// 한 번 연 뒤에는 연결 없이도 열리도록 화면 파일과 글꼴을 기기에 저장한다. 외부 요청은 하지 않는다.
var CACHE='anchor-v3';
var FILES=['./','./index.html','./fonts/Pretendard-Regular.subset.woff2','./fonts/Pretendard-SemiBold.subset.woff2','./fonts/Pretendard-Bold.subset.woff2','./fonts/Pretendard-ExtraBold.subset.woff2'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(FILES)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(function(r){var copy=r.clone();caches.open(CACHE).then(function(c){c.put(e.request,copy)});return r}).catch(function(){return caches.match(e.request,{ignoreSearch:true}).then(function(r){return r||caches.match('./index.html')})}))});
