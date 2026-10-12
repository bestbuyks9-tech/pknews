(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const languageKey = "pkonline-language", themeKey = "pkonline-theme";
  let language = "sq", weatherData = null, weatherPromise = null;
  const text = {
    sq: {searchRequired:"Shkruaj një fjalë për të kërkuar.", weatherError:"Moti nuk mund të ngarkohet tani", today:"Sot",tomorrow:"Nesër",dayAfter:"Pasnesër",read:"Lexo artikullin ↗",noResults:"Nuk u gjet asnjë artikull për këtë kërkim.",resultsFor:"Rezultatet për",searchTitle:"Kërko në PK Online",updated:"Përditësuar"},
    en: {searchRequired:"Enter a word to search.", weatherError:"Weather is temporarily unavailable",today:"Today",tomorrow:"Tomorrow",dayAfter:"Day after",read:"Read article ↗",noResults:"No articles matched your search.",resultsFor:"Results for",searchTitle:"Search PK Online",updated:"Updated"}
  };
  const codes = {
    0:["Diell","Sunny","☀️"],1:["Kryesisht kthjellët","Mainly clear","🌤️"],2:["Pjesërisht me re","Partly cloudy","⛅"],3:["Me re","Overcast","☁️"],45:["Mjegull","Fog","🌫️"],48:["Mjegull me brymë","Rime fog","🌫️"],51:["Riga të lehta","Light drizzle","🌦️"],53:["Riga","Drizzle","🌦️"],55:["Riga të dendura","Dense drizzle","🌧️"],61:["Shi i lehtë","Light rain","🌦️"],63:["Shi","Rain","🌧️"],65:["Shi i dendur","Heavy rain","🌧️"],71:["Borë e lehtë","Light snow","🌨️"],73:["Borë","Snow","🌨️"],75:["Borë e dendur","Heavy snow","❄️"],80:["Rrebeshe","Rain showers","🌦️"],81:["Rrebeshe","Rain showers","🌧️"],82:["Rrebeshe të forta","Heavy showers","🌧️"],95:["Stuhi","Thunderstorm","⛈️"],96:["Stuhi me breshër","Thunderstorm with hail","⛈️"],99:["Stuhi e fortë","Severe thunderstorm","⛈️"]
  };
  function setLanguage(next) {
    language = next === "en" ? "en" : "sq";
    document.documentElement.lang = language;
    $$("[data-sq][data-en]").forEach(el => { const value=el.getAttribute("data-"+language); if(value!==null) el.textContent=value; });
    $$("[data-placeholder-sq][data-placeholder-en]").forEach(el => { el.placeholder=el.getAttribute("data-placeholder-"+language)||""; });
    const btn=$("[data-language-toggle]"); if(btn) btn.textContent=language==="sq"?"EN ↗":"SQ ↗";
    try { localStorage.setItem(languageKey,language); } catch(_){}
    const date=$("[data-current-date]"); if(date) date.textContent=new Intl.DateTimeFormat(language==="sq"?"sq-XK":"en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date());
    if(weatherData) renderWeather(weatherData);
    renderLocalSearch();
  }
  function setTheme(dark) {
    document.body.classList.toggle("dark",Boolean(dark));
    const btn=$("[data-theme-toggle]");
    if(btn){btn.setAttribute("aria-pressed",String(Boolean(dark)));btn.setAttribute("aria-label",dark?"Switch to light theme":"Switch to dark theme");}
    try{localStorage.setItem(themeKey,dark?"dark":"light");}catch(_){}
  }
  function setupSearch(){
    const panel=$("[data-search-panel]"),open=$("[data-search-open]"),close=$("[data-search-close]");
    if(panel&&open) open.addEventListener("click",()=>{
      panel.classList.toggle("open");
      open.setAttribute("aria-expanded",String(panel.classList.contains("open")));
      const input=$("[data-search-input]",panel);
      if(panel.classList.contains("open")&&input)input.focus();
    });
    if(panel&&close) close.addEventListener("click",()=>panel.classList.remove("open"));
    $$("[data-search-form], [data-local-search-form]").forEach(form=>{
      const input=$("[data-search-input], [data-local-search-input]",form);
      if(!input)return;
      form.addEventListener("submit",event=>{
        event.preventDefault();
        const q=input.value.trim();
        if(!q){input.setCustomValidity(text[language].searchRequired);input.reportValidity();return;}
        input.setCustomValidity("");
        window.location.href="/kerkimi/?q="+encodeURIComponent(q);
      });
      input.addEventListener("input",()=>input.setCustomValidity(""));
    });
  }
  function card(article){
    const a=document.createElement("a");a.className="story-card";a.href=article.path;
    const cover=document.createElement("div");cover.className="cover-art";cover.setAttribute("data-symbol",article.symbol||"PK");
    const badge=document.createElement("span");badge.className="cover-art-label";badge.textContent=language==="sq"?article.categorySq:article.categoryEn;cover.appendChild(badge);
    const body=document.createElement("div");body.className="story-card-body";
    const meta=document.createElement("div");meta.className="story-card-meta";
    const date=document.createElement("span");date.textContent=article.date;
    const time=document.createElement("span");time.textContent=article.minutes+(language==="sq"?" min lexim":" min read");meta.append(date,time);
    const title=document.createElement("h2");title.textContent=language==="sq"?article.titleSq:article.titleEn;
    const summary=document.createElement("p");summary.textContent=language==="sq"?article.summarySq:article.summaryEn;
    const read=document.createElement("div");read.className="story-card-more";read.textContent=text[language].read;
    body.append(meta,title,summary,read);a.append(cover,body);return a;
  }
  function renderLocalSearch(){
    const container=$("[data-search-results]");if(!container||!Array.isArray(window.PK_ARTICLES))return;
    const q=(new URLSearchParams(window.location.search).get("q")||"").trim();
    const normalized=q.toLocaleLowerCase(language==="sq"?"sq-XK":"en-GB");
    const heading=$("[data-search-heading]");if(heading)heading.textContent=normalized?text[language].resultsFor+': “'+q+'”':text[language].searchTitle;
    const input=$("[data-local-search-input]")||$("[data-search-input]");if(input)input.value=q;
    const results=window.PK_ARTICLES.filter(a=>[a.titleSq,a.titleEn,a.summarySq,a.summaryEn,a.categorySq,a.categoryEn,a.keywords].join(" ").toLocaleLowerCase(language==="sq"?"sq-XK":"en-GB").includes(normalized));
    container.replaceChildren();
    if(results.length)results.forEach(a=>container.appendChild(card(a)));
    else {const p=document.createElement("p");p.className="search-empty";p.textContent=text[language].noResults;container.appendChild(p);}
    const count=$("[data-search-count]");if(count)count.textContent=results.length+(language==="sq"?" artikuj":" articles");
  }
  function renderWeather(data){
    const widget=$("[data-weather-widget]");if(!widget||!data?.current)return;
    const c=data.current,desc=codes[c.weather_code]||["Kushtet aktuale","Current conditions","🌤️"];
    $("[data-weather-icon]",widget).textContent=desc[2];$("[data-weather-condition]",widget).textContent=desc[language==="sq"?0:1];$("[data-weather-temp]",widget).textContent=Math.round(c.temperature_2m)+"°C";$("[data-weather-feels]",widget).textContent=Math.round(c.apparent_temperature)+"°C";$("[data-weather-humidity]",widget).textContent=c.relative_humidity_2m+"%";$("[data-weather-wind]",widget).textContent=Math.round(c.wind_speed_10m)+" km/h";
    const time=$("[data-weather-updated]",widget);if(time)time.textContent=new Date().toLocaleTimeString(language==="sq"?"sq-XK":"en-GB",{hour:"2-digit",minute:"2-digit"});
    const forecast=$("[data-weather-forecast]",widget);if(!forecast)return;forecast.replaceChildren();
    (data.daily.time||[]).slice(0,3).forEach((date,i)=>{const code=codes[data.daily.weather_code[i]]||["Me re","Cloudy","☁️"];const d=document.createElement("span");d.className="forecast-day";const day=document.createElement("span");day.textContent=[text[language].today,text[language].tomorrow,text[language].dayAfter][i]||date;const icon=document.createElement("span");icon.textContent=code[2];const temp=document.createElement("strong");temp.textContent=Math.round(data.daily.temperature_2m_max[i])+"° / "+Math.round(data.daily.temperature_2m_min[i])+"°";d.append(day,icon,temp);forecast.appendChild(d);});
    const src=document.createElement("span");src.className="forecast-source";src.textContent="Open-Meteo · "+text[language].updated+" "+(time?.textContent||"");forecast.appendChild(src);
  }
  function loadWeather(){
    if(!$("[data-weather-widget]"))return;if(weatherData){renderWeather(weatherData);return;}if(weatherPromise)return;
    weatherPromise=fetch("https://api.open-meteo.com/v1/forecast?latitude=42.6629&longitude=21.1655&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBelgrade&forecast_days=3")
      .then(r=>{if(!r.ok)throw new Error("Weather unavailable");return r.json();}).then(d=>{weatherData=d;renderWeather(d);})
      .catch(()=>{const el=$("[data-weather-condition]");if(el)el.textContent=text[language].weatherError;}).finally(()=>{weatherPromise=null;});
  }
  function boot(){
    let lang="sq",theme="light";try{lang=localStorage.getItem(languageKey)||"sq";theme=localStorage.getItem(themeKey)||"light";}catch(_){}
    setLanguage(lang);setTheme(theme==="dark");
    const lb=$("[data-language-toggle]");if(lb)lb.addEventListener("click",()=>setLanguage(language==="sq"?"en":"sq"));
    const tb=$("[data-theme-toggle]");if(tb)tb.addEventListener("click",()=>setTheme(!document.body.classList.contains("dark")));
    setupSearch();renderLocalSearch();loadWeather();
  }
  document.addEventListener("DOMContentLoaded",boot);
})();