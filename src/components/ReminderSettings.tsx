import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Plant, Weather } from '@/types/plant';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Clock, Bell } from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateAdjustedWateringDays,
  getWaterLevel,
} from '@/lib/plantLogic';
import {
  ensureNotificationPermission,
  scheduleWateringReminder,
  cancelWateringReminder,
  testNotification,
} from '@/lib/notifications';

interface ReminderSettingsProps {
  plant: Plant;
  weather: Weather | null;
  onUpdate: (plantId: string, updates: Partial<Plant>) => void;
}

export function ReminderSettings({ plant, weather, onUpdate }: ReminderSettingsProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(plant.remindersEnabled || false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative && 'Notification' in window) {
      setPermission(Notification.permission as 'granted' | 'denied' | 'default');
    }
  }, [isNative]);

  useEffect(() => {
    setNotificationsEnabled(plant.remindersEnabled || false);
  }, [plant.remindersEnabled]);

  const handleEnableNotifications = async () => {
    try {
      if (!isNative && !('Notification' in window)) {
        toast.error('Il tuo browser non supporta le notifiche');
        return;
      }

      const result = await ensureNotificationPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.info('Attiva le notifiche nelle impostazioni dell’app o del browser');
        return;
      }

      const testResult = await testNotification();
      if (!testResult) {
        toast.error('Errore nell’invio della notifica di test');
        return;
      }

      setNotificationsEnabled(true);
      onUpdate(plant.id, { remindersEnabled: true });

      const waterLevel = getWaterLevel(plant);
      const adjustedDays = weather
        ? calculateAdjustedWateringDays(plant, weather)
        : plant.wateringDays;
      const hoursRemaining = waterLevel * adjustedDays * 24;

      await scheduleWateringReminder(plant.name, hoursRemaining > 0 ? hoursRemaining : 0);

      if (hoursRemaining > 0) {
        toast.success('Promemoria attivato! 🔔', {
          description: `Ti avviseremo quando ${plant.name} avrà bisogno d’acqua (tra ${Math.floor(
            hoursRemaining / 24
          )}g ${Math.floor(hoursRemaining % 24)}h)`,
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Errore nell’attivazione dei promemoria');
    }
  };

  const handleDisableNotifications = async () => {
    setNotificationsEnabled(false);
    onUpdate(plant.id, { remindersEnabled: false });
    await cancelWateringReminder(plant.name);
    toast.info('Promemoria disattivato');
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
          checked={notificationsEnabled && permission === 'granted'}
          onCheckedChange={(checked) => {
            if (checked) handleEnableNotifications();
            else handleDisableNotifications();
          }}
        />
      </div>

      {permission === 'denied' && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Notifiche bloccate</p>
          <p className="text-xs mt-1">
            Abilita le notifiche nelle impostazioni dell’app o del browser per ricevere promemoria
          </p>
        </div>
      )}

      {notificationsEnabled && permission === 'granted' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-primary/5 p-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Prossima annaffiatura prevista</p>
              <p className="text-xs text-muted-foreground mt-1">
                {daysRemaining > 0 ? (
                  <>
                    Tra circa <strong>{daysRemaining}</strong>{' '}
                    {daysRemaining === 1 ? 'giorno' : 'giorni'}
                    {hoursOnly > 0 && (
                      <>
                        {' '}e <strong>{hoursOnly}</strong>{' '}
                        {hoursOnly === 1 ? 'ora' : 'ore'}
                      </>
                    )}
                  </>
                ) : hoursRemaining > 1 ? (
                  <>
                    Tra circa <strong>{Math.floor(hoursRemaining)}</strong>{' '}
                    {Math.floor(hoursRemaining) === 1 ? 'ora' : 'ore'}
                  </>
                ) : (
                  <span className="text-destructive font-medium">Serve acqua ora!</span>
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
              <p>📊 I promemoria si adattano automaticamente in base a meteo e preferenze della pianta</p>
              {weather.temp > plant.preferences.maxTemp && (
                <p className="text-warning">⚠️ Temperatura alta: frequenza aumentata</p>
              )}
              {weather.precipitation > 0 && (
                <p className="text-accent">💧 Pioggia rilevata: frequenza ridotta</p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
