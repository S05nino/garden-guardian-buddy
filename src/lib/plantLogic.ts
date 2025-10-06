import { Plant, Weather, WateringHistory } from "@/types/plant";

export function getWaterLevel(plant: Plant): number {
  const daysPassed = Math.floor(
    (Date.now() - new Date(plant.lastWatered).getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, Math.min(1, 1 - daysPassed / plant.wateringDays));
}

export function calculateAdjustedWateringDays(plant: Plant, weather: Weather): number {
  let adjustedDays = plant.wateringDays;

  // Se preferences non esiste, ritorna giorni base
  if (!plant.preferences) {
    return adjustedDays;
  }

  // Temperatura fuori range ottimale aumenta il consumo
  if (weather.temp > plant.preferences.maxTemp) {
    const tempExcess = weather.temp - plant.preferences.maxTemp;
    adjustedDays *= Math.max(0.5, 1 - (tempExcess * 0.05)); // Riduce fino al 50%
  } else if (weather.temp < plant.preferences.minTemp) {
    adjustedDays *= 1.2; // Pianta rallenta il consumo al freddo
  }

  // Umidità influenza il fabbisogno
  if (weather.humidity < plant.preferences.minHumidity) {
    adjustedDays *= 0.8; // Più asciutto = più acqua
  } else if (weather.humidity > plant.preferences.maxHumidity) {
    adjustedDays *= 1.2; // Più umido = meno acqua
  }

  // Pioggia recente riduce il fabbisogno
  if (weather.precipitation > 0) {
    adjustedDays *= (1 + weather.precipitation * 0.1); // Ogni mm aggiunge 10%
  }

  return Math.max(1, Math.round(adjustedDays));
}

export function updateHealthBasedOnWeather(plant: Plant, weather: Weather): Plant {
  let health = plant.health;
  const waterLevel = getWaterLevel(plant);

  // Pioggia significativa annaffia automaticamente
  if (weather.precipitation > 5 && plant.position?.toLowerCase().includes('esterno')) {
    const newHistory: WateringHistory = {
      date: new Date().toISOString(),
      waterLevel: waterLevel,
      weatherTemp: weather.temp,
      weatherCondition: `Pioggia naturale (${weather.precipitation}mm)`,
    };

    return {
      ...plant,
      lastWatered: new Date().toISOString(),
      health: Math.min(100, health + 5),
      wateringHistory: [...plant.wateringHistory, newHistory].slice(-30),
    };
  }

  // Gestione livello acqua (sempre applicabile)
  if (waterLevel < 0.1) {
    // Acqua critica - danno severo
    health = Math.max(0, health - 20);
  } else if (waterLevel < 0.2) {
    // Poca acqua - danno moderato
    health = Math.max(0, health - 12);
  } else if (waterLevel < 0.3) {
    // Acqua bassa - danno lieve
    health = Math.max(0, health - 5);
  } else if (waterLevel > 0.95) {
    // Troppa acqua - rischio marciume
    health = Math.max(0, health - 8);
  }

  // Solo se preferences esiste, considera temperatura e umidità (per piante da esterno)
  if (plant.preferences && plant.position?.toLowerCase().includes('esterno')) {
    // Temperatura fuori range ottimale danneggia
    if (weather.temp > plant.preferences.maxTemp) {
      const tempExcess = weather.temp - plant.preferences.maxTemp;
      // Caldo eccessivo danneggia di più se c'è poca acqua
      const waterPenalty = waterLevel < 0.4 ? 2 : 1;
      health = Math.max(0, health - Math.floor(tempExcess * 0.8 * waterPenalty));
    } else if (weather.temp < plant.preferences.minTemp) {
      const tempDeficit = plant.preferences.minTemp - weather.temp;
      health = Math.max(0, health - Math.floor(tempDeficit * 0.5));
    }

    // Temperatura ottimale + buona acqua = salute migliora
    const inOptimalTemp = weather.temp >= plant.preferences.minTemp && 
                          weather.temp <= plant.preferences.maxTemp;
    if (inOptimalTemp && waterLevel > 0.5 && waterLevel < 0.9) {
      health = Math.min(100, health + 2);
    }

    // Umidità fuori range
    if (weather.humidity < plant.preferences.minHumidity && waterLevel < 0.3) {
      health = Math.max(0, health - 5);
    } else if (weather.humidity > plant.preferences.maxHumidity && waterLevel > 0.8) {
      health = Math.max(0, health - 4); // Troppa umidità + troppa acqua = problemi funghi
    }
  }

  return {
    ...plant,
    health,
  };
}

export function waterPlant(plant: Plant, weather: Weather | null): { plant: Plant; message: string } {
  const waterLevel = getWaterLevel(plant);
  const now = new Date().toISOString();

  // Troppa acqua
  if (waterLevel >= 0.95) {
    return {
      plant: {
        ...plant,
        health: Math.max(0, plant.health - 10),
      },
      message: `⚠️ Troppa acqua per ${plant.name}, le radici potrebbero marcire!`,
    };
  }

  const newHistory: WateringHistory = {
    date: now,
    waterLevel: waterLevel,
    weatherTemp: weather?.temp || 22,
    weatherCondition: weather?.condition || "N/D",
  };

  // Calcola quanto guadagna di salute in base al bisogno
  let healthGain = 5;
  if (waterLevel < 0.3) {
    healthGain = 10; // Era urgente, grande recupero
  } else if (waterLevel > 0.7) {
    healthGain = 2; // Non era urgente
  }

  // Annaffiatura corretta
  return {
    plant: {
      ...plant,
      lastWatered: now,
      health: Math.min(100, plant.health + healthGain),
      wateringHistory: [...plant.wateringHistory, newHistory].slice(-30),
      totalWaterings: plant.totalWaterings + 1,
    },
    message: `💧 Hai annaffiato ${plant.name}`,
  };
}

export function getHealthColor(health: number): string {
  if (health > 70) return "text-primary";
  if (health > 40) return "text-warning";
  return "text-destructive";
}

export function getHealthBgColor(health: number): string {
  if (health > 70) return "bg-primary";
  if (health > 40) return "bg-warning";
  return "bg-destructive";
}

export function shouldWater(plant: Plant, weather: Weather | null): boolean {
  const waterLevel = getWaterLevel(plant);
  
  // Urgenza base
  if (waterLevel < 0.2) return true;
  
  // Considera meteo (solo se preferences esiste)
  if (weather && plant.preferences) {
    // Con caldo eccessivo, anticipa l'annaffiatura
    if (weather.temp > plant.preferences.maxTemp && waterLevel < 0.4) {
      return true;
    }
    
    // Con pioggia recente, può aspettare
    if (weather.precipitation > 2 && waterLevel > 0.3) {
      return false;
    }
  }
  
  return waterLevel < 0.3;
}

export function getDaysAlive(plant: Plant): number {
  // Verifica che createdAt esista, altrimenti usa lastWatered come fallback
  const startDate = plant.createdAt || plant.lastWatered;
  return Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
}

export function getAverageHealth(plant: Plant): number {
  // Verifica che wateringHistory esista e abbia elementi
  if (!plant.wateringHistory || plant.wateringHistory.length === 0) {
    return plant.health;
  }
  
  // Calcola media salute basandosi sulla storia
  const recentHistory = plant.wateringHistory.slice(-10);
  const avgWaterLevel = recentHistory.reduce((sum, h) => sum + h.waterLevel, 0) / recentHistory.length;
  
  // Stima salute media: 100% se sempre ben annaffiata
  return Math.round(avgWaterLevel * 100);
}