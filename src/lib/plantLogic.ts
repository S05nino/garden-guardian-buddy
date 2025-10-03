import { Plant, Weather } from "@/types/plant";

export function getWaterLevel(plant: Plant): number {
  const daysPassed = Math.floor(
    (Date.now() - new Date(plant.lastWatered).getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, Math.min(1, 1 - daysPassed / plant.wateringDays));
}

export function updateHealthBasedOnWeather(plant: Plant, weather: Weather): Plant {
  let health = plant.health;
  const waterLevel = getWaterLevel(plant);

  // Se piove molto (>5mm), la pianta si annaffia da sola
  if (weather.precipitation > 5) {
    return {
      ...plant,
      lastWatered: new Date().toISOString(),
      health: Math.min(100, health + 3),
    };
  }

  // Temperatura alta (>30°C) aumenta consumo acqua
  if (weather.temp > 30 && waterLevel < 0.3) {
    health = Math.max(0, health - 8);
  }

  // Temperatura ottimale (18-25°C) migliora salute
  if (weather.temp >= 18 && weather.temp <= 25 && waterLevel > 0.5) {
    health = Math.min(100, health + 2);
  }

  // Umidità bassa (<30%) e poca acqua danneggia
  if (weather.humidity < 30 && waterLevel < 0.3) {
    health = Math.max(0, health - 5);
  }

  // Poca acqua danneggia sempre
  if (waterLevel < 0.2) {
    health = Math.max(0, health - 10);
  }

  return {
    ...plant,
    health,
  };
}

export function waterPlant(plant: Plant): { plant: Plant; message: string } {
  const waterLevel = getWaterLevel(plant);

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

  // Annaffiatura corretta
  return {
    plant: {
      ...plant,
      lastWatered: new Date().toISOString(),
      health: Math.min(100, plant.health + 5),
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

export function shouldWater(plant: Plant): boolean {
  return getWaterLevel(plant) < 0.3;
}
