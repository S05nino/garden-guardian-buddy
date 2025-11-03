import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFriends } from "@/hooks/useFriends";
import { useAuth } from "@/hooks/useAuth";
import { usePlants } from "@/hooks/usePlants";
import { useWeather } from "@/hooks/useWeather";
import { useGardenShares } from "@/hooks/useGardenShares";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, UserPlus, Users, Leaf, Swords, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Plant } from "@/types/plant";
import { ArenaModal } from "@/components/ArenaModal";

interface FriendDetailProps {
  friendId: string;
  onClose: () => void;
  onChallenge: (friendId: string, plants: Plant[]) => void;
  isShared: boolean;
  onToggleShare: () => void;
}

function FriendDetail({ friendId, onClose, onChallenge, isShared, onToggleShare }: FriendDetailProps) {
  const [profile, setProfile] = useState<any>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFriendData = async () => {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", friendId)
          .single();

        const { data: plantsData } = await supabase
          .from("plants")
          .select("*")
          .eq("user_id", friendId);

        setProfile(profileData);
        
        // Mappa i dati dal database al tipo Plant
        const mappedPlants: Plant[] = (plantsData || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          wateringDays: p.watering_days || 7,
          position: p.position,
          icon: p.icon || "🪴",
          lastWatered: p.last_watered || new Date().toISOString(),
          health: p.health || 100,
          imageUrl: p.image_url,
          category: p.category,
          preferences: p.preferences || { minTemp: 15, maxTemp: 25, minHumidity: 40, maxHumidity: 70, sunlight: "partial" },
          wateringHistory: p.watering_history || [],
          createdAt: p.created_at || new Date().toISOString(),
          totalWaterings: p.total_waterings || 0,
          remindersEnabled: p.reminders_enabled || false,
          victories: p.victories || 0,
          defeats: p.defeats || 0,
        }));
        
        setPlants(mappedPlants);
      } catch (err) {
        console.error("Errore caricamento dati amico:", err);
        toast.error("Errore nel caricamento dei dati");
      } finally {
        setLoading(false);
      }
    };

    loadFriendData();
  }, [friendId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-primary text-white font-semibold rounded-full h-12 w-12">
            {profile?.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{profile?.full_name || "Utente"}</h3>
            <p className="text-sm text-muted-foreground">
              {plants.length} {plants.length === 1 ? "pianta" : "piante"}
            </p>
          </div>
        </div>
        <Button
          onClick={onToggleShare}
          size="sm"
          variant={isShared ? "destructive" : "default"}
          className={!isShared ? "bg-shared hover:bg-shared/80 text-shared-foreground" : ""}
        >
          {isShared ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Rimuovi
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 mr-2" />
              Condividi
            </>
          )}
        </Button>
      </div>

      {plants.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Piante</h4>
            <Button
              onClick={() => onChallenge(friendId, plants)}
              size="sm"
              className="bg-gradient-primary"
            >
              <Swords className="h-4 w-4 mr-2" />
              Sfida
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
            {plants.map((plant) => (
              <Card key={plant.id} className="p-3">
                <div className="flex flex-col items-center text-center">
                  {plant.imageUrl ? (
                    <img
                      src={plant.imageUrl}
                      alt={plant.name}
                      className="w-16 h-16 object-cover rounded-full mb-2"
                    />
                  ) : (
                    <Leaf className="h-10 w-10 text-muted-foreground mb-2" />
                  )}
                  <p className="font-medium text-sm">{plant.name}</p>
                  <p className="text-xs text-muted-foreground">{plant.category}</p>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {plants.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Leaf className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Questo utente non ha ancora piante</p>
        </div>
      )}

      <Button variant="outline" onClick={onClose} className="w-full">
        Chiudi
      </Button>
    </div>
  );
}

export default function Friends() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { friends, loading, addFriend, removeFriend } = useFriends();
  const { weather } = useWeather();
  const { plants, updatePlant } = usePlants(weather);
  const { shares, receivedShares, isSharedWith, shareGardenWith, removeShare, refreshShares } = useGardenShares();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [friendId, setFriendId] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [arenaChallenge, setArenaChallenge] = useState<{
    friendUserId: string;
    friendName: string;
    friendPlants: Plant[];
  } | null>(null);

  const handleAddFriend = async () => {
    if (!friendId.trim()) {
      toast.error("Inserisci un ID valido");
      return;
    }

    const success = await addFriend(friendId.trim());
    if (success) {
      setFriendId("");
      setShowAddDialog(false);
    }
  };

  const handleChallenge = async (friendUserId: string, friendPlants: Plant[]) => {
    if (plants.length === 0) {
      toast.error("Devi avere almeno una pianta per combattere!");
      return;
    }
    
    if (friendPlants.length === 0) {
      toast.error("Questo amico non ha piante!");
      return;
    }

    // Carica il nome dell'amico
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", friendUserId)
      .single();

    // Chiudi il dialog dell'amico e apri l'arena
    setSelectedFriend(null);
    setArenaChallenge({
      friendUserId,
      friendName: profileData?.full_name || "Amico",
      friendPlants,
    });
  };

  const handleToggleShare = async (friendUserId: string) => {
    const alreadyShared = isSharedWith(friendUserId);
    
    if (alreadyShared) {
      await removeShare(friendUserId);
    } else {
      await shareGardenWith(friendUserId);
    }
    
    await refreshShares();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Accesso richiesto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Devi effettuare l'accesso per vedere i tuoi amici
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Torna alla home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-8 py-10">
          <div className="flex items-center gap-3 mt-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              aria-label="Torna indietro"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">I Miei Amici</h1>
              <p className="text-sm text-muted-foreground">
                {friends.length} {friends.length === 1 ? "amico" : "amici"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Button
            onClick={() => setShowAddDialog(true)}
            className="w-full bg-gradient-primary"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Aggiungi Amico
          </Button>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Caricamento amici...
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-muted rounded-full p-6 mb-4 inline-block">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold mb-2">Nessun amico ancora</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Aggiungi amici condividendo il tuo ID o inserendo il loro per
                vedere le loro piante e sfidarli nell'arena!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend) => {
                const hasSharedGarden = receivedShares.some(s => s.owner_id === friend.user_id);
                return (
                <Card
                  key={friend.user_id}
                  className="cursor-pointer hover:border-primary transition"
                  onClick={() => setSelectedFriend(friend.user_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center bg-primary text-white font-semibold rounded-full h-10 w-10">
            {friend.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {friend.full_name || "Utente"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Amici da{" "}
                          {new Date(friend.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFriend(friend.user_id);
                      }}
                    >
                      Rimuovi
                    </Button>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Dialog Aggiungi Amico */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi un amico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Inserisci l'ID dell'amico
              </label>
              <Input
                value={friendId}
                onChange={(e) => setFriendId(e.target.value)}
                placeholder="es: 123e4567-e89b-12d3-a456-426614174000"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Chiedi all'amico di condividere il suo ID dal profilo
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddFriend} className="flex-1 bg-gradient-primary">
                Aggiungi
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setFriendId("");
                }}
                className="flex-1"
              >
                Annulla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Dettagli Amico */}
      <Dialog
        open={!!selectedFriend}
        onOpenChange={(open) => !open && setSelectedFriend(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profilo Amico</DialogTitle>
          </DialogHeader>
          {selectedFriend && (
            <FriendDetail
              friendId={selectedFriend}
              onClose={() => setSelectedFriend(null)}
              onChallenge={handleChallenge}
              isShared={isSharedWith(selectedFriend)}
              onToggleShare={() => handleToggleShare(selectedFriend)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ArenaModal per sfide tra amici */}
      {arenaChallenge && (
        <ArenaModal
          open={!!arenaChallenge}
          onClose={() => setArenaChallenge(null)}
          plants={plants}
          updatePlant={updatePlant}
          friendChallenge={arenaChallenge}
        />
      )}
    </div>
  );
}
