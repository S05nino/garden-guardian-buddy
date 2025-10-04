import { useState, useEffect } from "react";
import { Plant, Weather } from "@/types/plant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { calculateAdjustedWateringDays, getWaterLevel } from "@/lib/plantLogic";
import {
  requestNotificationPermission,
  scheduleWateringReminder,
  cancelWateringReminder,
  testNotification,
} from "@/lib/notifications";
import { Bell, BellOff, Clock } from "lucide-react";
import { toast } from "sonner";

interface ReminderSettingsProps {
  plant: Plant;
  weather: Weather | null;
}

export function ReminderSettings({ plant, weather }: ReminderSettingsProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);

    if (result === "granted") {
      // Test immediato della notifica
      const testResult = testNotification();
      
      if (testResult) {
        setNotificationsEnabled(true);
        
        // Calcola quando serve la prossima annaffiatura
        const waterLevel = getWaterLevel(plant);
        const adjustedDays = weather
          ? calculateAdjustedWateringDays(plant, weather)
          : plant.wateringDays;
        
        const hoursRemaining = waterLevel * adjustedDays * 24;
        
        console.log(`Programmazione promemoria per ${plant.name}: ${hoursRemaining} ore`);
        
        if (hoursRemaining > 0) {
          scheduleWateringReminder(plant.name, hoursRemaining);
          toast.success("Promemoria attivato! 🔔", {
            description: `Ti avviseremo quando ${plant.name} avrà bisogno d'acqua (tra ${Math.floor(hoursRemaining / 24)}g ${Math.floor(hoursRemaining % 24)}h)`,
          });
        } else {
          scheduleWateringReminder(plant.name, 0); // Notifica immediata
        }
      }
    } else if (result === "denied") {
      toast.error("Permesso negato", {
        description: "Abilita le notifiche nelle impostazioni del browser",
      });
    }
  };

  const handleDisableNotifications = () => {
    setNotificationsEnabled(false);
    cancelWateringReminder(plant.name);
    toast.info("Promemoria disattivato");
  };

  const waterLevel = getWaterLevel(plant);
  const adjustedDays = weather
    ? calculateAdjustedWateringDays(plant, weather)
    : plant.wateringDays;
  const hoursRemaining = waterLevel * adjustedDays * 24;
  const daysRemaining = Math.floor(hoursRemaining / 24);
  const hoursOnly = Math.floor(hoursRemaining % 24);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Promemoria Irrigazione</h3>
            <p className="text-xs text-muted-foreground">
              Ricevi notifiche quando serve annaffiare
            </p>
          </div>
        </div>
        <Switch
          checked={notificationsEnabled && permission === "granted"}
          onCheckedChange={(checked) => {
            if (checked) {
              handleEnableNotifications();
            } else {
              handleDisableNotifications();
            }
          }}
        />
      </div>

      {permission === "denied" && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Notifiche bloccate</p>
          <p className="text-xs mt-1">
            Abilita le notifiche nelle impostazioni del browser per ricevere promemoria
          </p>
        </div>
      )}

      {notificationsEnabled && permission === "granted" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Prossima annaffiatura prevista</p>
              <p className="text-xs text-muted-foreground mt-1">
                {daysRemaining > 0 ? (
                  <>
                    Tra circa <strong>{daysRemaining}</strong>{" "}
                    {daysRemaining === 1 ? "giorno" : "giorni"}
                    {hoursOnly > 0 && (
                      <>
                        {" "}
                        e <strong>{hoursOnly}</strong>{" "}
                        {hoursOnly === 1 ? "ora" : "ore"}
                      </>
                    )}
                  </>
                ) : hoursRemaining > 1 ? (
                  <>
                    Tra circa <strong>{Math.floor(hoursRemaining)}</strong>{" "}
                    {Math.floor(hoursRemaining) === 1 ? "ora" : "ore"}
                  </>
                ) : (
                  <span className="text-destructive font-medium">
                    Serve acqua ora!
                  </span>
                )}
              </p>
              {weather && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Giorni base: {plant.wateringDays}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Adattato: {adjustedDays}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {weather && plant.preferences && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                📊 I promemoria si adattano automaticamente in base a meteo e preferenze della pianta
              </p>
              {weather.temp > plant.preferences.maxTemp && (
                <p className="text-warning">
                  ⚠️ Temperatura alta: frequenza aumentata
                </p>
              )}
              {weather.precipitation > 0 && (
                <p className="text-accent">
                  💧 Pioggia rilevata: frequenza ridotta
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
