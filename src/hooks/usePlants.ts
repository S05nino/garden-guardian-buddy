import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { Plant, Weather } from "@/types/plant";
import { updateHealthBasedOnWeather } from "@/lib/plantLogic";
import type { Json } from "@/integrations/supabase/types";

export interface PlantWithOwner extends Plant {
  isShared?: boolean;
  ownerName?: string;
  ownerId?: string;
}

export function usePlants(weather: Weather | null) {
  const [plants, setPlants] = useState<PlantWithOwner[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 🔑 Listener per cambiamenti di autenticazione
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id || null;
      setUserId(newUserId);
      
      // Se l'utente fa logout, svuota immediatamente le piante
      if (!newUserId) {
        console.log("❌ Logout rilevato, svuoto le piante");
        setPlants([]);
        setLoaded(true);
      }
    });

    // Recupera user iniziale
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id || null);
    };
    fetchUser();

    return () => subscription.unsubscribe();
  }, []);

  // 🌱 Carica piante quando cambia userId
  useEffect(() => {
    const load = async () => {
      if (!userId) {
        // Se non c'è utente, assicurati che le piante siano vuote
        setPlants([]);
        setLoaded(true);
        return;
      }

      try {
        console.log("🔍 Caricamento piante per user_id:", userId);
        
        // Carica piante proprie
        const { data: myPlants, error: myError } = await supabase
          .from("plants")
          .select("*")
          .eq("user_id", userId);

        if (myError) throw myError;

        const mappedMyPlants: PlantWithOwner[] = (myPlants || []).map(p => ({
          ...toPlant(p),
          isShared: false,
        }));

        // Carica piante condivise da amici
        const { data: sharedGardens } = await supabase
          .from("garden_shares")
          .select("owner_id")
          .eq("shared_with_id", userId);

        let sharedPlants: PlantWithOwner[] = [];
        
        if (sharedGardens && sharedGardens.length > 0) {
          const ownerIds = sharedGardens.map(sg => sg.owner_id);
          
          // Carica piante condivise
          const { data: sharedPlantsData } = await supabase
            .from("plants")
            .select("*")
            .in("user_id", ownerIds);

          // Carica nomi proprietari
          const { data: ownerProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", ownerIds);

          sharedPlants = (sharedPlantsData || []).map(p => {
            const ownerProfile = ownerProfiles?.find(prof => prof.user_id === p.user_id);
            return {
              ...toPlant(p),
              isShared: true,
              ownerId: p.user_id,
              ownerName: ownerProfile?.full_name || "Amico",
            };
          });
        }

        const allPlants = [...mappedMyPlants, ...sharedPlants];
        console.log("✅ Caricate", allPlants.length, "piante (", mappedMyPlants.length, "proprie,", sharedPlants.length, "condivise)");
        setPlants(allPlants);
      } catch (err) {
        console.error("Errore caricamento piante:", err);
        setPlants([]);
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, [userId]);

  // ☁️ Sincronizza su Supabase quando cambiano le piante
  useEffect(() => {
    if (!loaded || !userId || plants.length === 0) return;
    
    const sync = async () => {
      // Sincronizza solo le piante proprie, non quelle condivise
      const myPlants = plants.filter(p => !p.isShared);
      for (const plant of myPlants) {
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
    if (!userId) {
      console.error("❌ Impossibile aggiungere pianta: utente non loggato");
      return;
    }

    const newPlant: Plant = {
      ...p,
      id: p.id || uuidv4(),
      createdAt: new Date().toISOString(),
      totalWaterings: p.totalWaterings || 0,
      victories: p.victories || 0,
      defeats: p.defeats || 0,
    };
    
    console.log("💾 Salvataggio pianta per user_id:", userId, "pianta:", newPlant.name);
    const record = toDbPlant(newPlant, userId);
    const { error } = await supabase.from("plants").insert([record]);
    if (error) {
      console.error("❌ Errore aggiunta pianta:", error);
      return;
    }
    console.log("✅ Pianta salvata su Supabase");
    
    setPlants((prev) => [...prev, newPlant]);
  };

  // 🔄 Aggiorna
  const updatePlant = (id: string, updates: Partial<Plant>) =>
    setPlants((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));

  // ❌ Rimuovi
  const removePlant = async (id: string) => {
    if (!userId) {
      console.error("❌ Impossibile eliminare pianta: utente non loggato");
      return;
    }

    console.log("🗑️ Eliminazione pianta da Supabase:", id);
    const { error } = await supabase.from("plants").delete().eq("id", id);
    
    if (error) {
      console.error("❌ Errore eliminazione pianta da Supabase:", error);
      return;
    }
    
    console.log("✅ Pianta eliminata da Supabase, rimuovo dallo state locale");
    setPlants((prev) => prev.filter((p) => p.id !== id));
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
