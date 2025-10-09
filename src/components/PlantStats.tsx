import { Plant } from "@/types/plant";
import { Card } from "@/components/ui/card";
import { getDaysAlive, getAverageHealth } from "@/lib/plantLogic";
import { Calendar, Droplets, Heart, TrendingUp } from "lucide-react";
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

  // Prepara dati per grafico storico (solo se wateringHistory esiste)
  const historyData = plant.wateringHistory 
    ? plant.wateringHistory.slice(-15).map((h) => ({
        date: format(new Date(h.date), "dd/MM", { locale: it }),
        acqua: Math.round(h.waterLevel * 100),
        temp: h.weatherTemp,
      }))
    : [];

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
    // Statistiche battaglia
    {
      icon: Heart, // puoi usare un'icona diversa se vuoi
      label: "Vittorie in arena",
      value: plant.victories || 0,
      unit: "vittorie",
      color: "text-green-600",
    },
    {
      icon: Heart, // o un'altra icona tipo "💀" per sconfitte
      label: "Sconfitte in arena",
      value: plant.defeats || 0,
      unit: "sconfitte",
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Statistiche</h3>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <Card key={index} className="p-4">
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

      {/* History Chart */}
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

      {/* Weather History */}
      {historyData.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold mb-4">Temperature durante annaffiature</h4>
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

      {/* Recent History List */}
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
