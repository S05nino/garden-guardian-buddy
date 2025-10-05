import { LocalNotifications } from '@capacitor/local-notifications';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    // Check current permission status
    const permission = await LocalNotifications.checkPermissions();
    
    if (permission.display === 'granted') {
      return "granted";
    }

    // Request permission if not granted
    const requested = await LocalNotifications.requestPermissions();
    
    if (requested.display === 'granted') {
      return "granted";
    } else if (requested.display === 'denied') {
      return "denied";
    } else {
      return "default";
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return "denied";
  }
}

export async function sendBrowserNotification(title: string, body: string, icon?: string) {
  try {
    const permission = await LocalNotifications.checkPermissions();
    
    if (permission.display === "granted") {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 1000) }, // Schedule 1 second from now
            smallIcon: "ic_launcher",
            iconColor: "#4CAF50",
          }
        ]
      });
      console.log("Notifica inviata:", title, body);
    }
  } catch (error) {
    console.error("Error showing notification:", error);
  }
}

// Mappa per tenere traccia degli ID delle notifiche attive
const activeReminders = new Map<string, number>();

export async function scheduleWateringReminder(plantName: string, hoursUntilWatering: number) {
  try {
    // Cancel any existing reminder for this plant
    await cancelWateringReminder(plantName);

    // Don't schedule if it's too far in the future (more than 24 hours)
    if (hoursUntilWatering > 24) {
      console.log(`Reminder for ${plantName} is too far in the future (${hoursUntilWatering} hours). Will reschedule closer to time.`);
      return;
    }

    // Calculate the notification time
    const notificationTime = new Date(Date.now() + (hoursUntilWatering * 60 * 60 * 1000));

    // If the reminder is for right now or the past, send it immediately
    if (hoursUntilWatering <= 0) {
      await sendBrowserNotification(
        "Tempo di annaffiare! 💧",
        `${plantName} ha bisogno d'acqua adesso`,
        "ic_launcher"
      );
      return;
    }

    // Generate a unique ID for this plant notification
    const notificationId = Math.abs(plantName.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0));

    // Schedule the reminder
    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Promemoria irrigazione 🌱",
          body: `Ricordati di annaffiare ${plantName}`,
          id: notificationId,
          schedule: { at: notificationTime },
          smallIcon: "ic_launcher",
          iconColor: "#4CAF50",
        }
      ]
    });

    // Store the notification ID
    activeReminders.set(plantName, notificationId);
    
    console.log(`Promemoria programmato per ${plantName} tra ${hoursUntilWatering} ore`);
  } catch (error) {
    console.error("Error scheduling reminder:", error);
  }
}

export async function cancelWateringReminder(plantName: string) {
  try {
    const notificationId = activeReminders.get(plantName);
    if (notificationId) {
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      activeReminders.delete(plantName);
      console.log(`Promemoria cancellato per ${plantName}`);
    }
  } catch (error) {
    console.error("Error cancelling reminder:", error);
  }
}

// Test immediato della notifica
export async function testNotification() {
  try {
    const permission = await requestNotificationPermission();
    if (permission === "granted") {
      await sendBrowserNotification(
        "Test notifica 🔔",
        "Le notifiche funzionano correttamente!",
        "ic_launcher"
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error testing notification:", error);
    return false;
  }
}
