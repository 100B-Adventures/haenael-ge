/* 해낼게 서비스 워커.
 *
 * 하는 일은 딱 둘이다. 푸시를 받아 알림을 띄우고, 알림을 누르면 앱을 연다.
 * fetch 핸들러를 일부러 두지 않는다. 잔액·환전 상태를 캐시했다가 낡은 값을
 * 보여주면 돈 화면이 거짓말을 한다. 오프라인 캐시가 필요해지면 돈과 무관한
 * 정적 자원에 한해 별도 결정으로 넣는다.
 *
 * 푸시 발송 자체(구독 저장·VAPID 키·서버 발송)는 별도 기능이다. 이 파일은
 * 기기 쪽 수신 준비까지다.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "해낼게", body: "새 소식이 있어요.", url: "/me" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // 본문이 JSON 이 아니면 기본 문구로 띄운다. 알림을 조용히 버리지 않는다.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
