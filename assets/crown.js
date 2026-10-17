/* 반짝이는 티아라 — 모든 페이지 맨 위 (첫 header 안 맨 앞, 없으면 body 맨 앞) */
(function () {
  var css = [
    ".tiara{position:relative;width:132px;height:74px;margin:0 auto 6px;pointer-events:none;animation:tfloat 3.4s ease-in-out infinite}",
    ".tiara svg{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 4px 6px rgba(90,55,5,.35)) drop-shadow(0 0 12px rgba(255,236,170,.55))}",
    ".tiara .gem{animation:tgem 2.4s ease-in-out infinite}",
    ".tiara .g2{animation-delay:.6s}.tiara .g3{animation-delay:1.2s}.tiara .g4{animation-delay:1.8s}",
    ".tiara .sweep{animation:tsweep 3s ease-in-out infinite}",
    ".tiara .tw{position:absolute;color:#fff;font-size:13px;line-height:1;opacity:0;text-shadow:0 0 6px #fff,0 0 12px #FFE7A0;animation:ttw 2.2s ease-in-out infinite}",
    ".tiara .s1{left:62px;top:-8px}.tiara .s2{left:22px;top:18px;font-size:10px;animation-delay:.7s}",
    ".tiara .s3{right:20px;top:14px;font-size:11px;animation-delay:1.3s}.tiara .s4{left:44px;top:44px;font-size:9px;animation-delay:1.7s}",
    ".tiara .s5{right:40px;top:46px;font-size:9px;animation-delay:.3s}",
    "@keyframes tfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}",
    "@keyframes tgem{0%,100%{opacity:.15}50%{opacity:1}}",
    "@keyframes tsweep{0%{transform:translateX(-60px) skewX(-20deg)}60%,100%{transform:translateX(230px) skewX(-20deg)}}",
    "@keyframes ttw{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1.2) rotate(30deg)}}",
    "@media (prefers-reduced-motion:reduce){.tiara,.tiara *{animation:none!important}.tiara .tw{opacity:.8}}"
  ].join("\n");

  // 물방울 크리스털
  function drop(cx, top, w, h, cls) {
    var b = top + h, r = w / 2;
    var d = "M" + cx + " " + top + " C" + (cx + r * 0.35) + " " + (top + h * 0.35) + ", " + (cx + r) + " " + (top + h * 0.55) + ", " + (cx + r) + " " + (b - r) +
      " A" + r + " " + r + " 0 0 1 " + (cx - r) + " " + (b - r) +
      " C" + (cx - r) + " " + (top + h * 0.55) + ", " + (cx - r * 0.35) + " " + (top + h * 0.35) + ", " + cx + " " + top + " Z";
    return '<path d="' + d + '" fill="url(#tiara-tc)" stroke="#B88A2C" stroke-width="2.4"/>' +
      '<path d="M' + cx + ' ' + (top + 3) + ' L' + (cx - r * 0.55) + ' ' + (b - r) + ' L' + cx + ' ' + (b - 2) + ' L' + (cx + r * 0.55) + ' ' + (b - r) + ' Z" fill="none" stroke="#C9D6E3" stroke-width=".7" opacity=".9"/>' +
      '<path d="M' + (cx - r * 0.35) + ' ' + (b - r - 2) + ' L' + cx + ' ' + (top + h * 0.3) + '" stroke="#fff" stroke-width="1.2" opacity=".9"/>' +
      '<circle class="gem ' + cls + '" cx="' + (cx - r * 0.25) + '" cy="' + (b - r - 1) + '" r="' + (r * 0.32) + '" fill="#fff"/>';
  }
  // 둥근 크리스털 (띠)
  function stone(x, y, r, i) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#tiara-ts)" stroke="#A97C22" stroke-width="1"/>' +
      '<circle cx="' + (x - r * 0.3) + '" cy="' + (y - r * 0.3) + '" r="' + (r * 0.35) + '" fill="#fff" class="gem g' + (i % 4 + 1) + '"/>';
  }

  var stones = "";
  for (var i = 0; i < 15; i++) {
    var t = i / 14, x = 22 + t * 176, y = 120 - Math.sin(t * Math.PI) * 6;
    stones += stone(x, y, 4.3, i);
  }

  var svg =
    '<svg viewBox="0 0 220 132" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<defs>' +
    '<linearGradient id="tiara-tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3C6"/><stop offset=".35" stop-color="#E9C46A"/><stop offset=".7" stop-color="#C08F2E"/><stop offset="1" stop-color="#8A6214"/></linearGradient>' +
    '<linearGradient id="tiara-tc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#E7EEF5"/><stop offset=".7" stop-color="#BFCBD8"/><stop offset="1" stop-color="#F7FAFD"/></linearGradient>' +
    '<radialGradient id="tiara-ts" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#DCE5EE"/><stop offset="1" stop-color="#9FB0C2"/></radialGradient>' +
    '<linearGradient id="tiara-tw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<clipPath id="tiara-tclip"><path d="M14 126 L14 108 L26 66 L36 92 L52 46 L68 86 L86 40 L110 4 L134 40 L152 86 L168 46 L184 92 L194 66 L206 108 L206 126 Z"/></clipPath>' +
    '</defs>' +
    // 가지들 (금 테두리 오픈워크)
    '<g fill="none" stroke="url(#tiara-tg)" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round">' +
    '<path d="M110 6 C100 30, 92 48, 82 62 C92 68, 100 78, 110 100 C120 78, 128 68, 138 62 C128 48, 120 30, 110 6 Z"/>' +
    '<path d="M66 40 C60 58, 54 70, 46 80 C54 86, 60 94, 66 106 C72 94, 78 86, 86 80 C78 70, 72 58, 66 40 Z"/>' +
    '<path d="M154 40 C148 58, 142 70, 134 80 C142 86, 148 94, 154 106 C160 94, 166 86, 174 80 C166 70, 160 58, 154 40 Z"/>' +
    '<path d="M30 62 C27 76, 23 86, 18 94 C24 100, 28 104, 30 110 C33 104, 37 100, 42 94 C37 86, 33 76, 30 62 Z"/>' +
    '<path d="M190 62 C187 76, 183 86, 178 94 C184 100, 188 104, 190 110 C193 104, 197 100, 202 94 C197 86, 193 76, 190 62 Z"/>' +
    // 사이 작은 가지 + 소용돌이
    '<path d="M88 58 C86 72, 84 82, 88 96 M132 58 C134 72, 136 82, 132 96"/>' +
    '<path d="M44 70 C42 82, 44 94, 48 104 M176 70 C178 82, 176 94, 172 104"/>' +
    '<path d="M78 100 C72 92, 80 86, 84 92 M142 100 C148 92, 140 86, 136 92"/>' +
    '<path d="M38 104 C34 98, 40 94, 42 98 M182 104 C186 98, 180 94, 178 98"/>' +
    '</g>' +
    // 가지 끝 장식
    '<g fill="url(#tiara-tg)" stroke="#8A6214" stroke-width="1">' +
    '<path d="M110 0 L115 8 L110 14 L105 8 Z"/><path d="M66 34 L70 40 L66 46 L62 40 Z"/><path d="M154 34 L158 40 L154 46 L150 40 Z"/>' +
    '<path d="M30 56 L33 62 L30 67 L27 62 Z"/><path d="M190 56 L193 62 L190 67 L187 62 Z"/>' +
    '<circle cx="88" cy="56" r="3"/><circle cx="132" cy="56" r="3"/><circle cx="44" cy="68" r="2.6"/><circle cx="176" cy="68" r="2.6"/>' +
    '</g>' +
    // 크리스털
    drop(110, 34, 22, 46, "g1") + drop(66, 60, 15, 32, "g2") + drop(154, 60, 15, 32, "g3") +
    drop(30, 76, 10, 22, "g4") + drop(190, 76, 10, 22, "g1") +
    '<circle cx="110" cy="20" r="3.4" fill="url(#tiara-ts)" stroke="#A97C22"/><circle cx="66" cy="52" r="2.6" fill="url(#tiara-ts)" stroke="#A97C22"/><circle cx="154" cy="52" r="2.6" fill="url(#tiara-ts)" stroke="#A97C22"/>' +
    // 띠
    '<path d="M12 112 Q110 100 208 112 L208 128 Q110 116 12 128 Z" fill="url(#tiara-tg)" stroke="#8A6214" stroke-width="1.6"/>' +
    '<path d="M14 114.5 Q110 102.5 206 114.5" fill="none" stroke="#FFF6D2" stroke-width="1" opacity=".8"/>' +
    stones +
    // 빛 지나가기
    '<g clip-path="url(#tiara-tclip)"><rect class="sweep" x="0" y="0" width="34" height="132" fill="url(#tiara-tw)"/></g>' +
    '</svg>';

  function mount() {
    if (document.querySelector(".tiara")) return;
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    var el = document.createElement("div");
    el.className = "tiara";
    el.innerHTML = svg + '<span class="tw s1">✦</span><span class="tw s2">✧</span><span class="tw s3">✦</span><span class="tw s4">✧</span><span class="tw s5">✦</span>';
    var host = document.querySelector("header") || document.body;
    host.insertBefore(el, host.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
