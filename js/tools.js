/* IVA v2 — جعبه‌ابزار مالی (ابزارها): ارز، کریپتو، تبدیل، وام بانک مرکزی، نرخ روز/تورم، نشتی مالی، شناسایی بانک
   معماری شبکه: زنده فقط در بخش ابزارها؛ دسکتاپ (Electron main) و اندروید (پل بومی) با allowlist دامنه‌ها؛
   وب/PWA: تلاش مستقیم → کش آخرین نرخ + ورود دستی. هیچ SDK ثالث، هیچ شبکه‌ای در بقیه اپ. */
"use strict";

(function () {

  const IVA = window.IVA;
  /* ================= داده‌های ثابت داخلی ================= */

  const RATES_KEY = "iva-rates-v1";
  const NET_ALLOW = ["https://call1.tgju.org/", "https://api.nobitex.ir/", "https://api.arzdigital.com/", "https://api.coingecko.com/", "https://open.er-api.com/"];

  const FX = [
    { k: "usd",  id: "price_dollar_rl", fa: "دلار آمریکا",    en: "US Dollar",       flag: "🇺🇸" },
    { k: "eur",  id: "price_eur",       fa: "یورو",           en: "Euro",            flag: "🇪🇺" },
    { k: "gbp",  id: "price_gbp",       fa: "پوند انگلیس",    en: "British Pound",   flag: "🇬🇧" },
    { k: "chf",  id: "price_chf",       fa: "فرانک سوئیس",    en: "Swiss Franc",     flag: "🇨🇭" },
    { k: "try",  id: "price_try",       fa: "لیر ترکیه",      en: "Turkish Lira",    flag: "🇹🇷" },
    { k: "aed",  id: "price_aed",       fa: "درهم امارات",    en: "UAE Dirham",      flag: "🇦🇪" },
    { k: "afn",  id: "price_afn",       fa: "افغانی",         en: "Afghan Afghani",  flag: "🇦🇫" },
    { k: "cny",  id: "price_cny",       fa: "یوان چین",       en: "Chinese Yuan",    flag: "🇨🇳" },
    { k: "rub",  id: "price_rub",       fa: "روبل روسیه",     en: "Russian Ruble",   flag: "🇷🇺" },
    { k: "jpy",  id: "price_jpy",       fa: "۱۰۰ ین ژاپن",    en: "100 Japanese Yen", flag: "🇯🇵", per: 100 }
  ];
  const GOLD = [
    { k: "gold18", id: "geram18", fa: "طلای ۱۸ عیار (گرم)", en: "18k Gold (gram)", flag: "🥇" },
    { k: "coin",   id: "sekee",   fa: "سکه امامی",          en: "Emami Coin",      flag: "🪙" }
  ];
  const CRYPTO = [
    { k: "usdt", fa: "تتر",       en: "Tether" },   { k: "btc", fa: "بیت‌کوین",  en: "Bitcoin" },
    { k: "eth",  fa: "اتریوم",    en: "Ethereum" }, { k: "shib", fa: "شیبا اینو", en: "Shiba Inu" },
    { k: "doge", fa: "دوج‌کوین",  en: "Dogecoin" }, { k: "ton",  fa: "تون‌کوین",  en: "Toncoin" },
    { k: "sol",  fa: "سولانا",    en: "Solana" },   { k: "xrp",  fa: "ریپل",      en: "XRP" },
    { k: "trx",  fa: "ترون",      en: "Tron" },     { k: "ada",  fa: "کاردانو",   en: "Cardano" }
  ];
  /* شناسه معادل در CoinGecko (پشتیبان جهانی وقتی نوبیتکس در دسترس نیست) */
  const CG_IDS = { usdt: "tether", btc: "bitcoin", eth: "ethereum", shib: "shiba-inu", doge: "dogecoin", ton: "the-open-network", sol: "solana", xrp: "ripple", trx: "tron", ada: "cardano" };

  /* شناسه بانک‌ها از ۶ رقم اول کارت (BIN) — چندمنبعی ۱۴۰۵؛ رنگ اختصاصی برای بج */
  const BANKS = [
    ["62198618", "بلوبانک (سامان)", "#3094ea", "blu"], ["62198619", "بلوبانک (سامان)", "#3094ea", "blu"],
    ["603799", "بانک ملی ایران", "#1c3f94", "melli"], ["603769", "بانک صادرات", "#00843d", "saderat"],
    ["610433", "بانک ملت", "#c8102e", "mellat"], ["991975", "بانک ملت", "#c8102e", "mellat"],
    ["627353", "بانک تجارت", "#e87722", "tejarat"], ["585983", "بانک تجارت", "#e87722", "tejarat"],
    ["589210", "بانک سپه", "#006341", "sepah"], ["627381", "بانک انصار (سپه سابق)", "#6a1b9a", "ansar"],
    ["603770", "بانک کشاورزی", "#7ab800", "keshavarzi"], ["639217", "بانک کشاورزی", "#7ab800", "keshavarzi"],
    ["628023", "بانک مسکن", "#0055a5", "maskan"], ["627961", "بانک صنعت و معدن", "#f4a900", "sanatmadan"],
    ["627648", "بانک توسعه صادرات", "#0e7c86", "tosesaderat"], ["207177", "بانک توسعه صادرات", "#0e7c86", "tosesaderat"],
    ["589463", "بانک رفاه", "#0072bc", "refahkargaran"], ["627760", "پست بانک ایران", "#009a44", "post"],
    ["502908", "بانک توسعه تعاون", "#d71920", "tosetaavon"], ["639599", "بانک قوامین (ادغام‌شده در ملت)", "#c8102e", "ghavvamin"],
    ["606373", "بانک قرض‌الحسنه مهر ایران", "#2e7d32", "mehriran"], ["639370", "بانک مهر اقتصاد", "#00838f", "mehreghtesad"],
    ["627412", "بانک اقتصاد نوین", "#0097a7", "eghtesad"],
    ["622106", "بانک پارسیان", "#d32f2f", "parsian"], ["627884", "بانک پارسیان", "#d32f2f", "parsian"], ["639194", "بانک پارسیان", "#d32f2f", "parsian"],
    ["502229", "بانک پاسارگاد", "#f57c00", "pasargad"], ["639347", "بانک پاسارگاد", "#f57c00", "pasargad"],
    ["627488", "بانک کارآفرین", "#303f9f", "karafarin"], ["502910", "بانک کارآفرین", "#303f9f", "karafarin"],
    ["621986", "بانک سامان", "#1e88e5", "saman"], ["639346", "بانک سینا", "#00acc1", "sina"],
    ["639607", "بانک سرمایه", "#5d4037", "sarmaye"], ["636214", "بانک آینده", "#00b2a9", "ayande"],
    ["502806", "بانک شهر", "#0288d1", "shahr"], ["504706", "بانک شهر", "#0288d1", "shahr"],
    ["502938", "بانک دی", "#7cb342", "day"], ["505416", "بانک گردشگری", "#00897b", "gardeshgari"],
    ["505785", "بانک ایران‌زمین", "#8d6e63", "iranzamin"], ["636949", "بانک حکمت ایرانیان", "#455a64", "hekmat"],
    ["505801", "مؤسسه اعتباری کوثر", "#fbc02d", "kosar"], ["628157", "مؤسسه اعتباری توسعه", "#5c6bc0", "tose"],
    ["606256", "مؤسسه اعتباری ملل", "#37389a", "melal"], ["504172", "بانک قرض‌الحسنه رسالت", "#0092cf", "resalat"],
    ["581874", "بانک ایران‌ونزوئلا", "#3437a1", "iran-venezuela"], ["507677", "بانک نور", "#11b8c7", "noor"],
    ["588947", "بانک خاورمیانه", "#f7941e", "khavarmianeh"]
  ];

  /* تورم سالانه اعلامی بانک مرکزی ۱۳۸۰..۱۴۰۴ + تخمین ۱۴۰۵ (۱۲ماهه تا مرداد ۱۴۰۵ = ۶۵.۱٪) */
  const INFL = { 1380: 11.4, 1381: 15.8, 1382: 15.6, 1383: 15.2, 1384: 10.4, 1385: 11.9, 1386: 18.4, 1387: 25.4, 1388: 10.8, 1389: 12.4, 1390: 21.5, 1391: 30.5, 1392: 34.7, 1393: 15.6, 1394: 11.9, 1395: 9.0, 1396: 9.6, 1397: 31.2, 1398: 41.2, 1399: 47.1, 1400: 46.2, 1401: 53.1, 1402: 47.4, 1403: 35.8, 1404: 48.3 };
  const INFL_1405 = 65.1; /* تخمین — بانک مرکزی، ۱۲ماهه منتهی به مرداد ۱۴۰۵ */
  /* بازسازی شاخص سالانه (پایه ۱۳۹۵=۱۰۰) از زنجیره تورم */
  const CPI = (() => {
    const idx = { 1395: 100 };
    for (let y = 1396; y <= 1404; y++) idx[y] = idx[y - 1] * (1 + INFL[y] / 100);
    idx[1405] = idx[1404] * (1 + INFL_1405 / 100);
    for (let y = 1394; y >= 1380; y--) idx[y] = idx[y + 1] / (1 + INFL[y + 1] / 100);
    return idx;
  })();

  /* ================= نرخ‌ها: کش + واکشی زنده ================= */

  let RATES = { ts: 0, src: "", fx: {}, gold: {}, crypto: {} };
  try { const raw = JSON.parse(localStorage.getItem(RATES_KEY) || "null"); if (raw && raw.fx) RATES = raw; } catch (e) { }

  function saveRates() { try { localStorage.setItem(RATES_KEY, JSON.stringify(RATES)); } catch (e) { } }

  function _androidFetch(url, opts) {
    return new Promise(resolve => {
      try {
        const id = "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        T._netWait[id] = resolve;
        const b64 = opts && opts.body ? btoa(unescape(encodeURIComponent(opts.body))) : "";
        window.AndroidBridge.fetchUrl(url, id, (opts && opts.method) || "GET", b64);
        setTimeout(() => { if (T._netWait[id]) { delete T._netWait[id]; resolve(null); } }, 15000);
      } catch (e) { resolve(null); }
    });
  }
  window.__ivaNet = {
    resolve(id, status, b64) {
      const w = T._netWait[id];
      if (!w) return;
      delete T._netWait[id];
      let body = "";
      if (b64) { try { body = decodeURIComponent(escape(atob(b64))); } catch (e) { body = ""; } }
      w(status === 200 ? { status, body } : null);
    }
  };

  async function netFetch(url, opts) {
    const o = typeof opts === "number" ? { ms: opts } : (opts || {});
    const limit = o.ms || 12000;
    const raced = p => Promise.race([p, new Promise(res => setTimeout(() => res(null), limit))]);
    /* دسکتاپ: پل Electron (بدون CORS) → اندروید: پل بومی (allowlist) → وب: fetch مستقیم */
    try {
      if (window.ivaDesktop && typeof window.ivaDesktop.fetchExternal === "function") {
        const r = await raced(window.ivaDesktop.fetchExternal(url, { method: o.method, body: o.body }));
        return r && r.status === 200 ? r : null;
      }
    } catch (e) { }
    try {
      if (window.AndroidBridge && window.AndroidBridge.fetchUrl) return await raced(_androidFetch(url, o));
    } catch (e) { }
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), limit);
      const r = await raced(fetch(url, { signal: ctrl.signal, method: o.method || "GET", body: o.body, headers: o.body ? { "Content-Type": "application/json" } : undefined }));
      clearTimeout(t);
      if (!r || !r.ok) return null;
      return { status: r.status, body: await r.text() };
    } catch (e) { return null; }
  }

  async function fetchLive() {
    const out = { fx: {}, gold: {}, crypto: {}, src: [], ok: {} };
    /* ۱) TGJU: ارز + طلا + تتر (پاسخ ریال است → ÷۱۰ تومان) — هم از ایران هم خارج */
    const tgP = netFetch("https://call1.tgju.org/ajax.json", { ms: 11000 });
    /* ۲) نوبیتکس: POST رسمی /market/stats — کلیدها «btc-rls»، مقادیر ریال → ÷۱۰ */
    const nbP = netFetch("https://api.nobitex.ir/market/stats", {
      ms: 8000, method: "POST",
      body: JSON.stringify({ srcCurrency: "usdt,btc,eth,shib,doge,ton,sol,xrp,trx,ada", dstCurrency: "rls" })
    });
    /* ۳) ارزدیجیتال (به‌صورت برترین‌تلاش؛ فقط اگر پاسخ داد) */
    const azP = netFetch("https://api.arzdigital.com/up/currencies", { ms: 7000 });
    const tg = await tgP;
    let tgOk = false, goldOk = false;
    if (tg && tg.body) {
      try {
        const cur = JSON.parse(tg.body).current || {};
        const take = id => { const v = cur[id]; if (!v || !v.p) return NaN; return Math.round(parseFloat(String(v.p).replace(/,/g, "")) / 10); };
        FX.forEach(c => { const v = take(c.id); if (isFinite(v) && v > 0) { out.fx[c.k] = v; tgOk = true; } });
        GOLD.forEach(c => { const v = take(c.id); if (isFinite(v) && v > 0) { out.gold[c.k] = v; goldOk = true; } });
        /* tgju «usdt-irr» را تومانی گزارش می‌کند (نه ریال) → بدون ÷۱۰؛ با صرفِ دلار ۲۰۶k، تتر ~۲۷۳k منطقی است */
        const u = cur["usdt-irr"]; if (u && u.p) out.crypto.usdt = Math.round(parseFloat(String(u.p).replace(/,/g, "")));
        if (tgOk) out.src.push("tgju");
      } catch (e) { }
    }
    const nb = await nbP;
    let nbOk = false;
    if (nb && nb.body) {
      try {
        const st = JSON.parse(nb.body).stats || {};
        CRYPTO.forEach(c => {
          const row = st[c.k + "-rls"] || st[c.k + "-irt"];
          const v = row ? parseFloat(row.latest) : NaN;
          if (isFinite(v) && v > 0) { out.crypto[c.k] = Math.round(v / 10); nbOk = true; }
        });
        if (nbOk) out.src.push("nobitex");
      } catch (e) { }
    }
    /* ۴) پشتیبان جهانی: CoinGecko (قیمت دلاری × دلار تومانی) — وقتی نوبیتکس جواب نداد */
    if (!nbOk) {
      const usd = out.fx.usd || RATES.fx.usd;
      if (usd) {
        const cg = await netFetch("https://api.coingecko.com/api/v3/simple/price?ids=" +
          Object.keys(CG_IDS).map(k => CG_IDS[k]).join(",") + "&vs_currencies=usd", { ms: 8000 });
        if (cg && cg.body) {
          try {
            const j = JSON.parse(cg.body);
            let cgOk = false;
            CRYPTO.forEach(c => {
              /* تتر اگر از tgju آمده، قیمت واقعی ایران است — با «تتر دلاری × دلار» دوباره‌شمارش نشود */
              if (c.k === "usdt" && out.crypto.usdt) return;
              const row = j[CG_IDS[c.k]]; const v = row && row.usd; if (isFinite(v) && v > 0) { out.crypto[c.k] = Math.round(v * usd); cgOk = true; }
            });
            if (cgOk) out.src.push("coingecko");
          } catch (e) { }
        }
      }
    }
    /* ۵) ارزدیجیتال — اگر تا الان ارز نیامده بود */
    const az = await azP;
    if (az && az.body && !tgOk) {
      try {
        const j = JSON.parse(az.body);
        const rows = j.data || j;
        const grab = key => { for (const k of Object.keys(rows)) { if (k.toLowerCase() === key) { const r = rows[k]; return r.buy || r.sell || r.price || r.latest; } } return NaN; };
        FX.forEach(c => {
          const v = parseFloat(grab(c.k));
          if (isFinite(v) && v > 0) out.fx[c.k] = Math.round(v < 1000 ? v * 10 : v / 10);
        });
        if (Object.keys(out.fx).length) out.src.push("arzdigital");
      } catch (e) { }
    }
    if (tgOk || goldOk || nbOk || Object.keys(out.crypto).length) {
      RATES.ts = Date.now();
      if (tgOk) RATES.fx = Object.assign({}, RATES.fx, out.fx);
      RATES.gold = Object.assign({}, RATES.gold, out.gold);
      RATES.crypto = Object.assign({}, RATES.crypto, out.crypto);
      RATES.src = out.src.join("+");
      RATES.ok = Object.assign({}, RATES.ok, { fx: tgOk, gold: goldOk, crypto: nbOk || !!Object.keys(out.crypto).length });
      saveRates();
      return true;
    }
    return false;
  }

  /* ================= منطق محاسبات ================= */

  /* اقساط مساوی (آنیوتی — فرمول بانک مرکزی): A = P·i·(1+i)^n / ((1+i)^n − 1) */
  function annuity(P, ratePct, n) {
    const i = ratePct / 100 / 12;
    if (!(n > 0)) return 0;
    if (i <= 0) return P / n;
    const g = Math.pow(1 + i, n);
    return P * i * g / (g - 1);
  }
  function amortize(P, ratePct, n, pay) {
    const i = ratePct / 100 / 12;
    let bal = P; const rows = [];
    for (let m = 1; m <= n; m++) {
      const int = Math.round(bal * i);
      let pr = pay - int;
      if (pr < 0) pr = 0;
      if (m === n || pr > bal) { pr = bal; }
      bal = Math.max(0, bal - pr);
      rows.push({ m, pay: int + pr, int, pr, bal });
    }
    return rows;
  }
  /* فلت / قرض‌الحسنه کارمزدی: (اصل + اصل×نرخ×سال‌ها) ÷ n */
  function flatPay(P, ratePct, n) { return (P + P * (ratePct / 100) * (n / 12)) / n; }
  function jalaliEnd(n) {
    const key = U.monthKey() + n;
    const month = ((key - 1) % 12) + 1, y = Math.floor((key - 1) / 12);
    /* سال بدون جداکننده هزارگان (۱۴۱۰ نه ۱٬۴۱۰) */
    return U.jalaliMonths[U.lang()][month - 1] + " " + (U.lang() === "fa" ? String(y).replace(/\d/g, x => U.faDigits[+x]) : String(y));
  }
  function cpiConvert(amount, y1, y2) { return amount * CPI[y2] / CPI[y1]; }
  /* گرم با یک رقم اعشار (U.group گرد می‌کند و اعشار را می‌بُرد) */
  function fmtGrams(g) {
    const s = String(g), dot = s.indexOf(".");
    if (dot < 0) return U.group(+s);
    const ip = U.group(+s.slice(0, dot)), fr = s.slice(dot + 1);
    return U.lang() === "fa" ? ip + "\u066B" + fr.replace(/\d/g, d => U.faDigits[+d]) : ip + "." + fr;
  }
  /* سال شمسی همیشه بدون جداکننده هزارگان (۱۴۰۵ نه ۱٬۴۰۵) */
  function faYear(y) { return U.lang() === "fa" ? String(y).replace(/\d/g, x => U.faDigits[+x]) : String(y); }

  function luhnOK(d16) {
    if (!/^\d{16}$/.test(d16)) return false;
    let s = 0;
    for (let i = 0; i < 16; i++) { let dd = +d16[15 - i]; if (i % 2) { dd *= 2; if (dd > 9) dd -= 9; } s += dd; }
    return s % 10 === 0;
  }
  function binLookup(num) {
    const d = U.toEnDigits(String(num || "")).replace(/\D/g, "");
    if (d.length < 6) return null;
    /* طولی‌ترین پیشوند اول (بلوبانک ۸رقمی مقدم بر سامان ۶رقمی) */
    const hit = BANKS.find(b => d.startsWith(b[0]));
    return hit ? { name: hit[1], color: hit[2], logo: hit[3], bin: hit[0], letter: hit[1].replace("بانک ", "").replace("مؤسسه اعتباری ", "").replace("بلوبانک ", "").replace("(", "").trim().charAt(0) } : null;
  }

  /* ================= وضعیت UI ================= */

  const T = {
    tab: "fx",
    busy: false,
    /* وام: هیچ پیش‌فرض دمو — کاربر خودش وارد می‌کند؛ پریست‌ها فقط مقادیر رسمی ۱۴۰۵ را می‌گذارند */
    loan: { P: null, r: null, fee: null, n: null, mode: "annuity", preset: "custom", showTable: false },
    conv: { amount: 0, from: "usd", to: "irt" },
    cpi: { amount: 0, y1: 1390, y2: 1405, kind: "general", yAghd: 1385, yPay: 1405 },
    leak: { years: null, sel: "" },
    bin: "",
    notes: { q: "", draft: "", edit: null, editDraft: "" },
    _netWait: {}
  };
  T.binLookup = binLookup; /* برای بج بانک در لیست حساب‌ها */
  Object.defineProperty(T, "RATES", { get: () => RATES }); /* خواندن نرخ زنده برای تست/ماژول‌های دیگر */
  window.IVA.tools = T;

  /* ================= رندر ================= */

  const esc = s => U.esc(s);
  const fmt = n => U.group(Math.round(n));
  /* عدد با اعشار: برای تبدیل‌گر (مثلاً ۴٫۸۶ دلار یا ۰٫۰۰۰۶ بیت‌کوین) */
  const fmtSmart = n => {
    if (!isFinite(n)) return "—";
    if (Math.abs(n) >= 1000 || Number.isInteger(n)) return U.group(n);
    const abs = Math.abs(n);
    const dec = abs >= 100 ? 1 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 8;
    let t = n.toFixed(dec);
    if (t.indexOf(".") > -1) t = t.replace(/0+$/, "").replace(/\.$/, "");
    const neg = t.startsWith("-"); if (neg) t = t.slice(1);
    const parts = t.split(".");
    const sep = U.lang() === "fa" ? "٫" : ".";
    const frac = parts[1] ? sep + (U.lang() === "fa" ? parts[1].replace(/\d/g, x => U.faDigits[+x]) : parts[1]) : "";
    return (neg ? "−" : "") + U.group(+parts[0]) + frac;
  };
  function rateOf(group, k) { return (RATES[group] || {})[k]; }
  /* آیا این گروه در آخرین واکشی واقعاً آپدیت شده؟ (کش کهنه نباید «زنده» جلوه کند) */
  function liveOf(group) { return !!(RATES.ok && RATES.ok[group]); } /* بدون نتیجهٔ واکشیِ صریح، «کش» است */

  function badgeHtml(name, color, letter, small, logo) {
    /* لوگوی واقعی بانک (محلی از assets)؛ در نبودش حرف اول با رنگ برند */
    const mark = logo
      ? '<img class="bin-logo" src="assets/banks/' + logo + '.svg" alt="" width="' + (small ? 24 : 32) + '" height="' + (small ? 24 : 32) + '">'
      : "<i>" + esc(letter || "؟") + "</i>";
    return '<span class="bin-badge" style="' + (logo ? "" : "--bc:" + esc(color) + ";") + (small ? "--bs:24px" : "") + '">' + mark + "<b>" + esc(name) + "</b></span>";
  }

  function rateCard(c, group, live) {
    const v = rateOf(group, c.k);
    return '<div class="rate-card"><span class="rate-flag">' + c.flag + '</span><div class="rate-name">' + esc(U.lang() === "fa" ? c.fa : c.en) +
      "</div><b>" + (v ? fmt(v) : "—") + "</b><small>" + esc(U.t("common.toman")) + (live && v ? "" : " · " + esc(U.t("tools.cached"))) + "</small></div>";
  }

  function tabFx() {
    const live = liveOf("fx"), liveGold = liveOf("gold");
    return '<div class="tool-head"><button class="secondary" data-tool="refresh">' + U.icon("refresh", 15) + "<span>" + esc(U.t("tools.refresh")) + "</span></button>" +
      '<span class="rate-meta">' + esc(U.t("tools.updated")) + ": <b>" + (RATES.ts ? new Date(RATES.ts).toLocaleString(U.lang() === "fa" ? "fa-IR" : "en-US") : "—") + "</b>" +
      (RATES.src ? " · " + esc(RATES.src) : "") + "</span></div>" +
      '<h3 class="sec-title">' + esc(U.t("tools.fxTitle")) + "</h3>" +
      '<div class="rate-grid">' + FX.map(c => rateCard(c, "fx", live)).join("") + "</div>" +
      '<h3 class="sec-title">' + esc(U.t("tools.gold")) + "</h3>" +
      '<div class="rate-grid">' + GOLD.map(c => rateCard(c, "gold", liveGold)).join("") + "</div>" +
      '<p class="tool-note">' + U.icon("info", 13) + " " + esc(U.t("tools.sourceNote")) + "</p>";
  }

  function tabCrypto() {
    return '<div class="tool-head"><button class="secondary" data-tool="refresh">' + U.icon("refresh", 15) + "<span>" + esc(U.t("tools.refresh")) + "</span></button>" +
      '<span class="rate-meta">' + esc(U.t("tools.cryptoNote")) + "</span></div>" +
      '<div class="rate-grid">' + CRYPTO.map(c => {
        const v = rateOf("crypto", c.k), live = liveOf("crypto");
        return '<div class="rate-card"><span class="rate-flag">🪙</span><div class="rate-name">' + esc(U.lang() === "fa" ? c.fa : c.en) +
          "</div><b>" + (v ? fmt(v) : "—") + "</b><small>" + esc(U.t("common.toman")) + (live && v ? "" : " · " + esc(U.t("tools.cached"))) + "</small></div>";
      }).join("") + "</div>" +
      '<p class="tool-note">' + U.icon("info", 13) + " " + esc(U.t("tools.cryptoSrc")) + "</p>";
  }

  function convOptions() {
    const items = [{ g: "man", k: "irt", fa: "تومان", en: "Toman", flag: "🇮🇷" }]
      .concat(FX.map(c => ({ g: "fx", k: c.k, fa: c.fa, en: c.en, flag: c.flag })))
      .concat(GOLD.map(c => ({ g: "gold", k: c.k, fa: c.fa, en: c.en, flag: c.flag })))
      .concat(CRYPTO.map(c => ({ g: "crypto", k: c.k, fa: c.fa, en: c.en, flag: "🪙" })));
    const cur = { g: "man", k: "irt" };
    const find = k => items.find(i => i.k === k) || cur;
    const f = find(T.conv.from), t = find(T.conv.to);
    const opts = sel => items.map(i => '<option value="' + i.k + '" ' + (sel === i.k ? "selected" : "") + ">" + esc(U.lang() === "fa" ? i.fa : i.en) + "</option>").join("");
    return { f, t, opts };
  }
  const RATE_PER = { jpy: 100 }; /* TGJU ین ژاپن را برای هر ۱۰۰ ین می‌دهد — نرخ تکی = نرخ ÷ ۱۰۰ */
  function convRate(k) {
    if (k === "irt") return 1;
    for (const g of ["fx", "gold", "crypto"]) { const v = rateOf(g, k); if (v) return v / (RATE_PER[k] || 1); }
    return 0;
  }
  /* نمایش مبلغ تبدیل‌گر — اعشاری هم دارد (۰٫۵ بیت‌کوین!) */
  function convAmtText(a) { return a > 0 ? (Number.isInteger(a) ? U.group(a) : fmtSmart(a)) : ""; }
  /* خط «نرخ اعمال‌شده» — تگ کش وقتی نرخ زنده نیست */
  function convApplied(f, t, rf, rt) {
    const live = g => g === "man" ? true : liveOf(g);
    const cached = (!T.conv.manualFrom && rf > 0 && !live(f.g)) || (!T.conv.manualTo && rt > 0 && !live(t.g));
    return '<span class="conv-rate">' + esc(U.t("conv.applied")) + ": ۱ " + esc(U.lang() === "fa" ? f.fa : f.en) + " = " + fmtSmart(rf) + " " + esc(U.t("common.toman")) + " · ۱ " + esc(U.lang() === "fa" ? t.fa : t.en) + " = " + fmtSmart(rt) + " " + esc(U.t("common.toman")) + (RATES.src ? " · " + esc(RATES.src) : "") + (cached ? " · " + esc(U.t("tools.cached")) : "") + "</span>";
  }
  function tabConv() {
    const { f, t, opts } = convOptions();
    const rf = T.conv.manualFrom || convRate(T.conv.from);
    const rt = T.conv.manualTo || convRate(T.conv.to);
    const result = rf > 0 && rt > 0 ? T.conv.amount * rf / rt : 0;
    /* بی‌نرخ: راهنمای قدم‌به‌قدم — ارز از سلکت‌ها انتخاب شده، اینجا فقط قیمتش پرسیده می‌شود */
    const miss = [];
    if (!(rf > 0)) miss.push(f);
    if (!(rt > 0)) miss.push(t);
    const L = U.lang();
    const guide = miss.length ? '<div class="conv-guide">' + U.icon("alert", 17) + "<div><b>" + esc(U.t("conv.rateMissingTitle")) + "</b><small>" + esc(U.t("conv.rateMissingDesc", { n: miss.map(i => (L === "fa" ? i.fa : i.en)).join(L === "fa" ? " و " : " and ") })) + "</small></div>" +
      miss.map(m => '<label class="field"><span>' + esc(L === "fa" ? m.fa : m.en) + " — " + esc(U.t("conv.rateMissingPrice")) + '</span><input class="amt-input" name="conv-' + (m.k === T.conv.from ? "mf" : "mt") + '" inputmode="decimal" placeholder="' + esc(U.t("conv.rateMissingPh")) + '"></label>').join("") + "</div>" : "";
    return '<div class="conv-box">' +
      '<label class="field"><span>' + esc(U.t("common.amount")) + "</span>" +
      '<input class="amt-input" name="conv-amount" inputmode="decimal" placeholder="' + esc(U.t("conv.amountPh")) + '" value="' + convAmtText(T.conv.amount) + '"></label>' +
      '<div class="conv-row"><label class="field"><span>' + esc(U.t("conv.from")) + '</span><select name="conv-from">' + opts(T.conv.from) + '</select></label>' +
      '<button type="button" class="square conv-swap" data-tool="conv-swap" aria-label="swap">' + U.icon("swap", 17) + "</button>" +
      '<label class="field"><span>' + esc(U.t("conv.to")) + '</span><select name="conv-to">' + opts(T.conv.to) + "</select></label></div>" +
      '<div class="conv-result"><small>' + esc(U.t("conv.result")) + "</small><b>" + (result ? fmtSmart(result) : "—") + "</b>" +
      (rf > 0 && rt > 0 ? convApplied(f, t, rf, rt) : "") + "</div>" +
      (miss.length ? guide : '<details class="conv-manual"><summary>' + esc(U.t("tools.manualTitle")) + "</summary>" +
      '<div class="conv-row"><label class="field"><span>' + esc(U.t("conv.from")) + ' — ' + esc(U.t("tools.manualRate")) + '</span><input class="amt-input" name="conv-mf" inputmode="decimal" placeholder="' + (convRate(T.conv.from) || "—") + '" value="' + (T.conv.manualFrom || "") + '"></label>' +
      '<label class="field"><span>' + esc(U.t("conv.to")) + ' — ' + esc(U.t("tools.manualRate")) + '</span><input class="amt-input" name="conv-mt" inputmode="decimal" placeholder="' + (convRate(T.conv.to) || "—") + '" value="' + (T.conv.manualTo || "") + '"></label></div>' +
      '<small class="tool-note">' + esc(U.t("tools.manualHint")) + "</small></details>") +
      "</div>";
  }

  /* خروجی تبدیل‌گر جدا از فرم (تایپ مبلغ/نرخ دستی فیلدها را نمی‌بَرد) */
  function convResultInner() {
    const { f, t } = convOptions();
    const rf = T.conv.manualFrom || convRate(T.conv.from);
    const rt = T.conv.manualTo || convRate(T.conv.to);
    const result = rf > 0 && rt > 0 ? T.conv.amount * rf / rt : 0;
    return "<small>" + esc(U.t("conv.result")) + "</small><b>" + (result ? fmtSmart(result) : "—") + "</b>" +
      (rf > 0 && rt > 0 ? convApplied(f, t, rf, rt) : "");
  }
  function updateConvResult() {
    const pc = document.querySelector("#page-content");
    if (!pc || !IVA.app || IVA.app.page !== "tools") return;
    const el = pc.querySelector(".conv-result");
    if (el && pc.querySelector('[name="conv-amount"]')) el.innerHTML = convResultInner();
    else redrawSoft("conv");
  }
  function loanCalc(L) {
    const isFee = L.mode === "fee";
    /* تا کاربر مبلغ/نرخ/مدت را نداده باشد، هیچ عدد جعلی نمایش داده نمی‌شود */
    const rate = isFee ? L.fee : L.r;
    if (!(L.P > 0) || !L.n || !(rate > 0)) return null;
    const pay = Math.round(L.mode === "annuity" ? annuity(L.P, L.r, L.n) : flatPay(L.P, isFee ? L.fee || 4 : L.r, L.n));
    const totalPay = pay * L.n; /* قسط گردشده × تعداد = کل دقیق (سازگار با جدول اقساط) */
    const interest = totalPay - L.P;
    const ratio = L.P > 0 ? interest / L.P * 100 : 0;
    const tag = ratio > 60 ? ["heavy", "loan.heavy"] : ratio > 30 ? ["medium", "loan.medium"] : ["fair", "loan.fair"];
    return { isFee, pay, totalPay, interest, ratio, tag };
  }
  /* خروجی‌های وام — جدا از فرم تا «تایپ» خراب نشود (بروزرسانی سبک) */
  function loanOutInner(L) {
    const C = loanCalc(L);
    if (!C) return '<div class="lo main"><small>' + esc(U.t("loan.monthlyPay")) + '</small><b>—</b></div><div class="lo"><small>' + esc(U.t("loan.emptyHint")) + "</small><b>⌨</b></div>";
    const { pay, totalPay, interest, ratio, tag } = C;
    const over = L.mode !== "fee" && L.r > 23; /* بالاتر از سقف مصوب ۱۴۰۵ */
    return '<div class="lo main"><small>' + esc(U.t("loan.monthlyPay")) + "</small><b>" + fmt(pay) + " <i>" + esc(U.t("common.toman")) + "</i></b></div>" +
      '<div class="lo"><small>' + esc(U.t("loan.totalInterest")) + "</small><b>" + fmt(interest) + "</b></div>" +
      '<div class="lo"><small>' + esc(U.t("loan.totalPay")) + "</small><b>" + fmt(totalPay) + "</b></div>" +
      '<div class="lo"><small>' + esc(U.t("loan.ratio")) + "</small><b>" + U.pct(ratio) + '</b><span class="due ' + tag[0] + '">' + esc(U.t(tag[1])) + "</span></div>" +
      '<div class="lo"><small>' + esc(U.t("loan.endDate")) + "</small><b>" + esc(jalaliEnd(L.n)) + "</b></div>" +
      (over ? '<div class="lo"><small>' + esc(U.t("loan.cap")) + '</small><span class="due heavy">' + U.icon("alert", 12) + " " + esc(U.t("loan.overCap")) + "</span></div>" : "");
  }
  function tableHtml(L) {
    const C = loanCalc(L);
    if (!C) return "";
    const { isFee, pay } = C;
    let table = '<div class="amort-wrap"><table class="amort"><thead><tr><th>' + esc(U.t("common.month")) + "</th><th>" + esc(U.t("loan.pay")) + "</th><th>" + esc(U.t("loan.principal")) + "</th><th>" + esc(U.t("loan.interest")) + "</th><th>" + esc(U.t("loan.balance")) + "</th></tr></thead><tbody>";
    if (L.mode === "annuity") {
      amortize(L.P, L.r, L.n, Math.round(pay)).forEach(r => { table += "<tr><td>" + U.group(r.m) + "</td><td>" + fmt(r.pay) + "</td><td>" + fmt(r.pr) + "</td><td>" + fmt(r.int) + "</td><td>" + fmt(r.bal) + "</td></tr>"; });
    } else {
      const fpay = Math.round(pay); let bal = L.P; const years = L.n / 12;
      const intEach = Math.round(L.P * ((isFee ? L.fee || 4 : L.r) / 100) * years / L.n);
      for (let m = 1; m <= L.n; m++) {
        let pr = fpay - intEach;
        if (m === L.n || pr > bal) pr = bal; /* قسط آخر: مانده دقیقاً صفر */
        bal = Math.max(0, bal - pr);
        table += "<tr><td>" + U.group(m) + "</td><td>" + fmt(fpay) + "</td><td>" + fmt(pr) + "</td><td>" + fmt(intEach) + "</td><td>" + fmt(bal) + "</td></tr>";
      }
    }
    return table + "</tbody></table></div>";
  }
  /* آپدیت فقط-خروجی: فیلد نرخ/کارمزد در حال تایپ دست‌نخورده می‌ماند (اعشار زنده می‌ماند) */
  function redrawLoanOutputs() {
    const pc = document.querySelector("#page-content");
    if (!pc || !IVA.app || IVA.app.page !== "tools") return;
    const out = pc.querySelector(".loan-out");
    if (!out) { redrawSoft("loan"); return; }
    out.innerHTML = loanOutInner(T.loan);
    if (T.loan.showTable) {
      const box = pc.querySelector(".loan-box");
      const w = box && box.querySelector(".amort-wrap");
      const h = tableHtml(T.loan);
      if (w) w.outerHTML = h;
      else if (box) { const b = box.querySelector('[data-loan="table"]'); if (b) b.insertAdjacentHTML("afterend", h); }
    }
  }

  /* مقادیر رسمی ۱۴۰۵ برای پریست‌ها (ابلاغیه بانک مرکزی): ازدواج ۳۰۰م/۴٪/۱۲۰م، فرزندآوری ۴۴م/۴٪/۳۶م */
  const presetFill = { marriage: { P: 300000000, fee: 4, r: null, n: 120, mode: "fee" }, child: { P: 44000000, fee: 4, r: null, n: 36, mode: "fee" }, qarz: { fee: 4, n: 24, mode: "fee" }, mortgage: { r: 23, n: 60, mode: "annuity" }, deposit: { r: 23, n: 60, mode: "annuity" }, car: { r: 23, n: 60, mode: "annuity" }, goods: { r: 23, n: 24, mode: "annuity" } };

  function tabLoan() {
    const L = T.loan;
    const presets = [["mortgage", "loan.mortgage"], ["deposit", "loan.deposit"], ["marriage", "loan.marriage"], ["child", "loan.child"], ["car", "loan.car"], ["goods", "loan.goods"], ["qarz", "loan.qarz"], ["custom", "loan.custom"]];
    const months = [12, 24, 36, 48, 60, 84, 120];
    const table = L.showTable ? tableHtml(L) : "";
    return '<div class="loan-box">' +
      '<div class="chips">' + presets.map(p => '<button type="button" class="chip-btn ' + (L.preset === p[0] ? "on" : "") + '" data-loan="preset" data-val="' + p[0] + '">' + esc(U.t(p[1])) + "</button>").join("") + "</div>" +
      '<div class="seg wide" data-role="loan-mode">' +
      [["annuity", "loan.modeAnnuity"], ["fee", "loan.modeFee"], ["flat", "loan.modeFlat"]].map(m => '<button type="button" class="seg-btn ' + (L.mode === m[0] ? "on" : "") + '" data-loan="mode" data-val="' + m[0] + '">' + esc(U.t(m[1])) + "</button>").join("") + "</div>" +
      '<div class="loan-inputs">' +
      '<label class="field"><span>' + esc(U.t("loan.amount")) + " (" + esc(U.t("common.toman")) + ')</span><input class="amt-input" data-loan="amount" inputmode="numeric" placeholder="' + esc(U.t("loan.amountPh")) + '" value="' + (L.P ? U.group(L.P) : "") + '"></label>' +
      '<div class="loan-two">' +
      (L.mode === "fee" ? "" : '<label class="field"><span>' + esc(U.t("loan.rate")) + ' ٪</span><input class="amt-input" data-loan="rate" inputmode="decimal" placeholder="۲۳" value="' + (L.r == null ? "" : String(L.r)) + '"></label>') +
      (L.mode === "fee" ? '<label class="field"><span>' + esc(U.t("loan.feeRate")) + ' ٪</span><input class="amt-input" data-loan="fee" inputmode="decimal" placeholder="۴" value="' + (L.fee == null ? "" : String(L.fee)) + '"></label>' : "") +
      '<label class="field"><span>' + esc(U.t("loan.months")) + '</span><select data-loan="months"><option value="" ' + (L.n ? "" : "selected") + ">—</option>" + months.map(m => '<option value="' + m + '" ' + (L.n === m ? "selected" : "") + ">" + U.group(m) + "</option>").join("") + "</select></label></div></div>" +
      '<div class="loan-out">' + loanOutInner(L) + "</div>" +
      '<button type="button" class="ghost wide" data-loan="table">' + (L.showTable ? "▲ " : "▼ ") + esc(U.t("loan.table")) + "</button>" + table +
      '<p class="tool-note">' + U.icon("info", 13) + " " + esc(U.t("loan.note")) + "</p></div>";
  }

  /* خروجی CPI جدا از فرم — تایپ مبلغ فیلدها را نمی‌بَرد (فاصله/کرسر حفظ می‌شود) */
  function cpiResultInner() {
    const C = T.cpi;
    const dash = C.amount > 0 ? null : "—"; /* تا مبلغ تایپ شود هیچ عدد جعلی نمایش داده نمی‌شود */
    if (C.kind === "mahr") {
      const ySrc = Math.max(C.yAghd, C.yPay - 1);
      const v = cpiConvert(C.amount, C.yAghd, ySrc);
      return '<div class="conv-result"><small>' + esc(U.t("cpi.mahrResult")) + "</small><b>" + (dash || fmt(v) + " <i>" + esc(U.t("common.toman")) + "</i>") + "</b></div>";
    }
    return '<div class="conv-result"><small>' + esc(U.t("cpi.todayValue")) + "</small><b>" + (dash || fmt(cpiConvert(C.amount, C.y1, C.y2)) + " <i>" + esc(U.t("common.toman")) + "</i>") + "</b></div>";
  }
  function updateCpiResult() {
    const pc = document.querySelector("#page-content");
    if (!pc || !IVA.app || IVA.app.page !== "tools") return;
    const el = pc.querySelector(".conv-result");
    if (el && pc.querySelector('[data-cpi="amount"]')) el.outerHTML = cpiResultInner();
    else redrawSoft("cpi");
  }
  function tabCpi() {
    const C = T.cpi;
    const years = [];
    for (let y = 1380; y <= 1405; y++) years.push(y);
    const yOpts = sel => years.map(y => '<option value="' + y + '" ' + (sel === y ? "selected" : "") + ">" + faYear(y) + (y === 1405 ? " " + U.t("cpi.est") : "") + "</option>").join("");
    let body = "";
    if (C.kind === "mahr") {
      /* ماده ۱۰۸۲: مبلغ × (شاخص سال تأدیه − ۱ ÷ شاخص سال عقد)؛ هرگز کمتر از اصل عقد نمی‌شود */
      const ySrc = Math.max(C.yAghd, C.yPay - 1);
      const v = C.amount > 0 ? cpiConvert(C.amount, C.yAghd, ySrc) : null;
      body = '<div class="loan-two"><label class="field"><span>' + esc(U.t("cpi.mahrYearAghd")) + '</span><select data-cpi="yAghd">' + yOpts(C.yAghd) + "</select></label>" +
        '<label class="field"><span>' + esc(U.t("cpi.mahrYearPay")) + '</span><select data-cpi="yPay">' + yOpts(C.yPay) + "</select></label></div>" +
        '<div class="conv-result"><small>' + esc(U.t("cpi.mahrResult")) + "</small><b>" + (v == null ? "—" : fmt(v) + " <i>" + esc(U.t("common.toman")) + "</i>") + "</b></div>" +
        '<small class="tool-note">' + esc(U.t("cpi.mahrFormula")) + "</small>";
    } else {
      body = '<div class="loan-two"><label class="field"><span>' + esc(U.t("cpi.yearFrom")) + '</span><select data-cpi="y1">' + yOpts(C.y1) + "</select></label>" +
        '<label class="field"><span>' + esc(U.t("cpi.yearTo")) + '</span><select data-cpi="y2">' + yOpts(C.y2) + "</select></label></div>" +
        '<div class="conv-result"><small>' + esc(U.t("cpi.todayValue")) + "</small><b>" + (C.amount > 0 ? fmt(cpiConvert(C.amount, C.y1, C.y2)) + " <i>" + esc(U.t("common.toman")) + "</i>" : "—") + "</b></div>";
    }
    return '<div class="loan-box">' +
      '<div class="chips">' + [["general", "cpi.general"], ["mahr", "cpi.mahr"]].map(k => '<button type="button" class="chip-btn ' + (C.kind === k[0] ? "on" : "") + '" data-cpi="kind" data-val="' + k[0] + '">' + esc(U.t(k[1])) + "</button>").join("") + "</div>" +
      '<label class="field"><span>' + esc(U.t("common.amount")) + " (" + esc(U.t("common.toman")) + ')</span><input class="amt-input" data-cpi="amount" inputmode="numeric" placeholder="' + esc(U.t("cpi.amountPh")) + '" value="' + (C.amount > 0 ? U.group(C.amount) : "") + '"></label>' + body +
      '<p class="tool-note">' + U.icon("info", 13) + " " + esc(U.t("cpi.note")) + "</p>" +
      '<details><summary>' + esc(U.t("cpi.inflTable")) + "</summary><div class='amort-wrap'><table class='amort'><thead><tr><th>" + esc(U.t("common.year")) + "</th><th>" + esc(U.t("cpi.inflCol")) + "</th><th>CPI</th></tr></thead><tbody>" +
      Object.keys(INFL).concat(["1405"]).map(y => "<tr><td>" + faYear(+y) + "</td><td>" + (y === "1405" ? "≈ " + U.pct(INFL_1405) : U.pct(INFL[y])) + "</td><td>" + U.group(CPI[y]) + "</td></tr>").join("") + "</tbody></table></div></details></div>";
  }

  /* ================= یادداشت‌ها — ذخیره در Store.state.notes (بکاپ/خروجی JSON خودکار) ================= */
  function noteDate(ts) {
    const d = new Date(ts), L = U.lang(), p = U._jParts(d);
    const day = L === "fa" ? U.group(p.day) : String(p.day);
    const month = U.jalaliMonths[L][p.month - 1];
    /* سال بدون جداکنندهٔ هزارگان (۱۴۰۵ نه ۱٬۴۰۵) */
    const year = L === "fa" ? String(p.year).replace(/\d/g, x => U.faDigits[+x]) : String(p.year);
    const hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    return day + " " + month + " " + year + (L === "fa" ? "، " : ", ") + (L === "fa" ? hm.replace(/\d/g, x => U.faDigits[+x]) : hm);
  }
  function tabNotes() {
    const N = Store.state.notes = Store.state.notes || [];
    const q = (T.notes.q || "").trim().toLowerCase();
    const list = q ? N.filter(n => n.text.toLowerCase().includes(q)) : N;
    let cards = "";
    for (const n of list) {
      const meta = "<span>" + esc(noteDate(n.ts)) + (n.up ? " · " + esc(U.t("notes.edited")) : "") + "</span>";
      if (T.notes.edit === n.id) {
        cards += '<article class="note-card"><textarea class="note-new" name="note-edit" data-note-id="' + n.id + '" dir="auto" maxlength="5000" rows="4">' + esc(T.notes.editDraft || n.text) + "</textarea>" +
          '<div class="note-meta">' + meta + '<span class="note-act"><button type="button" class="ghost" data-note="save" data-id="' + n.id + '">' + U.icon("check", 14) + " " + esc(U.t("common.save")) + '</button><button type="button" class="ghost" data-note="cancel">' + esc(U.t("common.cancel")) + "</button></span></div></article>";
      } else {
        cards += '<article class="note-card"><div class="note-body" dir="auto">' + esc(n.text) + "</div>" +
          '<div class="note-meta">' + meta + '<span class="note-act"><button type="button" class="ibtn" data-note="edit" data-id="' + n.id + '" aria-label="' + esc(U.t("common.edit")) + '" title="' + esc(U.t("common.edit")) + '">' + U.icon("edit", 15) + '</button><button type="button" class="ibtn danger note-del" data-note="del" data-id="' + n.id + '" aria-label="' + esc(U.t("common.delete")) + '" title="' + esc(U.t("common.delete")) + '">' + U.icon("trash", 15) + "</button></span></div></article>";
      }
    }
    if (!N.length) cards = '<div class="empty">' + U.icon("edit", 40) + "<p>" + esc(U.t("notes.empty")) + "</p></div>";
    else if (!list.length) cards = '<div class="empty">' + U.icon("search", 40) + "<p>" + esc(U.t("notes.emptyQ")) + "</p></div>";
    return '<div class="loan-box notes-box">' +
      '<label class="field"><span>' + esc(U.t("tools.tabNotes")) + '</span><textarea id="note-new" class="note-new" dir="auto" maxlength="5000" rows="3" placeholder="' + esc(U.t("notes.ph")) + '">' + esc(T.notes.draft || "") + "</textarea></label>" +
      '<div class="notes-add"><button type="button" class="primary" data-note="add">' + U.icon("plus", 15) + " " + esc(U.t("notes.add")) + "</button></div>" +
      (N.length ? '<label class="field notes-q"><span>' + esc(U.t("common.search")) + '</span><input name="note-q" dir="auto" placeholder="' + esc(U.t("notes.searchPh")) + '" value="' + esc(T.notes.q || "") + '"></label>' : "") +
      (N.length ? '<div class="notes-head"><span class="notes-count">' + esc(U.t("notes.count", { n: U.group(N.length) })) + "</span></div>" : "") +
      cards + "</div>";
  }

  const LEAK_ITEMS = [
    { k: "smoke", n: "leak.smoke", ph: "leak.smokeU", defN: 10, defP: 40000, per: "day" },
    { k: "coffee", n: "leak.coffee", ph: "leak.coffeeU", defN: 5, defP: 65000, per: "week" },
    { k: "cab", n: "leak.cab", ph: "leak.cabU", defN: 6, defP: 65000, per: "week" },
    { k: "food", n: "leak.food", ph: "leak.foodU", defN: 3, defP: 180000, per: "week" }
  ];
  /* اعداد نتیجهٔ نشتی — جدا از فرم تا هنگام تایپ، فیلدها دست‌نخورده بمانند */
  function leakNumsInner() {
    const y = T.leak.years;
    const g18 = rateOf("gold", "gold18") || 0;
    const usd = rateOf("fx", "usd") || 0;
    const it = LEAK_ITEMS.find(x => x.k === T.leak.sel);
    if (!it) return "";
    const st = T.leak[it.k] || (T.leak[it.k] = { n: null, p: null });
    const dash = "—";
    /* تا کاربر تعداد و قیمت را نداده، هیچ عدد جعلی نمایش داده نمی‌شود */
    if (!(st.n > 0) || !(st.p > 0)) {
      return '<div class="leak-nums"><div><small>' + esc(U.t("leak.monthly")) + "</small><b>" + dash + "</b></div>" +
        '<div><small>' + esc(U.t("leak.yearly")) + "</small><b>" + dash + "</b></div>" +
        '<div><small>' + esc(U.t("leak.total", { y: y > 0 ? U.group(y) : dash })) + "</small><b>" + dash + "</b></div></div>";
    }
    const perMonth = it.per === "day" ? st.n * 30 : st.n * 52 / 12; /* میانگین ۵۲ هفته‌ی سال */
    const monthly = perMonth * st.p;
    const yearly = monthly * 12;
    const total = y > 0 ? monthly * 12 * y : null;
    const gold = total != null && g18 ? (total / g18).toFixed(1) : null;
    const usdV = total != null && usd ? Math.round(total / usd) : 0;
    return '<div class="leak-nums"><div><small>' + esc(U.t("leak.monthly")) + "</small><b>" + fmt(monthly) + "</b></div>" +
      '<div><small>' + esc(U.t("leak.yearly")) + "</small><b>" + fmt(yearly) + "</b></div>" +
      '<div><small>' + esc(U.t("leak.total", { y: y > 0 ? U.group(y) : dash })) + "</small><b>" + (total != null ? fmt(total) : dash) + "</b></div>" +
      (gold ? '<div><small>' + esc(U.t("leak.goldEq")) + "</small><b>⚖ " + fmtGrams(gold) + " " + esc(U.t("common.gram")) + "</b></div>" : "") +
      (usdV ? '<div><small>' + esc(U.t("leak.usdEq")) + "</small><b>$ " + U.group(usdV) + "</b></div>" : "") +
      "</div>";
  }
  function updateLeakNums() {
    const pc = document.querySelector("#page-content");
    if (!pc || !IVA.app || IVA.app.page !== "tools") return;
    const el = pc.querySelector(".leak-nums");
    if (el && pc.querySelector('[data-leak="years"]')) el.outerHTML = leakNumsInner();
    else redrawSoft("leak");
  }
  function tabLeak() {
    const items = LEAK_ITEMS;
    /* کاربر یک مورد را انتخاب می‌کند و دقیقاً همان یک محاسبه‌گر باز می‌شود */
    const body = !T.leak.sel ? '<div class="empty">' + U.icon("target", 40) + "<p>" + esc(U.t("leak.pick")) + "</p></div>" : (() => {
      const it = items.find(x => x.k === T.leak.sel);
      const st = T.leak[it.k] || (T.leak[it.k] = { n: null, p: null });
      return '<article class="card leak-card"><h3>' + esc(U.t(it.n)) + "</h3>" +
        '<div class="loan-two"><label class="field"><span>' + esc(U.t(it.ph)) + '</span><input class="amt-input" data-leak-num="' + it.k + '" inputmode="numeric" placeholder="' + esc(U.t("leak.nPh")) + '" value="' + (st.n ? U.group(st.n) : "") + '"></label>' +
        '<label class="field"><span>' + esc(U.t("leak.unitPrice")) + '</span><input class="amt-input" data-leak-price="' + it.k + '" inputmode="numeric" placeholder="' + esc(U.t("leak.pPh")) + '" value="' + (st.p ? U.group(st.p) : "") + '"></label></div>' +
        leakNumsInner() + "</article>";
    })();
    return '<div class="loan-box">' +
      '<div class="chips">' + items.map(it => '<button type="button" class="chip-btn ' + (T.leak.sel === it.k ? "on" : "") + '" data-leak-sel="' + it.k + '">' + esc(U.t(it.n)) + "</button>").join("") + "</div>" +
      '<label class="field"><span>' + esc(U.t("leak.years")) + '</span><input class="amt-input" data-leak="years" inputmode="numeric" placeholder="' + esc(U.t("leak.yearsPh")) + '" value="' + (T.leak.years ? U.group(T.leak.years) : "") + '"></label>' +
      body +
      '<p class="tool-note">' + U.icon("info", 13) + " " + esc(U.t("leak.note")) + "</p></div>";
  }

  function tabBin() {
    const d = U.toEnDigits(T.bin).replace(/\D/g, "").slice(0, 16);
    const hit = binLookup(d);
    const full = d.length === 16;
    const luhn = full ? luhnOK(d) : null;
    const pretty = d ? d.replace(/(\d{4})(?=\d)/g, "$1 ").replace(/\d/g, x => U.lang() === "fa" ? U.faDigits[+x] : x) : "";
    const inner = d.length >= 6 ? (hit ? badgeHtml(hit.name, hit.color, hit.letter, false, hit.logo) : '<span class="bin-badge unknown"><i>؟</i><b>' + esc(U.t("bank.unknown")) + "</b></span>") +
      (full ? '<span class="due ' + (luhn ? "ok" : "bad") + '">' + U.icon(luhn ? "check" : "alert", 13) + " " + esc(U.t(luhn ? "bank.luhnOk" : "bank.luhnBad")) + "</span>" : "") : "";
    return '<div class="loan-box">' +
      '<label class="field"><span>' + esc(U.t("bank.enter")) + '</span><input class="card-input" data-bin="input" dir="ltr" inputmode="numeric" maxlength="19" value="' + pretty + '" placeholder="' + esc(U.t("acc.cardNumberPh")) + '"></label>' +
      '<div class="bin-result">' + inner + "</div>" +
      '<p class="tool-note">' + U.icon("shield", 13) + " " + esc(U.t("bank.privacy")) + "</p></div>";
  }

  function page() {
    const tabs = [["fx", "tools.tabFx"], ["crypto", "tools.tabCrypto"], ["conv", "tools.tabConv"], ["loan", "tools.tabLoan"], ["cpi", "tools.tabCpi"], ["leak", "tools.tabLeak"], ["bin", "tools.tabBin"], ["notes", "tools.tabNotes"]];
    const body = { fx: tabFx, crypto: tabCrypto, conv: tabConv, loan: tabLoan, cpi: tabCpi, leak: tabLeak, bin: tabBin, notes: tabNotes }[T.tab] || tabFx;
    return '<section class="tool-tabs">' + tabs.map(t => '<button type="button" class="chip-btn ' + (T.tab === t[0] ? "on" : "") + '" data-tooltab="' + t[0] + '">' + esc(U.t(t[1])) + "</button>").join("") + "</section>" +
      '<section class="card tool-card">' + body() + "</section>";
  }

  /* ================= ایونت‌ها ================= */

  function redraw() { render(); }

  function bind(root) {
    root.addEventListener("click", e => {
      const tab = e.target.closest("[data-tooltab]");
      if (tab) { T.tab = tab.dataset.tooltab; redraw(); return; }
      const act = e.target.closest("[data-tool]");
      if (act && act.dataset.tool === "refresh") {
        if (T.busy) return;
        T.busy = true; act.classList.add("spin");
        fetchLive().then(ok => {
          T.busy = false;
          redraw();
          IVA.toast && IVA.toast(ok ? U.t("tools.refreshed") : U.t("tools.netFail"), { type: ok ? "ok" : "error" });
        });
        return;
      }
      const swap = e.target.closest('[data-tool="conv-swap"]');
      if (swap) { const a = T.conv.from; T.conv.from = T.conv.to; T.conv.to = a; T.conv.manualFrom = T.conv.manualTo = ""; redraw(); return; }
      const loanBtn = e.target.closest("[data-loan]");
      /* فقط دکمه‌ها (پریست/مد/جدول)؛ خودِ input و select وام نباید رندر دوباره کنند —
         باگ: کلیک روی فیلد مبلغ صفحه را از نو می‌ساخت و فوکوس می‌پرید (ورودی کاربر گرفته نمی‌شد) */
      if (loanBtn && loanBtn.tagName === "BUTTON") {
        const k = loanBtn.dataset.loan, v = loanBtn.dataset.val;
        if (k === "preset") {
          T.loan.preset = v;
          if (v === "custom") { T.loan.mode = "annuity"; T.loan.P = null; T.loan.r = null; T.loan.fee = null; T.loan.n = null; }
          else { Object.assign(T.loan, presetFill[v] || {}); }
        }
        if (k === "mode") T.loan.mode = v;
        if (k === "table") T.loan.showTable = !T.loan.showTable;
        redraw(); return;
      }
      const leakSel = e.target.closest("[data-leak-sel]");
      if (leakSel) { T.leak.sel = leakSel.dataset.leakSel; redraw(); return; }
      const cpiChip = e.target.closest('[data-cpi="kind"]');
      if (cpiChip) { T.cpi.kind = cpiChip.dataset.val; redraw(); return; }
      const noteBtn = e.target.closest("[data-note]");
      if (noteBtn) {
        const act = noteBtn.dataset.note, id = noteBtn.dataset.id;
        const N = Store.state.notes = Store.state.notes || [];
        if (act === "add") {
          const ta = root.querySelector("#note-new");
          const txt = (ta ? ta.value : T.notes.draft || "").trim();
          if (!txt) { if (ta) ta.focus(); return; }
          if (N.length >= 500) { IVA.toast && IVA.toast(U.t("notes.full"), { type: "error" }); return; }
          N.unshift({ id: U.uid(), text: txt.slice(0, 5000), ts: Date.now(), up: 0 });
          Store.save();
          T.notes.draft = "";
          IVA.toast && IVA.toast(U.t("notes.saved"), { type: "ok" });
          redraw();
        } else if (act === "edit") {
          T.notes.edit = id; T.notes.editDraft = ""; redraw();
          const ta = root.querySelector('[name="note-edit"]');
          if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { } }
        } else if (act === "save") {
          const ta = root.querySelector('[name="note-edit"]');
          const n = N.find(x => x.id === id);
          const v = ta ? ta.value.trim() : "";
          if (n && v) { n.text = v.slice(0, 5000); n.up = Date.now(); Store.save(); IVA.toast && IVA.toast(U.t("notes.updated"), { type: "ok" }); }
          T.notes.edit = null; T.notes.editDraft = ""; redraw();
        } else if (act === "cancel") {
          T.notes.edit = null; T.notes.editDraft = ""; redraw();
        } else if (act === "del") {
          if (noteBtn.dataset.armed) {
            const i = N.findIndex(x => x.id === id);
            if (i > -1) { N.splice(i, 1); Store.save(); IVA.toast && IVA.toast(U.t("notes.deleted")); }
            redraw();
          } else {
            /* تأیید دومرحله‌ای حذف — بدون رندر دوباره تا پیش‌نویس نپرد */
            noteBtn.dataset.armed = "1"; noteBtn.classList.add("arm");
            noteBtn.innerHTML = esc(U.t("notes.sure"));
            setTimeout(() => { if (noteBtn.isConnected) { delete noteBtn.dataset.armed; noteBtn.classList.remove("arm"); noteBtn.innerHTML = U.icon("trash", 15); } }, 2600);
          }
        }
        return;
      }
    });
    root.addEventListener("input", e => {
      const el = e.target;
      /* فرمت نمایشی ورودی‌ها را هندلر سراسری اپ انجام می‌دهد؛ اینجا فقط وضعیت خوانده می‌شود */
      if (el.dataset.bin === "input") {
        /* فرمت نمایشی + کِرست را هندلر سراسری اپ انجام می‌دهد؛ اینجا فقط وضعیت و نتیجه */
        T.bin = U.toEnDigits(el.value).replace(/\D/g, "").slice(0, 16);
        const d = T.bin;
        const res = root.querySelector(".bin-result");
        if (res) { /* بازرندر سبز نتیجه */
          const hit = binLookup(d), full = d.length === 16, luhn = full ? luhnOK(d) : null;
          res.innerHTML = (hit ? badgeHtml(hit.name, hit.color, hit.letter, false, hit.logo) : '<span class="bin-badge unknown"><i>؟</i><b>' + esc(U.t("bank.unknown")) + "</b></span>") +
            (full ? '<span class="due ' + (luhn ? "ok" : "bad") + '">' + U.icon(luhn ? "check" : "alert", 13) + " " + esc(U.t(luhn ? "bank.luhnOk" : "bank.luhnBad")) + "</span>" : "");
        }
        return;
      }
      if (el.dataset.loan) {
        const k = el.dataset.loan, v = U.toEnDigits(el.value).replace(/[^\d.]/g, "");
        if (k === "amount") { T.loan.P = Math.max(0, +v || 0); recalcLoanSoon(); return; }
        /* نرخ/کارمزد: اعشار مجاز — فقط خروجی‌ها آپدیت می‌شوند تا نقطه‌ی در حال تایپ حذف نشود */
        if (k === "rate") T.loan.r = U.clamp(parseFloat(v) || 0, 0, 100);
        if (k === "fee") T.loan.fee = U.clamp(parseFloat(v) || 0, 0, 100);
        if (k === "rate" || k === "fee") { clearTimeout(_tm.rate); _tm.rate = setTimeout(redrawLoanOutputs, 160); }
        return;
      }
      if (el.dataset.cpi) {
        const k = el.dataset.cpi, v = U.toEnDigits(el.value).replace(/[^\d.]/g, "");
        if (k === "amount") T.cpi.amount = Math.max(0, +v || 0);
        recalcSoon("cpi"); return;
      }
      if (el.dataset.leakNum || el.dataset.leakPrice) {
        const k = el.dataset.leakNum ? el.dataset.leakNum : el.dataset.leakPrice;
        const st = T.leak[k] || (T.leak[k] = { n: null, p: null });
        const raw = U.toEnDigits(el.value).replace(/[^\d]/g, "");
        const v = raw === "" ? null : (+raw || 0); /* خالی = هنوز وارد نشده */
        if (el.dataset.leakNum) st.n = v; else st.p = v;
        recalcSoon("leak"); return;
      }
      if (el.dataset.leak === "years") {
        const rawY = U.toEnDigits(el.value).replace(/[^\d]/g, "");
        T.leak.years = rawY === "" ? null : Math.max(1, +rawY || 1);
        recalcSoon("leak"); return;
      }
      if (el.name === "conv-amount") { const v = U.toEnDigits(el.value).replace(/[\u066B]/g, ".").replace(/[^\d.]/g, ""); T.conv.amount = parseFloat(v) || 0; recalcSoon("conv"); return; }
      if (el.name === "conv-mf") { const v = U.toEnDigits(el.value).replace(/[\u066B]/g, ".").replace(/[^\d.]/g, ""); T.conv.manualFrom = parseFloat(v) || 0; recalcSoon("conv"); return; }
      if (el.name === "conv-mt") { const v = U.toEnDigits(el.value).replace(/[\u066B]/g, ".").replace(/[^\d.]/g, ""); T.conv.manualTo = parseFloat(v) || 0; recalcSoon("conv"); return; }
      if (el.id === "note-new") { T.notes.draft = el.value; return; }
      if (el.name === "note-edit") { T.notes.editDraft = el.value; return; }
      if (el.name === "note-q") { T.notes.q = el.value; recalcSoon("notes"); return; }
    });
    /* Ctrl/⌘+Enter در یادداشت جدید = افزودن */
    root.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && e.target.id === "note-new") {
        const btn = root.querySelector('[data-note="add"]');
        if (btn) { e.preventDefault(); btn.click(); }
      }
    });
    root.addEventListener("change", e => {
      const el = e.target;
      if (el.dataset.loan === "months") { T.loan.n = +el.value || null; redraw(); return; }
      /* انتخاب سال/ارز: فقط خروجی آپدیت می‌شود — فوکوس و چیدمان نمی‌پرد */
      if (el.dataset.cpi && el.tagName === "SELECT") { T.cpi[el.dataset.cpi] = +el.value || 1405; updateCpiResult(); return; }
      /* ارزِ بی‌نرخ: رندر کامل تا راهنمای «قیمت را وارد کنید» بیاید؛ با نرخ: فقط خروجی */
      if (el.name === "conv-from") { T.conv.from = el.value; T.conv.manualFrom = ""; convRate(el.value) > 0 ? updateConvResult() : redrawSoft("conv"); return; }
      if (el.name === "conv-to") { T.conv.to = el.value; T.conv.manualTo = ""; convRate(el.value) > 0 ? updateConvResult() : redrawSoft("conv"); return; }
    });
  }

  const _tm = {};
  /* همه مسیرهای «در حال تایپ» فقط خروجی را آپدیت می‌کنند — هرگز کل تب رندر دوباره نمی‌شود
     (ریشهٔ باگ «فقط یک رقم می‌شود وارد کرد»: رندر دوباره فوکوس و حروف در راه را می‌خورد) */
  function recalcLoanSoon() { clearTimeout(_tm.loan); _tm.loan = setTimeout(() => redrawLoanOutputs(), 250); }
  function recalcSoon(which) {
    clearTimeout(_tm[which]);
    _tm[which] = setTimeout(() => {
      if (which === "cpi") updateCpiResult();
      else if (which === "leak") updateLeakNums();
      else if (which === "conv") updateConvResult();
      else redrawSoft(which);
    }, 250);
  }
  /* نرم: بدون ساخت دوباره فیلد در حال تایپ — فقط خروجی‌ها */
  function redrawSoft(which) {
    const pc = document.querySelector("#page-content");
    if (!pc || !IVA.app || IVA.app.page !== "tools") return;
    const active = document.activeElement;
    const keep = active && active.dataset ? (active.dataset.loan || active.dataset.cpi || active.dataset.leak || active.dataset.leakNum || active.dataset.leakPrice || active.name || (active.dataset.bin === "input" ? "bin" : "")) : "";
    render();
    if (keep) {
      const again = pc.querySelector('[data-loan="' + keep + '"], [data-cpi="' + keep + '"], [data-leak="' + keep + '"], [data-leak-num="' + keep + '"], [data-leak-price="' + keep + '"], [name="' + keep + '"], [data-bin="input"]');
      if (again) { again.focus(); try { again.setSelectionRange(again.value.length, again.value.length); } catch (e) { } }
    }
  }

  function render() {
    const pc = document.querySelector("#page-content");
    if (!pc) return;
    pc.innerHTML = page();
  }
  T.render = render;
  /* فراخوانی از router اپ: HTML برمی‌گرداند و ایونت‌ها را یک‌بار می‌بندد (گره بر #page-content پایدار است) */
  T.mount = function () {
    const pc = document.querySelector("#page-content");
    if (!pc) return "";
    if (!T._bound) { T._bound = true; bind(pc); }
    return page();
  };

  /* هوک فرم حساب: نمایش زنده بانک از ۶ رقم اول (مثل درگاه‌های پرداخت) */
  T.cardHint = function (inputEl) {
    const box = inputEl.closest(".field-in");
    if (!box) return;
    let hint = box.querySelector(".bin-hint");
    const d = U.toEnDigits(inputEl.value).replace(/\D/g, "");
    if (d.length < 6) { if (hint) hint.remove(); return; }
    const hit = binLookup(d);
    const html = hit ? badgeHtml(hit.name, hit.color, hit.letter, true, hit.logo) +
      (d.length === 16 && !luhnOK(d) ? '<span class="due bad">' + U.icon("alert", 12) + " " + esc(U.t("bank.luhnBad")) + "</span>" : "") : "";
    if (!hint) { hint = document.createElement("div"); hint.className = "bin-hint"; box.appendChild(hint); }
    hint.innerHTML = html;
  };

  window.IVA.tools = T;
})();
