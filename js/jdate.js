/* IVA — تقویم شمسی حرفه‌ای + انتخابگر تاریخ برای همهٔ فیلدهای تاریخ اپ
   تبدیل: الگوریتم Borkowski (پیاده‌سازی مرجع jalaali-js v2 — MIT)؛ دقیق برای ۱۸۰۰..۲۲۵۶ میلادی.
   ذخیره‌سازی هم‌چنان ISO میلادی است؛ فقط «نمایش و انتخاب» کاملاً شمسی است. */
"use strict";

(function () {
  window.IVA = window.IVA || {};
  const U = () => window.IVA.utils;

  /* ================= هستهٔ ریاضی (jalaali v2) ================= */
  const div = (a, b) => ~~(a / b);
  const mod = (a, b) => a - ~~(a / b) * b;
  const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  /* سال کبیسه/عادی + روز اول فروردین در مارس میلادی */
  function jalCal(jy) {
    let leapJ = -14, jp = BREAKS[0], jump = 0;
    for (let i = 1; i < BREAKS.length; i++) {
      const jm = BREAKS[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    const n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    const gy = jy + 621;
    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    let adjusted = n;
    if (jump - n < 6) adjusted = n - jump + div(jump + 4, 33) * 33;
    let leap = mod(mod(adjusted + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap, gy, march: 20 + leapJ - leapG };
  }
  function g2d(gy, gm, gd) {
    let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }
  function d2g(jdn) {
    let j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = div(mod(j, 1461), 4) * 5 + 308;
    const gd = div(mod(i, 153), 5) + 1;
    const gm = mod(div(i, 153), 12) + 1;
    return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm, gd };
  }
  function j2d(jy, jm, jd) {
    const r = jalCal(jy);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }
  function d2j(jdn) {
    const gy = d2g(jdn).gy;
    let jy = gy - 621;
    const r = jalCal(jy);
    let k = jdn - g2d(r.gy, 3, r.march);
    if (k >= 0) {
      if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
  }
  const isLeapJ = jy => jalCal(jy).leap === 0;
  const monthLen = (jy, jm) => (jm <= 6 ? 31 : jm <= 11 ? 30 : isLeapJ(jy) ? 30 : 29);
  const toJalaali = (gy, gm, gd) => d2j(g2d(gy, gm, gd));
  const toGregorian = (jy, jm, jd) => d2g(j2d(jy, jm, jd));
  const isoOf = (gy, gm, gd) => gy + "-" + String(gm).padStart(2, "0") + "-" + String(gd).padStart(2, "0");
  const jIso = (jy, jm, jd) => { const g = toGregorian(jy, jm, jd); return isoOf(g.gy, g.gm, g.gd); };
  const isoToJ = isoStr => { const p = isoStr.split("-").map(Number); return toJalaali(p[0], p[1], p[2]); };

  /* ================= نمایش شمسی ================= */
  function label(isoStr) {
    if (!isoStr || !/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return "";
    const j = isoToJ(isoStr);
    const u = U(), L = u.lang();
    const m = u.jalaliMonths[L][j.jm - 1];
    const d = L === "fa" ? u.group(j.jd) : String(j.jd);
    const y = L === "fa" ? String(j.jy).replace(/\d/g, x => u.faDigits[+x]) : String(j.jy);
    return d + " " + m + " " + y;
  }

  /* ================= پاپ‌آپ تقویم ================= */
  let open = null; /* {wrap, inp, view:{jy,jm}} */
  const WEEK = { fa: ["ش", "ی", "د", "س", "چ", "پ", "ج"], en: ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"] };
  const faDig = (u, n) => String(n).replace(/\d/g, x => u.faDigits[+x]);
  const todayJ = () => isoToJ(U().isoToday());

  function onDoc(e) { if (open && !open.wrap.isConnected) return closePop(); /* مودال با میان‌بر عوض شده */
    if (open && !open.wrap.contains(e.target)) closePop(); }
  function onKey(e) {
    if (open && !open.wrap.isConnected) { closePop(); return; }
    if (e.key === "Escape" && open) { e.preventDefault(); e.stopImmediatePropagation(); closePop(); }
  }
  function closePop() {
    if (!open) return;
    open.wrap.classList.remove("open");
    const p = open.wrap.querySelector(".jd-pop");
    if (p) p.remove();
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("mousedown", onDoc, true);
    open = null;
  }

  function renderPop() {
    const u = U(), L = u.lang();
    const { wrap, inp, view } = open;
    const pop = wrap.querySelector(".jd-pop");
    if (!pop) return;
    const sel = inp.value || "";
    const max = inp.getAttribute("max") || "";
    const min = inp.getAttribute("min") || "";
    const td = todayJ();
    const g1 = toGregorian(view.jy, view.jm, 1);
    const col = (new Date(g1.gy, g1.gm - 1, g1.gd).getDay() + 1) % 7; /* شنبه = ستون اول */
    const len = monthLen(view.jy, view.jm);
    const title = u.jalaliMonths[L][view.jm - 1] + " " + (L === "fa" ? faDig(u, view.jy) : view.jy);
    let cells = "";
    for (let i = 0; i < col; i++) cells += "<i></i>";
    const todayIso = jIso(td.jy, td.jm, td.jd);
    for (let d = 1; d <= len; d++) {
      const iso = jIso(view.jy, view.jm, d);
      const dis = (max && iso > max) || (min && iso < min);
      cells += '<button type="button" class="jd-day' + (iso === sel ? " sel" : "") + (iso === todayIso ? " today" : "") + (dis ? " dis" : "") + '" data-d="' + d + '"' + (dis ? " disabled" : "") + ">" + (L === "fa" ? faDig(u, d) : d) + "</button>";
    }
    pop.innerHTML =
      '<div class="jd-head">' +
      '<button type="button" class="jd-nav" data-nav="py" aria-label="year-">«</button>' +
      '<button type="button" class="jd-nav" data-nav="pm" aria-label="month-">‹</button>' +
      '<span class="jd-title">' + title + "</span>" +
      '<button type="button" class="jd-nav" data-nav="nm" aria-label="month+">›</button>' +
      '<button type="button" class="jd-nav" data-nav="ny" aria-label="year+">»</button></div>' +
      '<div class="jd-week">' + WEEK[L].map(w => "<span>" + w + "</span>").join("") + "</div>" +
      '<div class="jd-grid">' + cells + "</div>" +
      '<div class="jd-foot"><button type="button" data-act="today">' + esc(u, u.t("jdate.today")) + "</button>" +
      (inp.required ? "<span></span>" : '<button type="button" data-act="clear">' + esc(u, u.t("jdate.clear")) + "</button>") + "</div>";
  }
  const esc = (u, s) => u.esc(s);

  function setOpenVal(iso) {
    const inp = open.inp, wrap = open.wrap;
    inp.value = iso;
    const t = wrap.querySelector(".jd-text");
    if (t) t.textContent = iso ? label(iso) : U().t("jdate.pick");
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function pick(d, base) {
    const v = base || open.view;
    setOpenVal(jIso(v.jy, v.jm, d));
    closePop();
  }
  function bindPop(pop) {
    pop.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b || b.disabled || !open) return;
      /* پاپ‌آپ داخل label است؛ preventDefault تا کلیکِ دکمه‌های تقویم، دکمهٔ نمایش را دوباره فعال نکند */
      e.preventDefault();
      if (b.dataset.d) { pick(+b.dataset.d); return; }
      if (b.dataset.nav) {
        const v = open.view;
        let m = v.jm, y = v.jy;
        if (b.dataset.nav === "pm") { m--; if (m < 1) { m = 12; y--; } }
        if (b.dataset.nav === "nm") { m++; if (m > 12) { m = 1; y++; } }
        if (b.dataset.nav === "py") y--;
        if (b.dataset.nav === "ny") y++;
        open.view = { jy: Math.min(1500, Math.max(1300, y)), jm: m };
        renderPop();
        return;
      }
      if (b.dataset.act === "today") { const t = todayJ(); pick(t.jd, t); return; }
      if (b.dataset.act === "clear") { setOpenVal(""); closePop(); }
    });
  }

  function openPicker(wrap, inp) {
    closePop();
    const cur = inp.value ? isoToJ(inp.value) : todayJ();
    open = { wrap, inp, view: { jy: cur.jy, jm: cur.jm } };
    const pop = document.createElement("div");
    pop.className = "jd-pop";
    pop.dir = U().lang() === "fa" ? "rtl" : "ltr";
    wrap.appendChild(pop);
    wrap.classList.add("open");
    bindPop(pop);
    renderPop();
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onDoc, true);
  }

  /* ================= اتصال به فیلدهای date ================= */
  function enhance(root) {
    const u = U();
    (root || document).querySelectorAll('input[type="date"]').forEach(inp => {
      let wrap = inp.closest(".jd-wrap");
      if (!wrap) {
        wrap = document.createElement("span");
        wrap.className = "jd-wrap";
        inp.parentNode.insertBefore(wrap, inp);
        const disp = document.createElement("button");
        disp.type = "button";
        disp.className = "jd-display";
        disp.innerHTML = '<span class="jd-text"></span>' + u.icon("calendar", 15);
        wrap.appendChild(disp);
        wrap.appendChild(inp);
        inp.classList.add("jd-native");
        inp.tabIndex = -1; /* از چرخهٔ Tab بیرون بماند */
        disp.addEventListener("click", e => {
          e.preventDefault(); /* پیش‌فرض label را خنثی می‌کند (دوبار باز نشود) */
          e.stopPropagation();
          if (open && open.wrap === wrap) closePop();
          else openPicker(wrap, inp);
        });
        inp.addEventListener("change", () => {
          const t = wrap.querySelector(".jd-text");
          if (t) t.textContent = inp.value ? label(inp.value) : U().t("jdate.pick");
        });
      }
      const t = wrap.querySelector(".jd-text");
      t.textContent = inp.value ? label(inp.value) : U().t("jdate.pick");
    });
  }

  window.IVA.jdate = { enhance, label, close: closePop, toJalaali, toGregorian, monthLen, isLeapJ, isoToJ, jIso };
})();
