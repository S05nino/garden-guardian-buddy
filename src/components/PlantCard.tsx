import { Plant } from "@/types/plant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWaterLevel, getHealthColor, shouldWater } from "@/lib/plantLogic";
import { Droplets, Heart } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface PlantCardProps {
  plant: Plant;
  onClick: () => void;
}

export function PlantCard({ plant, onClick }: PlantCardProps) {
  const waterLevel = getWaterLevel(plant);
  const needsWater = shouldWater(plant);

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all hover:shadow-glow hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {plant.imageUrl ? (
          <img
            src={plant.imageUrl}
            alt={plant.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">
            {plant.icon}
          </div>
        )}
        {needsWater && (
          <Badge
            variant="destructive"
            className="absolute right-2 top-2 animate-pulse"
          >
            <Droplets className="mr-1 h-3 w-3" />
            Acqua!
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{plant.name}</h3>
            <p className="text-sm text-muted-foreground">{plant.position}</p>
          </div>
          <div className="text-2xl">{plant.icon}</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Heart className={`h-4 w-4 ${getHealthColor(plant.health)}`} />
              <span className="text-muted-foreground">Salute</span>
            </div>
            <span className={`font-semibold ${getHealthColor(plant.health)}`}>
              {plant.health}%
            </span>
          </div>
          <Progress value={plant.health} className="h-2" />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Droplets className="h-4 w-4 text-accent" />
              <span className="text-muted-foreground">Acqua</span>
            </div>
            <span className="font-semibold text-accent">
              {Math.round(waterLevel * 100)}%
            </span>
          </div>
          <Progress value={waterLevel * 100} className="h-2 [&>div]:bg-accent" />
        </div>
      </div>
    </Card>
  );
}
