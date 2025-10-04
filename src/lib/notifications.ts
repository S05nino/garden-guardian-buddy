export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return Promise.resolve("denied");
  }
  
  if (Notification.permission === "granted") {
    return Promise.resolve("granted");
  }
  
  if (Notification.permission !== "denied") {
    return Notification.requestPermission();
  }
  
  return Promise.resolve(Notification.permission);
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico",
        requireInteraction: false,
        silent: false,
      });
      
      // Auto-chiudi dopo 10 secondi
      setTimeout(() => notification.close(), 10000);
      
      console.log("Notifica inviata:", title, body);
    } catch (error) {
      console.error("Errore invio notifica:", error);
    }
  } else {
    console.warn("Permesso notifiche non concesso");
  }
}

// Mappa per tenere traccia dei timeout attivi
const activeReminders = new Map<string, number>();

export function scheduleWateringReminder(plantName: string, hoursUntilWatering: number) {
  // Cancella eventuali promemoria precedenti per questa pianta
  if (activeReminders.has(plantName)) {
    clearTimeout(activeReminders.get(plantName));
    activeReminders.delete(plantName);
  }
  
  // Se serve acqua ora, invia notifica immediata
  if (hoursUntilWatering <= 0) {
    sendBrowserNotification(
      "Tempo di annaffiare! 💧",
      `${plantName} ha bisogno d'acqua adesso`,
    );
    return;
  }
  
  const milliseconds = hoursUntilWatering * 60 * 60 * 1000;
  const maxTimeout = 2147483647; // Max setTimeout value (~24 giorni)
  
  // Se il timeout è troppo lungo, programma per il massimo e ri-schedula dopo
  if (milliseconds > maxTimeout) {
    const timeoutId = window.setTimeout(() => {
      // Ricalcola il tempo rimanente
      const remainingHours = hoursUntilWatering - (maxTimeout / (60 * 60 * 1000));
      scheduleWateringReminder(plantName, remainingHours);
    }, maxTimeout);
    
    activeReminders.set(plantName, timeoutId);
    console.log(`Promemoria programmato per ${plantName} tra ${hoursUntilWatering} ore (parte 1)`);
  } else {
    const timeoutId = window.setTimeout(() => {
      sendBrowserNotification(
        "Promemoria irrigazione 🌱",
        `Ricordati di annaffiare ${plantName}`,
      );
      activeReminders.delete(plantName);
    }, milliseconds);
    
    activeReminders.set(plantName, timeoutId);
    console.log(`Promemoria programmato per ${plantName} tra ${hoursUntilWatering} ore`);
  }
}

export function cancelWateringReminder(plantName: string) {
  if (activeReminders.has(plantName)) {
    clearTimeout(activeReminders.get(plantName));
    activeReminders.delete(plantName);
    console.log(`Promemoria cancellato per ${plantName}`);
  }
}

// Test immediato della notifica
export function testNotification() {
  if (Notification.permission === "granted") {
    sendBrowserNotification(
      "Test notifica 🔔",
      "Le notifiche funzionano correttamente!",
    );
    return true;
  }
  return false;
}
