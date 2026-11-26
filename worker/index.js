// عامل مخصص يُدمج في Service Worker الخاص بـ PWA
// معالجة إشعارات Web Push والضغط عليها

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }

  const title = payload.title || "رسالة جديدة";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/skynova-dark.png",
    badge: "/skynova-dark.png",
    tag: payload.tag || "skynova-chat",
    dir: "rtl",
    lang: "ar",
    renotify: true,
    data: { url: payload.url || "/dashboard/communication" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    "/dashboard/communication";

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windowClients) {
        if ("focus" in client) {
          try {
            await client.navigate(targetUrl);
          } catch (e) {
            // تجاهل
          }
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })()
  );
});
