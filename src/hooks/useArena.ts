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

  // 🔹 Recupera battaglie passate dell'utente
  const getUserBattles = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];
    const { data, error } = await supabase
      .from("arena_battles")
      .select("*")
      .or(`challenger_id.eq.${user.id},defender_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  };

  // 🔹 Classifica globale (opzionale)
  const getLeaderboard = async () => {
    const { data, error } = await supabase.rpc("get_arena_leaderboard");
    if (error) throw error;
    return data;
  };

  return { startBattle, getUserBattles, getLeaderboard };
}
