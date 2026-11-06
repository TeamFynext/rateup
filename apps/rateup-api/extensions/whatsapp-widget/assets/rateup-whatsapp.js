/**
 * RateUp WhatsApp chat button for Shopify storefronts.
 *
 * Loaded by blocks/whatsapp-embed.liquid, which also prints the config this
 * reads from <script id="rateup-wa-config">. Plain ES5-style JS with no
 * dependencies and no build step: Shopify serves this file as written and
 * reviews its effect on storefront performance, so keep it small.
 *
 * `settings` is the public payload rateup-api writes to the `rateup.widget`
 * metafield: { enabled, phone, buttonLabel, greeting, prefill, productPrefill,
 * color, position, offsetY, showOn, hideOnMobile, eventUrl }.
 */
(function () {
  "use strict";

  var ROOT_ID = "rateup-wa";
  // Same cap as WHATSAPP_PREFILL_MAX_LENGTH in rateup-ui/src/utils/whatsappLink.ts.
  var PREFILL_MAX_LENGTH = 1000;
  var DEFAULT_LABEL = "Chat on WhatsApp";
  // Shopify's page types, mapped to the names used in the `showOn` setting.
  var PAGE_NAMES = { index: "home" };
  var ICON =
    '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099' +
    "-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255" +
    "-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133" +
    ".298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669" +
    "-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074" +
    "-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 " +
    "3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758" +
    "-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403" +
    "h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 " +
    "01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 " +
    "0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0" +
    "C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 " +
    '11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';

  function readConfig() {
    var el = document.getElementById("rateup-wa-config");
    if (!el) return null;
    try {
      return JSON.parse(el.textContent || "");
    } catch (e) {
      return null;
    }
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function shouldShow(showOn, pageType) {
    if (!showOn || !showOn.length || showOn.indexOf("all") !== -1) return true;
    return showOn.indexOf(PAGE_NAMES[pageType] || pageType) !== -1;
  }

  // Mirrors buildWhatsAppLink in rateup-ui: digits-only number, capped text.
  function buildLink(phone, message) {
    var trimmed = message.slice(0, PREFILL_MAX_LENGTH);
    return "https://wa.me/" + phone + (trimmed ? "?text=" + encodeURIComponent(trimmed) : "");
  }

  function buildMessage(settings, product) {
    var template = (product && text(settings.productPrefill)) || text(settings.prefill);
    return template
      .replace(/\{product\}/g, product ? product.title : "")
      .replace(/\{url\}/g, product ? product.url : window.location.href)
      .trim();
  }

  function init() {
    var config = readConfig();
    if (!config || document.getElementById(ROOT_ID)) return;

    var settings = config.settings || {};
    var phone = String(settings.phone || "").replace(/\D/g, "");
    if (!settings.enabled || !phone) return;
    if (!shouldShow(settings.showOn, config.pageType)) return;

    var link = buildLink(phone, buildMessage(settings, config.product));
    var label = text(settings.buttonLabel) || DEFAULT_LABEL;
    var greeting = text(settings.greeting);

    function track(event) {
      if (!settings.eventUrl) return;
      var body = JSON.stringify({ shop: config.shop, event: event, pageType: config.pageType });
      try {
        // A string body goes out as text/plain, which needs no CORS preflight
        // and still arrives when the tap navigates away to WhatsApp.
        if (navigator.sendBeacon) {
          navigator.sendBeacon(settings.eventUrl, body);
        } else {
          fetch(settings.eventUrl, {
            method: "POST",
            body: body,
            mode: "no-cors",
            keepalive: true,
          });
        }
      } catch (e) {
        // Tracking must never break the button.
      }
    }

    function chatLink(className) {
      var a = document.createElement("a");
      a.className = className;
      a.href = link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.addEventListener("click", function () {
        track("click");
      });
      return a;
    }

    var root = document.createElement("div");
    root.id = ROOT_ID;
    root.className =
      "rateup-wa--" +
      (settings.position === "left" ? "left" : "right") +
      (settings.hideOnMobile ? " rateup-wa--hide-mobile" : "");
    if (/^#[0-9a-f]{3,8}$/i.test(settings.color || "")) {
      root.style.setProperty("--rateup-wa-color", settings.color);
    }
    var offsetY = Number(settings.offsetY);
    if (offsetY >= 0 && offsetY <= 400) {
      root.style.setProperty("--rateup-wa-offset-y", offsetY + "px");
    }

    var bubble;
    if (greeting) {
      // With a greeting, the bubble opens a card and the card links to WhatsApp.
      var card = document.createElement("div");
      card.className = "rateup-wa__card";
      card.id = ROOT_ID + "-card";
      card.hidden = true;

      var close = document.createElement("button");
      close.type = "button";
      close.className = "rateup-wa__close";
      close.setAttribute("aria-label", "Close");
      close.textContent = "×";

      var message = document.createElement("p");
      message.className = "rateup-wa__greeting";
      message.textContent = greeting;

      var cta = chatLink("rateup-wa__cta");
      cta.textContent = label;

      card.appendChild(close);
      card.appendChild(message);
      card.appendChild(cta);
      root.appendChild(card);

      bubble = document.createElement("button");
      bubble.type = "button";
      bubble.setAttribute("aria-controls", card.id);
      bubble.setAttribute("aria-expanded", "false");

      var setOpen = function (open) {
        card.hidden = !open;
        bubble.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) track("open");
      };
      bubble.addEventListener("click", function () {
        setOpen(card.hidden);
      });
      close.addEventListener("click", function () {
        setOpen(false);
        bubble.focus();
      });
      root.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !card.hidden) {
          setOpen(false);
          bubble.focus();
        }
      });
    } else {
      // Without one, the bubble is the link, so a tap is both an open and a click.
      bubble = chatLink("");
      bubble.addEventListener("click", function () {
        track("open");
      });
    }

    bubble.className = "rateup-wa__bubble";
    bubble.setAttribute("aria-label", label);
    bubble.title = label;
    bubble.innerHTML = ICON;
    root.appendChild(bubble);

    document.body.appendChild(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
