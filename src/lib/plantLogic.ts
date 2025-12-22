import { Plant, Weather, WateringHistory } from "@/types/plant";

// Calcola livello acqua considerando i giorni base della pianta
export function getWaterLevel(plant: Plant): number {
  const lastWateredDate = new Date(plant.lastWatered || plant.createdAt || Date.now());
  const daysPassed = (Date.now() - lastWateredDate.getTime()) / (1000 * 60 * 60 * 24);
  const level = 1 - daysPassed / plant.wateringDays;
  return Math.max(0, Math.min(1, level));
}

// Calcola livello acqua considerando anche il meteo (per piante esterne)
export function getWaterLevelWithWeather(plant: Plant, weather: Weather | null): number {
  const lastWateredDate = new Date(plant.lastWatered || plant.createdAt || Date.now());
  const daysPassed = (Date.now() - lastWateredDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Calcola i giorni effettivi considerando il meteo
  const effectiveDays = weather ? calculateAdjustedWateringDays(plant, weather) : plant.wateringDays;
  
  const level = 1 - daysPassed / effectiveDays;
  return Math.max(0, Math.min(1, level));
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
  const waterLevel = getWaterLevelWithWeather(plant, weather);
  
  // Fattore di sensibilità: piante che richiedono più acqua (wateringDays basso) 
  // sono più sensibili alla mancanza d'acqua
  const sensitivityFactor = Math.max(0.5, 3 / plant.wateringDays); // Da 0.5x a 3x
  
  const isOutdoor = plant.position?.toLowerCase().includes("esterno");

  // === GESTIONE SALUTE BASATA SUL LIVELLO D'ACQUA ===
  
  if (waterLevel === 0) {
    // Acqua a zero: danno grave proporzionale alla sensibilità della pianta
    const baseDamage = 8;
    health -= baseDamage * sensitivityFactor;
  } else if (waterLevel < 0.1) {
    // Acqua critica: danno significativo
    health -= 5 * sensitivityFactor;
  } else if (waterLevel < 0.2) {
    // Acqua molto bassa: danno moderato
    health -= 3 * sensitivityFactor;
  } else if (waterLevel < 0.3) {
    // Acqua bassa: danno leggero
    health -= 1 * sensitivityFactor;
  }

  // === EFFETTI TEMPERATURA (anche con acqua presente) ===
  if (plant.preferences) {
    const { minTemp, maxTemp } = plant.preferences;
    
    // Penalità caldo eccessivo - più grave se anche l'acqua è bassa
    if (weather.temp > maxTemp) {
      const tempExcess = weather.temp - maxTemp;
      const waterStressMultiplier = waterLevel < 0.3 ? 2.5 : waterLevel < 0.5 ? 1.5 : 1;
      
      // Danno proporzionale all'eccesso di temperatura
      // Solo piante esterne subiscono il pieno effetto del meteo
      const outdoorMultiplier = isOutdoor ? 1 : 0.3;
      health -= Math.min(12, tempExcess * 0.4 * waterStressMultiplier * outdoorMultiplier);
    }
    
    // Penalità freddo eccessivo
    if (weather.temp < minTemp) {
      const tempDeficit = minTemp - weather.temp;
      const outdoorMultiplier = isOutdoor ? 1 : 0.2;
      health -= Math.min(10, tempDeficit * 0.3 * outdoorMultiplier);
    }
    
    // Umidità fuori range amplifica i problemi
    const { minHumidity, maxHumidity } = plant.preferences;
    if (weather.humidity < minHumidity && waterLevel < 0.3) {
      // Ambiente secco + poca acqua = stress elevato
      health -= 2 * sensitivityFactor;
    }
    if (weather.humidity > maxHumidity && waterLevel > 0.85) {
      // Troppa umidità + troppa acqua = rischio marciume
      health -= 1.5;
    }
  }

  // === RECUPERO NATURALE ===
  // Recupero quando le condizioni sono buone
  const hasGoodWater = waterLevel >= 0.3 && waterLevel <= 0.8;
  const hasGoodTemp = plant.preferences 
    ? weather.temp >= plant.preferences.minTemp && weather.temp <= plant.preferences.maxTemp
    : weather.temp >= 15 && weather.temp <= 28;
  
  if (hasGoodWater && hasGoodTemp && health < 100) {
    // Recupero lento ma costante in condizioni ottimali
    health += 0.8;
  } else if (hasGoodWater && health < 100) {
    // Recupero minimo anche solo con acqua buona
    health += 0.3;
  }

  // Bonus pioggia naturale per piante esterne con buona salute base
  if (weather.precipitation > 5 && isOutdoor && health > 30) {
    health = Math.min(100, health + 1);
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
  const waterLevel = getWaterLevelWithWeather(plant, weather);
  
  // Urgenza base in base al livello d'acqua
  if (waterLevel <= 0.15) return true;
  
  // Solo per piante da esterno: considera meteo
  const isOutdoor = plant.position?.toLowerCase().includes("esterno");
  if (weather && plant.preferences && isOutdoor) {
    // Con caldo eccessivo, anticipa l'annaffiatura
    if (weather.temp > plant.preferences.maxTemp && waterLevel < 0.25) {
      return true;
    }
    
    // Con pioggia recente abbondante, può aspettare
    if (weather.precipitation > 5 && waterLevel > 0.2) {
      return false;
    }
  }
  
  return waterLevel <= 0.15;
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