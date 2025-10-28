import { useState, useEffect } from "react";
import { Preferences } from "@capacitor/preferences";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Plant, Weather } from "@/types/plant";
import { updateHealthBasedOnWeather } from "@/lib/plantLogic";
import type { Json } from "@/integrations/supabase/types";

const STORAGE_KEY = "garden-plants";

export function usePlants(weather: Weather | null) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 🔑 Recupera user Supabase
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
    };
    fetchUser();
  }, []);

  // 🌱 Carica piante (solo se c'è un utente loggato)
  useEffect(() => {
    const load = async () => {
      try {
        if (!userId) {
          // Se non c'è utente, svuota le piante
          console.log("❌ Nessun utente loggato, svuoto le piante");
          setPlants([]);
          await Preferences.remove({ key: STORAGE_KEY });
          setLoaded(true);
          return;
        }

        console.log("🔍 Caricamento piante per user_id:", userId);
        const { data, error } = await supabase
          .from("plants")
          .select("*")
          .eq("user_id", userId);

        if (error) throw error;

        if (data && data.length > 0) {
          console.log("✅ Caricate", data.length, "piante per l'utente");
          const mapped = data.map(toPlant);
          setPlants(mapped);
          await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(mapped) });
        } else {
          console.log("ℹ️ Nessuna pianta trovata su Supabase per questo utente");
          setPlants([]);
        }
      } catch (err) {
        console.error("Errore caricamento piante:", err);
        setPlants([]);
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, [userId]);

  // ☁️ Sincronizza su Supabase (solo se c'è un utente)
  useEffect(() => {
    if (!loaded || !userId) return;
    const sync = async () => {
      await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(plants) });

      for (const plant of plants) {
        const record = toDbPlant(plant, userId);
        const { error } = await supabase
          .from("plants")
          .upsert([record]);
        if (error) console.warn("Errore sync pianta:", error);
      }
    };
    sync();
  }, [plants, loaded, userId]);

  // 🌦️ Aggiorna salute basata sul meteo
  useEffect(() => {
    if (weather && plants.length > 0) {
      setPlants((prev) => prev.map((p) => updateHealthBasedOnWeather(p, weather)));
    }
  }, [weather]);

  // ➕ Aggiungi
  const addPlant = async (p: Plant) => {
    const newPlant: Plant = {
      ...p,
      id: p.id || uuidv4(),
      createdAt: new Date().toISOString(),
      totalWaterings: p.totalWaterings || 0,
      victories: p.victories || 0,
      defeats: p.defeats || 0,
    };
    
    // Se l'utente è loggato, salva immediatamente su Supabase
    if (userId) {
      console.log("💾 Salvataggio pianta per user_id:", userId, "pianta:", newPlant.name);
      const record = toDbPlant(newPlant, userId);
      const { error } = await supabase.from("plants").insert([record]);
      if (error) {
        console.error("❌ Errore aggiunta pianta:", error);
        return;
      }
      console.log("✅ Pianta salvata su Supabase");
    }
    
    setPlants((prev) => [...prev, newPlant]);
  };

  // 🔄 Aggiorna
  const updatePlant = (id: string, updates: Partial<Plant>) =>
    setPlants((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));

  // ❌ Rimuovi
  const removePlant = async (id: string) => {
    setPlants((prev) => prev.filter((p) => p.id !== id));
    if (userId) await supabase.from("plants").delete().eq("id", id);
  };

  // ⚔️ Battaglie
  const recordBattleResult = (winnerId: string, loserId: string) => {
    setPlants((prev) =>
      prev.map((p) => {
        if (p.id === winnerId) return { ...p, victories: (p.victories || 0) + 1 };
        if (p.id === loserId) return { ...p, defeats: (p.defeats || 0) + 1 };
        return p;
      })
    );
  };

  return { plants, addPlant, updatePlant, removePlant, recordBattleResult };
}

// 🔁 Helpers di mapping
function toPlant(dbRow: any): Plant {
  return {
    id: dbRow.id,
    name: dbRow.name,
    description: dbRow.description,
    wateringDays: dbRow.watering_days,
    position: dbRow.position,
    icon: dbRow.icon || "🪴",
    lastWatered: dbRow.last_watered || new Date().toISOString(),
    health: dbRow.health ?? 100,
    imageUrl: dbRow.image_url || undefined,
    category: dbRow.category,
    preferences: dbRow.preferences,
    wateringHistory: dbRow.watering_history || [],
    createdAt: dbRow.created_at,
    totalWaterings: dbRow.total_waterings ?? 0,
    remindersEnabled: dbRow.reminders_enabled ?? false,
    victories: dbRow.victories ?? 0,
    defeats: dbRow.defeats ?? 0,
  };
}

function toDbPlant(plant: Plant, userId: string) {
  return {
    id: plant.id,
    user_id: userId,
    name: plant.name,
    description: plant.description,
    watering_days: plant.wateringDays,
    position: plant.position,
    icon: plant.icon,
    last_watered: plant.lastWatered,
    health: plant.health,
    image_url: plant.imageUrl,
    category: plant.category,
    preferences: plant.preferences as unknown as Json,
    watering_history: plant.wateringHistory as unknown as Json,
    created_at: plant.createdAt,
    total_waterings: plant.totalWaterings,
    reminders_enabled: plant.remindersEnabled,
    victories: plant.victories,
    defeats: plant.defeats,
    updated_at: new Date().toISOString(),
  };
}
