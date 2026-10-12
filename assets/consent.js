/* Consent gate for docandsendnotary.com.
   Third-party scripts stay unloaded until Accept, or until Chat with us
   (chat only). The choice is stored in localStorage under ds-consent-v1. */
(function () {
  "use strict";

  var STORAGE_KEY = "ds-consent-v1";
  var DEFAULT_TAWK = "https://embed.tawk.to/696d57412bf6a3197bbcbe0a/1jf9hpm4g";
  var tawkInjected = false;

  function tawkSrc() {
    var meta = document.querySelector('meta[name="ds-tawk-src"]');
    var src = meta && meta.getAttribute("content");
    return src || DEFAULT_TAWK;
  }

  function readRecord() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== 1) return null;
      if (data.choice === "accept" || data.choice === "reject" || data.choice === "chat") {
        return data;
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  function readChoice() {
    var record = readRecord();
    return record ? record.choice : null;
  }

  function writeChoice(choice) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          v: 1,
          choice: choice,
          at: new Date().toISOString()
        })
      );
    } catch (err) {
      /* Private browsing can block storage. The choice still applies this page view. */
    }
  }

  function applyGoogle(choice) {
    if (typeof window.gtag !== "function") return;
    var state = choice === "accept" ? "granted" : "denied";
    window.gtag("consent", "update", {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state,
      functionality_storage: state,
      personalization_storage: state
    });
  }

  function setChatButtonVisible(show) {
    var button = document.getElementById("ds-chat-btn");
    if (!button) return;
    if (show) button.removeAttribute("hidden");
    else button.setAttribute("hidden", "");
  }

  function hideTawk() {
    document.documentElement.classList.add("ds-tawk-suppressed");
    try {
      if (window.Tawk_API && typeof window.Tawk_API.hideWidget === "function") {
        window.Tawk_API.hideWidget();
      }
    } catch (err) {
      /* Widget may not be ready yet. onLoad checks the stored choice. */
    }
    setChatButtonVisible(true);
  }

  function showTawk() {
    document.documentElement.classList.remove("ds-tawk-suppressed");
    try {
      if (window.Tawk_API && typeof window.Tawk_API.showWidget === "function") {
        window.Tawk_API.showWidget();
      }
    } catch (err) {
      /* Widget script may still be downloading. */
    }
    setChatButtonVisible(false);
  }

  function loadTawk() {
    if (readChoice() === "reject") return;
    if (tawkInjected) {
      showTawk();
      return;
    }
    tawkInjected = true;
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    var priorOnLoad = window.Tawk_API.onLoad;
    window.Tawk_API.onLoad = function () {
      if (typeof priorOnLoad === "function") priorOnLoad();
      if (readChoice() === "reject") hideTawk();
      else showTawk();
    };
    var script = document.createElement("script");
    script.async = true;
    script.src = tawkSrc();
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    script.id = "ds-tawk-script";
    var first = document.getElementsByTagName("script")[0];
    if (first && first.parentNode) first.parentNode.insertBefore(script, first);
    else document.body.appendChild(script);
    setChatButtonVisible(false);
  }

  function syncBannerOffset() {
    var banner = document.getElementById("ds-consent-banner");
    var open = banner && !banner.hasAttribute("hidden");
    document.body.classList.toggle("ds-consent-open", !!open);
    var height = open ? banner.offsetHeight : 0;
    document.documentElement.style.setProperty("--ds-banner-offset", height + "px");
  }

  function statusText(choice) {
    if (choice === "accept") return "Current choice: Accept.";
    if (choice === "reject") return "Current choice: Reject.";
    if (choice === "chat") {
      return "Current choice: chat only. The chat widget may load. Other optional tools stay off.";
    }
    return "";
  }

  function openBanner() {
    var banner = document.getElementById("ds-consent-banner");
    if (!banner) return;
    var status = document.getElementById("ds-consent-status");
    if (status) status.textContent = statusText(readChoice());
    banner.removeAttribute("hidden");
    syncBannerOffset();
    banner.focus();
  }

  function closeBanner() {
    var banner = document.getElementById("ds-consent-banner");
    if (!banner) return;
    banner.setAttribute("hidden", "");
    syncBannerOffset();
  }

  function choose(choice) {
    writeChoice(choice);
    applyGoogle(choice);
    if (choice === "accept" || choice === "chat") loadTawk();
    else hideTawk();
    closeBanner();
  }

  function buildBanner() {
    var banner = document.createElement("div");
    banner.id = "ds-consent-banner";
    banner.className = "ds-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-labelledby", "ds-consent-title");
    banner.setAttribute("aria-describedby", "ds-consent-desc");
    banner.tabIndex = -1;
    banner.hidden = true;
    banner.innerHTML =
      '<div class="ds-consent-inner">' +
      '<div class="ds-consent-copy">' +
      '<h2 id="ds-consent-title">Optional tools</h2>' +
      '<p id="ds-consent-desc">Third-party scripts stay off until you choose. Accept loads the tawk.to chat widget, which is operated by a third party. Reject keeps those scripts off. Phone and email stay available either way. See the <a href="/privacy/">privacy page</a>. You can change this later with Cookie settings.</p>' +
      '<p id="ds-consent-status" class="ds-consent-status" role="status"></p>' +
      "</div>" +
      '<div class="ds-consent-actions">' +
      '<button type="button" class="ds-consent-choice" id="ds-consent-accept">Accept</button>' +
      '<button type="button" class="ds-consent-choice" id="ds-consent-reject">Reject</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(banner);
    document.getElementById("ds-consent-accept").addEventListener("click", function () {
      choose("accept");
    });
    document.getElementById("ds-consent-reject").addEventListener("click", function () {
      choose("reject");
    });
  }

  function buildDock() {
    var dock = document.createElement("aside");
    dock.className = "ds-contact-dock";
    dock.setAttribute("aria-label", "Contact Doc and Send");
    dock.innerHTML =
      '<a class="ds-dock-link" href="tel:16154842552">Call 615-484-2552</a>' +
      '<a class="ds-dock-link" href="mailto:docandsendnotary@gmail.com">Email</a>' +
      '<button type="button" class="ds-chat-btn" id="ds-chat-btn">Chat with us</button>';
    document.body.appendChild(dock);
    document.getElementById("ds-chat-btn").addEventListener("click", function () {
      choose("chat");
    });
  }

  function bindSettings() {
    var links = document.querySelectorAll("a.ds-cookie-settings, a[href='#cookie-settings']");
    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        openBanner();
      });
    });
  }

  function onKeydown(event) {
    if (event.key !== "Escape") return;
    var banner = document.getElementById("ds-consent-banner");
    if (!banner || banner.hasAttribute("hidden")) return;
    if (readChoice()) closeBanner();
  }

  function init() {
    buildBanner();
    buildDock();
    bindSettings();
    document.addEventListener("keydown", onKeydown);
    window.addEventListener("resize", syncBannerOffset);

    var choice = readChoice();
    applyGoogle(choice || "reject");
    if (choice === "accept" || choice === "chat") {
      loadTawk();
      closeBanner();
    } else if (choice === "reject") {
      setChatButtonVisible(true);
      closeBanner();
    } else {
      setChatButtonVisible(true);
      openBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
