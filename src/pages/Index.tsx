import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WeatherWidget } from "@/components/WeatherWidget";
import { PlantCard } from "@/components/PlantCard";
import { PlantDetail } from "@/components/PlantDetail";
import { AddPlantModal } from "@/components/AddPlantModal";
import { useWeather } from "@/hooks/useWeather";
import { usePlants } from "@/hooks/usePlants";
import { Plant } from "@/types/plant";
import { Plus, Leaf } from "lucide-react";
import { toast } from "sonner";
import { shouldWater } from "@/lib/plantLogic";

const Index = () => {
  const { weather, loading: weatherLoading, refetch } = useWeather();
  const { plants, addPlant, updatePlant, removePlant } = usePlants(weather);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Check for plants that need water and show notifications
  useEffect(() => {
    if (plants.length > 0) {
      const needWater = plants.filter(shouldWater);
      if (needWater.length > 0) {
        const names = needWater.map((p) => p.name).join(", ");
        toast.warning("Piante da annaffiare!", {
          description: `${names} ${needWater.length === 1 ? "ha" : "hanno"} bisogno d'acqua`,
        });
      }
    }
  }, [plants]);

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
                <h1 className="text-2xl font-bold">Il Mio Giardino</h1>
                <p className="text-sm text-muted-foreground">
                  {plants.length} {plants.length === 1 ? "pianta" : "piante"} nel tuo giardino
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-primary shadow-soft"
            >
              <Plus className="mr-2 h-5 w-5" />
              Aggiungi Pianta
            </Button>
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

          {/* Plants Grid */}
          {plants.length === 0 ? (
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
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">Le Tue Piante</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {plants.map((plant) => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
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
          onUpdate={updatePlant}
          onDelete={removePlant}
          onClose={() => setSelectedPlant(null)}
        />
      )}

      {showAddModal && (
        <AddPlantModal onAdd={addPlant} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};

export default Index;
