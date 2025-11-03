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
import { scheduleWateringReminder } from "@/lib/notifications";
import { Droplets, Heart, MapPin, Calendar, Trash2, X, BarChart3, Bell, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, useEffect } from "react";
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
import { PlantWithOwner } from "@/hooks/usePlants";

interface PlantDetailProps {
  plant: PlantWithOwner;
  weather: Weather | null;
  onUpdate: (plantId: string, updates: Partial<Plant>) => void;
  onDelete: (plantId: string) => void;
  onClose: () => void;
  onOpenAIDiagnosis?: () => void;
}

export function PlantDetail({
  plant,
  weather,
  onUpdate,
  onDelete,
  onClose,
  onOpenAIDiagnosis,
}: PlantDetailProps) {
  // Stato locale per aggiornamenti immediati
  const [localPlant, setLocalPlant] = useState<PlantWithOwner>(plant);

  // Sincronizza lo stato locale quando la prop plant cambia
  useEffect(() => {
    setLocalPlant(plant);
  }, [plant]);

  // Ricalcola i valori quando localPlant o weather cambiano
  const waterLevel = useMemo(() => getWaterLevel(localPlant), [localPlant]);
const daysSinceWatered = useMemo(() => {
  if (!localPlant.lastWatered) return null; // nessuna annaffiatura mai registrata
  const lastWateredDate = new Date(localPlant.lastWatered).getTime();
  const now = Date.now();
  if (isNaN(lastWateredDate) || lastWateredDate > now) return null; // data non valida
  const diffDays = Math.floor((now - lastWateredDate) / (1000 * 60 * 60 * 24));
  return diffDays;
}, [localPlant.lastWatered]);

  const adjustedDays = useMemo(
    () => (weather ? calculateAdjustedWateringDays(localPlant, weather) : localPlant.wateringDays),
    [localPlant, weather]
  );

  const handleWater = async () => {
    const result = waterPlant(localPlant, weather);
    setLocalPlant(result.plant); // Aggiorna immediatamente lo stato locale
    onUpdate(localPlant.id, result.plant); // Aggiorna anche il parent
    
    // Riprogramma la notifica se i promemoria sono abilitati
    if (result.plant.remindersEnabled) {
      const newWaterLevel = getWaterLevel(result.plant);
      const adjustedDaysValue = weather ? calculateAdjustedWateringDays(result.plant, weather) : result.plant.wateringDays;
      const hoursRemaining = newWaterLevel * adjustedDaysValue * 24;
      
      try {
        await scheduleWateringReminder(result.plant.name, hoursRemaining > 0 ? hoursRemaining : 0);
      } catch (error) {
        console.error("Error rescheduling reminder:", error);
      }
    }
    
    if (result.message.includes("⚠️")) {
      toast.warning(result.message);
    } else {
      toast.success(result.message);
    }
  };

  const handleLocalUpdate = (plantId: string, updates: Partial<Plant>) => {
    setLocalPlant(prev => ({ ...prev, ...updates })); // Aggiorna immediatamente lo stato locale
    onUpdate(plantId, updates); // Aggiorna anche il parent
  };

  const handleDelete = () => {
    if (confirm(`Sei sicuro di voler rimuovere ${localPlant.name}?`)) {
      onDelete(localPlant.id);
      onClose();
      toast.success(`${localPlant.name} rimossa dal giardino`);
    }
  };

  const chartData = [
    { name: "Acqua disponibile", value: waterLevel * 100 },
    { name: "Acqua mancante", value: (1 - waterLevel) * 100 },
  ];

  const COLORS = ["hsl(var(--accent))", "hsl(var(--muted))"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className={`relative max-w-4xl w-full max-h-[90vh] overflow-y-auto ${
        localPlant.isShared || localPlant.isSharedByMe ? "border-shared bg-shared/30" : ""
      }`}>
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
              <div className="text-6xl">{localPlant.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-3xl font-bold">{localPlant.name}</h2>
                  <Badge variant="secondary">{localPlant.category}</Badge>
                  {localPlant.isShared && (
                    <Badge className="bg-shared text-shared-foreground">
                      <Users className="mr-1 h-3 w-3" />
                      {localPlant.ownerName}
                    </Badge>
                  )}
                  {localPlant.isSharedByMe && !localPlant.isShared && (
                    <Badge className="bg-shared text-shared-foreground">
                      <Users className="mr-1 h-3 w-3" />
                      Condiviso
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">{localPlant.description}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{localPlant.position}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Image */}
          {localPlant.imageUrl && (
            <div className="relative aspect-video overflow-hidden rounded-lg">
              <img
                src={localPlant.imageUrl}
                alt={localPlant.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Health Status */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Heart className={`h-5 w-5 ${getHealthColor(localPlant.health)}`} />
                  <span className="font-semibold">Salute</span>
                </div>
                <span className={`text-2xl font-bold ${getHealthColor(localPlant.health)}`}>
                  {localPlant.health}%
                </span>
              </div>
              <Progress value={localPlant.health} className="h-3" />
              {localPlant.health < 40 && (
                <div className="bg-destructive/10 rounded-lg p-3 mt-2">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ La pianta sta soffrendo! Controlla acqua e condizioni.
                  </p>
                </div>
              )}
            </div>

            {/* AI Diagnosis Button - Always visible */}
            {onOpenAIDiagnosis && (
              <Button
                variant="outline"
                onClick={onOpenAIDiagnosis}
                className="w-full gap-2 border-primary/20 hover:border-primary"
              >
                <Sparkles className="h-4 w-4" />
                Diagnostica con AI
              </Button>
            )}

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
                  {daysSinceWatered == null
                    ? "Non ancora annaffiata"
                    : daysSinceWatered === 0
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
                      Base: ogni {localPlant.wateringDays}{" "}
                      {localPlant.wateringDays === 1 ? "giorno" : "giorni"}
                    </p>
                    {weather && adjustedDays !== localPlant.wateringDays && (
                      <p className="text-sm font-medium text-primary mt-1">
                        Adattato al meteo: ogni {adjustedDays}{" "}
                        {adjustedDays === 1 ? "giorno" : "giorni"}
                      </p>
                    )}
                    {waterLevel <= 0.10 && (
                      <Badge variant="destructive" className="mt-2">
                        Serve acqua ora!
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>

              {/* Plant Preferences */}
              {localPlant.preferences ? (
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Condizioni Ideali</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Temperatura</p>
                      <p className="font-medium">
                        {localPlant.preferences.minTemp}°C - {localPlant.preferences.maxTemp}°C
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Umidità</p>
                      <p className="font-medium">
                        {localPlant.preferences.minHumidity}% - {localPlant.preferences.maxHumidity}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Esposizione</p>
                      <p className="font-medium capitalize">
                        {localPlant.preferences.sunlight === "full"
                          ? "Sole pieno"
                          : localPlant.preferences.sunlight === "partial"
                          ? "Sole parziale"
                          : "Ombra"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Categoria</p>
                      <p className="font-medium capitalize">{localPlant.category}</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-4">
                  <h3 className="font-semibold text-sm mb-3">Informazioni Pianta</h3>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Categoria</p>
                    <p className="font-medium capitalize">{localPlant.category}</p>
                  </div>
                </Card>
              )}

              {/* Actions */}
              {localPlant.isShared ? (
                <Card className="p-4 bg-shared/20 border-shared">
                  <div className="flex items-center gap-3 text-shared-foreground">
                    <Users className="h-5 w-5" />
                    <div>
                      <p className="font-semibold text-sm">Pianta condivisa</p>
                      <p className="text-sm opacity-80">
                        Questa pianta è condivisa da {localPlant.ownerName}. Non puoi modificarla.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
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
              )}
            </TabsContent>

            <TabsContent value="stats" className="mt-6">
              <PlantStats plant={localPlant} />
            </TabsContent>

            <TabsContent value="reminders" className="mt-6">
              {localPlant.isShared ? (
                <Card className="p-6 bg-shared/20 border-shared text-center">
                  <Users className="h-12 w-12 mx-auto mb-3 text-shared-foreground" />
                  <p className="text-shared-foreground font-semibold">
                    Promemoria non disponibili per piante condivise
                  </p>
                  <p className="text-sm text-shared-foreground/70 mt-2">
                    Solo {localPlant.ownerName} può gestire i promemoria per questa pianta
                  </p>
                </Card>
              ) : (
                <ReminderSettings plant={localPlant} weather={weather} onUpdate={handleLocalUpdate} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}