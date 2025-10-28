import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FriendProfile {
  user_id: string;
  full_name: string;
  created_at: string;
}

export function useFriends() {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFriends = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase
        .from("friendships")
        .select(`
          friend_id,
          profiles!friendships_friend_id_fkey (
            user_id,
            full_name,
            created_at
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const friendsList = data?.map((f: any) => f.profiles).filter(Boolean) || [];
      setFriends(friendsList);
    } catch (err) {
      console.error("Errore caricamento amici:", err);
    } finally {
      setLoading(false);
    }
  };

  const addFriend = async (friendUserId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Devi essere loggato");

      if (user.id === friendUserId) {
        toast.error("Non puoi aggiungere te stesso come amico!");
        return false;
      }

      // Verifica che il profilo dell'utente corrente esista
      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!currentUserProfile) {
        // Crea il profilo se non esiste
        const { error: createError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Utente"
          });
        
        if (createError) {
          toast.error("Errore nella creazione del profilo");
          console.error("Errore creazione profilo:", createError);
          return false;
        }
      }

      // Verifica che il profilo dell'amico esista
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("user_id", friendUserId)
        .maybeSingle();

      if (!profile) {
        toast.error("ID utente non valido");
        return false;
      }

      // Verifica se già amici
      const { data: existing } = await supabase
        .from("friendships")
        .select("id")
        .eq("user_id", user.id)
        .eq("friend_id", friendUserId)
        .maybeSingle();

      if (existing) {
        toast.info("Questo utente è già tuo amico!");
        return false;
      }

      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: friendUserId,
      });

      if (error) throw error;

      toast.success(`${profile.full_name || "Amico"} aggiunto!`);
      await loadFriends();
      return true;
    } catch (err: any) {
      console.error("Errore aggiunta amico:", err);
      toast.error(err.message || "Errore durante l'aggiunta");
      return false;
    }
  };

  const removeFriend = async (friendUserId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Devi essere loggato");

      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("user_id", user.id)
        .eq("friend_id", friendUserId);

      if (error) throw error;

      toast.success("Amico rimosso");
      await loadFriends();
    } catch (err: any) {
      console.error("Errore rimozione amico:", err);
      toast.error(err.message || "Errore durante la rimozione");
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  return { friends, loading, addFriend, removeFriend, refreshFriends: loadFriends };
}
