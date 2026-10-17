/* 반짝이는 티아라 — 모든 페이지 맨 위 (첫 header 안 맨 앞, 없으면 body 맨 앞) */
(function () {
  var _cs = document.currentScript;
  var css = [
    ".tiara{position:relative;width:150px;margin:0 auto 6px;pointer-events:none;animation:tfloat 3.4s ease-in-out infinite}",
    ".tiara img{display:block;width:100%;height:auto;filter:drop-shadow(0 4px 6px rgba(90,55,5,.35)) drop-shadow(0 0 14px rgba(255,236,170,.6));animation:tglow 2.6s ease-in-out infinite}",
    ".tiara .shine{position:absolute;inset:0;overflow:hidden;-webkit-mask-size:100% 100%;mask-size:100% 100%}",
    ".tiara .shine i{position:absolute;top:0;bottom:0;width:30%;left:-40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);transform:skewX(-20deg);animation:tsweep 3s ease-in-out infinite}",
    ".tiara .tw{position:absolute;color:#fff;font-size:14px;line-height:1;opacity:0;text-shadow:0 0 6px #fff,0 0 12px #FFE7A0;animation:ttw 2.2s ease-in-out infinite}",
    ".tiara .s1{left:68px;top:-6px}.tiara .s2{left:30px;top:30px;font-size:11px;animation-delay:.7s}",
    ".tiara .s3{right:26px;top:26px;font-size:12px;animation-delay:1.3s}.tiara .s4{left:60px;top:58px;font-size:10px;animation-delay:1.7s}",
    ".tiara .s5{right:52px;top:62px;font-size:10px;animation-delay:.3s}",
    "@keyframes tfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}",
    "@keyframes tglow{0%,100%{filter:drop-shadow(0 4px 6px rgba(90,55,5,.35)) drop-shadow(0 0 10px rgba(255,236,170,.45))}50%{filter:drop-shadow(0 4px 6px rgba(90,55,5,.35)) drop-shadow(0 0 20px rgba(255,240,190,.9))}}",
    "@keyframes tsweep{0%{left:-40%}60%,100%{left:120%}}",
    "@keyframes ttw{0%,100%{opacity:0;transform:scale(.3) rotate(0)}50%{opacity:1;transform:scale(1.2) rotate(30deg)}}",
    "@media (prefers-reduced-motion:reduce){.tiara,.tiara *{animation:none!important}.tiara .tw{opacity:.8}}"
  ].join("\n");

  // 루크가 만든 티아라 사진 (배경만 지움) + 빛줄기 + 반짝이
  var base = (_cs && _cs.src) || "";
  var src = base.replace(/crown\.js(\?.*)?$/, "crown.png?v=20261017-1500");
  var svg =
    '<img src="' + src + '" alt="" width="360" height="237">' +
    '<span class="shine" style="-webkit-mask-image:url(' + src + ');mask-image:url(' + src + ')"><i></i></span>';
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
