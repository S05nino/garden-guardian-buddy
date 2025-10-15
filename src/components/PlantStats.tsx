import { Plant } from "@/types/plant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getDaysAlive, getAverageHealth } from "@/lib/plantLogic";
import {
  Calendar,
  Droplets,
  Heart,
  SkullIcon,
  TrendingUp,
  Trophy,
  Medal,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PlantStatsProps {
  plant: Plant;
}

export function PlantStats({ plant }: PlantStatsProps) {
  const daysAlive = getDaysAlive(plant);
  const avgHealth = getAverageHealth(plant);

  // Dati per i grafici
  const historyData = plant.wateringHistory
    ? plant.wateringHistory.slice(-15).map((h) => ({
        date: format(new Date(h.date), "dd/MM", { locale: it }),
        acqua: Math.round(h.waterLevel * 100),
        temp: h.weatherTemp,
      }))
    : [];

  // Calcolo battaglie
  const totalBattles = (plant.victories || 0) + (plant.defeats || 0);
  const winRate =
    totalBattles > 0 ? Math.round((plant.victories / totalBattles) * 100) : 0;

  // 🔹 Sistema Rank a 5 livelli
  let rank = "Seme";
  let rankColor = "text-muted-foreground";

  if (winRate >= 75) {
    rank = "Oro";
    rankColor = "text-yellow-500";
  } else if (winRate >= 60) {
    rank = "Argento";
    rankColor = "text-gray-400";
  } else if (winRate >= 40) {
    rank = "Bronzo";
    rankColor = "text-amber-700";
  } else if (winRate >= 20) {
    rank = "Legno";
    rankColor = "text-orange-600";
  }

  // 🔹 Statistiche principali
  const stats = [
    {
      icon: Calendar,
      label: "Giorni di vita",
      value: daysAlive,
      unit: "giorni",
      color: "text-primary",
    },
    {
      icon: Droplets,
      label: "Annaffiature totali",
      value: plant.totalWaterings || 0,
      unit: "volte",
      color: "text-accent",
    },
    {
      icon: Heart,
      label: "Salute media",
      value: avgHealth,
      unit: "%",
      color: "text-warning",
    },
    {
      icon: TrendingUp,
      label: "Tendenza",
      value: plant.health >= avgHealth ? "↑" : "↓",
      unit: plant.health >= avgHealth ? "Miglioramento" : "Attenzione",
      color: plant.health >= avgHealth ? "text-primary" : "text-destructive",
    },
    {
      icon: Trophy,
      label: "Vittorie in arena",
      value: plant.victories || 0,
      unit: "vittorie",
      color: "text-green-600",
    },
    {
      icon: SkullIcon,
      label: "Sconfitte in arena",
      value: plant.defeats || 0,
      unit: "sconfitte",
      color: "text-red-600",
    },
    {
      icon: TrendingUp,
      label: "Tasso di vittoria",
      value: winRate,
      unit: "%",
      color: "text-green-500",
    },
    {
      icon: Medal,
      label: "Rank",
      value: `${rank}`,
      unit: "",
      color: rankColor,
      hasInfo: true, // 👈 Aggiungiamo un flag per mostrare il popover
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Statistiche</h3>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <Card key={index} className="p-4 relative">
            {/* Info Popover solo nel riquadro Rank */}
            {stat.hasInfo && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-5 w-5 text-muted-foreground hover:text-foreground"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="end"
                  className="text-xs space-y-1 w-56"
                >
                  <p className="font-semibold text-sm mb-1">
                    ⚠️ Sistema Rank
                  </p>
                  <p>🥇 Oro (≥75%)</p>
                  <p>🥈 Argento (60–74%)</p>
                  <p>🥉 Bronzo (40–59%)</p>
                  <p>🪵 Legno (20–39%)</p>
                  <p>🌱 Seme (&lt;20%)</p>
                </PopoverContent>
              </Popover>
            )}

            <div className="flex items-start gap-3">
              <div className={`rounded-lg bg-muted p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.unit}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Storico annaffiature */}
      {historyData.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-4">Storico Annaffiature</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="colorAcqua" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--accent))"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--accent))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="acqua"
                stroke="hsl(var(--accent))"
                fillOpacity={1}
                fill="url(#colorAcqua)"
                name="Livello acqua (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Temperature */}
      {historyData.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-4">
            Temperature durante annaffiature
          </h4>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--warning))" }}
                name="Temperatura (°C)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Ultime annaffiature */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold mb-3">Ultime Annaffiature</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {plant.wateringHistory && plant.wateringHistory.length > 0 ? (
            plant.wateringHistory
              .slice()
              .reverse()
              .slice(0, 10)
              .map((h, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-accent" />
                    <span className="text-muted-foreground">
                      {format(new Date(h.date), "dd MMM yyyy, HH:mm", {
                        locale: it,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {Math.round(h.waterLevel * 100)}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {h.weatherTemp}°C
                    </span>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessuna annaffiatura registrata
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
