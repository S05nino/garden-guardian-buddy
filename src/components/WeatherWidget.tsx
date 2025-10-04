import { Weather } from "@/types/plant";
import { Card } from "@/components/ui/card";
import { Cloud, Droplets, MapPin, RefreshCw, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeatherWidgetProps {
  weather: Weather | null;
  loading: boolean;
  onRefresh: () => void;
}

export function WeatherWidget({ weather, loading, onRefresh }: WeatherWidgetProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!weather) return null;

  const hasRain = weather.precipitation > 0;

  return (
    <Card className="relative overflow-hidden bg-gradient-sky">
      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-card-foreground/80">
              <MapPin className="h-4 w-4" />
              <span>{weather.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-5xl">{weather.icon}</div>
              <div>
                <div className="text-3xl font-bold text-card-foreground">
                  {Math.round(weather.temp)}°C
                </div>
                <div className="text-sm text-card-foreground/80">
                  {weather.condition}
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="text-card-foreground/80 hover:text-card-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-card/50 p-3 backdrop-blur-sm">
            <Droplets className="h-5 w-5 text-accent" />
            <div>
              <div className="text-xs text-card-foreground/70">Umidità</div>
              <div className="font-semibold text-card-foreground">
                {weather.humidity}%
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-card/50 p-3 backdrop-blur-sm">
            <Cloud className="h-5 w-5 text-accent" />
            <div>
              <div className="text-xs text-card-foreground/70">Pioggia</div>
              <div className="font-semibold text-card-foreground">
                {weather.precipitation} mm
              </div>
            </div>
          </div>
        </div>

        {hasRain && (
          <div className="mt-4 rounded-lg bg-accent/10 p-3 text-sm text-accent">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              <span className="font-medium">
                Pioggia rilevata! Le tue piante si stanno annaffiando naturalmente 🌧️
              </span>
            </div>
          </div>
        )}

        {weather.temp > 30 && (
          <div className="mt-4 rounded-lg bg-warning/10 p-3 text-sm text-warning">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              <span className="font-medium">
                Temperatura alta! Le piante potrebbero aver bisogno di più acqua 🌡️
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
