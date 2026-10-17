/* 데이트 지도 — 카카오맵 JavaScript SDK
 * 페이지에서 쓰는 법:
 *   <div class="kmap-box" data-course="ID"></div>
 *   <script type="application/json" id="ID">{"points":[{"label":"1","name":"이름","q":"검색어 동네","route":true}, ...]}</script>
 *   <link rel="stylesheet" href="../assets/kmap.css"><script src="../assets/kmap.js" defer></script>
 * 좌표는 저장하지 않고 열 때마다 장소 검색으로 찾음 (카카오 정책).
 * 여기 들어가는 키는 JavaScript 키(공개용)만. REST·어드민 키 금지.
 */
(function () {
  var KAKAO_JS_KEY = "__KAKAO_JS_KEY__";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // 카카오 링크는 쉼표로 값을 나누므로 이름에서 쉼표·슬래시 제거
  function linkName(s) { return encodeURIComponent(String(s).replace(/[,\/]/g, " ").trim()); }
  function toLink(p) { return "https://map.kakao.com/link/to/" + linkName(p.name) + "," + p.lat + "," + p.lng; }
  function fromToLink(a, b) {
    return "https://map.kakao.com/link/from/" + linkName(a.name) + "," + a.lat + "," + a.lng +
      "/to/" + linkName(b.name) + "," + b.lat + "," + b.lng;
  }
  function searchLink(p) { return "https://map.kakao.com/link/search/" + encodeURIComponent(p.q || p.name); }

  var boxes = [].slice.call(document.querySelectorAll(".kmap-box"));
  if (!boxes.length) return;

  // 1) 지도 없이도 쓸 수 있는 장소 목록부터 그림 (SDK가 실패해도 남음)
  var courses = boxes.map(function (box) {
    var data = { points: [] };
    try { data = JSON.parse(document.getElementById(box.getAttribute("data-course")).textContent); } catch (e) {}
    box.innerHTML =
      '<div class="kmap" role="region" aria-label="코스 지도"><div class="kmap-msg">지도 불러오는 중…</div></div>' +
      '<ol class="kmap-list"></ol>' +
      '<div class="kmap-legs"></div>';
    var list = box.querySelector(".kmap-list");
    data.points.forEach(function (p, i) {
      var li = document.createElement("li");
      li.className = "kmap-item" + (p.route ? " is-route" : "");
      li.innerHTML =
        '<span class="kmap-no">' + esc(p.label || i + 1) + '</span>' +
        '<span class="kmap-name">' + esc(p.name) + (p.note ? '<small>' + esc(p.note) + '</small>' : '') + '</span>' +
        '<span class="kmap-btns"><a class="kmap-btn ghost" href="' + searchLink(p) + '" target="_blank" rel="noopener">카카오맵에서 찾기</a></span>';
      list.appendChild(li);
      p._li = li;
    });
    return { box: box, data: data };
  });

  function fallback(c, text) {
    var el = c.box.querySelector(".kmap");
    el.classList.add("is-empty");
    el.querySelector(".kmap-msg").textContent = text;
  }

  if (!KAKAO_JS_KEY || KAKAO_JS_KEY.indexOf("__") === 0) {
    courses.forEach(function (c) { fallback(c, "지도는 곧 붙어요 — 아래 버튼으로 카카오맵에서 바로 볼 수 있어요"); });
    return;
  }

  // 2) SDK 불러오기
  var s = document.createElement("script");
  s.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + KAKAO_JS_KEY + "&autoload=false&libraries=services";
  s.onerror = function () {
    courses.forEach(function (c) { fallback(c, "지도를 불러오지 못했어요 — 아래 버튼으로 카카오맵에서 보세요"); });
  };
  s.onload = function () { kakao.maps.load(function () { courses.forEach(draw); }); };
  document.head.appendChild(s);

  function draw(c) {
    var el = c.box.querySelector(".kmap");
    var map = new kakao.maps.Map(el, { center: new kakao.maps.LatLng(37.5665, 126.978), level: 7 });
    map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    var places = new kakao.maps.services.Places();
    var pts = c.data.points;
    var open = null;

    // 순서대로 하나씩 검색 (검색량 아끼고 순서 보장)
    (function next(i) {
      if (i >= pts.length) return finish();
      var p = pts[i];
      places.keywordSearch(p.q || p.name, function (res, status) {
        if (status === kakao.maps.services.Status.OK && res.length) {
          var r = res[0];
          p.lat = +r.y; p.lng = +r.x; p.url = r.place_url;
          p.pos = new kakao.maps.LatLng(p.lat, p.lng);
          addPin(p, i);
          var btns = p._li.querySelector(".kmap-btns");
          btns.innerHTML =
            '<a class="kmap-btn ghost" href="' + esc(p.url) + '" target="_blank" rel="noopener">카카오맵에서 보기</a>' +
            '<a class="kmap-btn" href="' + toLink(p) + '" target="_blank" rel="noopener">길찾기</a>';
        } else {
          p._li.classList.add("is-missing");
          p._li.querySelector(".kmap-name").insertAdjacentHTML("beforeend", '<small class="miss">위치 못 찾음</small>');
        }
        next(i + 1);
      });
    })(0);

    function addPin(p, i) {
      var pin = document.createElement("button");
      pin.type = "button";
      pin.className = "kpin" + (p.route ? " is-route" : "");
      pin.innerHTML = '<span class="n">' + esc(p.label || i + 1) + '</span><span class="t">' + esc(p.name) + '</span>';
      new kakao.maps.CustomOverlay({ map: map, position: p.pos, content: pin, yAnchor: 1, zIndex: p.route ? 3 : 2 });

      var card = document.createElement("div");
      card.className = "kcard";
      card.innerHTML =
        '<button type="button" class="x" aria-label="닫기">×</button>' +
        '<b>' + esc(p.name) + '</b>' +
        '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">카카오맵에서 보기</a>' +
        '<a class="go" href="' + toLink(p) + '" target="_blank" rel="noopener">길찾기</a>';
      var info = new kakao.maps.CustomOverlay({ position: p.pos, content: card, yAnchor: 1.55, zIndex: 9 });
      card.querySelector(".x").onclick = function () { info.setMap(null); open = null; };
      pin.onclick = function () {
        if (open) open.setMap(null);
        info.setMap(map); open = info;
      };
    }

    function finish() {
      var found = pts.filter(function (p) { return p.pos; });
      var msg = el.querySelector(".kmap-msg");
      if (msg) msg.remove();
      if (!found.length) {
        el.insertAdjacentHTML("beforeend", '<div class="kmap-msg">장소를 못 찾았어요</div>');
        return;
      }
      var route = found.filter(function (p) { return p.route; });
      if (route.length > 1) {
        new kakao.maps.Polyline({
          map: map, path: route.map(function (p) { return p.pos; }),
          strokeWeight: 5, strokeColor: getComputedStyle(c.box).getPropertyValue("--kmap-line").trim() || "#E0618C",
          strokeOpacity: 0.85, strokeStyle: "solid"
        });
        var legs = c.box.querySelector(".kmap-legs");
        for (var k = 0; k < route.length - 1; k++) {
          var a = route[k], b = route[k + 1];
          legs.insertAdjacentHTML("beforeend",
            '<a class="kmap-leg" href="' + fromToLink(a, b) + '" target="_blank" rel="noopener">' +
            esc(a.label) + ' ' + esc(a.name) + ' → ' + esc(b.label) + ' ' + esc(b.name) + ' 길찾기</a>');
        }
      }
      if (found.length === 1) { map.setCenter(found[0].pos); map.setLevel(4); }
      else {
        var bounds = new kakao.maps.LatLngBounds();
        found.forEach(function (p) { bounds.extend(p.pos); });
        map.setBounds(bounds, 60, 40, 40, 40);
      }
    }
  }
})();
