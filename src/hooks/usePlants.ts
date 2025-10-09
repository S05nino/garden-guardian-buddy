import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";
import { Plant, Weather } from "@/types/plant";
import { updateHealthBasedOnWeather } from "@/lib/plantLogic";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "garden-plants";

export function usePlants(weather: Weather | null) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 🪴 Carica piante da Capacitor Preferences al primo render
  useEffect(() => {
    const loadPlants = async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (value) {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            setPlants(parsed);
          } else {
            console.warn("Dati piante non validi, reset dello storage...");
            await Preferences.remove({ key: STORAGE_KEY });
          }
        }
      } catch (error) {
        console.error("Errore durante il caricamento delle piante:", error);
        await Preferences.remove({ key: STORAGE_KEY });
      } finally {
        setLoaded(true);
      }
    };

    loadPlants();
  }, []);

  // 💾 Salva SEMPRE su Preferences quando cambia lo stato (dopo caricamento)
  useEffect(() => {
    if (!loaded) return; // Evita di sovrascrivere prima del primo caricamento

    const savePlants = async () => {
      try {
        await Preferences.set({
          key: STORAGE_KEY,
          value: JSON.stringify(plants),
        });
      } catch (error) {
        console.error("Errore nel salvataggio delle piante:", error);
      }
    };

    savePlants();
  }, [plants, loaded]);

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
      id: plant.id || uuidv4(),
      ...plant,
      wateringHistory: plant.wateringHistory || [],
      createdAt: plant.createdAt || new Date().toISOString(),
      totalWaterings: plant.totalWaterings || 0,
      victories: plant.victories || 0,
      defeats: plant.defeats || 0,
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

  // ⚔️ Registra il risultato di una battaglia
  const recordBattleResult = (winnerId: string, loserId: string) => {
    setPlants((prev) =>
      prev.map((p) => {
        if (p.id === winnerId) {
          return { ...p, victories: (p.victories || 0) + 1 };
        }
        if (p.id === loserId) {
          return { ...p, defeats: (p.defeats || 0) + 1 };
        }
        return p;
      })
    );
  };

  return {
    plants,
    addPlant,
    updatePlant,
    removePlant,
    recordBattleResult,
  };
}
