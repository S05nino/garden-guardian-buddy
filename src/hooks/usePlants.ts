import { useState, useEffect, useRef } from "react";
import { Plant, Weather } from "@/types/plant";
import { updateHealthBasedOnWeather } from "@/lib/plantLogic";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "garden-plants";

export function usePlants(weather: Weather | null) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loaded, setLoaded] = useState(false); // ✅ indica se i dati sono caricati da localStorage
  const hasAppliedWeather = useRef(false); // evita doppia applicazione al primo render

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
    } finally {
      setLoaded(true);
    }
  }, []);

  // 💾 Salva su localStorage ogni volta che cambia plants (ma solo dopo il primo caricamento)
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
      } catch (error) {
        console.error("Errore nel salvataggio delle piante:", error);
      }
    }
  }, [plants, loaded]);

  // 🌦️ Aggiorna salute in base al meteo, ma solo dopo caricamento iniziale
  useEffect(() => {
    if (weather && loaded && plants.length > 0 && !hasAppliedWeather.current) {
      setPlants((prev) =>
        prev.map((plant) => updateHealthBasedOnWeather(plant, weather))
      );
      hasAppliedWeather.current = true;
    }
  }, [weather, loaded]);

  // ➕ Aggiunge una nuova pianta
  const addPlant = (plant: Plant) => {
    const completePlant: Plant = {
      id: plant.id || uuidv4(),
      ...plant,
      wateringHistory: plant.wateringHistory || [],
      createdAt: plant.createdAt || new Date().toISOString(),
      totalWaterings: plant.totalWaterings || 0,
    };
    setPlants((prev) => [...prev, completePlant]);
  };

  // 🔄 Aggiorna pianta
  const updatePlant = (plantId: string, updates: Partial<Plant>) => {
    setPlants((prev) =>
      prev.map((p) => (p.id === plantId ? { ...p, ...updates } : p))
    );
  };

  // ❌ Rimuove pianta
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
