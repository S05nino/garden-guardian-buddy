import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WeatherWidget } from "@/components/WeatherWidget";
import { PlantCard } from "@/components/PlantCard";
import { PlantDetail } from "@/components/PlantDetail";
import { AddPlantModal } from "@/components/AddPlantModal";
import { PlantVisionModal } from "@/components/PlantVisionModal";
import { useWeather } from "@/hooks/useWeather";
import { usePlants } from "@/hooks/usePlants";
import { Plant } from "@/types/plant";
import { Plus, Leaf, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { shouldWater } from "@/lib/plantLogic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { weather, loading: weatherLoading, refetch } = useWeather();
  const { plants, addPlant, updatePlant, removePlant } = usePlants(weather);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [plantToDiagnose, setPlantToDiagnose] = useState<{ id: string; name: string } | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [visionMode, setVisionMode] = useState<"identify" | "diagnose">("identify");

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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Leaf className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Garden Guardian Buddy</h1>
                <p className="text-sm text-muted-foreground">
                  {plants.length} {plants.length === 1 ? "pianta" : "piante"} nel tuo giardino
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setVisionMode("identify");
                  setPlantToDiagnose(undefined);
                  setShowVisionModal(true);
                }}
                size="sm"
                className="bg-gradient-primary shadow-soft"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Identifica con AI
              </Button>
              <Button
                onClick={() => setShowAddModal(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="mr-2 h-5 w-5" />
                Aggiungi
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
              {["herbs", "succulents", "flowers", "vegetables", "indoor"].map(
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
                        : "Interno"}{" "}
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
                        : "Piante da Interno"
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
            setVisionMode("diagnose");
            setShowVisionModal(true);
            setSelectedPlant(null);
          }}
        />
      )}

      {showAddModal && (
        <AddPlantModal onAdd={addPlant} onClose={() => setShowAddModal(false)} />
      )}

      <PlantVisionModal
        open={showVisionModal}
        onClose={() => {
          setShowVisionModal(false);
          setPlantToDiagnose(undefined);
          setVisionMode("identify");
        }}
        mode={visionMode}
        onAddPlant={addPlant}
        plantToDiagnose={plantToDiagnose}
        onUpdatePlantHealth={(plantId, health) => {
          updatePlant(plantId, { health });
        }}
      />
    </div>
  );
};

export default Index;