const CACHE_NAME = 'tracnghiem-cache-v1';

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
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Đã lưu cache thành công!');
        return cache.addAll(urlsToCache);
      })
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
