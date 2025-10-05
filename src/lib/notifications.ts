import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

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
 * Web invia solo notifica immediata.
 */
export async function scheduleWateringReminder(plantName: string, hoursUntilWatering: number) {
  try {
    await cancelWateringReminder(plantName);

    if (Capacitor.isNativePlatform()) {
      if (hoursUntilWatering > 24) return;

      const notificationTime = new Date(Date.now() + hoursUntilWatering * 60 * 60 * 1000);
      const notificationId = Math.abs(
        plantName.split('').reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)
      );

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: 'Promemoria irrigazione 🌱',
            body: `Ricordati di annaffiare ${plantName}`,
            schedule: { at: notificationTime },
            smallIcon: 'ic_launcher',
            iconColor: '#4CAF50',
          },
        ],
      });

      activeReminders.set(plantName, notificationId);
      console.log(`Promemoria programmato per ${plantName} tra ${hoursUntilWatering} ore`);
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
    }
  } catch (error) {
    console.error('Error cancelling reminder:', error);
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
