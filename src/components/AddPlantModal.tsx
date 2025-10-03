import { useState } from "react";
import { Plant, PLANT_TEMPLATES } from "@/types/plant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";
import { toast } from "sonner";

interface AddPlantModalProps {
  onAdd: (plant: Plant) => void;
  onClose: () => void;
}

export function AddPlantModal({ onAdd, onClose }: AddPlantModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = {
    all: "Tutte",
    herbs: "Erbe Aromatiche",
    succulents: "Succulente",
    flowers: "Fiori",
    vegetables: "Ortaggi",
    indoor: "Da Interno",
  };

  const filteredPlants =
    selectedCategory === "all"
      ? PLANT_TEMPLATES
      : PLANT_TEMPLATES.filter((p) => p.category === selectedCategory);

  const handleSelect = (template: typeof PLANT_TEMPLATES[0]) => {
    const newPlant: Plant = {
      ...template,
      id: `plant-${Date.now()}`,
      lastWatered: new Date().toISOString(),
      health: 100,
      wateringHistory: [],
      createdAt: new Date().toISOString(),
      totalWaterings: 0,
    };

    onAdd(newPlant);
    toast.success(`${template.name} aggiunta al giardino! 🌱`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="relative max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold">Scegli una Pianta</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {/* Category Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {Object.entries(categories).map(([key, label]) => (
                <Button
                  key={key}
                  variant={selectedCategory === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className={
                    selectedCategory === key ? "bg-gradient-primary" : ""
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {filteredPlants.length}{" "}
              {filteredPlants.length === 1 ? "pianta" : "piante"} disponibili
            </p>
          </div>

          {/* Plants Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPlants.map((template, index) => (
              <Card
                key={index}
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-glow hover:-translate-y-1"
                onClick={() => handleSelect(template)}
              >
              <div className="relative aspect-square overflow-hidden bg-muted">
                {template.imageUrl ? (
                  <img
                    src={template.imageUrl}
                    alt={template.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl">
                    {template.icon}
                  </div>
                )}
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{template.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <span className="text-2xl">{template.icon}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-1 text-xs">
                  <Badge variant="outline" className="text-xs">
                    💧 {template.wateringDays}d
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {template.preferences.sunlight === "full"
                      ? "☀️ Sole"
                      : template.preferences.sunlight === "partial"
                      ? "⛅ Parziale"
                      : "🌑 Ombra"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    🌡️ {template.preferences.minTemp}-{template.preferences.maxTemp}°C
                  </Badge>
                </div>
              </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
