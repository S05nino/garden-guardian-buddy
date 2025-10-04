import { Plant, Weather } from "@/types/plant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getWaterLevel,
  getHealthColor,
  getHealthBgColor,
  waterPlant,
  calculateAdjustedWateringDays,
} from "@/lib/plantLogic";
import { Droplets, Heart, MapPin, Calendar, Trash2, X, BarChart3, Bell } from "lucide-react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { PlantStats } from "./PlantStats";
import { ReminderSettings } from "./ReminderSettings";

interface PlantDetailProps {
  plant: Plant;
  weather: Weather | null;
  onUpdate: (plantId: string, updates: Partial<Plant>) => void;
  onDelete: (plantId: string) => void;
  onClose: () => void;
}

export function PlantDetail({
  plant,
  weather,
  onUpdate,
  onDelete,
  onClose,
}: PlantDetailProps) {
  const waterLevel = getWaterLevel(plant);
  const daysSinceWatered = Math.floor(
    (Date.now() - new Date(plant.lastWatered).getTime()) / (1000 * 60 * 60 * 24)
  );
  const adjustedDays = weather
    ? calculateAdjustedWateringDays(plant, weather)
    : plant.wateringDays;

  const handleWater = () => {
    const result = waterPlant(plant, weather);
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
      <Card className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="p-6 space-y-6">
          <div className="pr-8">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="text-6xl">{plant.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-3xl font-bold">{plant.name}</h2>
                  <Badge variant="secondary">{plant.category}</Badge>
                </div>
                <p className="text-muted-foreground mt-1">{plant.description}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{plant.position}</span>
                </div>
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

          {/* Tabs for different sections */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">
                <Heart className="mr-2 h-4 w-4" />
                Panoramica
              </TabsTrigger>
              <TabsTrigger value="stats">
                <BarChart3 className="mr-2 h-4 w-4" />
                Statistiche
              </TabsTrigger>
              <TabsTrigger value="reminders">
                <Bell className="mr-2 h-4 w-4" />
                Promemoria
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-6">
              {/* Watering Schedule */}
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-start gap-3">
                  <Droplets className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Programmazione Irrigazione</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Base: ogni {plant.wateringDays}{" "}
                      {plant.wateringDays === 1 ? "giorno" : "giorni"}
                    </p>
                    {weather && adjustedDays !== plant.wateringDays && (
                      <p className="text-sm font-medium text-primary mt-1">
                        Adattato al meteo: ogni {adjustedDays}{" "}
                        {adjustedDays === 1 ? "giorno" : "giorni"}
                      </p>
                    )}
                    {waterLevel < 0.3 && (
                      <Badge variant="destructive" className="mt-2">
                        Serve acqua ora!
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>

              {/* Plant Preferences */}
              {plant.preferences ? (
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Condizioni Ideali</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Temperatura</p>
                      <p className="font-medium">
                        {plant.preferences.minTemp}°C - {plant.preferences.maxTemp}°C
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Umidità</p>
                      <p className="font-medium">
                        {plant.preferences.minHumidity}% - {plant.preferences.maxHumidity}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Esposizione</p>
                      <p className="font-medium capitalize">
                        {plant.preferences.sunlight === "full"
                          ? "Sole pieno"
                          : plant.preferences.sunlight === "partial"
                          ? "Sole parziale"
                          : "Ombra"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Categoria</p>
                      <p className="font-medium capitalize">{plant.category}</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Informazioni Pianta</h3>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Categoria</p>
                    <p className="font-medium capitalize">{plant.category}</p>
                  </div>
                </Card>
              )}

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
                <Button variant="destructive" size="lg" onClick={handleDelete}>
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-6">
              <PlantStats plant={plant} />
            </TabsContent>

            <TabsContent value="reminders" className="mt-6">
              <ReminderSettings plant={plant} weather={weather} />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
