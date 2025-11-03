import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GardenShare {
  id: string;
  owner_id: string;
  shared_with_id: string;
  created_at: string;
}

export function useGardenShares() {
  const [shares, setShares] = useState<GardenShare[]>([]);
  const [receivedShares, setReceivedShares] = useState<GardenShare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Condivisioni fatte da me
      const { data: myShares } = await supabase
        .from("garden_shares")
        .select("*")
        .eq("owner_id", user.id);

      // Condivisioni ricevute da altri
      const { data: received } = await supabase
        .from("garden_shares")
        .select("*")
        .eq("shared_with_id", user.id);

      setShares(myShares || []);
      setReceivedShares(received || []);
    } catch (err) {
      console.error("Errore caricamento condivisioni:", err);
    } finally {
      setLoading(false);
    }
  };

  const shareGardenWith = async (friendUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Devi essere loggato");
        return false;
      }

      const { error } = await supabase
        .from("garden_shares")
        .insert({
          owner_id: user.id,
          shared_with_id: friendUserId,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Hai già condiviso il giardino con questo amico");
        } else {
          toast.error("Errore nella condivisione");
        }
        return false;
      }

      toast.success("Giardino condiviso!");
      await loadShares();
      return true;
    } catch (err) {
      console.error("Errore condivisione giardino:", err);
      toast.error("Errore nella condivisione");
      return false;
    }
  };

  const removeShare = async (friendUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from("garden_shares")
        .delete()
        .eq("owner_id", user.id)
        .eq("shared_with_id", friendUserId);

      if (error) {
        toast.error("Errore rimozione condivisione");
        return false;
      }

      toast.success("Condivisione rimossa");
      await loadShares();
      return true;
    } catch (err) {
      console.error("Errore rimozione condivisione:", err);
      return false;
    }
  };

  const isSharedWith = (friendUserId: string) => {
    return shares.some((s) => s.shared_with_id === friendUserId);
  };

  return {
    shares,
    receivedShares,
    loading,
    shareGardenWith,
    removeShare,
    isSharedWith,
    refreshShares: loadShares,
  };
}
