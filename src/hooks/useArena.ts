import { supabase } from "@/integrations/supabase/client";

export function useArena() {
  // 🔹 Avvia una nuova battaglia
  const startBattle = async (challengerPlantId: string, defenderPlantId: string, defenderUserId: string, winnerId: string) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("Devi essere loggato per combattere!");

    const { error } = await supabase.from("arena_battles").insert({
      challenger_id: user.id,
      defender_id: defenderUserId,
      challenger_plant_id: challengerPlantId,
      defender_plant_id: defenderPlantId,
      winner_id: winnerId,
      battle_log: {},
    });

    if (error) throw error;

    return { winnerId };
  };

  // 🔹 Recupera battaglie passate dell'utente con dettagli
  const getUserBattles = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];
    
    const { data: battles, error } = await supabase
      .from("arena_battles")
      .select("*")
      .or(`challenger_id.eq.${user.id},defender_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!battles || battles.length === 0) return [];

    // Fetch profiles separately
    const userIds = [...new Set([
      ...battles.map(b => b.challenger_id),
      ...battles.map(b => b.defender_id)
    ])];
    
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    // Fetch plants separately
    const plantIds = [...new Set([
      ...battles.map(b => b.challenger_plant_id),
      ...battles.map(b => b.defender_plant_id)
    ])];
    
    const { data: plants } = await supabase
      .from("plants")
      .select("id, name, icon")
      .in("id", plantIds);

    // Merge data
    return battles.map(battle => ({
      ...battle,
      challenger: profiles?.find(p => p.user_id === battle.challenger_id),
      defender: profiles?.find(p => p.user_id === battle.defender_id),
      challenger_plant: plants?.find(p => p.id === battle.challenger_plant_id),
      defender_plant: plants?.find(p => p.id === battle.defender_plant_id)
    }));
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
    const statName = isWinner ? "victories" : "defeats";
    
    const { error } = await supabase.rpc("increment_plant_stat", {
      plant_uuid: plantId,
      stat_name: statName
    });
    
    if (error) {
      console.error("Errore aggiornamento statistiche pianta:", error);
      throw error;
    }
  };

  return { startBattle, getUserBattles, getLeaderboard, updatePlantStats };
}
