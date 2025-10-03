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
    new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
    });
  }
}

export function scheduleWateringReminder(plantName: string, hoursUntilWatering: number) {
  // Per ora usa setTimeout (in produzione userei service workers)
  if (hoursUntilWatering <= 0) {
    sendBrowserNotification(
      "Tempo di annaffiare! 💧",
      `${plantName} ha bisogno d'acqua adesso`,
    );
    return;
  }
  
  const milliseconds = hoursUntilWatering * 60 * 60 * 1000;
  
  setTimeout(() => {
    sendBrowserNotification(
      "Promemoria irrigazione 🌱",
      `Ricordati di annaffiare ${plantName}`,
    );
  }, Math.min(milliseconds, 2147483647)); // Max setTimeout value
}
