import { useState } from "react";
import { Plant, PLANT_TEMPLATES } from "@/types/plant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

interface AddPlantModalProps {
  onAdd: (plant: Plant) => void;
  onClose: () => void;
}

export function AddPlantModal({ onAdd, onClose }: AddPlantModalProps) {
  const handleSelect = (template: typeof PLANT_TEMPLATES[0]) => {
    const newPlant: Plant = {
      ...template,
      id: `plant-${Date.now()}`,
      lastWatered: new Date().toISOString(),
      health: 100,
    };

    onAdd(newPlant);
    toast.success(`${template.name} aggiunta al giardino! 🌱`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold">Scegli una Pianta</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANT_TEMPLATES.map((template, index) => (
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
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  <span className="text-2xl">{template.icon}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>💧 Ogni {template.wateringDays} giorni</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  📍 {template.position}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
