/* ============================================================
 *  Geurmaatje — embed loader for Shopify / any website
 *  Add ONE line to the theme (before </body>):
 *    <script src="https://geurbar-chatbot.vercel.app/embed.js" defer></script>
 *
 *  Optional overrides via data-attributes:
 *    data-app  = chat app URL   (default: this script's origin)
 *    data-api  = backend URL    (default: geurbar-chatbot-backend.vercel.app)
 *
 *  Self-contained, Shadow-DOM isolated, fully responsive.
 * ============================================================ */
(function () {
  "use strict";
  if (window.__geurmaatjeEmbed) return;
  window.__geurmaatjeEmbed = true;

  var script = document.currentScript ||
    (function () { var s = document.getElementsByTagName("script"); return s[s.length - 1]; })();
  var origin = (function () { try { return new URL(script.src).origin; } catch (e) { return "https://geurbar-chatbot.vercel.app"; } })();
  var APP = (script.getAttribute("data-app") || origin).replace(/\/$/, "");
  var API = (script.getAttribute("data-api") || "https://geurbar-chatbot-backend.vercel.app").replace(/\/$/, "");

  var cfg = { botName: "Geurmaatje", teaser: "Klaar om een geurtje te kiezen? 😊", accentColor: "#141414" };
  var open = false;

  // ---- Shadow host --------------------------------------------------------
  var host = document.createElement("div");
  host.id = "geurmaatje-embed";
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent =
    ":host{all:initial}*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
    ".wrap{position:fixed;bottom:20px;right:20px;z-index:2147483000;display:flex;align-items:center;gap:10px}" +
    ".teaser{background:#fff;color:#141414;padding:10px 14px;border-radius:16px;box-shadow:0 6px 24px rgba(0,0,0,.18);font-size:14px;max-width:220px;line-height:1.35;cursor:pointer;position:relative;animation:gm-pop .3s ease}" +
    ".teaser:after{content:'';position:absolute;right:-6px;bottom:14px;border:7px solid transparent;border-left-color:#fff}" +
    ".teaser .x{position:absolute;top:-8px;left:-8px;width:20px;height:20px;border-radius:50%;background:#141414;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer}" +
    ".btn{width:62px;height:62px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 8px 28px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;flex:0 0 auto;transition:transform .15s}" +
    ".btn:hover{transform:scale(1.06)}.btn svg{width:28px;height:28px}" +
    ".panel{position:fixed;bottom:96px;right:20px;width:392px;max-width:calc(100vw - 32px);height:640px;max-height:calc(100vh - 120px);border:none;border-radius:20px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.4);z-index:2147483000;background:#fff;animation:gm-up .25s ease}" +
    ".panel iframe{width:100%;height:100%;border:0;display:block}" +
    "@keyframes gm-pop{from{opacity:0;transform:translateY(8px)}to{opacity:1}}" +
    "@keyframes gm-up{from{opacity:0;transform:translateY(20px)}to{opacity:1}}" +
    "@media(max-width:520px){.panel{bottom:0;right:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0}.wrap{bottom:16px;right:16px}}";
  root.appendChild(style);

  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg>';
  var ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var wrap = document.createElement("div");
  wrap.className = "wrap";
  wrap.innerHTML =
    '<div class="teaser" style="display:none"><span class="x">×</span><span class="ttxt"></span></div>' +
    '<button class="btn" aria-label="Open chat"></button>';
  root.appendChild(wrap);

  var panel = null;
  var btn = root.querySelector(".btn");
  var teaser = root.querySelector(".teaser");
  var ttxt = root.querySelector(".ttxt");
  var teaserX = root.querySelector(".x");

  function paint() {
    btn.style.background = cfg.accentColor || "#141414";
    btn.innerHTML = open ? ICON_CLOSE : ICON_CHAT;
  }
  function openPanel() {
    open = true; teaser.style.display = "none";
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "panel";
      panel.innerHTML = '<iframe src="' + APP + '/?embed=1" title="' + cfg.botName + '" allow="clipboard-write"></iframe>';
      root.appendChild(panel);
    } else panel.style.display = "block";
    paint();
  }
  function closePanel() { open = false; if (panel) panel.style.display = "none"; paint(); }
  function toggle() { open ? closePanel() : openPanel(); }

  btn.addEventListener("click", toggle);
  teaser.addEventListener("click", openPanel);
  teaserX.addEventListener("click", function (e) { e.stopPropagation(); teaser.style.display = "none"; });

  paint();

  // Load brand settings for the launcher (teaser text + accent color).
  fetch(API + "/api/settings").then(function (r) { return r.json(); }).then(function (s) {
    cfg = Object.assign(cfg, s); paint();
  }).catch(function () {}).finally(function () {
    setTimeout(function () { if (!open) { ttxt.textContent = cfg.teaser; teaser.style.display = "block"; } }, 2500);
  });

  // Allow the chat app (inside the iframe) to request closing the panel.
  window.addEventListener("message", function (e) {
    if (e && e.data === "geurmaatje:close") closePanel();
  });
})();
