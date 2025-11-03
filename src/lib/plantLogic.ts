import { Plant, Weather, WateringHistory } from "@/types/plant";

export function getWaterLevel(plant: Plant): number {
  // Calcola frazione di acqua in base ai giorni trascorsi
  const lastWateredDate = new Date(plant.lastWatered || plant.createdAt || Date.now());
  const daysPassed = (Date.now() - lastWateredDate.getTime()) / (1000 * 60 * 60 * 24); // frazione di giorno
  const level = 1 - daysPassed / plant.wateringDays;
  return Math.max(0, Math.min(1, level)); // sempre tra 0 e 1
}

export function calculateAdjustedWateringDays(plant: Plant, weather: Weather): number {
  let adjustedDays = plant.wateringDays;

  // Se preferences non esiste, ritorna giorni base
  if (!plant.preferences) {
    return adjustedDays;
  }

  // Se la pianta è da interno, il meteo non impatta sull'irrigazione
  const isIndoor = plant.position?.toLowerCase().includes("interno");
  if (isIndoor) {
    return adjustedDays;
  }

  // Solo per piante da esterno: applica modifiche meteo
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

  // Penalità salute SOLO quando l'acqua è a zero
  if (waterLevel === 0) {
    health -= 15; // Penalità significativa quando non c'è acqua
  }

  // Bonus pioggia naturale per piante esterne
  if (weather.precipitation > 5 && plant.position?.toLowerCase().includes("esterno")) {
    health = Math.min(100, health + 2); // piccolo bonus proporzionale
  }

  // Penalità/bonus temperatura e umidità solo se preferences definite e pianta esterna
  if (plant.preferences && plant.position?.toLowerCase().includes("esterno")) {
    const { minTemp, maxTemp, minHumidity, maxHumidity } = plant.preferences;

    // Temperatura troppo alta
    if (weather.temp > maxTemp) {
      const tempExcess = weather.temp - maxTemp;
      health -= Math.min(health, tempExcess * 0.5 * (waterLevel < 0.5 ? 2 : 1));
    }
    // Temperatura troppo bassa
    else if (weather.temp < minTemp) {
      const tempDeficit = minTemp - weather.temp;
      health -= Math.min(health, tempDeficit * 0.3);
    }

    // Bonus se temperatura ottimale e acqua buona
    if (weather.temp >= minTemp && weather.temp <= maxTemp && waterLevel >= 0.5 && waterLevel <= 0.9) {
      health = Math.min(100, health + 1); // piccolo recupero graduale
    }

    // Umidità fuori range
    if (weather.humidity < minHumidity && waterLevel < 0.3) health -= 2;
    if (weather.humidity > maxHumidity && waterLevel > 0.8) health -= 2;
  }

  return {
    ...plant,
    health: Math.round(Math.max(0, Math.min(100, health))),
  };
}

export function waterPlant(plant: Plant, weather: Weather | null): { plant: Plant; message?: string } {
  const waterLevel = getWaterLevel(plant);
  const now = new Date().toISOString();

  // Troppa acqua
  if (waterLevel >= 0.95) {
    return {
      plant: {
        ...plant,
        health: Math.round(Math.max(0, plant.health - 10)),
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
      health: Math.round(Math.min(100, plant.health + healthGain)),
      wateringHistory: [...plant.wateringHistory, newHistory].slice(-30),
      totalWaterings: plant.totalWaterings + 1,
    },
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
  if (waterLevel < 0.1) return true;
  
  // Solo per piante da esterno: considera meteo
  const isOutdoor = plant.position?.toLowerCase().includes("esterno");
  if (weather && plant.preferences && isOutdoor) {
    // Con caldo eccessivo, anticipa l'annaffiatura
    if (weather.temp > plant.preferences.maxTemp && waterLevel < 0.2) {
      return true;
    }
    
    // Con pioggia recente, può aspettare
    if (weather.precipitation > 2 && waterLevel > 0.15) {
      return false;
    }
  }
  
  return waterLevel < 0.1;
}

export function getDaysAlive(plant: Plant): number {
  // Verifica che createdAt esista, altrimenti usa lastWatered come fallback
  const startDate = plant.createdAt || plant.lastWatered;
  
  // Calcola giorni basandosi solo sulla data (ignorando ore/minuti)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  return Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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