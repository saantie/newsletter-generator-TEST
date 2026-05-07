/* ============================================================
   Newsletter365 — Service Worker
   เปลี่ยน CACHE_VERSION ทุกครั้งที่ push โค้ดใหม่
   ============================================================ */
const CACHE_VERSION = "nl365-v1";
const CACHE_NAME = CACHE_VERSION;

/* ไฟล์ที่ cache ไว้สำหรับ offline */
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
];

/* ── Install: precache ไฟล์หลัก ── */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  /* ไม่ skipWaiting ที่นี่ — รอให้ผู้ใช้กดอัปเดตเอง */
});

/* ── Activate: ลบ cache เก่าทิ้ง ── */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: Network-first สำหรับ index.html, Cache-first สำหรับไฟล์อื่น ── */
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  /* ไม่ cache requests ที่ไม่ใช่ GET หรือ cross-origin */
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  /* index.html: Network-first เพื่อให้โหลดโค้ดใหม่เสมอ */
  if (url.pathname === "/" || url.pathname.endsWith("/index.html")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* ไฟล์อื่น: Cache-first, fallback network */
  e.respondWith(
    caches.match(e.request).then(
      (cached) => cached || fetch(e.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return res;
      })
    )
  );
});

/* ── Message: รับคำสั่ง SKIP_WAITING จาก App ── */
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
