const CACHE_NAME = 'tracnghiem-cache-v9';

// Danh sách các file cần tải ngầm và lưu trữ offline
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data_ppnckh.js',
  './data_triethoc.js',
  './data_hcm.js',
  './data_lsd.js',
  './data_cnxh.js',
  './data_ktct.js',
  './data_qth.js',
  './icon-512x512.jpg'
];

// Sự kiện cài đặt Service Worker (Tiến hành lưu Cache)
self.addEventListener('install', event => {
  self.skipWaiting(); // Ép Service Worker mới thay thế ngay lập tức bản cũ
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Đã lưu cache thành công!');
        return cache.addAll(urlsToCache);
      })
  );
});

// Sự kiện kích hoạt (Xóa bỏ các bản Cache cũ kỹ)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Đang xóa cache cũ:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Ép áp dụng ngay lập tức
  );
});

// Sự kiện khi người dùng yêu cầu 1 file (Lấy từ Cache ra nếu mất mạng)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu tìm thấy file trong bộ nhớ đệm (Cache) thì trả về luôn
        if (response) {
          return response; 
        }
        // Nếu không có, bắt buộc phải tải từ Internet
        return fetch(event.request);
      })
  );
});
