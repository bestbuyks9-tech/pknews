(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const languageKey = "pkonline-language";
  const themeKey = "pkonline-theme";
  let language = "sq";

  const uiStrings = {
    sq: {
      feedLoading: "Po ngarkohen titujt e fundit…",
      feedReady: "Tituj nga burime lokale. Kliko një lajm për të hapur botuesin origjinal.",
      feedError: "Lajmet e drejtpërdrejta nuk u ngarkuan. Provo lidhjet e burimeve më poshtë.",
      read: "Lexo burimin ↗",
      visit: "Vizito botuesin ↗",
      today: "Sot",
      tomorrow: "Nesër",
      dayAfter: "Pasnesër",
      weatherError: "Moti nuk mund të ngarkohet tani",
      searchRequired: "Shkruaj një fjalë për të kërkuar.",
      weatherUpdated: "Përditësuar"
    },
    en: {
      feedLoading: "Loading the latest headlines…",
      feedReady: "Headlines from local publishers. Select a story to open the original publisher.",
      feedError: "Live headlines could not load. Use the publisher links below.",
      read: "Read source ↗",
      visit: "Visit publisher ↗",
      today: "Today",
      tomorrow: "Tomorrow",
      dayAfter: "Day after",
      weatherError: "Weather is temporarily unavailable",
      searchRequired: "Enter a word to search.",
      weatherUpdated: "Updated"
    }
  };

  const sourceFallbacks = [
    { name: "KOHA.NET", description: "Lajmet e fundit", url: "https://www.koha.net/" },
    { name: "TELEGRAFI", description: "Lajme nga Kosova dhe rajoni", url: "https://telegrafi.com/" },
    { name: "KALLXO", description: "Raportim dhe hulumtime", url: "https://kallxo.com/" },
    { name: "KOSOVAPRESS", description: "Agjenci e lajmeve", url: "https://kosovapress.com/" }
  ];
  const weatherCodes = {
    0: ["Diell", "Sunny", "☀️"], 1: ["Kryesisht kthjellët", "Mainly clear", "🌤️"],
    2: ["Pjesërisht me re", "Partly cloudy", "⛅"], 3: ["Me re", "Overcast", "☁️"],
    45: ["Mjegull", "Fog", "🌫️"], 48: ["Mjegull me brymë", "Rime fog", "🌫️"],
    51: ["Riga të lehta", "Light drizzle", "🌦️"], 53: ["Riga", "Drizzle", "🌦️"],
    55: ["Riga të dendura", "Dense drizzle", "🌧️"], 61: ["Shi i lehtë", "Light rain", "🌦️"],
    63: ["Shi", "Rain", "🌧️"], 65: ["Shi i dendur", "Heavy rain", "🌧️"],
    71: ["Borë e lehtë", "Light snow", "🌨️"], 73: ["Borë", "Snow", "🌨️"],
    75: ["Borë e dendur", "Heavy snow", "❄️"], 80: ["Rrebeshe", "Rain showers", "🌦️"],
    81: ["Rrebeshe", "Rain showers", "🌧️"], 82: ["Rrebeshe të forta", "Heavy showers", "🌧️"],
    95: ["Stuhi", "Thunderstorm", "⛈️"], 96: ["Stuhi me breshër", "Thunderstorm with hail", "⛈️"],
    99: ["Stuhi e fortë", "Severe thunderstorm", "⛈️"]
  };

  function setLanguage(next) {
    language = next === "en" ? "en" : "sq";
    document.documentElement.lang = language;
    $$("[data-sq][data-en]").forEach(el => {
      const value = el.getAttribute("data-" + language);
      if (value !== null) el.textContent = value;
    });
    $$("[data-placeholder-sq][data-placeholder-en]").forEach(el => {
      el.placeholder = el.getAttribute("data-placeholder-" + language) || "";
    });
    const languageButton = $("[data-language-toggle]");
    if (languageButton) languageButton.textContent = language === "sq" ? "EN ↗" : "SQ ↗";
    try { localStorage.setItem(languageKey, language); } catch (_) {}
    // Refresh the date and feed labels in the selected language.
    const dateEl = $("[data-current-date]");
    if (dateEl) dateEl.textContent = new Intl.DateTimeFormat(language === "sq" ? "sq-XK" : "en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(new Date());
    loadWeather();
    $$("[data-news-feed]").forEach(loadNewsFeed);
  }

  function setTheme(isDark) {
    document.body.classList.toggle("dark", Boolean(isDark));
    const button = $("[data-theme-toggle]");
    if (button) {
      button.setAttribute("aria-pressed", String(Boolean(isDark)));
      button.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    }
    try { localStorage.setItem(themeKey, isDark ? "dark" : "light"); } catch (_) {}
  }

  function safeText(value) {
    return String(value || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }

  function makeNewsCard(item) {
    const anchor = document.createElement("a");
    anchor.className = "news-card";
    const candidate = String(item.link || "");
    anchor.href = /^https?:\/\//i.test(candidate) ? candidate : "https://news.google.com/";
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    const source = document.createElement("div");
    source.className = "news-source";
    const sourceText = document.createElement("span");
    sourceText.textContent = safeText(item.author || item.source || "Lajme");
    const arrow = document.createElement("span");
    arrow.className = "news-arrow";
    arrow.textContent = "↗";
    source.append(sourceText, arrow);

    const title = document.createElement("h3");
    title.textContent = safeText(item.title) || "Lajm i ri";

    const meta = document.createElement("div");
    meta.className = "news-meta";
    const date = document.createElement("span");
    const published = item.pubDate ? new Date(item.pubDate) : null;
    date.textContent = published && !Number.isNaN(published.getTime())
      ? published.toLocaleDateString(language === "sq" ? "sq-XK" : "en-GB", { day: "numeric", month: "short" })
      : "Google News";
    const read = document.createElement("span");
    read.className = "news-arrow";
    read.textContent = uiStrings[language].read;
    meta.append(date, read);
    anchor.append(source, title, meta);
    return anchor;
  }

  function makeFallbackCard(source) {
    const item = document.createElement("a");
    item.className = "news-card";
    item.href = source.url;
    item.target = "_blank";
    item.rel = "noopener noreferrer";
    const header = document.createElement("div");
    header.className = "news-source";
    header.textContent = source.name;
    const title = document.createElement("h3");
    title.textContent = source.description;
    const meta = document.createElement("div");
    meta.className = "news-meta";
    const label = document.createElement("span");
    label.textContent = language === "sq" ? "Burim lajmesh" : "News publisher";
    const link = document.createElement("span");
    link.className = "news-arrow";
    link.textContent = uiStrings[language].visit;
    meta.append(label, link);
    item.append(header, title, meta);
    return item;
  }

  async function loadNewsFeed(grid) {
    if (!grid) return;
    if (grid.dataset.loading === "true") return;
    grid.dataset.loading = "true";
    const query = grid.dataset.feedQuery || "(site:koha.net OR site:telegrafi.com OR site:kallxo.com OR site:kosovapress.com) Kosovo";
    const count = Math.max(3, Math.min(12, Number(grid.dataset.count || 6)));
    const feed = "https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=" + (language === "sq" ? "sq" : "en-US") + "&gl=XK&ceid=" + (language === "sq" ? "XK:sq" : "US:en");
    const api = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(feed) + "&count=" + count;
    const status = grid.parentElement.querySelector("[data-feed-status]");
    if (status) status.textContent = uiStrings[language].feedLoading;

    // A short timeout prevents an unresponsive feed service from leaving the page in a loading state.
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = controller ? setTimeout(() => controller.abort(), 10000) : null;
    try {
      const response = await fetch(api, controller ? { signal: controller.signal } : {});
      if (!response.ok) throw new Error("Feed service returned " + response.status);
      const payload = await response.json();
      if (!Array.isArray(payload.items) || payload.items.length === 0) throw new Error("No headlines returned");
      const fragment = document.createDocumentFragment();
      payload.items.slice(0, count).forEach(item => fragment.appendChild(makeNewsCard(item)));
      grid.replaceChildren(fragment);
      if (status) status.textContent = uiStrings[language].feedReady;
    } catch (error) {
      const fragment = document.createDocumentFragment();
      sourceFallbacks.forEach(item => fragment.appendChild(makeFallbackCard(item)));
      grid.replaceChildren(fragment);
      if (status) status.textContent = uiStrings[language].feedError;
    } finally {
      if (timeout) clearTimeout(timeout);
      grid.dataset.loading = "false";
    }
  }

  async function loadWeather() {
    const widget = $("[data-weather-widget]");
    if (!widget || widget.dataset.loading === "true") return;
    widget.dataset.loading = "true";
    const codeText = weatherCodes;
    try {
      const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=42.6629&longitude=21.1655&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBelgrade&forecast_days=3");
      if (!response.ok) throw new Error("Weather service returned " + response.status);
      const data = await response.json();
      const current = data.current;
      const description = codeText[current.weather_code] || ["Kushtet aktuale", "Current conditions", "🌤️"];
      $("[data-weather-icon]", widget).textContent = description[2];
      $("[data-weather-condition]", widget).textContent = description[language === "sq" ? 0 : 1];
      $("[data-weather-temp]", widget).textContent = Math.round(current.temperature_2m) + "°C";
      $("[data-weather-feels]", widget).textContent = Math.round(current.apparent_temperature) + "°C";
      $("[data-weather-humidity]", widget).textContent = current.relative_humidity_2m + "%";
      $("[data-weather-wind]", widget).textContent = Math.round(current.wind_speed_10m) + " km/h";
      $("[data-weather-updated]", widget).textContent = new Date().toLocaleTimeString(language === "sq" ? "sq-XK" : "en-GB", { hour: "2-digit", minute: "2-digit" });
      const dayNames = [uiStrings[language].today, uiStrings[language].tomorrow, uiStrings[language].dayAfter];
      const forecast = $("[data-weather-forecast]", widget);
      forecast.replaceChildren();
      (data.daily.time || []).slice(0, 3).forEach((day, index) => {
        const code = codeText[data.daily.weather_code[index]] || ["Me re", "Cloudy", "☁️"];
        const node = document.createElement("span");
        node.className = "forecast-day";
        const dayName = document.createElement("span");
        dayName.textContent = dayNames[index] || day;
        const icon = document.createElement("span");
        icon.textContent = code[2];
        const temps = document.createElement("strong");
        temps.textContent = Math.round(data.daily.temperature_2m_max[index]) + "° / " + Math.round(data.daily.temperature_2m_min[index]) + "°";
        node.append(dayName, icon, temps);
        forecast.appendChild(node);
      });
      const source = document.createElement("span");
      source.className = "forecast-source";
      source.textContent = "Open-Meteo · " + uiStrings[language].weatherUpdated + " " + $("[data-weather-updated]", widget).textContent;
      forecast.appendChild(source);
    } catch (_) {
      const label = $("[data-weather-condition]", widget);
      if (label) label.textContent = uiStrings[language].weatherError;
      const forecast = $("[data-weather-forecast]", widget);
      if (forecast) {
        forecast.replaceChildren();
        const message = document.createElement("span");
        message.className = "forecast-day";
        message.textContent = "Open-Meteo · Prishtina";
        forecast.appendChild(message);
      }
    } finally {
      widget.dataset.loading = "false";
    }
  }

  function setupSearch() {
    const panel = $("[data-search-panel]");
    const open = $("[data-search-open]");
    const close = $("[data-search-close]");
    const form = $("[data-search-form]");
    const input = $("[data-search-input]");
    if (!panel || !open || !form || !input) return;
    open.addEventListener("click", () => {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) input.focus();
    });
    if (close) close.addEventListener("click", () => panel.classList.remove("open"));
    form.addEventListener("submit", event => {
      event.preventDefault();
      const query = input.value.trim();
      if (!query) {
        input.focus();
        input.setCustomValidity(uiStrings[language].searchRequired);
        input.reportValidity();
        return;
      }
      input.setCustomValidity("");
      window.location.href = "https://news.google.com/search?q=" + encodeURIComponent(query + " Kosovo") + "&hl=sq&gl=XK&ceid=XK:sq";
    });
    input.addEventListener("input", () => input.setCustomValidity(""));
  }

  function setupMenus() {
    // Category controls are ordinary links to separate documents.
    // Deliberately no click interception, history mutation, or JS scrolling.
    $$("a[data-page-link]").forEach(link => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) {
        link.setAttribute("href", "/");
      }
    });
  }

  function boot() {
    try {
      language = localStorage.getItem(languageKey) === "en" ? "en" : "sq";
    } catch (_) { language = "sq"; }
    setLanguage(language);
    let theme = "light";
    try { theme = localStorage.getItem(themeKey) || "light"; } catch (_) {}
    setTheme(theme === "dark");
    const languageButton = $("[data-language-toggle]");
    if (languageButton) {
      languageButton.addEventListener("click", () => setLanguage(language === "sq" ? "en" : "sq"));
    }
    const themeButton = $("[data-theme-toggle]");
    if (themeButton) themeButton.addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
    setupSearch();
    setupMenus();
    $$("[data-news-feed]").forEach(loadNewsFeed);
    loadWeather();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();