import { Plant } from "@/types/plant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getWaterLevel,
  getHealthColor,
  getHealthBgColor,
  waterPlant,
} from "@/lib/plantLogic";
import { Droplets, Heart, MapPin, Calendar, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface PlantDetailProps {
  plant: Plant;
  onUpdate: (plantId: string, updates: Partial<Plant>) => void;
  onDelete: (plantId: string) => void;
  onClose: () => void;
}

export function PlantDetail({
  plant,
  onUpdate,
  onDelete,
  onClose,
}: PlantDetailProps) {
  const waterLevel = getWaterLevel(plant);
  const daysSinceWatered = Math.floor(
    (Date.now() - new Date(plant.lastWatered).getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleWater = () => {
    const result = waterPlant(plant);
    onUpdate(plant.id, result.plant);
    
    if (result.message.includes("⚠️")) {
      toast.warning(result.message);
    } else {
      toast.success(result.message);
    }
  };

  const handleDelete = () => {
    if (confirm(`Sei sicuro di voler rimuovere ${plant.name}?`)) {
      onDelete(plant.id);
      onClose();
      toast.success(`${plant.name} rimossa dal giardino`);
    }
  };

  const chartData = [
    { name: "Acqua disponibile", value: waterLevel * 100 },
    { name: "Acqua mancante", value: (1 - waterLevel) * 100 },
  ];

  const COLORS = ["hsl(var(--accent))", "hsl(var(--muted))"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="text-6xl">{plant.icon}</div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold">{plant.name}</h2>
              <p className="text-muted-foreground mt-1">{plant.description}</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{plant.position}</span>
              </div>
            </div>
          </div>

          {/* Image */}
          {plant.imageUrl && (
            <div className="relative aspect-video overflow-hidden rounded-lg">
              <img
                src={plant.imageUrl}
                alt={plant.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Health Status */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Heart className={`h-5 w-5 ${getHealthColor(plant.health)}`} />
                  <span className="font-semibold">Salute</span>
                </div>
                <span className={`text-2xl font-bold ${getHealthColor(plant.health)}`}>
                  {plant.health}%
                </span>
              </div>
              <Progress value={plant.health} className="h-3" />
              {plant.health < 40 && (
                <p className="text-sm text-destructive mt-2">
                  ⚠️ La pianta sta soffrendo! Controlla acqua e condizioni.
                </p>
              )}
            </div>

            {/* Water Level Chart */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-accent" />
                  <span className="font-semibold">Livello Acqua</span>
                </div>
                <span className="text-2xl font-bold text-accent">
                  {Math.round(waterLevel * 100)}%
                </span>
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="flex items-center justify-between text-sm mt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Ultima annaffiatura
                  </span>
                </div>
                <span className="font-medium">
                  {daysSinceWatered === 0
                    ? "Oggi"
                    : `${daysSinceWatered} ${daysSinceWatered === 1 ? "giorno" : "giorni"} fa`}
                </span>
              </div>
            </div>
          </div>

          {/* Watering Schedule */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <Droplets className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Programmazione Irrigazione</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Annaffiare ogni {plant.wateringDays}{" "}
                  {plant.wateringDays === 1 ? "giorno" : "giorni"}
                </p>
                {waterLevel < 0.3 && (
                  <Badge variant="destructive" className="mt-2">
                    Serve acqua ora!
                  </Badge>
                )}
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleWater}
              className="flex-1 bg-gradient-primary"
              size="lg"
            >
              <Droplets className="mr-2 h-5 w-5" />
              Annaffia Ora
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleDelete}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
