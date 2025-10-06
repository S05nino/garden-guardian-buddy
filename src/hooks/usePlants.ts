import { useState, useEffect } from "react";
import { Plant, Weather } from "@/types/plant";
import { updateHealthBasedOnWeather } from "@/lib/plantLogic";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "garden-plants";

export function usePlants(weather: Weather | null) {
  const [plants, setPlants] = useState<Plant[]>([]);

  // 🪴 Carica piante da localStorage al primo render
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPlants(parsed);
        } else {
          console.warn("Dati piante non validi in localStorage. Resetto lo storage.");
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error("Errore durante il caricamento delle piante:", error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // 💾 Salva SEMPRE su localStorage quando cambia lo stato
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
    } catch (error) {
      console.error("Errore nel salvataggio delle piante:", error);
    }
  }, [plants]);

  // 🌦️ Aggiorna automaticamente la salute delle piante in base al meteo
  useEffect(() => {
    if (weather && plants.length > 0) {
      setPlants((prev) =>
        prev.map((plant) => updateHealthBasedOnWeather(plant, weather))
      );
    }
  }, [weather]);

  // ➕ Aggiunge una nuova pianta
  const addPlant = (plant: Plant) => {
    const completePlant: Plant = {
      id: plant.id || uuidv4(), // genera un ID unico se non c’è
      ...plant,
      wateringHistory: plant.wateringHistory || [],
      createdAt: plant.createdAt || new Date().toISOString(),
      totalWaterings: plant.totalWaterings || 0,
    };

    setPlants((prev) => [...prev, completePlant]);
  };

  // 🔄 Aggiorna i dati di una pianta
  const updatePlant = (plantId: string, updates: Partial<Plant>) => {
    setPlants((prev) =>
      prev.map((p) => (p.id === plantId ? { ...p, ...updates } : p))
    );
  };

  // ❌ Rimuove una pianta dal giardino
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
