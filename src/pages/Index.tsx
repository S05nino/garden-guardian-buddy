import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { WeatherWidget } from "@/components/WeatherWidget";
import { PlantCard } from "@/components/PlantCard";
import { PlantDetail } from "@/components/PlantDetail";
import { AddPlantModal } from "@/components/AddPlantModal";
import { ArenaModal } from "@/components/ArenaModal";
import { PlantVisionModal } from "@/components/PlantVisionModal";
import { useWeather } from "@/hooks/useWeather";
import { usePlants } from "@/hooks/usePlants";
import { Plant } from "@/types/plant";
import { Plus, Leaf, Sparkles, User, Info } from "lucide-react";
import { toast } from "sonner";
import { shouldWater } from "@/lib/plantLogic";
import { ca } from "date-fns/locale";

const Index = () => {
  const { weather, loading: weatherLoading, refetch } = useWeather();
  const { plants, addPlant, updatePlant, removePlant } = usePlants(weather);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [plantToDiagnose, setPlantToDiagnose] = useState<{ id: string; name: string } | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visionMode, setVisionMode] = useState<"identify" | "diagnose">("identify");
  const [showArenaModal, setShowArenaModal] = useState(false);
  const [showTabBar, setShowTabBar] = useState(true);
  const [showProfileInfo, setShowProfileInfo] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (window.scrollY > lastScrollY && window.scrollY > 100) {
        // Scorrendo verso il basso
        setShowTabBar(false);
      } else {
        // Scorrendo verso l'alto
        setShowTabBar(true);
      }
      lastScrollY = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check for plants that need water and show notifications
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

            {/* --- Bottone profilo / info in alto a destra --- */}
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowProfileInfo(true)}
                aria-label="Informazioni sull'app"
                className="rounded-full"
                title="Informazioni App"
              >
                <User className="h-5 w-5" />
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
              {["herbs", "succulents", "flowers", "vegetables", "indoor", 
              "aquatic", "ornamental", "other"].map(
                (cat) => {
                  const count = plants.filter((p) => p.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <Button
                      key={cat}
                      variant={categoryFilter === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategoryFilter(cat)}
                      className={
                        categoryFilter === cat ? "bg-gradient-primary" : ""
                      }
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

      {/* Nuovo: Dialog Informazioni / Profilo con Release Notes */}
      <Dialog open={showProfileInfo} onOpenChange={(open) => setShowProfileInfo(open)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informazioni & Guida — Garden Buddy
              </DialogTitle>
              <div className="text-xs text-muted-foreground">v3.1</div>
            </div>
          </DialogHeader>

          {/* Stato per gestire la scheda attiva */}
          {(() => {
            const [activeTab, setActiveTab] = useState<"guide" | "release">("guide");

            return (
              <>
                {/* Tab switch */}
                <div className="flex justify-around border-b mb-3">
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

                {/* Contenuto scorrevole */}
                <div className="space-y-4 py-2 overflow-y-auto pr-2 max-h-[60vh]">
                  {activeTab === "guide" ? (
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
                        <h4 className="font-semibold">⚔️ Arena</h4>
                        <p className="text-sm text-muted-foreground">
                          Fai combattere le tue piante in sfide divertenti 🌻.  
                          Il loro <em>Rank</em> dipende dal tasso di vittorie:  
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
                        <h4 className="font-semibold">ℹ️ Nota tecnica</h4>
                        <p className="text-sm text-muted-foreground">
                          Al momento non c’è ancora un profilo utente persistente:  
                          questo tasto funge da guida e info center.  
                          In futuro potrai visualizzare qui le tue statistiche globali 🌍.
                        </p>
                      </section>
                    </>
                  ) : (
                    <>
                      <h4 className="font-semibold text-lg mb-2">🚀 Novità della versione 3.0</h4>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        <li>
                          🌱 <strong>Nuova barra inferiore</strong> —  
                          i pulsanti per aggiungere piante e accedere all’AI sono ora nella <em>tab bar</em> per una navigazione più semplice.
                        </li>
                        <li>
                          🤖 <strong>AI migliorata</strong> —  
                          ora rileva solo vere piante e aggiunge automaticamente al giardino solo ciò che riconosce.  
                          Abbiamo anche ampliato le <em>categorie</em> disponibili!
                        </li>
                        <li>
                          🧹 <strong>Bug fix</strong> —  
                          risolti diversi errori segnalati nelle varie schermate e funzionalità dell’app.
                        </li>
                        <li>
                          ⚔️ <strong>Nuova Arena</strong> —  
                          più interattiva e con nuovi sistemi di ranking 🌟, oltre a più piante da sfidare!
                        </li>
                        <li>
                          ℹ️ <strong>Info Button</strong> —  
                          ora puoi accedere direttamente a questa guida e alle note di rilascio tramite l’icona in alto a destra.
                        </li>
                      </ul>

                      <p className="text-sm text-muted-foreground mt-4">
                        🌍 <strong>Prossimi passi:</strong>  
                        stiamo lavorando per rendere possibile l’interazione tra utenti —  
                        presto potrai condividere i tuoi progressi e confrontare il tuo giardino con quello dei tuoi amici! 💬
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
        className={`fixed bottom-0 left-0 right-0 border-t bg-card/80 backdrop-blur-md flex justify-around items-center py-3 sm:hidden transition-transform duration-300 ${
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
