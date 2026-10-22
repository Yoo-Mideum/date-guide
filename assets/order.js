/* 일정 순서 자동 정리 — 오늘 일정은 맨 위로, 지난 일정은 맨 아래 '지난 일정'으로.
 * 메인: #sched 안의 [data-date] 카드 (data-end 있으면 그 날까지)
 * 계획: .d 블록의 .date 글자("10/17 토", "11/8 일 ~ 9 월", "11/14 토 · 15 일")
 */
(function () {
  function kstToday() {
    var d = new Date(Date.now() + 9 * 3600e3);
    return d.toISOString().slice(0, 10);
  }
  var TODAY = kstToday();
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(m, d) { var y = m < 7 ? 2027 : 2026; return y + "-" + pad(m) + "-" + pad(d); }
  function status(s, e) { e = e || s; return e < TODAY ? "past" : (s <= TODAY ? "today" : "future"); }

  var css = [
    ".is-now{position:relative;border-color:var(--pink,#E0618C)!important;box-shadow:0 0 0 3px rgba(224,97,140,.18)!important}",
    ".now-badge{display:inline-block;font-size:11px;font-weight:800;color:#fff;background:var(--pink,#E0618C);border-radius:999px;padding:2px 9px;margin:0 0 6px}",
    ".past-sched{margin-top:16px;border-top:1px dashed var(--line,#ddd);padding-top:8px}",
    ".past-sched summary{cursor:pointer;font-size:14px;font-weight:700;color:var(--muted,#888);padding:6px 2px;list-style:none}",
    ".past-sched summary::-webkit-details-marker{display:none}",
    ".past-sched > *:not(summary){opacity:.75}",
    ".today-h{margin-top:4px}"
  ].join("\n");

  function badge(el, text) {
    var b = document.createElement("span"); b.className = "now-badge"; b.textContent = text;
    el.insertBefore(b, el.firstChild);
  }
  function pastBox(n) {
    var d = document.createElement("details"); d.className = "past-sched";
    d.innerHTML = "<summary>✓ 지난 일정 " + n + "개 — 펼쳐보기</summary>";
    return d;
  }

  function main() {
    var box = document.getElementById("sched"); if (!box) return;
    var items = [].slice.call(box.querySelectorAll(":scope > [data-date]"));
    var today = [], past = [];
    items.forEach(function (el) {
      var st = status(el.getAttribute("data-date"), el.getAttribute("data-end"));
      if (st === "today") today.push(el); else if (st === "past") past.push(el);
    });
    today.reverse().forEach(function (el) { el.classList.add("is-now"); badge(el, "📍 오늘"); box.insertBefore(el, box.firstChild); });
    if (past.length) { var pb = pastBox(past.length); past.forEach(function (el) { pb.appendChild(el); }); box.appendChild(pb); }
  }

  function plan() {
    var blocks = [].slice.call(document.querySelectorAll(".wrap > .d"));
    if (!blocks.length) return;
    var today = [], past = [];
    blocks.forEach(function (el) {
      var t = (el.querySelector(".date") || {}).textContent || "";
      var m = t.match(/(\d{1,2})\/(\d{1,2})/); if (!m) return;
      var mo = +m[1], s = ymd(mo, +m[2]), e = s;
      var m2 = t.slice(m.index + m[0].length).match(/[~·]\s*(?:(\d{1,2})\/)?(\d{1,2})/);
      if (m2) e = ymd(m2[1] ? +m2[1] : mo, +m2[2]);
      var st = status(s, e);
      if (st === "today") today.push(el); else if (st === "past") past.push(el);
    });
    var wrap = blocks[0].parentNode;
    if (today.length) {
      var h = document.createElement("h2"); h.className = "today-h"; h.textContent = "📍 오늘";
      wrap.insertBefore(h, wrap.firstChild);
      var at = h.nextSibling;
      today.forEach(function (el) { el.classList.add("hi", "is-now"); wrap.insertBefore(el, at); });
    }
    if (past.length) {
      var pb = pastBox(past.length);
      past.forEach(function (el) { pb.appendChild(el); });
      var anchor = wrap.querySelector(".must") || wrap.querySelector(".back");
      wrap.insertBefore(pb, anchor);
    }
    // 블록이 하나도 안 남은 달 제목(h2 + hint)은 숨김
    [].slice.call(wrap.querySelectorAll(":scope > h2")).forEach(function (h2) {
      if (h2.classList.contains("today-h")) return;
      var n = h2.nextElementSibling, has = false;
      while (n && n.tagName !== "H2" && !n.classList.contains("must") && !n.classList.contains("past-sched")) {
        if (n.classList.contains("d")) { has = true; break; } n = n.nextElementSibling;
      }
      if (!has) { h2.hidden = true; var p = h2.nextElementSibling; if (p && p.classList.contains("hint")) p.hidden = true; }
    });
  }

  function run() {
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    main(); plan();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
