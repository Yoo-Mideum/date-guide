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
      '<div class="kmap" role="region" aria-label="데이트 지도"><div class="kmap-msg">지도 불러오는 중…</div></div>' +
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
      done();
    }

    function fit(list) {
      if (list.length === 1) { map.setCenter(list[0].pos); map.setLevel(4); return; }
      var bounds = new kakao.maps.LatLngBounds();
      list.forEach(function (p) { bounds.extend(p.pos); });
      map.setBounds(bounds, 60, 40, 40, 40);
    }
  }
})();
