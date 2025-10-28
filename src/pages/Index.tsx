import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WeatherWidget } from "@/components/WeatherWidget";
import { PlantCard } from "@/components/PlantCard";
import { PlantDetail } from "@/components/PlantDetail";
import { AddPlantModal } from "@/components/AddPlantModal";
import { ArenaModal } from "@/components/ArenaModal";
import { PlantVisionModal } from "@/components/PlantVisionModal";
import { useWeather } from "@/hooks/useWeather";
import { usePlants } from "@/hooks/usePlants";
import { Plant } from "@/types/plant";
import { Plus, Leaf, Sparkles, User, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import { shouldWater } from "@/lib/plantLogic";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";

function EditProfileSection({
  currentName,
  onUpdate,
}: {
  currentName: string;
  onUpdate: (newName: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast.error("Il nome non può essere vuoto");
      return;
    }
    if (newName.trim().length > 100) {
      toast.error("Il nome non può superare i 100 caratteri");
      return;
    }
    setLoading(true);
    try {
      await supabase.auth.updateUser({ data: { full_name: newName } });
      onUpdate(newName);
      setEditingName(false);
      toast.success("Nome aggiornato!");
    } catch (err) {
      console.error("Errore aggiornamento nome:", err);
      toast.error("Errore durante l'aggiornamento");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("La password deve essere di almeno 6 caratteri");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Le password non coincidono");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setEditingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password aggiornata!");
    } catch (err: any) {
      console.error("Errore aggiornamento password:", err);
      toast.error(err.message || "Errore durante l'aggiornamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Modifica Nome */}
      {!editingName ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setEditingName(true)}
        >
          ✏️ Modifica nome
        </Button>
      ) : (
        <div className="flex flex-col gap-2 p-3 border rounded-lg">
          <label className="text-sm font-medium">Nuovo nome</label>
          <input
            type="text"
            className="border rounded-md px-3 py-2 text-sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome e Cognome"
            maxLength={100}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSaveName}
              disabled={loading}
              className="flex-1 bg-gradient-primary"
            >
              {loading ? "Salvataggio..." : "Salva"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingName(false);
                setNewName(currentName);
              }}
              className="flex-1"
            >
              Annulla
            </Button>
          </div>
        </div>
      )}

      {/* Modifica Password */}
      {!editingPassword ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setEditingPassword(true)}
        >
          🔒 Cambia password
        </Button>
      ) : (
        <div className="flex flex-col gap-2 p-3 border rounded-lg">
          <label className="text-sm font-medium">Nuova password</label>
          <input
            type="password"
            className="border rounded-md px-3 py-2 text-sm"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimo 6 caratteri"
            minLength={6}
          />
          <label className="text-sm font-medium">Conferma password</label>
          <input
            type="password"
            className="border rounded-md px-3 py-2 text-sm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ripeti la password"
          />
          <div className="flex gap-2 mt-2">
            <Button
              onClick={handleSavePassword}
              disabled={loading}
              className="flex-1 bg-gradient-primary"
            >
              {loading ? "Aggiornamento..." : "Aggiorna"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingPassword(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="flex-1"
            >
              Annulla
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


const Index = () => {
  const { weather, loading: weatherLoading, refetch } = useWeather();
  const { plants, addPlant, updatePlant, removePlant } = usePlants(weather);
  const { user } = useAuth();

  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [plantToDiagnose, setPlantToDiagnose] = useState<{ id: string; name: string } | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visionMode, setVisionMode] = useState<"identify" | "diagnose">("identify");
  const [showArenaModal, setShowArenaModal] = useState(false);
  const [showTabBar, setShowTabBar] = useState(true);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileInfo, setShowProfileInfo] = useState(false);

  // Calcola le iniziali per il bottone
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .filter(Boolean)
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : null;

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        setShowTabBar(false);
      } else {
        setShowTabBar(true);
      }
      lastScrollY = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Notifiche piante da annaffiare
  useEffect(() => {
    if (plants.length > 0 && weather) {
      const needWater = plants.filter((p) => shouldWater(p, weather));
      if (needWater.length > 0) {
        const names = needWater.map((p) => p.name).join(", ");
        toast.warning("Piante da annaffiare!", {
          description: `${names} ${needWater.length === 1 ? "ha" : "hanno"} bisogno d'acqua`,
        });
      }
    }
  }, [plants, weather]);

  const filteredPlants =
    categoryFilter === "all"
      ? plants
      : plants.filter((p) => p.category === categoryFilter);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-8 py-10">
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-3">
              <img src="icon/ggb.png" alt="Contadino" className="h-10 w-10 rounded-lg"/>
              <div>
                <h1 className="text-2xl font-bold">Garden Buddy</h1>
                <p className="text-sm text-muted-foreground">
                  {plants.length} {plants.length === 1 ? "pianta" : "piante"} nel tuo giardino
                </p>
              </div>
            </div>

            {/* Bottone profilo: iniziali se loggato, icona se guest.
                Clic: se loggato -> apre Info/Dialog con tab Profilo; se guest -> AuthModal */}
            <div className="flex items-center gap-3">
              {user && <NotificationBell />}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (user) setShowProfileInfo(true);
                  else setShowAuthModal(true);
                }}
                aria-label="Profilo"
                className="rounded-full relative"
                title={user ? "Profilo / Info" : "Accedi"}
              >
                {user && initials ? (
                  <span className="flex items-center justify-center bg-primary text-white font-semibold rounded-full h-8 w-8">
                    {initials}
                  </span>
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24">
        <div className="space-y-8">
          {/* Weather Widget */}
          <WeatherWidget
            weather={weather}
            loading={weatherLoading}
            onRefresh={refetch}
          />

          {/* Category Filter */}
          {plants.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("all")}
                className={categoryFilter === "all" ? "bg-gradient-primary" : ""}
              >
                Tutte ({plants.length})
              </Button>
              {["herbs","succulents","flowers","vegetables","indoor","aquatic","ornamental","other"].map(
                (cat) => {
                  const count = plants.filter((p) => p.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <Button
                      key={cat}
                      variant={categoryFilter === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategoryFilter(cat)}
                      className={categoryFilter === cat ? "bg-gradient-primary" : ""}
                    >
                      {cat === "herbs"
                        ? "Erbe"
                        : cat === "succulents"
                        ? "Succulente"
                        : cat === "flowers"
                        ? "Fiori"
                        : cat === "vegetables"
                        ? "Ortaggi"
                        : cat === "indoor"
                        ? "Da Interno"
                        : cat === "aquatic"
                        ? "Acquatiche"
                        : cat === "ornamental"
                        ? "Ornamentali"
                        : "Altro"}{" "}
                      ({count})
                    </Button>
                  );
                }
              )}
            </div>
          )}

          {/* Plants Grid */}
          {filteredPlants.length === 0 && plants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-muted rounded-full p-6 mb-4">
                <Leaf className="h-12 w-12 text-muted-foreground" />
              </div>
              {!user ? (
                <>
                  <h2 className="text-2xl font-bold mb-2">Benvenuto in Garden Buddy</h2>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Accedi al tuo profilo per iniziare a gestire il tuo giardino e prenderti cura delle tue piante!
                  </p>
                  <Button
                    onClick={() => setShowAuthModal(true)}
                    size="lg"
                    className="bg-gradient-primary shadow-soft"
                  >
                    <User className="mr-2 h-5 w-5" />
                    Accedi o Registrati
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-2">Nessuna pianta aggiunta</h2>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Inizia il tuo giardino aggiungendo la tua prima pianta. Ti aiuteremo a
                    prendertene cura!
                  </p>
                  <Button
                    onClick={() => setShowAddModal(true)}
                    size="lg"
                    className="bg-gradient-primary shadow-soft"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Aggiungi Prima Pianta
                  </Button>
                </>
              )}
            </div>
          ) : filteredPlants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                Nessuna pianta in questa categoria
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setCategoryFilter("all")}
              >
                Mostra tutte
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {categoryFilter === "all"
                  ? "Le Tue Piante"
                  : `${
                      categoryFilter === "herbs"
                        ? "Erbe Aromatiche"
                        : categoryFilter === "succulents"
                        ? "Succulente"
                        : categoryFilter === "flowers"
                        ? "Fiori"
                        : categoryFilter === "vegetables"
                        ? "Ortaggi"
                        : categoryFilter === "indoor"
                        ? "Da Interno"
                        : categoryFilter === "aquatic"
                        ? "Acquatiche"
                        : categoryFilter === "ornamental"
                        ? "Ornamentali"
                        : "Altro"
                    }`}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPlants.map((plant) => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    weather={weather}
                    onClick={() => setSelectedPlant(plant)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {selectedPlant && (
        <PlantDetail
          plant={selectedPlant}
          weather={weather}
          onUpdate={updatePlant}
          onDelete={removePlant}
          onClose={() => setSelectedPlant(null)}
          onOpenAIDiagnosis={() => {
            setPlantToDiagnose({ id: selectedPlant.id, name: selectedPlant.name });
            setShowVisionModal(true);
            setSelectedPlant(null);
          }}
        />
      )}

      {showAddModal && (
        <AddPlantModal onAdd={addPlant} onClose={() => setShowAddModal(false)} />
      )}
      {showArenaModal && (
        <ArenaModal 
          open={showArenaModal}
          onClose={() => setShowArenaModal(false)}
          plants={plants}
          updatePlant={updatePlant}
        />
      )}

      {showVisionModal && (
        <PlantVisionModal
          open={showVisionModal}
          mode={plantToDiagnose ? "diagnose" : "identify"}
          onClose={() => {
            setShowVisionModal(false);
            setPlantToDiagnose(undefined);
          }}
          onAddPlant={addPlant}
          plantToDiagnose={plantToDiagnose}
          onUpdatePlantHealth={(plantId, health) => updatePlant(plantId, { health })}
        />
      )}

      {/* Auth modal (solo se non loggato) */}
      {showAuthModal && (
        <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}

      {/* INFO DIALOG — ora con 3 tab: Profilo / Guida / Release */}
      <Dialog open={showProfileInfo} onOpenChange={(open) => setShowProfileInfo(open)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="flex items-center gap-2">
                {/* Avatar/iniziali solo se loggato */}
                {user && initials ? (
                  <span className="flex items-center justify-center bg-primary text-white font-semibold rounded-full h-7 w-7">
                    {initials}
                  </span>
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
                {user ? "Profilo & Info — Garden Buddy" : "Informazioni & Guida — Garden Buddy"}
              </DialogTitle>
              <div className="text-xs text-muted-foreground">v4.0</div>
            </div>
          </DialogHeader>

          {/* Stato interno per tab (default: se loggato -> 'profile', altrimenti 'guide') */}
          {(() => {
            const [activeTab, setActiveTab] = useState<"profile" | "guide" | "release">(
              user ? "profile" : "guide"
            );

            return (
              <>
                {/* Tab switch */}
                <div className="flex justify-around border-b mb-3">
                  <button
                    className={`flex-1 py-2 text-sm font-medium transition ${
                      activeTab === "profile"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab("profile")}
                  >
                    👤 Profilo
                  </button>
                  <button
                    className={`flex-1 py-2 text-sm font-medium transition ${
                      activeTab === "guide"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab("guide")}
                  >
                    📖 Guida
                  </button>
                  <button
                    className={`flex-1 py-2 text-sm font-medium transition ${
                      activeTab === "release"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab("release")}
                  >
                    📝 Release Notes
                  </button>
                </div>

                {/* Contenuto scrollabile */}
                <div className="space-y-4 py-2 overflow-y-auto pr-2 max-h-[60vh]">
                  {activeTab === "profile" ? (
                    <>
                      {user ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center bg-primary text-white font-semibold rounded-full h-10 w-10">
                              {initials}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold">{user.user_metadata?.full_name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>

                          {/* ID Utente condivisibile */}
                          <div className="p-3 rounded-lg border bg-card space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Il tuo ID</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(user.id);
                                  toast.success("ID copiato negli appunti!");
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <code className="text-xs bg-muted p-2 rounded block break-all">
                              {user.id}
                            </code>
                            <p className="text-xs text-muted-foreground">
                              Condividi questo ID con i tuoi amici per aggiungerti!
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-3 rounded-lg border bg-card">
                              <div className="text-muted-foreground">Piante</div>
                              <div className="text-xl font-bold">{plants.length}</div>
                            </div>
                            <div className="p-3 rounded-lg border bg-card">
                              <div className="text-muted-foreground">Categoria preferita</div>
                              <div className="text-base">
                                {
                                  (["herbs","succulents","flowers","vegetables","indoor"] as const)
                                    .map((c) => [c, plants.filter(p => p.category === c).length] as const)
                                    .sort((a,b) => b[1]-a[1])[0]?.[0] ?? "—"
                                }
                              </div>
                            </div>
                          </div>

                          {/* ✏️ Sezione modifica profilo */}
                          <EditProfileSection
                            currentName={user.user_metadata?.full_name || ""}
                            onUpdate={(newName) => {
                              if (user.user_metadata) {
                                user.user_metadata.full_name = newName;
                              }
                            }}
                          />

                          {/* 🔸 Pulsante logout */}
                          <Button
                            variant="destructive"
                            className="w-full mt-2"
                            onClick={() => {
                              setShowProfileInfo(false);
                              supabase.auth.signOut();
                              toast.success("Logout effettuato");
                            }}
                          >
                            🚪 Esci
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3 text-center">
                          <p className="text-sm text-muted-foreground">
                            Non hai ancora effettuato l'accesso.
                          </p>
                          <Button
                            className="bg-gradient-primary"
                            onClick={() => {
                              setShowProfileInfo(false);
                              setShowAuthModal(true);
                            }}
                          >
                            Accedi o Registrati
                          </Button>
                        </div>
                      )}
                    </>
                  ) : activeTab === "guide" ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Benvenuto <strong>Garden Buddy</strong>! 🌱  
                        Qui trovi una panoramica su come usare tutte le funzioni principali della tua app.
                      </p>

                      <section>
                        <h4 className="font-semibold">🌿 Aggiungere piante</h4>
                        <p className="text-sm text-muted-foreground">
                          Usa il pulsante <strong>Aggiungi</strong> nella barra in basso per inserire manualmente una pianta,  
                          oppure sfrutta <strong>AI Plant Doctor</strong> per identificarla da una foto.
                        </p>
                      </section>

                      <section>
                        <h4 className="font-semibold">🤖 AI Plant Doctor</h4>
                        <p className="text-sm text-muted-foreground">
                          Analizza le foto per riconoscere specie, preferenze ambientali e salute generale.  
                          Puoi scegliere tra <strong>Identify</strong> (aggiungi) e <strong>Diagnose</strong> (aggiorna salute).
                        </p>
                      </section>

                      <section>
                        <h4 className="font-semibold">💧 Annaffiature & Notifiche</h4>
                        <p className="text-sm text-muted-foreground">
                          Ogni pianta ha un campo <code>wateringDays</code> per sapere ogni quanto va annaffiata.  
                          Garden Buddy ti invia notifiche automatiche quando è il momento giusto!
                        </p>
                      </section>

                      <section>
                        <h4 className="font-semibold">👥 Buddies</h4>
                        <p className="text-sm text-muted-foreground">
                          Aggiungi amici condividendo il tuo <strong>ID utente</strong> (disponibile nel tuo profilo).  
                          Una volta aggiunti, puoi vedere le loro piante e sfidarli nell'Arena!
                        </p>
                      </section>

                      <section>
                        <h4 className="font-semibold">⚔️ Arena</h4>
                        <p className="text-sm text-muted-foreground">
                          Fai combattere le tue piante in sfide divertenti 🌻.  
                          Allenati contro il computer oppure sfida i tuoi <strong>Buddies</strong> per salire in classifica!
                        </p>
                        <ul className="text-sm text-muted-foreground list-disc list-inside mt-2">
                          <li>🥇 <strong>Oro</strong> — win rate ≥ 75%</li>
                          <li>🥈 <strong>Argento</strong> — 60–74%</li>
                          <li>🥉 <strong>Bronzo</strong> — 40–59%</li>
                          <li>🪵 <strong>Legno</strong> — 20–39%</li>
                          <li>🌱 <strong>Seme</strong> — &lt; 20% o nessuna battaglia</li>
                        </ul>
                      </section>

                      <section>
                        <h4 className="font-semibold">👤 Profilo Utente</h4>
                        <p className="text-sm text-muted-foreground">
                          Registrati per salvare le tue piante nel cloud e accedervi da qualsiasi dispositivo.
                          Potrai anche visualizzare le tue statistiche personali!
                        </p>
                      </section>
                    </>
                  ) : (
                    <>
                      <h4 className="font-semibold text-lg mb-2">🚀 Novità della versione 4.0</h4>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        <li>
                          👥 <strong>Sistema Buddies</strong> —  
                          aggiungi amici tramite ID utente e visualizza le loro piante!
                        </li>
                        <li>
                          ⚔️ <strong>Sfide tra amici</strong> —  
                          dalla sezione Buddies puoi sfidare i tuoi amici nell'Arena e vedere chi ha le piante più forti!
                        </li>
                        <li>
                          📊 <strong>Classifica online</strong> —  
                          le partite contro i tuoi Buddies contano per la classifica globale. Allenati vs computer e poi sfida i tuoi amici!
                        </li>
                        <li>
                          🏆 <strong>Storico battaglie</strong> —  
                          rivedi tutte le tue sfide passate e tieni traccia delle tue vittorie.
                        </li>
                        <li>
                          🎮 <strong>Arena rinnovata</strong> —  
                          gioca contro il computer per allenarti, poi scala la classifica sfidando utenti reali!
                        </li>
                      </ul>

                      <p className="text-sm text-muted-foreground mt-4">
                        🌍 <strong>Prossimi passi:</strong>  
                        continueremo a migliorare l'esperienza multiplayer con nuove modalità di sfida e premi stagionali! 🎁
                      </p>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Bottom Tab Bar (solo mobile) */}
      <nav
        className={`fixed bottom-0 left-0 right-0 border-t bg-card/80 backdrop-blur-md flex justify-around items-center py-3 sm:hidden transition-transform duration-300 z-30 ${
          showTabBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Aggiungi manualmente */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex flex-col items-center text-sm text-muted-foreground hover:text-foreground transition"
        >
          <Plus className="h-5 w-5 mb-1" />
          <span>Aggiungi</span>
        </button>

        {/* Aggiungi/Diagnostica con AI */}
        <button
          onClick={() => {
            setVisionMode("identify");
            setPlantToDiagnose(undefined);
            setShowVisionModal(true);
          }}
          className="flex flex-col items-center text-sm text-muted-foreground hover:text-foreground transition"
        >
          <Sparkles className="h-5 w-5 mb-1" />
          <span>AI Plant Doctor</span>
        </button>

        {/* Buddies */}
        <button
          onClick={() => {
            if (!user) {
              toast.info("Effettua l'accesso per vedere i tuoi Buddies");
              setShowAuthModal(true);
              return;
            }
            window.location.href = "/friends";
          }}
          className="flex flex-col items-center text-sm text-muted-foreground hover:text-foreground transition"
        >
          <Users className="h-5 w-5 mb-1" />
          <span>Buddies</span>
        </button>

        {/* Arena */}
        <button
          onClick={() => setShowArenaModal(true)}
          className="flex flex-col items-center text-sm text-muted-foreground hover:text-foreground transition"
        >
          ⚔️
          <span>Arena</span>
        </button>
      </nav>
    </div>
  );
};

export default Index;
