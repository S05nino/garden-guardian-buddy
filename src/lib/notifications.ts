import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Richiede i permessi di notifica.
 * Su Android/iOS usa Capacitor LocalNotifications, su Web Notification API.
 */
export async function ensureNotificationPermission(): Promise<'granted' | 'denied'> {
  try {
    if (Capacitor.isNativePlatform()) {
      let permission = await LocalNotifications.checkPermissions();

      if (permission.display !== 'granted') {
        permission = await LocalNotifications.requestPermissions();
      }

      return permission.display === 'granted' ? 'granted' : 'denied';
    } else if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted' ? 'granted' : 'denied';
    }

    return 'denied';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Invia una notifica immediata.
 */
export async function sendNotification(title: string, body: string, icon?: string) {
  try {
    if (Capacitor.isNativePlatform()) {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title,
              body,
              schedule: { at: new Date(Date.now() + 1000) }, // 1 secondo dopo
              smallIcon: 'ic_launcher',
              iconColor: '#4CAF50',
            },
          ],
        });
        console.log('Notifica inviata (mobile):', title, body);
      }
    } else if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon });
        console.log('Notifica inviata (web):', title, body);
      }
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// Mappa per ID notifiche attive
const activeReminders = new Map<string, number>();

/**
 * Programma un promemoria di annaffiatura.
 * Su Android/iOS crea notifiche programmate persistenti.
 */
export async function scheduleWateringReminder(plantName: string, hoursUntilWatering: number) {
  try {
    await cancelWateringReminder(plantName);

    if (Capacitor.isNativePlatform()) {
      const notificationTime = new Date(Date.now() + hoursUntilWatering * 60 * 60 * 1000);
      const notificationId = Math.abs(
        plantName.split('').reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)
      );

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: 'Promemoria irrigazione 🌱',
            body: `È ora di annaffiare ${plantName}`,
            schedule: { at: notificationTime },
            smallIcon: 'ic_launcher',
            iconColor: '#4CAF50',
            sound: 'default',
            autoCancel: true,
          },
        ],
      });

      activeReminders.set(plantName, notificationId);
      
      // Salva il reminder per persistenza
      await Preferences.set({
        key: `reminder_${plantName}`,
        value: JSON.stringify({
          notificationId,
          scheduledTime: notificationTime.getTime(),
          plantName,
        }),
      });

      console.log(`Promemoria programmato per ${plantName} alle ${notificationTime.toLocaleString()}`);
    } else {
      await sendNotification(
        'Promemoria irrigazione 🌱',
        `${plantName} ha bisogno d'acqua!`
      );
    }
  } catch (error) {
    console.error('Error scheduling reminder:', error);
  }
}

/**
 * Cancella il promemoria di una pianta.
 */
export async function cancelWateringReminder(plantName: string) {
  try {
    if (Capacitor.isNativePlatform()) {
      const notificationId = activeReminders.get(plantName);
      if (notificationId) {
        await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
        activeReminders.delete(plantName);
        console.log(`Promemoria cancellato per ${plantName}`);
      }
      
      // Rimuovi dalla persistenza
      await Preferences.remove({ key: `reminder_${plantName}` });
    }
  } catch (error) {
    console.error('Error cancelling reminder:', error);
  }
}

/**
 * Ripristina tutti i reminder salvati all'avvio dell'app
 */
export async function restoreAllReminders() {
  try {
    if (!Capacitor.isNativePlatform()) return;

    const { keys } = await Preferences.keys();
    const reminderKeys = keys.filter(key => key.startsWith('reminder_'));

    for (const key of reminderKeys) {
      const stored = await Preferences.get({ key });
      if (stored.value) {
        const data = JSON.parse(stored.value);
        const { notificationId, scheduledTime, plantName } = data;

        // Se la notifica è ancora futura, ripristinala nella mappa
        if (scheduledTime > Date.now()) {
          activeReminders.set(plantName, notificationId);
          console.log(`Reminder ripristinato per ${plantName}`);
        } else {
          // Rimuovi reminder scaduti
          await Preferences.remove({ key });
        }
      }
    }
  } catch (error) {
    console.error('Error restoring reminders:', error);
  }
}

/**
 * Test immediato della notifica
 */
export async function testNotification() {
  try {
    const permission = await ensureNotificationPermission();
    if (permission === 'granted') {
      await sendNotification('Test notifica 🔔', 'Le notifiche funzionano correttamente!');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error testing notification:', error);
    return false;
  }
}
