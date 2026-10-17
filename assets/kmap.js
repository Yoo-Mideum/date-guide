/* 데이트 지도 — 카카오맵 JavaScript SDK
 *
 * 쓰는 법 (셋 중 하나)
 *   <div class="kmap-box" data-course="ID"></div> + <script type="application/json" id="ID">{"points":[...]}</script>
 *   <div class="kmap-box" data-trip="2026-09-12"></div>      ← assets/trips.js 의 그날 코스
 *   <div class="kmap-box" data-all></div>                    ← 전체 (메인 페이지)
 *
 * 좌표는 저장하지 않고 열 때마다 장소 검색으로 찾음 (카카오 정책). 같은 페이지 안에서만 잠깐 재사용.
 * 여기 들어가는 키는 JavaScript 키(공개용)만. REST·어드민 키는 절대 넣지 말 것.
 */
(function () {
  var KAKAO_JS_KEY = "9deee075d97e435626fcd348c1868f29";

  /* ---------- 공통 ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function linkName(s) { return encodeURIComponent(String(s).replace(/[,\/]/g, " ").trim()); }
  function toLink(p) { return "https://map.kakao.com/link/to/" + linkName(p.name) + "," + p.lat + "," + p.lng; }
  function fromToLink(a, b) {
    return "https://map.kakao.com/link/from/" + linkName(a.name) + "," + a.lat + "," + a.lng +
      "/to/" + linkName(b.name) + "," + b.lat + "," + b.lng;
  }
  function searchLink(p) { return "https://map.kakao.com/link/search/" + encodeURIComponent(p.q || p.name); }

  // 한국 시간 기준 오늘 (YYYY-MM-DD)
  var TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  function dayDiff(d) { return Math.round((Date.parse(d) - Date.parse(TODAY)) / 864e5); }
  function statusOf(t) {
    if (!t.date) return "past";
    var end = t.end || t.date;
    if (TODAY >= t.date && TODAY <= end) return "today";
    return t.date > TODAY ? "future" : "past";
  }
  // 핀에 붙는 짧은 표시: 오늘 / D-7 / ✓9/12
  function ddayText(t) {
    var s = statusOf(t);
    if (s === "today") return "오늘";
    if (s === "past") return t.date ? "✓" + md(t.date) : "✓";
    return "D-" + dayDiff(t.date);
  }
  function md(d) { var p = d.split("-"); return (+p[1]) + "/" + (+p[2]); }
  function dateText(t) {
    if (!t.date) return t.when || "날짜 확인 필요";
    var w = "일월화수목금토"[dow(t.date)];
    return md(t.date) + " (" + w + ")" + (t.end ? " ~ " + md(t.end) : "");
  }
  // 목록·창에 붙는 설명: "9/12 (토) ~ 9/13 · 35일 전 다녀옴"
  function whenText(t) {
    var s = statusOf(t);
    if (s === "past") return dateText(t) + (t.date ? " · " + (-dayDiff(t.end || t.date)) + "일 전 다녀옴" : " · 다녀옴");
    if (s === "today") return dateText(t) + " · 오늘";
    return dateText(t) + " · " + dayDiff(t.date) + "일 남음";
  }
  function dow(d) { var p = d.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }

  /* ---------- 데이터 모으기 ---------- */
  var boxes = [].slice.call(document.querySelectorAll(".kmap-box"));
  if (!boxes.length) return;
  var TRIPS = window.DATE_TRIPS || [];

  function groupFromTrip(t, compact) {
    var st = statusOf(t);
    return {
      trip: t, status: st, compact: compact,
      points: t.points.map(function (p, i) {
        return Object.assign({}, p, { route: true, status: st, label: String(i + 1),
          chip: compact ? ddayText(t) : String(i + 1) });
      })
    };
  }

  var courses = boxes.map(function (box) {
    var c = { box: box, mode: "course", groups: [] };
    if (box.hasAttribute("data-all")) {
      c.mode = "all";
      // 오늘 → 앞으로(가까운 순) → 다녀온 곳(최근 순)
      var order = { today: 0, future: 1, past: 2 };
      c.groups = TRIPS.slice().sort(function (a, b) {
        var sa = statusOf(a), sb = statusOf(b);
        if (sa !== sb) return order[sa] - order[sb];
        var ad = a.date || "0000", bd = b.date || "0000";
        return sa === "past" ? (ad < bd ? 1 : -1) : (ad > bd ? 1 : -1);
      }).map(function (t) { return groupFromTrip(t, true); });
    } else if (box.hasAttribute("data-trip")) {
      box.getAttribute("data-trip").split(",").forEach(function (id) {
        var t = TRIPS.filter(function (x) { return x.date === id.trim(); })[0];
        if (t) c.groups.push(groupFromTrip(t, false));
      });
    } else {
      var data = { points: [] };
      try { data = JSON.parse(document.getElementById(box.getAttribute("data-course")).textContent); } catch (e) {}
      c.groups.push({ status: "today", points: data.points.map(function (p, i) {
        return Object.assign({}, p, { label: p.label || String(i + 1), status: p.route ? "today" : "cand" });
      }) });
    }
    return c;
  });

  /* ---------- 목록 (지도 없어도 남는 부분) ---------- */
  courses.forEach(function (c) {
    var box = c.box;
    var filters = c.mode === "all"
      ? '<div class="kmap-filter" role="group" aria-label="보기">' +
        '<button type="button" data-f="all" class="on">전체</button>' +
        '<button type="button" data-f="future">앞으로 갈 곳</button>' +
        '<button type="button" data-f="past">다녀온 곳</button></div>'
      : "";
    box.innerHTML = filters +
      '<div class="kmap-frame"><i class="kf-o t"></i><i class="kf-o b"></i><i class="kf-o l"></i><i class="kf-o r"></i>' +
      '<div class="kmap" role="region" aria-label="데이트 지도"><div class="kmap-msg">지도 불러오는 중…</div></div></div>' +
      (c.mode === "all"
        ? '<div class="kmap-legend"><span><i class="lg today"></i>오늘</span><span><i class="lg future"></i>앞으로 (D-day)</span><span><i class="lg past"></i>다녀온 곳 ✓</span></div>'
        : "") +
      '<div class="kmap-groups"></div>';
    var wrap = box.querySelector(".kmap-groups");
    var pastWrap = null;
    if (c.mode === "all") {
      var nPast = c.groups.filter(function (g) { return g.status === "past"; }).length;
      if (nPast) {
        pastWrap = document.createElement("details");
        pastWrap.className = "kmap-past";
        pastWrap.innerHTML = '<summary>✓ 다녀온 곳 ' + nPast + '번 — 펼쳐보기</summary>';
      }
    }

    c.groups.forEach(function (g) {
      var sec = document.createElement("div");
      sec.className = "kmap-group st-" + g.status;
      g.el = sec;
      if (g.trip && c.mode === "all") {
        sec.innerHTML = '<a class="kmap-ghead"' + (g.trip.href ? ' href="' + esc(g.trip.href) + '"' : '') + '>' +
          '<span class="dd">' + esc(ddayText(g.trip)) + '</span>' +
          '<span class="gt">' + esc(g.trip.title) + '</span><span class="go">›</span>' +
          '<span class="gd">' + esc(whenText(g.trip)) + '</span></a>';
      }
      var ol = document.createElement("ol");
      ol.className = "kmap-list";
      g.points.forEach(function (p) {
        var li = document.createElement("li");
        li.className = "kmap-item st-" + p.status + (p.route ? " is-route" : "");
        li.innerHTML =
          '<span class="kmap-no">' + esc(p.label) + '</span>' +
          '<span class="kmap-name">' + esc(p.name) + (p.note ? '<small>' + esc(p.note) + '</small>' : '') + '</span>' +
          '<span class="kmap-btns"><a class="kmap-btn ghost" href="' + searchLink(p) + '" target="_blank" rel="noopener">카카오맵에서 찾기</a></span>';
        ol.appendChild(li);
        p._li = li;
      });
      sec.appendChild(ol);
      var legs = document.createElement("div");
      legs.className = "kmap-legs";
      sec.appendChild(legs);
      g.legsEl = legs;
      (pastWrap && g.status === "past" ? pastWrap : wrap).appendChild(sec);
    });
    if (pastWrap) wrap.appendChild(pastWrap);
    c.pastWrap = pastWrap;
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

  /* ---------- SDK ---------- */
  var s = document.createElement("script");
  s.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + KAKAO_JS_KEY + "&autoload=false&libraries=services";
  s.onerror = function () {
    courses.forEach(function (c) { fallback(c, "지도를 불러오지 못했어요 — 아래 버튼으로 카카오맵에서 보세요"); });
  };
  s.onload = function () {
    if (!window.kakao || !kakao.maps) {
      courses.forEach(function (c) { fallback(c, "지도를 불러오지 못했어요 — 아래 버튼으로 카카오맵에서 보세요"); });
      return;
    }
    kakao.maps.load(function () {
      var places = new kakao.maps.services.Places();
      var cache = {}; // 이 페이지 안에서만 (저장 안 함)
      function find(q, cb) {
        if (q in cache) return cb(cache[q]);
        places.keywordSearch(q, function (res, status) {
          var r = status === kakao.maps.services.Status.OK && res.length ? res[0] : null;
          cache[q] = r;
          cb(r);
        });
      }
      (function nextCourse(k) {
        if (k >= courses.length) return;
        draw(courses[k], find, function () { nextCourse(k + 1); });
      })(0);
    });
  };
  document.head.appendChild(s);

  function draw(c, find, done) {
    var el = c.box.querySelector(".kmap");
    var cs = getComputedStyle(c.box);
    var COLORS = {
      today: cs.getPropertyValue("--kmap-accent").trim() || "#E0618C",
      future: cs.getPropertyValue("--kmap-future").trim() || "#3F7BA6",
      past: "#A3AEB5", cand: "#A3AEB5"
    };

    var map = new kakao.maps.Map(el, { center: new kakao.maps.LatLng(37.5665, 126.978), level: 8 });
    map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    var open = null;
    var all = [];
    c.groups.forEach(function (g) { g.points.forEach(function (p) { p._g = g; all.push(p); }); });

    (function next(i) {
      if (i >= all.length) return finish();
      var p = all[i];
      find(p.q || p.name, function (r) {
        if (r) {
          p.lat = +r.y; p.lng = +r.x; p.url = r.place_url;
          p.pos = new kakao.maps.LatLng(p.lat, p.lng);
          addPin(p);
          p._li.querySelector(".kmap-btns").innerHTML =
            '<a class="kmap-btn ghost" href="' + esc(p.url) + '" target="_blank" rel="noopener">카카오맵에서 보기</a>' +
            '<a class="kmap-btn" href="' + toLink(p) + '" target="_blank" rel="noopener">길찾기</a>';
        } else {
          p._li.classList.add("is-missing");
          p._li.querySelector(".kmap-name").insertAdjacentHTML("beforeend", '<small class="miss">위치 못 찾음</small>');
        }
        next(i + 1);
      });
    })(0);

    function addPin(p) {
      var g = p._g;
      var pin = document.createElement("button");
      pin.type = "button";
      pin.className = "kpin st-" + p.status + (g.compact ? " compact" : "");
      pin.innerHTML = g.compact
        ? '<span class="n">' + esc(p.chip) + '</span>'
        : '<span class="n">' + esc(p.label) + '</span><span class="t">' + esc(p.name) + '</span>';
      pin.setAttribute("aria-label", p.name);
      var z = { today: 6, future: 5, cand: 3, past: 2 }[p.status] || 2;
      p.ov = new kakao.maps.CustomOverlay({ map: map, position: p.pos, content: pin, yAnchor: 1, zIndex: z });

      var card = document.createElement("div");
      card.className = "kcard";
      card.innerHTML =
        '<button type="button" class="x" aria-label="닫기">×</button>' +
        (g.trip ? '<span class="kc-when">' + esc(whenText(g.trip)) + '<br>' + esc(g.trip.title) + '</span>' : '') +
        '<b>' + (g.trip ? esc(p.label) + '. ' : '') + esc(p.name) + '</b>' +
        '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">카카오맵에서 보기</a>' +
        '<a class="go" href="' + toLink(p) + '" target="_blank" rel="noopener">길찾기</a>';
      var info = new kakao.maps.CustomOverlay({ position: p.pos, content: card, yAnchor: g.compact ? 1.35 : 1.55, zIndex: 20 });
      card.querySelector(".x").onclick = function () { info.setMap(null); open = null; };
      pin.onclick = function () { if (open) open.setMap(null); info.setMap(map); open = info; };
    }

    function finish() {
      var msg = el.querySelector(".kmap-msg");
      if (msg) msg.remove();
      var found = all.filter(function (p) { return p.pos; });
      if (!found.length) {
        el.insertAdjacentHTML("beforeend", '<div class="kmap-msg">장소를 못 찾았어요</div>');
        return done();
      }
      c.groups.forEach(function (g) {
        var route = g.points.filter(function (p) { return p.route && p.pos; });
        if (route.length < 2) return;
        var st = g.status;
        g.line = new kakao.maps.Polyline({
          map: map, path: route.map(function (p) { return p.pos; }),
          strokeWeight: st === "past" ? 3 : 5, strokeColor: COLORS[st] || COLORS.today,
          strokeOpacity: st === "past" ? 0.7 : 0.9, strokeStyle: st === "past" ? "shortdash" : "solid"
        });
        if (st === "past" && c.mode === "all") return; // 지난 코스는 구간 버튼 생략
        for (var k = 0; k < route.length - 1; k++) {
          var a = route[k], b = route[k + 1];
          g.legsEl.insertAdjacentHTML("beforeend",
            '<a class="kmap-leg" href="' + fromToLink(a, b) + '" target="_blank" rel="noopener">' +
            esc(a.label) + ' ' + esc(a.name) + ' → ' + esc(b.label) + ' ' + esc(b.name) + ' 길찾기</a>');
        }
      });
      fit(found);

      [].forEach.call(c.box.querySelectorAll(".kmap-filter button"), function (btn) {
        btn.onclick = function () {
          var f = btn.getAttribute("data-f");
          [].forEach.call(c.box.querySelectorAll(".kmap-filter button"), function (b) { b.classList.toggle("on", b === btn); });
          if (open) { open.setMap(null); open = null; }
          if (c.pastWrap) { c.pastWrap.open = f === "past"; c.pastWrap.style.display = f === "future" ? "none" : ""; }
          var shown = [];
          c.groups.forEach(function (g) {
            var on = f === "all" || (f === "future" ? g.status !== "past" : g.status === "past");
            g.el.style.display = on ? "" : "none";
            if (g.line) g.line.setMap(on ? map : null);
            g.points.forEach(function (p) { if (p.ov) { p.ov.setMap(on ? map : null); if (on) shown.push(p); } });
          });
          if (shown.length) fit(shown);
        };
      });
      if (c.box.hasAttribute("data-live")) {
        var liveRoute;
        if (c.mode === "all") {
          // 메인: 오늘 코스, 없으면 가장 가까운 다음 코스
          var g0 = c.groups.filter(function (g) { return g.status === "today"; })[0] ||
                   c.groups.filter(function (g) { return g.status === "future"; })[0];
          liveRoute = g0 ? g0.points.filter(function (p) { return p.pos; }) : [];
        } else {
          liveRoute = found.filter(function (p) { return p.route; });
        }
        addLive(liveRoute);
      }
      done();
    }

    /* ---------- 지금 위치에서 출발 (누를 때만 위치 사용) ----------
     * 도로 경로: OSRM 공개 서버(키 불필요, OpenStreetMap 도로 기준). 실시간 교통은 반영 안 됨.
     * 실패하면 직선 + 대략 시간으로 대신 보여줌. 정확한 시간·경로는 카카오맵 길찾기 버튼으로.
     */
    function addLive(route) {
      if (!route.length || !navigator.geolocation) return;
      var bar = document.createElement("div");
      bar.className = "kmap-live";
      bar.innerHTML = '<button type="button" class="kmap-live-btn">📍 지금 위치에서 ' + esc(route[0].name) + '까지 길 보기</button>' +
        '<div class="kmap-live-out" aria-live="polite"></div>';
      var frame = el.parentNode; frame.parentNode.insertBefore(bar, frame);
      var btn = bar.querySelector("button"), out = bar.querySelector(".kmap-live-out");
      var drawn = [];
      // 한 번 위치를 허용해둔 휴대폰이면 페이지 열 때 자동으로 그려요
      var ld = c.box.getAttribute("data-live-date");
      if ((!ld || ld === TODAY) && navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "geolocation" }).then(function (st) {
          if (st.state === "granted") btn.onclick();
        }).catch(function () {});
      }
      btn.onclick = function () {
        btn.disabled = true; btn.textContent = "위치 찾는 중…";
        navigator.geolocation.getCurrentPosition(function (g) {
          var me = { name: "지금 위치", lat: g.coords.latitude, lng: g.coords.longitude };
          me.pos = new kakao.maps.LatLng(me.lat, me.lng);
          drawn.forEach(function (o) { o.setMap(null); }); drawn = [];
          var dot = document.createElement("div"); dot.className = "kme";
          drawn.push(new kakao.maps.CustomOverlay({ map: map, position: me.pos, content: dot, zIndex: 8 }));
          var stops = [me].concat(route);
          btn.textContent = "길 찾는 중…";
          osrm(stops, function (res) {
            btn.disabled = false; btn.textContent = "🔄 다시 찾기";
            var legs = res ? res.legs : stops.slice(1).map(function (b, i) { return roughLeg(stops[i], b); });
            var path = res ? res.path : stops.map(function (p) { return p.pos; });
            animate(path);
            fit([me].concat(route));
            var total = legs.reduce(function (a, l) { return a + l.min; }, 0);
            out.innerHTML =
              '<div class="kl-total">🚗 전체 약 <b>' + fmtMin(total) + '</b>' +
              (res ? '' : ' <small>(직선거리로 어림)</small>') + '</div>' +
              legs.map(function (l, i) {
                var a = stops[i], b = stops[i + 1];
                return '<div class="kl-leg"><span>' + esc(i === 0 ? "지금 위치" : a.label + " " + a.name) +
                  ' → ' + esc(b.label + " " + b.name) + '</span><b>' + fmtMin(l.min) + ' · ' + l.km.toFixed(1) + 'km</b></div>';
              }).join("") +
              '<p class="kl-note">' + (res ? "도로 기준 예상 시간이에요(막히는 건 반영 안 됨). " : "") +
              '실제 경로·시간은 아래 <b>길찾기</b> 버튼으로 카카오맵에서 보세요.</p>';
          });
        }, function () {
          btn.disabled = false; btn.textContent = "📍 지금 위치에서 코스 보기";
          out.innerHTML = '<p class="kl-note">위치 권한이 필요해요. 브라우저에서 위치 허용 후 다시 눌러주세요.</p>';
        }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
      };

      function osrm(stops, cb) {
        var url = "https://router.project-osrm.org/route/v1/driving/" +
          stops.map(function (p) { return p.lng.toFixed(6) + "," + p.lat.toFixed(6); }).join(";") +
          "?overview=full&geometries=geojson";
        var done = false;
        var timer = setTimeout(function () { if (!done) { done = true; cb(null); } }, 8000);
        fetch(url).then(function (r) { return r.json(); }).then(function (j) {
          if (done) return; done = true; clearTimeout(timer);
          if (!j.routes || !j.routes[0]) return cb(null);
          var r0 = j.routes[0];
          cb({
            path: r0.geometry.coordinates.map(function (xy) { return new kakao.maps.LatLng(xy[1], xy[0]); }),
            legs: r0.legs.map(function (l) { return { min: l.duration / 60, km: l.distance / 1000 }; })
          });
        }).catch(function () { if (!done) { done = true; clearTimeout(timer); cb(null); } });
      }
      function roughLeg(a, b) {
        var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
        var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        var km = 2 * R * Math.asin(Math.sqrt(h)) * 1.35; // 도로는 직선보다 35% 정도 길다고 보고
        return { km: km, min: km / 25 * 60 };          // 시내 평균 25km/h로 어림
      }
      function fmtMin(m) {
        m = Math.max(1, Math.round(m));
        return m >= 60 ? Math.floor(m / 60) + "시간 " + (m % 60 ? (m % 60) + "분" : "") : m + "분";
      }
      // 선이 출발점에서 목적지까지 그려지고, 점이 그 위를 따라 움직임
      function animate(path) {
        var color = getComputedStyle(c.box).getPropertyValue("--kmap-accent").trim() || "#E0618C";
        var line = new kakao.maps.Polyline({ map: map, path: [path[0]], strokeWeight: 6, strokeColor: color, strokeOpacity: 0.95 });
        var car = document.createElement("div"); car.className = "kcar"; car.textContent = "🚗";
        var carOv = new kakao.maps.CustomOverlay({ map: map, position: path[0], content: car, zIndex: 9 });
        drawn.push(line, carOv);
        var n = path.length, dur = Math.min(4000, 800 + n * 6), t0 = null;
        function step(ts) {
          if (!t0) t0 = ts;
          var k = Math.min(1, (ts - t0) / dur), idx = Math.max(1, Math.floor(k * (n - 1)) + 1);
          line.setPath(path.slice(0, idx));
          carOv.setPosition(path[idx - 1]);
          if (k < 1) requestAnimationFrame(step);
          else loop();
        }
        requestAnimationFrame(step);
        // 다 그린 뒤에는 차가 코스를 천천히 계속 돌아요
        function loop() {
          var i = 0;
          var id = setInterval(function () {
            if (!carOv.getMap()) return clearInterval(id);
            i = (i + Math.max(1, Math.floor(n / 120))) % n;
            carOv.setPosition(path[i]);
          }, 60);
        }
      }
    }

    function fit(list) {
      if (list.length === 1) { map.setCenter(list[0].pos); map.setLevel(4); return; }
      var bounds = new kakao.maps.LatLngBounds();
      list.forEach(function (p) { bounds.extend(p.pos); });
      map.setBounds(bounds, 60, 40, 40, 40);
    }
  }
})();
