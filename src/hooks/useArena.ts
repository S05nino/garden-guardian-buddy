import { supabase } from "@/integrations/supabase/client";

export function useArena() {
  // 🔹 Avvia una nuova battaglia
  const startBattle = async (challengerPlantId: string, defenderPlantId: string, defenderUserId: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Devi essere loggato per combattere!");

    // Esempio logica base: punteggio casuale
    const challengerScore = Math.random();
    const defenderScore = Math.random();
    const winnerId = challengerScore > defenderScore ? user.id : defenderUserId;

    const { error } = await supabase.from("arena_battles").insert({
      challenger_id: user.id,
      defender_id: defenderUserId,
      challenger_plant_id: challengerPlantId,
      defender_plant_id: defenderPlantId,
      winner_id: winnerId,
      battle_log: {
        challengerScore,
        defenderScore,
      },
    });

    if (error) throw error;

    return { winnerId, challengerScore, defenderScore };
  };

  // 🔹 Recupera battaglie passate dell'utente con dettagli
  const getUserBattles = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];
    
    const { data, error } = await supabase
      .from("arena_battles")
      .select(`
        *,
        challenger:profiles!arena_battles_challenger_id_fkey(full_name),
        defender:profiles!arena_battles_defender_id_fkey(full_name),
        challenger_plant:plants!arena_battles_challenger_plant_id_fkey(name, icon),
        defender_plant:plants!arena_battles_defender_plant_id_fkey(name, icon)
      `)
      .or(`challenger_id.eq.${user.id},defender_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  };

  // 🔹 Classifica globale con nomi utenti
  const getLeaderboard = async () => {
    const { data, error } = await supabase.rpc("get_arena_leaderboard");
    if (error) throw error;
    
    // Aggiungi i nomi degli utenti
    if (data && data.length > 0) {
      const userIds = data.map((row: any) => row.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      
      return data.map((row: any) => ({
        ...row,
        full_name: profiles?.find((p) => p.user_id === row.user_id)?.full_name || "Utente"
      }));
    }
    
    return data;
  };

  // 🔹 Aggiorna statistiche piante dopo battaglia
  const updatePlantStats = async (plantId: string, isWinner: boolean) => {
    const field = isWinner ? "victories" : "defeats";
    
    const { data: currentPlant } = await supabase
      .from("plants")
      .select(field)
      .eq("id", plantId)
      .single();
    
    if (currentPlant) {
      const newValue = (currentPlant[field] || 0) + 1;
      const { error } = await supabase
        .from("plants")
        .update({ [field]: newValue })
        .eq("id", plantId);
      
      if (error) console.error("Errore aggiornamento statistiche pianta:", error);
    }
  };

  return { startBattle, getUserBattles, getLeaderboard, updatePlantStats };
}
