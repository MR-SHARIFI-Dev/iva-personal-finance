/* IVA v2 — utilities: escaping, money, Jalali dates, icons */
"use strict";

const U = {
  /* ---------- safety ---------- */
  esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
  clamp(n, min, max) { return Math.min(max, Math.max(min, n)); },

  /* ---------- digits ---------- */
  faDigits: "۰۱۲۳۴۵۶۷۸۹",
  toEnDigits(s) {
    return String(s ?? "").replace(/[۰-۹]/g, d => String(this.faDigits.indexOf(d)))
      .replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  },
  parseAmount(s) {
    const clean = this.toEnDigits(s).replace(/[^\d.-]/g, "");
    const n = Math.round(Number(clean));
    return Number.isFinite(n) ? n : NaN;
  },
  group(n) {
    const neg = n < 0; const abs = Math.abs(Math.round(n));
    let s = String(abs), out = "";
    while (s.length > 3) { out = "," + s.slice(-3) + out; s = s.slice(0, -3); }
    const grouped = s + out;
    if (U.lang() === "fa") {
      const fa = grouped.replace(/\d/g, d => U.faDigits[+d]).replace(/,/g, "٬");
      return (neg ? "−" : "") + fa;
    }
    return (neg ? "-" : "") + grouped;
  },
  /* full money in display currency; amounts stored in toman */
  money(n, opts = {}) {
    const cur = U.currency();
    const v = cur === "rial" ? Math.abs(n) * 10 : Math.abs(n);
    return U.group(v) + (opts.unit === false ? "" : " " + U.t("common." + cur));
  },
  compact(n) {
    const cur = U.currency();
    const v = Math.abs(cur === "rial" ? n * 10 : n);
    const fa = U.lang() === "fa";
    const fmt = (x, suf) => {
      const r = x >= 100 ? Math.round(x) : Math.round(x * 10) / 10;
      return U.group(r) + " " + suf;
    };
    if (v >= 1e9) return fmt(v / 1e9, fa ? "میلیارد" : "B");
    if (v >= 1e6) return fmt(v / 1e6, fa ? "میلیون" : "M");
    if (v >= 1e3) return fmt(v / 1e3, fa ? "هزار" : "K");
    return U.group(v);
  },
  pct(n) {
    const r = Math.round(n * 10) / 10;
    if (U.lang() !== "fa") return r + "%";
    /* فیکس: U.group اعشار را گرد می‌کرد و «۴۵٫۶٪» در فارسی «۴۶٪» می‌شد */
    const neg = r < 0, a = Math.abs(r);
    const ip = Math.floor(a), fr = Math.round((a - ip) * 10) % 10;
    return (neg ? "\u2212" : "") + U.group(ip) + (fr ? "\u066B" + U.faDigits[fr] : "") + "٪";
  },

  /* ---------- i18n plumbing (set by app) ---------- */
  lang: () => "fa",
  currency: () => "toman",
  t: (key, params) => {
    const d = window.IVA.i18n.I18N[U.lang()] || {};
    let s = d[key] ?? window.IVA.i18n.I18N.fa[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) s = s.split("{" + k + "}").join(String(v));
    return s;
  },

  /* ---------- dates (Jalali-aware, zero deps) ---------- */
  _pf: null,
  _jParts(date) {
    if (!U._pf) U._pf = new Intl.DateTimeFormat("en-u-ca-persian", { year: "numeric", month: "numeric", day: "numeric" });
    const p = {};
    for (const part of U._pf.formatToParts(date)) if (part.type !== "literal") p[part.type] = parseInt(part.value, 10);
    return p; // {year: 1405, month: 5, day: 3}
  },
  jalaliMonths: {
    fa: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"],
    en: ["Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar", "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand"]
  },
  monthKey(date = new Date()) {
    const p = U._jParts(date);
    return p.year * 12 + p.month; // stable integer key
  },
  monthLabel(key) {
    const monthNum = ((key - 1) % 12) + 1;
    const year = Math.floor((key - 1) / 12);
    return U.jalaliMonths[U.lang()][monthNum - 1] + (U.lang() === "fa" ? "" : " " + year);
  },
  isoToday() {
    const d = new Date();
    return U.toISO(d);
  },
  toISO(d) {
    const p = x => String(x).padStart(2, "0");
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  },
  fromISO(iso) {
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  },
  daysDiff(iso) { // target - today, in days
    const t = U.fromISO(iso); t.setHours(12, 0, 0, 0);
    const n = new Date(); n.setHours(12, 0, 0, 0);
    return Math.round((t - n) / 86400000);
  },
  dateLabel(iso) {
    if (!iso) return "—";
    const diff = U.daysDiff(iso);
    if (diff === 0) return U.t("common.today");
    if (diff === -1) return U.t("common.yesterday");
    const d = U.fromISO(iso);
    const p = U._jParts(d);
    const nowP = U._jParts(new Date());
    const day = U.lang() === "fa" ? U.group(p.day) : String(p.day);
    const ym = U.jalaliMonths[U.lang()][p.month - 1];
    /* فیکس: U.group سال را «۱٬۴۰۳» می‌کرد — سال بدون جداکنندهٔ هزارگان */
    const y = p.year !== nowP.year ? " " + (U.lang() === "fa" ? String(p.year).replace(/\d/g, x => U.faDigits[+x]) : p.year) : "";
    return day + " " + ym + y;
  },
  dueLabel(iso) {
    const diff = U.daysDiff(iso);
    const n = U.lang() === "fa" ? U.group(Math.abs(diff)) : Math.abs(diff);
    if (diff > 0) return { text: U.t("debt.dueIn", { n }), tone: diff <= 3 ? "warn" : "ok" };
    if (diff === 0) return { text: U.t("debt.dueToday"), tone: "warn" };
    return { text: U.t("debt.overdue", { n }), tone: "bad" };
  },

  /* ---------- inline SVG icon set (feather-style, stroke=currentColor) ---------- */
  _icons: {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    bank: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M17 7V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/><circle cx="8" cy="18" r="1.4"/><circle cx="16" cy="18" r="1.4"/>',
    card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    wallet: '<path d="M20 7H4a2 2 0 0 1 0-4h14v4"/><path d="M22 7v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5"/><circle cx="16" cy="14" r="1.3"/>',
    dollar: '<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    gauge: '<path d="M12 15l4-5"/><path d="M3.5 17a10 10 0 1 1 17 0"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    swap: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    gear: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    in: '<line x1="17" y1="7" x2="7" y2="17"/><polyline points="7 9 7 17 15 17"/>',
    out: '<line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 9 17 17 9 17"/>',
    trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    trendDown: '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
    pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    food: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
    truck: '<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    bag: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    dot: '<circle cx="12" cy="12" r="5"/>',
    more: '<circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/><circle cx="5" cy="12" r="1.6"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    spark: '<path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    chevL: '<polyline points="15 18 9 12 15 6"/>',
    chevR: '<polyline points="9 18 15 12 9 6"/>'
  },
  icon(name, size = 20, cls = "") {
    const body = U._icons[name] || U._icons.dot;
    return '<svg class="ic ' + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
  }
};

window.IVA.utils = U;
window.IVA.VERSION = "2.0.0"; /* نسخهٔ اپ — هنگام انتشار به‌روز شود */
