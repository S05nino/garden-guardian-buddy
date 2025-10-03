import { useState, useEffect } from "react";
import { Plant } from "@/types/plant";
import { updateHealthBasedOnWeather } from "@/lib/plantLogic";
import { Weather } from "@/types/plant";

const STORAGE_KEY = "garden-plants";

export function usePlants(weather: Weather | null) {
  const [plants, setPlants] = useState<Plant[]>([]);

  // Load plants from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPlants(parsed);
      } catch (error) {
        console.error("Error loading plants:", error);
      }
    }
  }, []);

  // Save plants to localStorage
  useEffect(() => {
    if (plants.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
    }
  }, [plants]);

  // Update plants health based on weather
  useEffect(() => {
    if (weather && plants.length > 0) {
      setPlants((prev) =>
        prev.map((plant) => updateHealthBasedOnWeather(plant, weather))
      );
    }
  }, [weather]);

  const addPlant = (plant: Plant) => {
    setPlants((prev) => [...prev, plant]);
  };

  const updatePlant = (plantId: string, updates: Partial<Plant>) => {
    setPlants((prev) =>
      prev.map((p) => (p.id === plantId ? { ...p, ...updates } : p))
    );
  };

  const removePlant = (plantId: string) => {
    setPlants((prev) => prev.filter((p) => p.id !== plantId));
  };

  return {
    plants,
    addPlant,
    updatePlant,
    removePlant,
  };
}
