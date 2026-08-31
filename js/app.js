/* IVA v2 — application: router, pages, forms, actions */
"use strict";

(function () {

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  /* ============ 0. boot wiring ============ */
  U.lang = () => App.settings.lang;
  U.currency = () => App.settings.currency;

  const App = {
    settings: null,
    page: "overview",
    txFilters: { q: "", type: "all", cat: "all", acc: "all", month: "all", sort: "dateDesc" },
    txLimit: 30,
    reportRange: 6,
    repSec: "cashflow", /* بند ۸: نشست مالی ۴ سکشنی — فقط سکشن انتخابی رندر می‌شود */
    repAcc: "all",      /* فیلتر حساب/کارت انتخابی در همه سکشن‌های گزارش */
    deferredInstall: null,
    lastFocus: null,
    undoSnap: null
  };
  window.IVA.app = App;
  window.IVA.toast = toast; /* برای ماژول tools */

  /* ============ 1. derived analytics ============ */
  const D = {
    account(id) { return Store.state.accounts.find(a => a.id === id); },
    txOfMonth(key) { return Store.state.transactions.filter(t => U.monthKey(U.fromISO(t.date)) === key); },
    monthKeys(n) { const cur = U.monthKey(); const out = []; for (let i = n - 1; i >= 0; i--) out.push(cur - i); return out; },
    sums(txs) {
      let income = 0, expense = 0;
      for (const t of txs) t.amount > 0 ? income += t.amount : expense += Math.abs(t.amount);
      return { income, expense, net: income - expense };
    },
    netWorth() { return Store.state.accounts.reduce((a, b) => a + b.balance, 0); },
    curKey() { return U.monthKey(); },
    series(n) {
      const keys = D.monthKeys(n);
      const rows = keys.map(k => ({ key: k, label: U.monthLabel(k), ...D.sums(D.txOfMonth(k)) }));
      return { keys, rows };
    },
    catBreakdown(key, type = "expense") {
      const map = {};
      for (const t of D.txOfMonth(key)) {
        if ((type === "expense" && t.amount > 0) || (type === "income" && t.amount < 0)) continue;
        map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
      }
      return Object.entries(map).map(([k, v]) => ({ cat: k, value: v, meta: IVA.i18n.CATEGORY_MAP[k] || { color: "#8892a6", icon: "dot" } }))
        .sort((a, b) => b.value - a.value);
    },
    budgetSpent(b, key = D.curKey()) {
      return D.txOfMonth(key).filter(t => t.amount < 0 && t.category === b.category)
        .reduce((a, t) => a + Math.abs(t.amount), 0);
    },
    totalsDebt() {
      const d = Store.state.debts.filter(x => !x.settled);
      return {
        debt: d.filter(x => x.kind === "debt").reduce((a, b) => a + b.amount, 0),
        credit: d.filter(x => x.kind === "credit").reduce((a, b) => a + b.amount, 0)
      };
    },
    health() {
      /* نمره فقط از بخش‌هایی محاسبه می‌شود که داده واقعی دارند.
         باگ قدیمی: با داده خالی، پیش‌فرض‌های خوش‌بینانه (۰.۵ پس‌انداز + ۱۰۰ بودجه + ۱۰۰ بدهی)
         نمره ۸۰ «عالی» می‌ساخت! حالا با هیچ داده‌ای، حالت «بدون داده» برمی‌گردد. */
      const cur = D.sums(D.txOfMonth(D.curKey()));
      const hasCur = cur.income > 0 || cur.expense > 0;
      const buds = Store.state.budgets;
      const { debt } = D.totalsDebt();
      let sum = 0, weight = 0;
      if (hasCur) {
        const sr = cur.income > 0 ? U.clamp((cur.income - cur.expense) / cur.income, 0, 1) : 0;
        sum += sr * 40; weight += 40;
      }
      if (buds.length) {
        const budScore = buds.reduce((acc, b) => {
          const ratio = b.amount > 0 ? D.budgetSpent(b) / b.amount : 0;
          return acc + U.clamp(100 - Math.max(0, ratio - 0.85) / 0.15 * 100, 0, 100);
        }, 0) / buds.length;
        sum += budScore * 0.3; weight += 30;
      }
      if (debt > 0 || hasCur) {
        const net = Math.max(D.netWorth(), 1);
        sum += (debt > 0 ? U.clamp(100 - (debt / net) * 300, 0, 100) : 100) * 0.3;
        weight += 30;
      }
      if (weight === 0) return { score: 0, label: "health.noData", neutral: true, savingsRate: null };
      const score = U.clamp(Math.round(sum / weight * 100), 0, 100);
      const label = score >= 80 ? "health.great" : score >= 60 ? "health.good" : score >= 40 ? "health.ok" : "health.poor";
      const srPct = cur.income > 0 ? Math.round(U.clamp((cur.income - cur.expense) / cur.income, 0, 1) * 100) : 0;
      return { score, label, savingsRate: srPct };
    },
    insights() {
      const out = [];
      const key = D.curKey();
      const cur = D.sums(D.txOfMonth(key));
      const prev = D.sums(D.txOfMonth(key - 1));
      const cats = D.catBreakdown(key);
      if (cur.income === 0 && cur.expense === 0) return out;
      // over-budget warning
      for (const b of Store.state.budgets) {
        const spent = D.budgetSpent(b);
        if (b.amount > 0 && spent / b.amount >= 0.9) {
          out.push({ icon: "alert", tone: "warn", html: U.t("ins.overBudget", { b: U.esc(b.name), p: Math.round(spent / b.amount * 100), a: U.money(Math.max(0, b.amount - spent)) }) });
          break;
        }
      }
      if (cats.length) {
        const c = cats[0];
        const share = cur.expense > 0 ? Math.round(c.value / cur.expense * 100) : 0;
        out.push({ icon: c.meta.icon, tone: "info", html: U.t("ins.topCat", { c: U.esc(U.t("cat." + c.cat)), a: U.money(c.value) }) + " (" + U.pct(share) + ")" });
      }
      if (cur.income > 0) {
        let trend = "";
        if (prev.income > 0 || prev.expense > 0) {
          const pr = prev.income > 0 ? (prev.income - prev.expense) / prev.income : 0;
          const cr = (cur.income - cur.expense) / cur.income;
          const diff = Math.round((cr - pr) * 100);
          trend = (diff >= 0 ? "▲ " : "▼ ") + (diff > 0 ? "+" : "") + U.pct(diff);
        }
        out.push({ icon: "trend", tone: "good", html: U.t("ins.savingRate", { p: Math.round((cur.income - cur.expense) / cur.income * 100), t: trend || "—" }) });
      } else {
        out.push({ icon: "info", tone: "warn", html: U.t("ins.noIncome") });
      }
      // goal ETA on avg savings
      const s6 = D.series(6).rows;
      const avgSave = s6.reduce((a, r) => a + r.net, 0) / Math.max(s6.filter(r => r.income > 0 || r.expense > 0).length, 1);
      const g = Store.state.goals.find(g => g.saved < g.target);
      if (g && avgSave > 10000) {
        out.push({ icon: "target", tone: "good", html: U.t("ins.goalEta", { m: U.compact(avgSave), g: U.esc(g.name), n: Math.max(1, Math.ceil((g.target - g.saved) / avgSave)) }) });
      }
      const big = D.txOfMonth(key).filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount)[0];
      if (big) out.push({ icon: "out", tone: "info", html: U.t("ins.biggest", { t: U.esc(big.title), a: U.money(Math.abs(big.amount)) }) });
      return out.slice(0, 3);
    }
  };
  window.IVA.data = D;

  /* ============ 2. router ============ */
  const PAGES = ["overview", "transactions", "accounts", "budgets", "goals", "debts", "reports", "tools", "settings"];

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, query] = h.split("?");
    const page = PAGES.includes(path) ? path : "overview";
    return { page, query: new URLSearchParams(query || "") };
  }

  function go(page) { location.hash = "#/" + page; }

  function render() {
    const { page, query } = parseHash();
    App.page = page;
    closeSheet(false);
    // nav states
    $$(".nav-item[data-page]").forEach(b => {
      const on = b.dataset.page === page;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    $$(".bottomnav-item[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === page));
    const t = {
      overview: [U.t("app.welcomeTitle"), U.t("app.welcomeSub")],
      transactions: [U.t("tx.title"), U.t("tx.sub")],
      accounts: [U.t("acc.title"), U.t("acc.sub")],
      budgets: [U.t("bud.title"), U.t("bud.sub")],
      goals: [U.t("goal.title"), U.t("goal.sub")],
      debts: [U.t("debt.title"), U.t("debt.sub")],
      reports: [U.t("rep.title"), U.t("rep.sub")],
      tools: [U.t("tools.title"), U.t("tools.sub")],
      settings: [U.t("set.title"), U.t("set.sub")]
    }[page];
    if (page === "overview") t[0] = U.t("common.today") === "امروز" ? "سلام " + (App.settings.name || "") + "، خوش آمدی 👋" : "Hello " + (App.settings.name || "") + ", welcome 👋";
    $("#page-title").textContent = t[0];
    $("#page-subtitle").textContent = t[1];
    const content = $("#page-content");
    content.innerHTML = ({
      overview: pageOverview, transactions: pageTransactions, accounts: pageAccounts,
      budgets: pageBudgets, goals: pageGoals, debts: pageDebts, reports: pageReports,
      tools: () => (window.IVA.tools ? IVA.tools.mount() : ""), settings: pageSettings
    }[page])();
    content.className = "page-" + page;
    IVA.charts.animate(content);
    countUp(content);
    renderHealth();
    if (query.get("new") === "1") {
      history.replaceState(null, "", location.pathname + location.search + "#/transactions");
      openForm("transaction");
    }
    if (App.lastPage !== page) { window.scrollTo(0, 0); App.lastPage = page; }
  }

  /* ============ 3. shared components ============ */
  /* ماسک شماره کارت: ۶۰۳۷ •••• •••• ۱۲۳۴ (برای نمایش) */
  function maskCard(num, full) {
    const d = U.toEnDigits(String(num || "")).replace(/\D/g, "");
    if (!d) return "";
    const s = full ? d.replace(/(\d{4})(?=\d)/g, "$1 ") : d.length >= 8 ? d.slice(0, 4) + " •••• •••• " + d.slice(-4) : d;
    return U.lang() === "fa" ? s.replace(/\d/g, x => U.faDigits[+x]) : s;
  }
  /* پسوند کوتاه برای انتخابگر حساب‌ها: ···۱۲۳۴ */
  function cardSuffix(num) {
    const d = U.toEnDigits(String(num || "")).replace(/\D/g, "");
    if (d.length < 4) return "";
    const t = "···" + d.slice(-4);
    return U.lang() === "fa" ? t.replace(/\d/g, x => U.faDigits[+x]) : t;
  }
  function pageHead(_title, _sub, actions = "") {
    /* فیکس: تیتر و زیرتیتر فقط در topbar (h1) رندر می‌شود؛ قبلأ اینجا هم تکرار می‌شد */
    return '<div class="page-head"><div class="page-actions">' + actions + "</div></div>";
  }
  function emptyState(icon, text, hint, action = "") {
    return '<div class="empty">' + U.icon(icon, 44) + "<p>" + U.esc(text) + "</p><small>" + U.esc(hint || "") + "</small>" + action + "</div>";
  }
  function momChip(cur, prev, invert) {
    if (!(prev > 0)) return '<span class="chip neutral">' + U.t("ov.noChange") + "</span>";
    const p = (cur - prev) / prev * 100;
    const good = invert ? p < 0 : p >= 0; /* فیکس: برای هزینه جهت خوب/بد برعکس است */
    const cls = good ? "up" : "down";
    const ic = good ? "trend" : "trendDown";
    return '<span class="chip ' + cls + '">' + U.icon(ic, 13) + U.pct(Math.abs(p)) + " <i>" + U.t("ov.mom") + "</i></span>";
  }
  function countUp(root) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.querySelectorAll("[data-count]").forEach(el => { el.textContent = (el.dataset.count < 0 ? "−" : "") + U.money(+el.dataset.count, { unit: false }); });
      return;
    }
    root.querySelectorAll("[data-count]").forEach(el => {
      const neg = +el.dataset.count < 0;
      const target = Math.abs(+el.dataset.count) || 0;
      const t0 = performance.now(), dur = 700;
      const step = now => {
        const k = U.clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - k, 3);
        el.textContent = (neg ? "−" : "") + U.money(Math.round(target * eased), { unit: false });
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  function txRow(t, opts = {}) {
    const meta = IVA.i18n.CATEGORY_MAP[t.category] || { color: "#8892a6", icon: "dot" };
    const acc = D.account(t.accountId);
    return '<div class="tx-row" role="row">' +
      '<button class="tx-main" data-action="edit" data-type="transaction" data-id="' + U.esc(t.id) + '" title="' + U.esc(U.t("common.edit")) + '">' +
      '<span class="tx-ic ' + (t.amount > 0 ? "in" : "out") + '" style="--c:' + meta.color + '">' + U.icon(t.amount > 0 ? "in" : "out", 15) + "</span>" +
      '<span class="tx-info"><b>' + U.esc(t.title) + "</b><small>" + U.esc(U.t("cat." + t.category)) + " · " + U.esc(acc ? acc.name : "—") + "</small></span></button>" +
      '<span class="tx-date">' + U.esc(U.dateLabel(t.date)) + "</span>" +
      '<span class="tx-note">' + U.esc(t.note || "") + "</span>" +
      '<strong class="tx-amt ' + (t.amount > 0 ? "pos" : "neg") + '">' + (t.amount > 0 ? "+" : "−") + U.money(t.amount, { unit: false }) + "</strong>" +
      (opts.compact ? "" : '<span class="tx-ops"><button class="ibtn" data-action="edit" data-type="transaction" data-id="' + U.esc(t.id) + '" aria-label="' + U.esc(U.t("common.edit")) + '">' + U.icon("edit", 15) + '</button><button class="ibtn danger" data-action="del" data-type="transaction" data-id="' + U.esc(t.id) + '" aria-label="' + U.esc(U.t("common.delete")) + '">' + U.icon("trash", 15) + "</button></span>") +
      "</div>";
  }

  /* ============ 4. pages ============ */
  function pageOverview() {
    const s6 = D.series(6);
    const cur = s6.rows[s6.rows.length - 1], prev = s6.rows[s6.rows.length - 2] || { income: 0, expense: 0, net: 0 };
    const net = D.netWorth();
    const spark = key => s6.rows.map(r => key === "income" ? r.income : key === "expense" ? r.expense : r.net);
    const cats = D.catBreakdown(D.curKey()).slice(0, 4);
    const catTotal = cats.reduce((a, c) => a + c.value, 0) || 1;
    const donutParts = cats.map(c => ({ value: c.value, color: c.meta.color, label: U.t("cat." + c.cat), tip: U.money(c.value) }));
    if (D.sums(D.txOfMonth(D.curKey())).expense > catTotal) donutParts.push({ value: D.sums(D.txOfMonth(D.curKey())).expense - catTotal, color: "var(--line-3)", label: U.t("chart.other") });
    const recent = [...Store.state.transactions].sort((a, b) => b.date < a.date ? -1 : 1).slice(0, 5);
    const insights = D.insights();
    const buds = Store.state.budgets.map(b => ({ b, ratio: b.amount > 0 ? D.budgetSpent(b) / b.amount : 0 })).sort((x, y) => y.ratio - x.ratio).slice(0, 3);
    const goal = [...Store.state.goals].sort((a, b) => (b.saved / b.target) - (a.saved / a.target))[0];

    return '<section class="hero card-glow">' +
      '<div class="hero-main"><span class="stat-label">' + U.icon("bank", 17) + U.esc(U.t("ov.netWorth")) + momChip(cur.income - cur.expense, prev.income - prev.expense) + "</span>" +
      '<strong class="hero-amt"><span data-count="' + net + '">0</span><small>' + U.esc(U.t("common." + App.settings.currency)) + "</small></strong>" +
      '<div class="hero-meta">' + U.group(Store.state.accounts.length) + " " + U.esc(U.t("nav.accounts")) + " · " + U.group(Store.state.transactions.length) + " " + U.esc(U.t("nav.transactions")) + "</div></div>" +
      '<div class="hero-spark">' + IVA.charts.sparkline(spark("net"), { w: 190, h: 64, color: "var(--brand-2)" }) + "</div></section>" +

      '<section class="kpis">' +
      kpi("in", U.t("ov.income"), cur.income, prev.income, spark("income"), "var(--brand-2)") +
      kpi("out", U.t("ov.expense"), cur.expense, prev.expense, spark("expense"), "var(--danger)", true) +
      kpi("spark", U.t("ov.savings"), Math.max(cur.net, 0), Math.max(prev.net, 0), spark("net"), "var(--brand)") +
      "</section>" +

      '<section class="grid-2">' +
      '<article class="card"><div class="card-head"><div><h2>' + U.esc(U.t("ov.cashflow")) + "</h2><p>" + U.esc(U.t("ov.cashflowSub")) + '</p></div><div class="legend-mini"><span><i style="background:var(--brand-2)"></i>' + U.esc(U.t("chart.income")) + '</span><span><i style="background:var(--danger)"></i>' + U.esc(U.t("chart.expense")) + "</span></div></div>" +
      IVA.charts.bars({ labels: s6.rows.map(r => r.label), income: s6.rows.map(r => r.income), expense: s6.rows.map(r => r.expense) }) + "</article>" +

      '<article class="card"><div class="card-head"><div><h2>' + U.esc(U.t("rep.breakdown")) + "</h2><p>" + U.esc(U.t("rep.breakdownSub")) + '</p></div></div>' +
      '<div class="donut-flex">' + (donutParts.length ? IVA.charts.donut(donutParts, { centerTitle: U.compact(D.sums(D.txOfMonth(D.curKey())).expense), centerSub: U.t("chart.expense") }) : emptyState("pie", U.t("chart.noData"), "")) +
      '<ul class="legend">' + cats.map(c => '<li><span><i style="background:' + c.meta.color + '"></i>' + U.esc(U.t("cat." + c.cat)) + "</span><b>" + U.compact(c.value) + " · " + U.pct(c.value / catTotal * 100) + "</b></li>").join("") + "</ul></div></article>" +
      "</section>" +

      (insights.length ? '<section class="insights"><h2 class="sec-title">' + U.icon("spark", 16) + " " + U.esc(U.t("ov.insights")) + '</h2><div class="insight-grid">' +
        insights.map((ins, i) => '<article class="insight ' + ins.tone + '">' + U.icon(ins.icon, 20) + "<p>" + ins.html + "</p></article>").join("") + "</div></section>" : "") +

      '<section class="grid-2-1">' +
      '<article class="card"><div class="card-head"><div><h2>' + U.esc(U.t("ov.recent")) + '</h2></div><button class="ghost" data-action="go" data-page="transactions">' + U.esc(U.t("common.viewAll")) + " " + U.icon(U.lang() === "fa" ? "chevL" : "chevR", 14) + '</button></div>' +
      '<div class="tx-list">' + (recent.length ? recent.map(t => txRow(t)).join("") : emptyState("list", U.t("tx.addFirst"), "")) + "</div></article>" +

      '<div class="side-stack">' +
      (buds.length ? '<article class="card"><div class="card-head"><div><h2>' + U.esc(U.t("ov.budgetsMini")) + '</h2></div><button class="ghost" data-action="go" data-page="budgets">' + U.esc(U.t("common.viewAll")) + '</button></div><ul class="mini-bars">' +
        buds.map(({ b, ratio }) => '<li><div class="mb-top"><span>' + U.esc(U.t("cat." + b.category)) + "</span><b>" + U.pct(ratio * 100) + "</b></div><div class=\"progress\"><i style=\"width:" + U.clamp(ratio * 100, 0, 100) + "%;background:" + (ratio > 1 ? "var(--danger)" : U.esc(b.color)) + '"></i></div></li>').join("") + "</ul></article>" : "") +
      (goal ? '<article class="card goal-mini"><div class="card-head"><div><h2>' + U.esc(U.t("ov.goalsMini")) + '</h2></div><button class="ghost" data-action="go" data-page="goals">' + U.esc(U.t("common.viewAll")) + '</button></div><div class="goal-flex">' +
        IVA.charts.ring(goal.saved / goal.target * 100, { color: U.esc(goal.color), size: 78, label: U.pct(goal.saved / goal.target * 100) }) +
        "<div><b>" + U.esc(goal.name) + "</b><p>" + U.money(goal.saved, { unit: false }) + " / " + U.compact(goal.target) + "</p></div></div></article>" : "") +
      "</div></section>";
  }
  function kpi(icon, label, cur, prev, spark, color, invert) {
    return '<article class="kpi"><div class="kpi-top"><span class="stat-label">' + U.icon(icon, 16) + U.esc(label) + "</span>" + momChip(cur, prev, invert) + '</div><strong><span data-count="' + cur + '">0</span><small>' + U.esc(U.t("common." + App.settings.currency)) + '</small></strong><div class="kpi-spark">' + IVA.charts.sparkline(spark, { w: 120, h: 34, color }) + "</div></article>";
  }

  function filteredTx() {
    const f = App.txFilters;
    let list = [...Store.state.transactions];
    if (f.type !== "all") list = list.filter(t => (f.type === "income") === (t.amount > 0));
    if (f.cat !== "all") list = list.filter(t => t.category === f.cat);
    if (f.acc !== "all") list = list.filter(t => t.accountId === f.acc);
    if (f.month !== "all") list = list.filter(t => U.monthKey(U.fromISO(t.date)) === +f.month);
    if (f.q) {
      const q = U.toEnDigits(f.q).toLowerCase();
      list = list.filter(t => (t.title + " " + (t.note || "") + " " + U.t("cat." + t.category) + " " + (D.account(t.accountId) || { name: "" }).name).toLowerCase().includes(q));
    }
    const cmp = { dateDesc: (a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id > a.id ? 1 : -1), dateAsc: (a, b) => a.date > b.date ? 1 : a.date < b.date ? -1 : (a.id > b.id ? 1 : -1), amountDesc: (a, b) => Math.abs(b.amount) - Math.abs(a.amount), amountAsc: (a, b) => Math.abs(a.amount) - Math.abs(b.amount) }[f.sort];
    return list.sort(cmp);
  }

  function pageTransactions() {
    const f = App.txFilters;
    const list = filteredTx();
    const shown = list.slice(0, App.txLimit);
    const sums = D.sums(list);
    const months = [...new Set(Store.state.transactions.map(t => U.monthKey(U.fromISO(t.date))))].sort((a, b) => b - a).slice(0, 12);
    const sel = (id, label, value, cur, options) =>
      '<label class="f-select"><span>' + U.esc(label) + '</span><select id="' + id + '">' + '<option value="all">' + U.esc(U.t("common.all")) + "</option>" + options + "</select></label>";
    return pageHead(U.t("tx.title"), U.t("tx.sub"),
      '<button class="secondary" data-action="export-csv">' + U.icon("download", 15) + "<span>" + U.esc(U.t("action.exportCsv")) + '</span></button><button class="primary" data-action="open-form" data-type="transaction">' + U.icon("plus", 16) + "<span>" + U.esc(U.t("action.newTx")) + "</span></button>") +
      '<article class="card"><div class="toolbar">' +
      '<label class="search">' + U.icon("search", 15) + '<input id="tx-q" placeholder="' + U.esc(U.t("tx.searchPh")) + '" value="' + U.esc(f.q) + '" aria-label="' + U.esc(U.t("common.search")) + '"></label>' +
      '<div class="chips" role="tablist">' +
      ["all", "income", "expense"].map(x => '<button class="chip-btn ' + (f.type === x ? "on" : "") + '" data-action="tx-filter" data-key="type" data-val="' + x + '">' + U.esc(x === "all" ? U.t("common.all") : x === "income" ? U.t("tx.income") : U.t("tx.expense")) + "</button>").join("") +
      "</div></div>" +
      '<div class="toolbar filters">' +
      sel("tx-cat", U.t("tx.filterCat"), f.cat, "cat", IVA.i18n.CATEGORIES.expense.concat(IVA.i18n.CATEGORIES.income).map(c => '<option value="' + c.key + '" ' + (f.cat === c.key ? "selected" : "") + ">" + U.esc(U.t("cat." + c.key)) + "</option>").join("")) +
      sel("tx-acc", U.t("tx.filterAcc"), f.acc, "acc", Store.state.accounts.map(a => '<option value="' + U.esc(a.id) + '" ' + (f.acc === a.id ? "selected" : "") + ">" + U.esc(a.name) + "</option>").join("")) +
      sel("tx-month", U.t("tx.filterMonth"), f.month, "month", months.map(m => '<option value="' + m + '" ' + (+f.month === m ? "selected" : "") + ">" + U.esc(U.monthLabel(m)) + "</option>").join("")) +
      sel("tx-sort", U.t("tx.sort"), f.sort, "sort", ["dateDesc", "dateAsc", "amountDesc", "amountAsc"].map(x => '<option value="' + x + '" ' + (f.sort === x ? "selected" : "") + ">" + U.esc(U.t("tx.sort." + x)) + "</option>").join("")) +
      "</div>" +
      '<div class="tx-summary"><span>' + U.icon("list", 14) + " " + U.group(list.length) + '</span><span class="pos">' + U.icon("in", 14) + U.money(sums.income, { unit: false }) + '</span><span class="neg">' + U.icon("out", 14) + U.money(sums.expense, { unit: false }) + "</span></div>" +
      '<div class="tx-head tx-row" role="row"><span class="tx-main">' + U.esc(U.t("common.title")) + "</span><span class=\"tx-date\">" + U.esc(U.t("common.date")) + "</span><span class=\"tx-note\">" + U.esc(U.t("common.note")) + "</span><span class=\"tx-amt\">" + U.esc(U.t("common.amount")) + "</span><span class=\"tx-ops\"></span></div>" +
      (shown.length ? '<div class="tx-list">' + shown.map(t => txRow(t)).join("") + "</div>" +
        (list.length > App.txLimit ? '<button class="ghost wide" data-action="tx-more">' + U.esc(U.t("common.showMore")) + " (" + U.group(list.length - App.txLimit) + ")</button>" : "")
        : emptyState("search", U.t("tx.none"), U.t("tx.noneHint"), '<button class="primary" data-action="open-form" data-type="transaction">' + U.icon("plus", 15) + " " + U.esc(U.t("action.newTx")) + "</button>")) +
      "</article>";
  }

  function pageAccounts() {
    const total = D.netWorth();
    const key = D.curKey();
    return pageHead(U.t("acc.title"), U.t("acc.sub"),
      '<button class="primary" data-action="open-form" data-type="account">' + U.icon("plus", 16) + "<span>" + U.esc(U.t("common.add")) + "</span></button>") +
      '<section class="acc-total card-glow"><span class="stat-label">' + U.icon("bank", 17) + U.esc(U.t("acc.totalBalance")) + '</span><strong><span data-count="' + total + '">0</span><small>' + U.esc(U.t("common." + App.settings.currency)) + "</small></strong></section>" +
      '<section class="acc-grid">' + Store.state.accounts.map(a => {
        const meta = IVA.i18n.ACCOUNT_TYPE_MAP[a.type] || { color: "#6756e8", icon: "bank" };
        const nTx = D.txOfMonth(key).filter(t => t.accountId === a.id).length;
        /* بند ۹: نام + لوگوی بانک شناسایی‌شده از BIN شماره کارت */
        const bin = a.cardNumber && window.IVA.tools && window.IVA.tools.binLookup ? window.IVA.tools.binLookup(a.cardNumber) : null;
        const bankBadge = bin ? '<span class="bank-badge" title="' + U.esc(bin.name) + '">' + (bin.logo ? '<img class="bin-logo" src="assets/banks/' + U.esc(bin.logo) + '.svg" alt="" width="14" height="14">' : "") + U.esc(bin.name) + "</span>" : "";
        const cardNo = a.cardNumber ? '<span class="card-no" dir="ltr" title="' + U.esc(U.t("acc.cardNumber")) + '">' + U.icon("card", 13) + " " + U.esc(maskCard(a.cardNumber)) + "</span>" : "";
        return '<article class="card acc-card" style="--ac:' + U.esc(a.color) + '">' +
          '<div class="acc-head"><span class="acc-ic">' + U.icon(meta.icon, 20) + '</span><div><h3>' + U.esc(a.name) + "</h3><small>" + U.esc(U.t("acc." + a.type)) + "</small></div>" +
          '<span class="tx-ops"><button class="ibtn" data-action="edit" data-type="account" data-id="' + U.esc(a.id) + '" aria-label="' + U.esc(U.t("common.edit")) + '">' + U.icon("edit", 15) + '</button><button class="ibtn danger" data-action="del" data-type="account" data-id="' + U.esc(a.id) + '" aria-label="' + U.esc(U.t("common.delete")) + '">' + U.icon("trash", 15) + "</button></span></div>" +
          '<strong class="acc-bal' + (a.balance < 0 ? " neg" : "") + '">' + (a.balance < 0 ? "\u2212" : "") + U.money(a.balance, { unit: false }) + '<small>' + U.esc(U.t("common." + App.settings.currency)) + "</small></strong>" +
          '<footer><span>' + U.icon("list", 13) + " " + U.group(nTx) + " " + U.esc(U.t("acc.txThisMonth")) + "</span>" + cardNo + (a.note ? "<span>" + U.esc(a.note) + "</span>" : "") + bankBadge + "</footer></article>";
      }).join("") + "</section>" +
      (Store.state.accounts.length ? "" : emptyState("bank", U.t("acc.none"), ""));
  }

  function pageBudgets() {
    const buds = Store.state.budgets;
    return pageHead(U.t("bud.title"), U.t("bud.sub"),
      '<button class="primary" data-action="open-form" data-type="budget">' + U.icon("plus", 16) + "<span>" + U.esc(U.t("common.add")) + "</span></button>") +
      (buds.length ? '<section class="bud-grid">' + buds.map(b => {
        const spent = D.budgetSpent(b);
        const ratio = b.amount > 0 ? spent / b.amount : 0;
        const over = spent > b.amount;
        return '<article class="card bud-card' + (over ? " over" : "") + '" style="--bc:' + U.esc(b.color) + '">' +
          '<div class="acc-head"><span class="acc-ic">' + U.icon((IVA.i18n.CATEGORY_MAP[b.category] || { icon: "dot" }).icon, 20) + '</span><div><h3>' + U.esc(b.name) + "</h3><small>" + U.esc(U.t("cat." + b.category)) + "</small></div>" +
          '<span class="tx-ops"><button class="ibtn" data-action="edit" data-type="budget" data-id="' + U.esc(b.id) + '" aria-label="' + U.esc(U.t("common.edit")) + '">' + U.icon("edit", 15) + '</button><button class="ibtn danger" data-action="del" data-type="budget" data-id="' + U.esc(b.id) + '" aria-label="' + U.esc(U.t("common.delete")) + '">' + U.icon("trash", 15) + "</button></span></div>" +
          '<div class="bud-nums"><b>' + U.money(spent, { unit: false }) + "</b><span>/ " + U.money(b.amount, { unit: false }) + "</span><em>" + U.pct(ratio * 100) + "</em></div>" +
          '<div class="progress tall"><i style="width:' + U.clamp(ratio * 100, 0, 100) + "%;background:" + (over ? "var(--danger)" : U.esc(b.color)) + '"></i></div>' +
          '<p class="bud-hint ' + (over ? "neg" : "") + '">' + (over ? U.t("bud.overBy", { a: U.money(spent - b.amount) }) : U.t("bud.left", { a: U.money(b.amount - spent) })) + "</p></article>";
      }).join("") + "</section>" : emptyState("gauge", U.t("bud.none"), "", '<button class="primary" data-action="open-form" data-type="budget">' + U.icon("plus", 15) + " " + U.esc(U.t("common.add")) + "</button>"));
  }

  function pageGoals() {
    const goals = Store.state.goals;
    const s6 = D.series(6).rows;
    const avgSave = s6.reduce((a, r) => a + r.net, 0) / Math.max(s6.filter(r => r.income > 0 || r.expense > 0).length, 1);
    return pageHead(U.t("goal.title"), U.t("goal.sub"),
      '<button class="primary" data-action="open-form" data-type="goal">' + U.icon("plus", 16) + "<span>" + U.esc(U.t("common.add")) + "</span></button>") +
      (goals.length ? '<section class="goal-grid">' + goals.map(g => {
        const pctDone = U.clamp(g.saved / g.target * 100, 0, 100);
        const done = g.saved >= g.target;
        let eta = "";
        if (!done && g.deadline) {
          const days = U.daysDiff(g.deadline);
          eta = days >= 0 ? U.t("goal.daysLeft", { n: U.group(days) }) : U.t("goal.overdue");
        }
        return '<article class="card goal-card" style="--gc:' + U.esc(g.color) + '">' +
          '<div class="acc-head"><span class="acc-ic">' + U.icon("target", 20) + '</span><div><h3>' + U.esc(g.name) + "</h3><small>" + (done ? U.t("goal.reached") : eta || U.t("common.deadline") + ": —") + "</small></div>" +
          '<span class="tx-ops"><button class="ibtn" data-action="add-funds" data-id="' + U.esc(g.id) + '" aria-label="' + U.esc(U.t("common.addFunds")) + '" title="' + U.esc(U.t("common.addFunds")) + '">' + U.icon("plus", 15) + '</button><button class="ibtn" data-action="edit" data-type="goal" data-id="' + U.esc(g.id) + '" aria-label="' + U.esc(U.t("common.edit")) + '">' + U.icon("edit", 15) + '</button><button class="ibtn danger" data-action="del" data-type="goal" data-id="' + U.esc(g.id) + '" aria-label="' + U.esc(U.t("common.delete")) + '">' + U.icon("trash", 15) + "</button></span></div>" +
          '<div class="goal-flex">' + IVA.charts.ring(pctDone, { color: U.esc(g.color), size: 86, label: U.pct(pctDone) }) +
          '<div class="goal-nums"><b>' + U.money(g.saved, { unit: false }) + "</b><span>/ " + U.money(g.target, { unit: false }) + "</span>" +
          (!done && avgSave > 10000 ? "<p>" + U.t("goal.eta", { n: Math.max(1, Math.ceil((g.target - g.saved) / avgSave)) }) + "</p>" : "") + "</div></div></article>";
      }).join("") + "</section>" : emptyState("target", U.t("goal.none"), "", '<button class="primary" data-action="open-form" data-type="goal">' + U.icon("plus", 15) + " " + U.esc(U.t("common.add")) + "</button>"));
  }

  function pageDebts() {
    const { debt, credit } = D.totalsDebt();
    const list = [...Store.state.debts].sort((a, b) => (a.settled - b.settled) || ((a.dueDate || "9999") > (b.dueDate || "9999") ? 1 : -1));
    return pageHead(U.t("debt.title"), U.t("debt.sub"),
      '<button class="primary" data-action="open-form" data-type="debt">' + U.icon("plus", 16) + "<span>" + U.esc(U.t("common.add")) + "</span></button>") +
      '<section class="debt-totals">' +
      '<div class="dtot neg"><span>' + U.icon("out", 15) + U.esc(U.t("debt.totalDebt")) + "</span><b>" + U.money(debt, { unit: false }) + "</b></div>" +
      '<div class="dtot pos"><span>' + U.icon("in", 15) + U.esc(U.t("debt.totalCredit")) + "</span><b>" + U.money(credit, { unit: false }) + "</b></div>" +
      '<div class="dtot"><span>' + U.icon("swap", 15) + U.esc(U.t("debt.net")) + "</span><b>" + (credit - debt < 0 ? "\u2212" : "") + U.money(credit - debt, { unit: false }) + "</b></div></section>" +
      (list.length ? '<section class="debt-grid">' + list.map(x => {
        const due = x.dueDate ? U.dueLabel(x.dueDate) : null;
        return '<article class="card debt-card ' + (x.kind === "debt" ? "is-debt" : "is-credit") + (x.settled ? " settled" : "") + '">' +
          '<div class="acc-head"><span class="acc-ic">' + U.icon(x.kind === "debt" ? "out" : "in", 20) + '</span><div><h3>' + U.esc(x.name) + "</h3><small>" + U.esc(x.kind === "debt" ? U.t("debt.youOwe") : U.t("debt.oweYou")) + (x.note ? " · " + U.esc(x.note) : "") + "</small></div>" +
          '<span class="tx-ops"><button class="ibtn" data-action="toggle-settle" data-id="' + U.esc(x.id) + '" title="' + U.esc(x.settled ? U.t("debt.unsettle") : U.t("debt.markSettled")) + '" aria-label="' + U.esc(x.settled ? U.t("debt.unsettle") : U.t("debt.markSettled")) + '">' + U.icon(x.settled ? "flag" : "check", 15) + '</button><button class="ibtn" data-action="edit" data-type="debt" data-id="' + U.esc(x.id) + '" aria-label="' + U.esc(U.t("common.edit")) + '">' + U.icon("edit", 15) + '</button><button class="ibtn danger" data-action="del" data-type="debt" data-id="' + U.esc(x.id) + '" aria-label="' + U.esc(U.t("common.delete")) + '">' + U.icon("trash", 15) + "</button></span></div>" +
          '<strong class="' + (x.kind === "debt" ? "neg" : "pos") + '">' + U.money(x.amount, { unit: false }) + "</strong>" +
          '<footer class="debt-foot">' + (due && !x.settled ? '<span class="due ' + due.tone + '">' + U.icon("clock", 13) + U.esc(due.text) + "</span>" : "<span></span>") +
          (x.settled ? '<span class="due ok">' + U.icon("check", 13) + U.esc(U.t("debt.settled")) + "</span>" : "") + "</footer></article>";
      }).join("") + "</section>" : emptyState("swap", U.t("debt.none"), "", '<button class="primary" data-action="open-form" data-type="debt">' + U.icon("plus", 15) + " " + U.esc(U.t("common.add")) + "</button>"));
  }

  function pageReports() {
    if (App.repAcc && App.repAcc !== "all" && !Store.state.accounts.some(a => a.id === App.repAcc)) App.repAcc = "all"; /* حساب حذف‌شده */
    const n = App.reportRange;
    const sec = App.repSec || "cashflow";
    const accF = App.repAcc || "all";
    /* بند ۸: همه محاسبات با فیلتر حساب/کارت انتخابی */
    const inAcc = t => accF === "all" || t.accountId === accF;
    const txsOf = k => D.txOfMonth(k).filter(inAcc);
    const keys = D.monthKeys(n);
    const s = { keys, rows: keys.map(k => ({ key: k, label: U.monthLabel(k), ...D.sums(txsOf(k)) })) };
    const cur = D.sums(txsOf(D.curKey()));
    const cumul = []; let run = 0; s.rows.forEach(r => { run += r.net; cumul.push(run); });
    const cats = D.catBreakdownRange(s.keys, inAcc);
    const catTotal = cats.reduce((a, c) => a + c.value, 0) || 1;
    /* فیکس: روز جاری و طول ماه بر پایه تقویم شمسی */
    const jNow = U._jParts(new Date());
    const daysPassed = Math.max(1, jNow.day || 1);
    const mLen = jNow.month <= 6 ? 31 : jNow.month <= 11 ? 30 : ([1, 5, 9, 13, 17, 22, 26, 30].indexOf(((jNow.year % 33) + 33) % 33) >= 0 ? 30 : 29);
    const projection = cur.expense / daysPassed * mLen;
    const big = Store.state.transactions.filter(t => t.amount < 0 && inAcc(t) && s.keys.includes(U.monthKey(U.fromISO(t.date)))).sort((a, b) => a.amount - b.amount)[0];
    const accSel = '<select id="rep-acc" class="sel" aria-label="' + U.esc(U.t("rep.accFilter")) + '">' +
      '<option value="all"' + (accF === "all" ? " selected" : "") + ">" + U.esc(U.t("rep.accAll")) + "</option>" +
      Store.state.accounts.map(a => '<option value="' + U.esc(a.id) + '"' + (accF === a.id ? " selected" : "") + ">" + U.esc(a.name) + (a.cardNumber ? " · " + U.esc(a.cardNumber.slice(-4)) : "") + "</option>").join("") + "</select>";
    const secChips = '<div class="chips" role="tablist">' +
      [["cashflow", "rep.secCash"], ["breakdown", "rep.secBreak"], ["trend", "rep.secTrend"], ["budget", "rep.secBudget"]].map(x =>
        '<button class="chip-btn ' + (sec === x[0] ? "on" : "") + '" role="tab" aria-selected="' + (sec === x[0]) + '" data-action="rep-sec" data-val="' + x[0] + '">' + U.esc(U.t(x[1])) + "</button>").join("") + "</div>";
    const head = pageHead(U.t("rep.title"), U.t("rep.sub"),
      '<div class="row-head">' + accSel + '</div><div class="chips">' + [3, 6, 12].map(x => '<button class="chip-btn ' + (x === n ? "on" : "") + '" data-action="range" data-val="' + x + '">' + U.esc(U.t("rep.months", { n: U.group(x) })) + "</button>").join("") + "</div>" + secChips);
    const tiles = '<section class="rp-tiles"><article class="kpi"><div class="kpi-top"><span class="stat-label">' + U.icon("trend", 16) + U.esc(U.t("rep.savingsRate")) + '</span></div><strong>' + (cur.income > 0 ? U.pct((cur.income - cur.expense) / cur.income * 100) : "—") + '</strong><small>' + U.esc(U.t("common.thisMonth")) + "</small></article>" +
      '<article class="kpi"><div class="kpi-top"><span class="stat-label">' + U.icon("calendar", 16) + U.esc(U.t("rep.avgDaily")) + '</span></div><strong>' + U.compact(cur.expense / daysPassed) + '</strong><small>' + U.esc(U.t("common.thisMonth")) + "</small></article>" +
      '<article class="kpi"><div class="kpi-top"><span class="stat-label">' + U.icon("out", 16) + U.esc(U.t("rep.projection")) + '</span></div><strong>' + U.compact(projection) + "</strong><small>" + U.esc(U.t("common.thisMonth")) + "</small></article></section>";
    let body = "";
    if (sec === "cashflow") {
      body = '<section class="grid-2"><article class="card"><div class="card-head"><div><h2>' + U.esc(U.t("rep.cashflow")) + "</h2><p>" + U.esc(U.t("rep.cashflowSub")) + '</p></div><div class="legend-mini"><span><i style="background:var(--brand-2)"></i>' + U.esc(U.t("chart.income")) + '</span><span><i style="background:var(--danger)"></i>' + U.esc(U.t("chart.expense")) + "</span></div></div>" +
        IVA.charts.bars({ labels: s.rows.map(r => r.label), income: s.rows.map(r => r.income), expense: s.rows.map(r => r.expense) }) + "</article></section>";
    } else if (sec === "breakdown") {
      body = '<section class="grid-2"><article class="card"><div class="card-head"><div><h2>' + U.esc(U.t("rep.topCats")) + "</h2><p>" + U.esc(U.t("rep.topCatsSub")) + "</p></div></div>" +
        (cats.length ? '<ul class="cat-list">' + cats.slice(0, 7).map(c => '<li><span class="cat-ic" style="--c:' + c.meta.color + '">' + U.icon(c.meta.icon, 15) + "</span><div class=\"cat-mid\"><b>" + U.esc(U.t("cat." + c.cat)) + '</b><div class="progress"><i style="width:' + (c.value / cats[0].value * 100).toFixed(0) + "%;background:" + c.meta.color + '"></i></div></div><div class="cat-end"><b>' + U.compact(c.value) + "</b><small>" + U.pct(c.value / catTotal * 100) + "</small></div></li>").join("") + "</ul>" : emptyState("pie", U.t("chart.noData"), "")) + "</article></section>";
    } else if (sec === "trend") {
      body = '<section class="grid-2"><article class="card"><div class="card-head"><div><h2>' + U.esc(U.t("rep.trend")) + "</h2><p>" + U.esc(U.t("rep.trendSub")) + "</p></div></div>" +
        IVA.charts.line({ labels: s.rows.map(r => r.label), values: cumul, color: "var(--brand)" }) + "</article></section>";
    } else {
      body = '<section class="grid-2"><article class="card"><div class="card-head"><div><h2>' + U.esc(U.t("rep.budgetUsage")) + "</h2><p>" + U.esc(U.t("rep.budgetUsageSub")) + "</p></div></div>" +
        (Store.state.budgets.length ? '<ul class="cat-list">' + Store.state.budgets.map(b => {
          const spent = D.txOfMonth(D.curKey()).filter(inAcc).filter(t => t.amount < 0 && t.category === b.category).reduce((a, t) => a + Math.abs(t.amount), 0);
          const ratio = b.amount > 0 ? spent / b.amount : 0;
          return '<li><span class="cat-ic" style="--c:' + U.esc(b.color) + '">' + U.icon((IVA.i18n.CATEGORY_MAP[b.category] || { icon: "dot" }).icon, 15) + '</span><div class="cat-mid"><b>' + U.esc(U.t("cat." + b.category)) + '</b><div class="progress"><i style="width:' + U.clamp(ratio * 100, 0, 100) + "%;background:" + (ratio > 1 ? "var(--danger)" : U.esc(b.color)) + '"></i></div></div><div class="cat-end"><b>' + U.pct(ratio * 100) + "</b><small>" + U.compact(spent) + "</small></div></li>";
        }).join("") + "</ul>" : emptyState("gauge", U.t("bud.none"), "")) +
        (big ? '<div class="biggest"><span>' + U.icon("out", 14) + U.esc(U.t("rep.biggest")) + "</span><b>" + U.esc(big.title) + " · " + U.money(Math.abs(big.amount)) + "</b></div>" : "") +
        "</article></section>";
    }
    return head + tiles + body;
  }
  D.catBreakdownRange = function (keys, inAcc) {
    const set = new Set(keys);
    const map = {};
    for (const t of Store.state.transactions) {
      if (t.amount > 0) continue;
      if (!set.has(U.monthKey(U.fromISO(t.date)))) continue;
      if (inAcc && !inAcc(t)) continue;
      map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
    }
    return Object.entries(map).map(([k, v]) => ({ cat: k, value: v, meta: IVA.i18n.CATEGORY_MAP[k] || { color: "#8892a6", icon: "dot" } })).sort((a, b) => b.value - a.value);
  };

  /* تشخیص خودکار سیستم/معماری برای بخش «بررسی بروزرسانی» */
  function sysInfo() {
    const fa = U.lang() === "fa";
    const d = window.ivaDesktop || null;
    let os = "", arch = (d && d.arch) || "";
    if (d && d.platform) os = d.platform;
    else {
      const ua = navigator.userAgent || "";
      if (/Android/i.test(ua)) os = "android";
      else if (/Windows/i.test(ua)) { os = "win32"; if (!arch) arch = /arm/i.test(ua) ? "arm64" : "x64"; }
      else if (/Macintosh|Mac OS/i.test(ua)) os = "darwin";
      else if (/Linux|X11/i.test(ua)) { os = "linux"; if (!arch) arch = /arm|aarch/i.test(ua) ? "arm64" : "x64"; }
    }
    const osName = { win32: fa ? "ویندوز" : "Windows", darwin: fa ? "مک (macOS)" : "macOS", linux: fa ? "لینوکس" : "Linux", android: fa ? "اندروید" : "Android" }[os] || (fa ? "مرورگر (PWA)" : "Browser (PWA)");
    const archName = { x64: fa ? "x64 (۶۴بیتی)" : "x64 (64-bit)", ia32: fa ? "x86 (۳۲بیتی)" : "x86 (32-bit)", arm64: "ARM64" }[arch] || "";
    const key = os === "win32" || os === "linux" ? os + "|" + (arch || "x64") : os;
    const file = {
      "win32|x64": fa ? "Setup x64.exe (ویندوز ۶۴بیتی)" : "Setup x64.exe (Windows 64-bit)",
      "win32|ia32": fa ? "Setup x86.exe (ویندوز ۳۲بیتی)" : "Setup x86.exe (Windows 32-bit)",
      "win32|arm64": fa ? "Setup ARM64.exe (ویندوز روی ARM)" : "Setup ARM64.exe (Windows on ARM)",
      darwin: fa ? "فایل dmg نسخهٔ مک" : "macOS dmg",
      "linux|x64": fa ? "بستهٔ deb یا AppImage" : "deb or AppImage",
      "linux|arm64": fa ? "بستهٔ ARM64 (deb/AppImage)" : "ARM64 (deb/AppImage)",
      android: fa ? "فایل APK" : "APK file",
      web: fa ? "نیازی به دانلود ندارد (PWA)" : "No download needed (PWA)"
    }[key] || (fa ? "فایل مناسب سیستم‌تان از صفحهٔ Releases" : "Matching file from the Releases page");
    return { label: osName + (archName ? " · " + archName : ""), file };
  }

  function pageSettings() {
    const st = App.settings;
    const sys = sysInfo();
    return pageHead(U.t("set.title"), U.t("set.sub")) +
      '<section class="set-grid">' +
      '<article class="card"><h2 class="sec-title">' + U.icon("home", 16) + " " + U.esc(U.t("set.profile")) + '</h2>' +
      '<div class="setting-row"><div><b>' + U.esc(U.t("set.displayName")) + "</b><small>" + U.esc(st.name || "—") + " · " + U.esc(U.t("set.displayNameHint")) + '</small></div><button class="secondary" data-action="change-name">' + U.esc(U.t("set.changeName")) + "</button></div>" +
      '<div class="setting-row"><div><b>' + U.esc(U.t("set.privacy")) + "</b><small>" + U.esc(U.t("set.privacyBody")) + "</small></div>" + U.icon("shield", 22, "mut") + "</div></article>" +

      '<article class="card"><h2 class="sec-title">' + U.icon("sun", 16) + " " + U.esc(U.t("set.appearance")) + '</h2>' +
      '<div class="setting-row"><div><b>' + U.esc(U.t("common.theme")) + "</b></div>" +
      '<div class="seg" role="radiogroup">' + ["light", "dark", "system"].map(x => '<button role="radio" aria-checked="' + (st.theme === x) + '" class="seg-btn ' + (st.theme === x ? "on" : "") + '" data-action="set-theme" data-val="' + x + '">' + U.esc(U.t("set.theme" + x[0].toUpperCase() + x.slice(1))) + "</button>").join("") + "</div></div>" +
      '<div class="setting-row"><div><b>' + U.esc(U.t("common.language")) + "</b></div>" +
      '<div class="seg">' + [["fa", "فارسی"], ["en", "English"]].map(x => '<button class="seg-btn ' + (st.lang === x[0] ? "on" : "") + '" data-action="set-lang" data-val="' + x[0] + '">' + x[1] + "</button>").join("") + "</div></div>" +
      '<div class="setting-row"><div><b>' + U.esc(U.t("common.currency")) + "</b><small>" + U.esc(U.t("set.currencyHint")) + "</small></div>" +
      '<div class="seg">' + [["toman", U.t("common.toman")], ["rial", U.t("common.rial")]].map(x => '<button class="seg-btn ' + (st.currency === x[0] ? "on" : "") + '" data-action="set-currency" data-val="' + x[0] + '">' + U.esc(x[1]) + "</button>").join("") + "</div></div></article>" +

      '<article class="card"><h2 class="sec-title">' + U.icon("download", 16) + " " + U.esc(U.t("set.data")) + '</h2>' +
      '<div class="setting-row"><div><b>' + U.esc(U.t("action.exportJson")) + "</b><small>" + U.esc(U.t("set.backupHint")) + '</small></div><button class="secondary" data-action="export-json">' + U.icon("download", 14) + " " + U.esc(U.t("common.download")) + "</button></div>" +
      '<div class="setting-row"><div><b>' + U.esc(U.t("action.importJson")) + "</b><small>" + U.esc(U.t("set.importHint")) + '</small></div><button class="secondary" data-action="import-json">' + U.icon("upload", 14) + " " + U.esc(U.t("common.restore")) + '</button><input type="file" id="import-file" accept="application/json,.json" hidden></div>' +
      '<div class="setting-row"><div><b>' + U.esc(U.t("action.reset")) + "</b><small>" + U.esc(U.t("set.resetHint")) + '</small></div><button class="danger-btn" data-action="reset">' + U.esc(U.t("action.reset")) + "</button></div></article>" +

      '<article class="card"><h2 class="sec-title">' + U.icon("refresh", 16) + " " + U.esc(U.t("set.upTitle")) + '</h2>' +
      '<p class="set-up-desc">' + U.esc(U.t("set.upDesc")) + "</p>" +
      '<div class="update-notes"><b>' + U.icon("info", 14) + " " + U.esc(U.t("set.upNotes")) + "</b><ul>" +
      "<li>" + U.esc(U.t("set.upVer")) + ": <b>IVA v" + U.esc(window.IVA.VERSION || "2.0.0") + "</b></li>" +
      "<li>" + U.esc(U.t("set.upSys")) + ": <b>" + U.esc(sys.label) + "</b></li>" +
      "<li>" + U.esc(U.t("set.upFile")) + ": <b>" + U.esc(sys.file) + "</b></li>" +
      "<li>" + U.esc(U.t("set.upTip")) + "</li></ul></div>" +
      '<a class="up-btn" href="https://github.com/Kourosh242/iva-personal-finance/releases" target="_blank" rel="noopener noreferrer">' + U.icon("refresh", 15) + " " + U.esc(U.t("set.upBtn")) + " \u2197</a></article>" +

      '<article class="card"><h2 class="sec-title">' + U.icon("info", 16) + " " + U.esc(U.t("set.about")) + '</h2>' +
      '<div class="setting-row"><div><b>IVA</b><small>' + U.esc(U.t("footer.slogan")) + "</small></div><span class=\"ver\">v" + U.esc(window.IVA.VERSION || "2.0.0") + "</span></div>" +
      '<div class="setting-row"><div><b>' + U.esc(U.t("set.onDevice")) + "</b></div><span class=\"due ok\">" + U.icon("check", 13) + U.esc(U.t("set.onDeviceOk")) + "</span></div>" +
      '<div class="setting-row"><div><b>' + U.esc(U.t("set.license")) + "</b></div><span>MIT</span></div>" +
      '<div class="setting-row"><div><b>' + U.esc(U.t("set.shortcuts")) + "</b><small>N: " + U.esc(U.t("set.scNew")) + " · /: " + U.esc(U.t("set.scSearch")) + " · T: " + U.esc(U.t("set.scTheme")) + " · Esc: " + U.esc(U.t("set.scClose")) + "</small></div></div>" +
      (App.deferredInstall ? '<div class="setting-row"><div><b>' + U.esc(U.t("action.install")) + "</b><small>" + U.esc(U.t("set.installHint")) + '</small></div><button class="primary" data-action="install">' + U.icon("smartphone", 15) + " " + U.esc(U.t("action.install")) + "</button></div>" : "") +
      "</article></section>";
  }

  /* ============ 5. modal form system ============ */
  const FORMS = {
    transaction(data = {}) {
      const isEdit = !!data.id;
      const type = data.type || "expense";
      const catList = t => IVA.i18n.CATEGORIES[t].map(c => '<option value="' + c.key + '" ' + ((data.category || (t === "expense" ? "food" : "salary")) === c.key ? "selected" : "") + ">" + U.esc(U.t("cat." + c.key)) + "</option>").join("");
      return {
        title: isEdit ? U.t("form.txEdit") : U.t("form.tx"),
        body:
          '<div class="seg wide" data-role="tx-type"><button type="button" class="seg-btn ' + (type === "expense" ? "on" : "") + '" data-val="expense">' + U.icon("out", 15) + " " + U.esc(U.t("tx.expense")) + '</button><button type="button" class="seg-btn ' + (type === "income" ? "on" : "") + '" data-val="income">' + U.icon("in", 15) + " " + U.esc(U.t("tx.income")) + "</button></div>" +
          '<input type="hidden" name="type" value="' + type + '">' +
          field("title", U.t("common.title"), '<input name="title" required minlength="2" maxlength="80" autocomplete="off" placeholder="' + U.esc(U.t("seed.tx2")) + '" value="' + U.esc(data.title || "") + '">') +
          field("amount", U.t("common.amount") + " (" + U.t("common.toman") + ")", '<input name="amount" class="amt-input" inputmode="numeric" required placeholder="' + U.esc(U.t("tx.amountPh")) + '" value="' + (data.amount != null ? U.group(Math.abs(data.amount)) : "") + '">') +
          field("category", U.t("common.category"), '<select name="category" id="f-cat">' + catList(type) + "</select>") +
          field("account", U.t("common.account"), '<select name="accountId">' + (Store.state.accounts.length ? Store.state.accounts.map(a => '<option value="' + U.esc(a.id) + '" ' + (data.accountId === a.id ? "selected" : "") + ">" + U.esc(a.name + (a.cardNumber ? " (" + cardSuffix(a.cardNumber) + ")" : "")) + "</option>").join("") : '<option value="">' + U.esc(U.t("acc.none")) + "</option>") + "</select>") +
          field("date", U.t("common.date"), '<input type="date" name="date" value="' + U.esc(data.date || U.isoToday()) + '" max="' + U.isoToday() + '"><small class="date-hint"></small>') +
          field("note", U.t("common.note") + " <i>(" + U.t("common.optional") + ")</i>", '<input name="note" maxlength="140" placeholder="' + U.esc(U.t("tx.notePh")) + '" value="' + U.esc(data.note || "") + '">')
      };
    },
    account(data = {}) {
      const isEdit = !!data.id;
      const isCard = data.type === "card";
      return {
        title: isEdit ? U.t("form.accountEdit") : U.t("form.account"),
        body:
          field("title", U.t("common.name"), '<input name="title" required minlength="2" maxlength="60" placeholder="' + U.esc(U.t(isCard ? "acc.nameCardPh" : "acc.nameBankPh")) + '" value="' + U.esc(data.name || "") + '">') +
          field("type", U.t("common.kind"), '<select name="accType">' + IVA.i18n.ACCOUNT_TYPES.map(a => '<option value="' + a.key + '" ' + ((data.type || "bank") === a.key ? "selected" : "") + ">" + U.esc(U.t("acc." + a.key)) + "</option>").join("") + "</select>") +
          '<label class="field card-field" style="display:' + (data.type === "cash" ? "none" : "") + '"><span>' + U.esc(U.t("acc.cardNumber")) + ' <i>(' + U.esc(U.t("common.required")) + ')</i></span><div class="field-in" data-field="cardNumber"><input name="cardNumber" class="card-input" dir="ltr" inputmode="numeric" autocomplete="off" maxlength="19" placeholder="' + U.esc(U.t("acc.cardNumberPh")) + '" value="' + U.esc(maskCard(data.cardNumber, true)) + '"></div></label>' +
          '<button type="button" class="skip-card-btn" data-skip="card">' + U.esc(U.t("acc.skipCard")) + "</button>" +
          field("amount", U.t("acc.openingBalance") + " (" + U.t("common.toman") + ")", '<input name="amount" class="amt-input" inputmode="numeric" placeholder="' + U.esc(U.t("acc.openBalPh")) + '" value="' + (data.balance != null ? U.group(data.balance) : "") + '">') +
          field("color", U.t("common.color"), swatches(data.color)) +
          field("note", U.t("common.note") + " <i>(" + U.t("common.optional") + ")</i>", '<input name="note" maxlength="40" value="' + U.esc(data.note || "") + '">')
      };
    },
    budget(data = {}) {
      const isEdit = !!data.id;
      return {
        title: isEdit ? U.t("form.budgetEdit") : U.t("form.budget"),
        body:
          field("title", U.t("common.name"), '<input name="title" required minlength="2" maxlength="60" placeholder="' + U.esc(U.t("seed.bud1")) + '" value="' + U.esc(data.name || "") + '">') +
          field("category", U.t("common.category"), '<select name="category">' + IVA.i18n.CATEGORIES.expense.map(c => '<option value="' + c.key + '" ' + ((data.category || "food") === c.key ? "selected" : "") + ">" + U.esc(U.t("cat." + c.key)) + "</option>").join("") + "</select>") +
          field("amount", U.t("common.limit") + " (" + U.t("common.toman") + ")", '<input name="amount" class="amt-input" inputmode="numeric" required placeholder="' + U.esc(U.t("bud.limitPh")) + '" value="' + (data.amount != null ? U.group(data.amount) : "") + '">') +
          field("color", U.t("common.color"), swatches(data.color))
      };
    },
    goal(data = {}) {
      const isEdit = !!data.id;
      return {
        title: isEdit ? U.t("form.goalEdit") : U.t("form.goal"),
        body:
          field("title", U.t("common.name"), '<input name="title" required minlength="2" maxlength="60" placeholder="' + U.esc(U.t("seed.goal1")) + '" value="' + U.esc(data.name || "") + '">') +
          field("target", U.t("common.target") + " (" + U.t("common.toman") + ")", '<input name="target" class="amt-input" inputmode="numeric" required placeholder="' + U.esc(U.t("goal.targetPh")) + '" value="' + (data.target != null ? U.group(data.target) : "") + '">') +
          field("saved", U.t("common.saved") + " (" + U.t("common.toman") + ")", '<input name="saved" class="amt-input" inputmode="numeric" placeholder="' + U.esc(U.t("goal.savedPh")) + '" value="' + (data.saved != null ? U.group(data.saved) : "") + '">') +
          field("deadline", U.t("common.deadline") + " <i>(" + U.t("common.optional") + ")</i>", '<input type="date" name="deadline" value="' + U.esc(data.deadline || "") + '">') +
          field("color", U.t("common.color"), swatches(data.color))
      };
    },
    debt(data = {}) {
      const isEdit = !!data.id;
      const kind = data.kind || "debt";
      return {
        title: isEdit ? U.t("form.debtEdit") : U.t("form.debt"),
        body:
          '<div class="seg wide" data-role="debt-kind"><button type="button" class="seg-btn ' + (kind === "debt" ? "on" : "") + '" data-val="debt">' + U.icon("out", 15) + " " + U.esc(U.t("debt.debt")) + '</button><button type="button" class="seg-btn ' + (kind === "credit" ? "on" : "") + '" data-val="credit">' + U.icon("in", 15) + " " + U.esc(U.t("debt.credit")) + "</button></div>" +
          '<input type="hidden" name="kind" value="' + kind + '">' +
          field("title", U.t("common.name"), '<input name="title" required minlength="2" maxlength="60" placeholder="' + U.esc(U.t("seed.debt1")) + '" value="' + U.esc(data.name || "") + '">') +
          field("amount", U.t("common.amount") + " (" + U.t("common.toman") + ")", '<input name="amount" class="amt-input" inputmode="numeric" required placeholder="' + U.esc(U.t("debt.amountPh")) + '" value="' + (data.amount != null ? U.group(data.amount) : "") + '">') +
          field("dueDate", U.t("common.deadline") + " <i>(" + U.t("common.optional") + ")</i>", '<input type="date" name="dueDate" value="' + U.esc(data.dueDate || "") + '">') +
          field("note", U.t("common.note") + " <i>(" + U.t("common.optional") + ")</i>", '<input name="note" maxlength="60" value="' + U.esc(data.note || "") + '">')
      };
    }
  };
  function field(name, label, input) {
    return '<label class="field"><span>' + label + '</span><div class="field-in" data-field="' + name + '">' + input + "</div></label>";
  }
  function swatches(selected) {
    return '<div class="swatches" role="radiogroup">' + IVA.i18n.COLOR_SWATCHES.map(c =>
      '<button type="button" class="swatch ' + (c === (selected || "#6756e8") ? "on" : "") + '" data-color="' + c + '" style="--c:' + c + '" role="radio" aria-checked="' + (c === (selected || "#6756e8")) + '" aria-label="' + c + '"></button>').join("") + "</div>";
  }

  function openForm(type, id) {
    const key = { transaction: "transactions", account: "accounts", budget: "budgets", goal: "goals", debt: "debts" }[type];
    if (!key) return;
    const data = id != null ? Store.state[key].find(x => x.id === id) : {};
    if (id != null && !data) return;
    const f = FORMS[type](data || {});
    App.lastFocus = document.activeElement;
    const root = $("#modal-root");
    root.innerHTML =
      '<div class="backdrop"><form class="modal" novalidate role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
      '<div class="modal-head"><h2 id="modal-title">' + U.esc(f.title) + '</h2><button type="button" class="ibtn" data-close="1" aria-label="' + U.esc(U.t("common.close")) + '">' + U.icon("x", 18) + "</button></div>" +
      '<input type="hidden" name="_type" value="' + type + '">' + (id != null ? '<input type="hidden" name="_id" value="' + U.esc(id) + '">' : "") +
      f.body +
      '<div class="form-err" id="form-err" role="alert" hidden></div>' +
      '<div class="modal-actions"><button type="button" class="secondary" data-close="1">' + U.esc(U.t("common.cancel")) + '</button><button type="submit" class="primary">' + U.icon("check", 15) + " " + U.esc(U.t("common.save")) + "</button></div></form></div>";
    root.hidden = false;
    const modal = root.querySelector(".modal");
    const first = modal.querySelector("input:not([type=hidden]), select");
    if (first) setTimeout(() => first.focus(), 60);
    /* فرم حساب: فیلد شماره کارت فقط برای نوع «کارت بانکی» + placeholder پویا */
    const typeSel = modal.querySelector('select[name="accType"]');
    if (typeSel) {
      const cardLabel = modal.querySelector(".card-field");
      const cardInput = modal.querySelector('input[name="cardNumber"]');
      const skipBtn = modal.querySelector(".skip-card-btn");
      const titleInput = modal.querySelector('input[name="title"]');
      const syncAcc = () => {
        const isCash = typeSel.value === "cash";
        const skipped = modal.dataset.skipCard === "1";
        if (cardLabel) cardLabel.style.display = (isCash || skipped) ? "none" : "";
        if (skipBtn) skipBtn.style.display = isCash ? "none" : "";
        if (titleInput && !(data && data.id)) titleInput.placeholder = U.t(typeSel.value === "card" ? "acc.nameCardPh" : "acc.nameBankPh");
      };
      /* دکمهٔ قرمز: «علاقه‌مند به وارد کردن شماره کارت نیستم» → ثبت بدون کارت */
      if (skipBtn) skipBtn.addEventListener("click", () => {
        const on = modal.dataset.skipCard === "1";
        if (on) {
          delete modal.dataset.skipCard;
          skipBtn.textContent = U.t("acc.skipCard");
          skipBtn.classList.remove("on");
          if (cardInput) cardInput.value = "";
        } else {
          modal.dataset.skipCard = "1";
          skipBtn.textContent = U.t("acc.skipCardBack");
          skipBtn.classList.add("on");
          if (cardInput) { cardInput.value = ""; }
          const hb = modal.querySelector(".bin-hint"); if (hb) hb.remove();
        }
        syncAcc();
        if (cardInput && !on) cardInput.focus();
      });
      typeSel.addEventListener("change", syncAcc);
      syncAcc();
    }
    // date hint
    const dateIn = modal.querySelector('input[type="date"]');
    const hint = modal.querySelector(".date-hint");
    const updHint = () => { if (hint && dateIn && dateIn.value) hint.textContent = U.dateLabel(dateIn.value); };
    if (dateIn) { dateIn.addEventListener("change", updHint); updHint(); }
    if (window.IVA && IVA.jdate) IVA.jdate.enhance(modal); /* انتخابگر تاریخ شمسی */
  }
  function closeModal() {
    if (window.IVA && IVA.jdate && IVA.jdate.close) IVA.jdate.close(); /* پاپ‌آپ تقویم یتیم نماند */
    const root = $("#modal-root");
    root.hidden = true; root.innerHTML = "";
    if (App.lastFocus && App.lastFocus.isConnected) App.lastFocus.focus();
  }

  /* add-funds mini modal */
  function openFunds(id) {
    const g = Store.state.goals.find(x => x.id === id);
    if (!g) return;
    App.lastFocus = document.activeElement;
    const root = $("#modal-root");
    root.innerHTML = '<div class="backdrop"><form class="modal slim" novalidate role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title">' + U.esc(U.t("form.funds")) + " — " + U.esc(g.name) + '</h2><button type="button" class="ibtn" data-close="1" aria-label="' + U.esc(U.t("common.close")) + '">' + U.icon("x", 18) + "</button></div>" +
      '<input type="hidden" name="_type" value="funds"><input type="hidden" name="_id" value="' + U.esc(id) + '">' +
      field("amount", U.t("common.amount") + " (" + U.t("common.toman") + ")", '<input name="amount" class="amt-input" inputmode="numeric" required placeholder="' + U.esc(U.t("form.fundsPh")) + '">') +
      '<div class="form-err" role="alert" hidden></div>' +
      '<div class="modal-actions"><button type="button" class="secondary" data-close="1">' + U.esc(U.t("common.cancel")) + '</button><button type="submit" class="primary">' + U.icon("check", 15) + " " + U.esc(U.t("common.save")) + "</button></div></form></div>";
    root.hidden = false;
    setTimeout(() => { const f = root.querySelector("input:not([type=hidden])"); if (f) f.focus(); }, 60);
  }

  /* confirm dialog (promise) */
  function confirmDlg(title, body, danger = true) {
    return new Promise(resolve => {
      const root = $("#confirm-root");
      root.innerHTML = '<div class="backdrop" data-x="1"><div class="modal slim confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><div class="confirm-ic ' + (danger ? "danger" : "") + '">' + U.icon("alert", 22) + '</div><h2 id="confirm-title">' + U.esc(title) + "</h2><p>" + body + "</p>" +
        '<div class="modal-actions center"><button class="secondary" data-r="0">' + U.esc(U.t("common.cancel")) + '</button><button class="' + (danger ? "danger-btn" : "primary") + '" data-r="1">' + U.esc(U.t("common.confirm")) + "</button></div></div></div>";
      root.hidden = false;
      root.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { root.hidden = true; root.innerHTML = ""; resolve(b.dataset.r === "1"); });
      root.querySelector(".backdrop").addEventListener("click", e => { if (e.target.classList.contains("backdrop")) { root.hidden = true; root.innerHTML = ""; resolve(false); } });
      setTimeout(() => root.querySelector('[data-r="1"]').focus(), 50);
    });
  }

  /* ============ 6. toasts ============ */
  function toast(msg, { type = "ok", action = null, onAction = null } = {}) {
    const stack = $("#toast-stack");
    stack.innerHTML = ""; // only the latest toast matters (avoids undo-ing the wrong action)
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.setAttribute("role", "status");
    const ic = type === "error" ? "alert" : type === "info" ? "info" : "check";
    el.innerHTML = U.icon(ic, 16) + "<span>" + U.esc(msg) + "</span>" + (action ? '<button class="toast-act">' + U.esc(action) + "</button>" : "");
    if (action && onAction) el.querySelector(".toast-act").onclick = () => { onAction(); el.remove(); };
    stack.appendChild(el);
    setTimeout(() => el.classList.add("show"), 20);
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 350); }, action ? 6000 : 3000);
  }

  /* ============ 7. actions ============ */
  function withUndo(msg, mutate) {
    const snap = Store.snapshot();
    mutate();
    Store.save();
    render();
    toast(msg, { action: U.t("common.undo"), onAction: () => { if (Store.restore(snap)) { render(); toast(U.t("common.done")); } } });
  }

  function submitForm(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const type = fd.get("_type");
    const id = fd.get("_id");
    const errBox = form.querySelector(".form-err");
    const fail = msg => { errBox.hidden = false; errBox.textContent = msg; return false; };
    const title = String(fd.get("title") || "").trim();
    const amount = U.parseAmount(fd.get("amount"));
    const color = form.querySelector(".swatch.on") ? form.querySelector(".swatch.on").dataset.color : "#6756e8";

    if (type === "funds") {
      if (!(amount > 0)) return fail(U.t("common.invalidAmount"));
      withUndo(U.t("goal.fundsAdded"), () => {
        const g = Store.state.goals.find(x => x.id === id);
        g.saved = Math.max(0, g.saved + amount); /* فیکس: مازاد بر هدف دور ریخته نمی‌شود */
      });
      closeModal(); return;
    }
    if (title.length < 2) return fail(U.t("common.invalidTitle"));

    if (type === "transaction") {
      if (!(Math.abs(amount) > 0)) return fail(U.t("common.invalidAmount"));
      const txType = fd.get("type") === "income" ? "income" : "expense";
      const accId = fd.get("accountId");
      if (!accId) return fail(U.t("acc.none"));
      const date = /^\d{4}-\d{2}-\d{2}$/.test(fd.get("date")) ? fd.get("date") : U.isoToday();
      const signed = txType === "income" ? Math.abs(amount) : -Math.abs(amount);
      closeModal();
      if (id) {
        withUndo(U.t("tx.updated"), () => {
          const t = Store.state.transactions.find(x => x.id === id);
          const oldAcc = D.account(t.accountId);
          if (oldAcc) oldAcc.balance -= t.amount;
          const newAcc = D.account(accId);
          if (newAcc) newAcc.balance += signed;
          Object.assign(t, { title, amount: signed, type: txType, category: fd.get("category") || "other", accountId: accId, date, note: String(fd.get("note") || "") });
        });
      } else {
        withUndo(U.t("tx.saved"), () => {
          const acc = D.account(accId);
          if (acc) acc.balance += signed;
          Store.state.transactions.unshift({ id: U.uid(), title, type: txType, amount: signed, category: fd.get("category") || "other", accountId: accId, date, note: String(fd.get("note") || "") });
        });
      }
      return;
    }
    if (!(Math.abs(amount) >= 0) || isNaN(amount)) return fail(U.t("common.invalidAmount"));

    if (type === "account") {
      /* شماره کارت: برای نوع «کارت بانکی» اجباری و باید ۱۶ رقم باشد */
      const accType = String(fd.get("accType") || "bank");
      const skipCard = form.dataset.skipCard === "1"; /* دکمهٔ قرمز: کاربر نخواست کارت بدهد */
      let cardNumber = U.toEnDigits(String(fd.get("cardNumber") || "")).replace(/\D/g, "");
      if (skipCard) {
        cardNumber = "";
      } else if (accType === "bank" || accType === "card" || accType === "savings" || accType === "wallet") {
        /* ثبت حساب بانکی بدون شماره کارت ممکن نیست (مگر با دکمهٔ انصراف صریح) */
        if (!cardNumber) return fail(U.t("acc.cardRequired"));
        if (cardNumber.length !== 16) return fail(U.t("acc.cardInvalid"));
      } else {
        cardNumber = "";
      }
      closeModal();
      if (id) withUndo(U.t("acc.updated"), () => { Object.assign(Store.state.accounts.find(x => x.id === id), { name: title, type: accType, balance: amount, color, note: String(fd.get("note") || ""), cardNumber }); });
      else withUndo(U.t("acc.saved"), () => { Store.state.accounts.push({ id: U.uid(), name: title, type: accType, balance: amount, color, note: String(fd.get("note") || ""), cardNumber }); });
      return;
    }
    if (type === "goal") {
      const target = U.parseAmount(fd.get("target"));
      if (!(target > 0)) return fail(U.t("common.invalidAmount"));
      const saved = Math.max(0, U.parseAmount(fd.get("saved")) || 0); /* فیکس: سرریز مجاز */
      closeModal();
      if (id) withUndo(U.t("goal.updated"), () => { Object.assign(Store.state.goals.find(x => x.id === id), { name: title, target, saved, deadline: fd.get("deadline") || "", color }); });
      else withUndo(U.t("goal.saved"), () => { Store.state.goals.push({ id: U.uid(), name: title, target, saved, deadline: fd.get("deadline") || "", color }); });
      return;
    }
    if (!(amount > 0)) return fail(U.t("common.invalidAmount"));
    if (type === "budget") {
      closeModal();
      const cat = fd.get("category");
      /* فیکس: ویرایش هم مثل ساخت؛ دو بودجه با یک دسته = شمارش دوبارهٔ خرج در نمرهٔ سلامت */
      if (id) withUndo(U.t("bud.updated"), () => { Object.assign(Store.state.budgets.find(x => x.id === id), { name: title, category: cat, amount, color }); Store.state.budgets = Store.state.budgets.filter(b => b.id === id || b.category !== cat); });
      else withUndo(U.t("bud.saved"), () => { if (Store.state.budgets.some(b => b.category === cat)) Store.state.budgets = Store.state.budgets.filter(b => b.category !== cat); Store.state.budgets.push({ id: U.uid(), name: title, category: cat, amount, color }); });
      return;
    }
    if (type === "debt") {
      closeModal();
      const patch = { name: title, kind: fd.get("kind") === "credit" ? "credit" : "debt", amount: Math.abs(amount), dueDate: fd.get("dueDate") || "", note: String(fd.get("note") || "") };
      if (id) withUndo(U.t("debt.updated"), () => { Object.assign(Store.state.debts.find(x => x.id === id), patch); });
      else withUndo(U.t("debt.saved"), () => { Store.state.debts.push({ id: U.uid(), settled: false, ...patch }); });
    }
  }

  async function deleteEntity(type, id) {
    const key = { transaction: "transactions", account: "accounts", budget: "budgets", goal: "goals", debt: "debts" }[type];
    const item = Store.state[key].find(x => x.id === id);
    if (!item) return;
    const name = item.title || item.name;
    if (type === "account") {
      const n = Store.state.transactions.filter(t => t.accountId === id).length;
      if (n > 0) {
        const ok = await confirmDlg(U.t("del.accTitle"), U.esc(U.t("acc.deleteCascade", { n: U.group(n) })) + "<br><br>" + U.esc(U.t("del.body", { t: name })));
        if (!ok) return;
        withUndo(U.t("acc.deleted"), () => {
          Store.state.transactions = Store.state.transactions.filter(t => t.accountId !== id);
          Store.state.accounts = Store.state.accounts.filter(a => a.id !== id);
        });
        return;
      }
    }
    const titles = { transaction: "del.txTitle", account: "del.accTitle", budget: "del.budTitle", goal: "del.goalTitle", debt: "del.debtTitle" };
    const bodies = { transaction: "del.txBody", budget: "del.body", goal: "del.body", debt: "del.body", account: "del.body" };
    const ok = await confirmDlg(U.t(titles[type]), U.esc(type === "transaction" ? U.t("del.txBody", { t: name }) : U.t(bodies[type], { t: name })));
    if (!ok) return;
    const msgs = { transaction: "tx.deleted", account: "acc.deleted", budget: "bud.deleted", goal: "goal.deleted", debt: "debt.deleted" };
    withUndo(U.t(msgs[type]), () => {
      if (type === "transaction") {
        const acc = D.account(item.accountId);
        if (acc) acc.balance -= item.amount;
      }
      Store.state[key] = Store.state[key].filter(x => x.id !== id);
    });
  }

  function exportCSV() {
    const q = s => '"' + String(s ?? "").replace(/"/g, '""') + '"';
    const rows = [["Date", "Title", "Category", "Account", "Type", "Amount", "Note"]];
    const list = App.page === "transactions" ? filteredTx() : Store.state.transactions;
    for (const t of list) {
      rows.push([t.date, t.title, U.t("cat." + t.category), (D.account(t.accountId) || { name: "" }).name, t.amount > 0 ? "income" : "expense", t.amount, t.note || ""]);
    }
    download("\uFEFF" + rows.map(r => r.map(q).join(",")).join("\r\n"), "iva-transactions.csv", "text/csv;charset=utf-8");
    toast(U.t("action.exportCsv") + " ✓");
  }
  function exportJSON() {
    download(JSON.stringify(Store.state, null, 2), "iva-backup-" + U.isoToday() + ".json", "application/json");
    toast(U.t("action.exportJson") + " ✓");
  }
  function download(data, name, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function importJSON(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { toast(U.t("set.importBad"), { type: "error" }); return; }
    if (!data || !Array.isArray(data.transactions) || !Array.isArray(data.accounts)) { toast(U.t("set.importBad"), { type: "error" }); return; }
    const ok = await confirmDlg(U.t("set.importConfirmTitle"), U.esc(U.t("set.importConfirmBody")), false);
    if (!ok) return;
    const snap = Store.snapshot();
    Store.state = Store.sanitize(data);
    Store.save(); render();
    toast(U.t("set.importDone"), { action: U.t("common.undo"), onAction: () => { Store.restore(snap); render(); } });
  }

  /* ============ 8. theme / lang / health ============ */
  function applyTheme() {
    const t = App.settings.theme;
    const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#0b0e17" : "#f6f7fb";
    const btn = $("#theme-toggle");
    if (btn) btn.innerHTML = dark ? U.icon("sun", 18) : U.icon("moon", 18);
  }
  function applyLang() {
    document.documentElement.lang = App.settings.lang;
    document.documentElement.dir = App.settings.lang === "fa" ? "rtl" : "ltr";
    $$("#navigation .nav-item, .bottomnav-item").forEach(b => {
      const k = "nav." + b.dataset.page;
      if (b.dataset.page) b.querySelector("span:last-child").textContent = U.t(k);
    });
    $$("[data-i18n]").forEach(el => { el.textContent = U.t(el.dataset.i18n); });
    $$("[data-i18n-ph]").forEach(el => { el.placeholder = U.t(el.dataset.i18nPh); });
    $("#lang-toggle").textContent = App.settings.lang === "fa" ? "EN" : "فا";
    const btnTxt = $("#new-tx-btn span:last-child");
    if (btnTxt) btnTxt.textContent = U.t("action.newTx");
    const moreTxt = $("#more-btn span:last-child");
    if (moreTxt) moreTxt.textContent = U.t("nav.more");
    $("#fab").setAttribute("aria-label", U.t("action.newTx"));
  }
  function applyIcons() {
    $$("[data-ic]").forEach(el => {
      const size = el.closest(".bottomnav") || el.closest("#fab") ? 21 : 17;
      el.innerHTML = U.icon(el.dataset.ic, size);
    });
  }
  function renderHealth() {
    const h = D.health();
    const el = $("#health-widget");
    if (!el) return;
    const ringColor = h.neutral ? "var(--line-2)" : h.score >= 80 ? "var(--brand-2)" : h.score >= 60 ? "var(--brand)" : h.score >= 40 ? "#f1b83f" : "var(--danger)";
    const desc = h.neutral ? U.t("health.noDataDesc") : U.t("health.desc", { sr: U.group(h.savingsRate) });
    el.innerHTML = '<div class="health-top"><b>' + U.icon("gauge", 15) + " " + U.esc(U.t("health.title")) + '</b><em>' + U.esc(U.t(h.label)) + "</em></div>" +
      IVA.charts.ring(h.score, { size: 92, thickness: 9, color: ringColor, label: h.neutral ? "—" : U.group(h.score) }) +
      "<p>" + U.esc(desc) + "</p>";
    IVA.charts.animate(el);
    // profile
    $("#profile-name").textContent = App.settings.name || "IVA";
    $("#profile-avatar").textContent = (App.settings.name || "I").trim().charAt(0).toUpperCase();
  }

  /* ============ 9. sheet (mobile) ============ */
  function openSheet() { $("#sheet-backdrop").hidden = false; $("#more-sheet").classList.add("open"); }
  function closeSheet(updateHash = true) {
    $("#sheet-backdrop").hidden = true;
    $("#more-sheet").classList.remove("open");
  }

  /* ============ 10. tooltip ============ */
  function bindTooltip() {
    const tip = $("#chart-tip");
    const show = (e, el) => {
      tip.innerHTML = el.dataset.tip;
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let x = r.left + r.width / 2 - tw / 2;
      x = U.clamp(x, 8, innerWidth - tw - 8);
      let y = r.top - th - 10;
      if (y < 8) y = r.bottom + 10;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    };
    document.addEventListener("mouseover", e => {
      const el = e.target.closest("[data-tip]");
      if (el) show(e, el); else tip.hidden = true;
    });
    document.addEventListener("focusin", e => { const el = e.target.closest("[data-tip]"); if (el) show(e, el); });
    document.addEventListener("focusout", () => { tip.hidden = true; });
    document.addEventListener("scroll", () => { tip.hidden = true; }, true);
  }

  /* ============ 11. global events ============ */
  function bind() {
    // clicks (delegated)
    document.addEventListener("click", async e => {
      const el = e.target.closest("[data-action]");
      if (el) {
        const a = el.dataset.action;
        const stop = () => { e.preventDefault(); e.stopPropagation(); };
        if (a === "go") { stop(); go(el.dataset.page); }
        else if (a === "open-form") { stop(); openForm(el.dataset.type); }
        else if (a === "add-funds") { stop(); openFunds(el.dataset.id); }
        else if (a === "edit") { stop(); openForm(el.dataset.type, el.dataset.id); }
        else if (a === "del") { stop(); deleteEntity(el.dataset.type, el.dataset.id); }
        else if (a === "toggle-settle") {
          stop();
          const x = Store.state.debts.find(d => d.id === el.dataset.id);
          if (x) withUndo(U.t("common.done"), () => { x.settled = !x.settled; });
        }
        else if (a === "tx-filter") { stop(); App.txFilters.type = el.dataset.val; App.txLimit = 30; render(); }
        else if (a === "tx-more") { stop(); App.txLimit += 30; render(); const inp = $("#tx-q"); if (inp) { const v = inp.value; inp.focus(); inp.value = v; } }
        else if (a === "range") { stop(); App.reportRange = +el.dataset.val; render(); }
        else if (a === "rep-sec") { stop(); App.repSec = el.dataset.val; render(); }
        else if (a === "export-csv") { stop(); exportCSV(); }
        else if (a === "export-json") { stop(); exportJSON(); }
        else if (a === "import-json") { stop(); $("#import-file").click(); }
        else if (a === "reset") {
          stop();
          if (await confirmDlg(U.t("set.resetConfirmTitle"), U.esc(U.t("set.resetConfirmBody")), false)) {
            withUndo(U.t("toast.resetDone"), () => { Store.state = Store.seed(); });
          }
        }
        else if (a === "set-theme") { stop(); App.settings.theme = el.dataset.val; Store.saveSettings(); applyTheme(); render(); }
        else if (a === "set-lang") { stop(); App.settings.lang = el.dataset.val; Store.saveSettings(); applyLang(); render(); }
        else if (a === "set-currency") { stop(); App.settings.currency = el.dataset.val; Store.saveSettings(); render(); }
        else if (a === "change-name") { stop(); openWelcome(); }
        else if (a === "install") { stop(); if (App.deferredInstall) { App.deferredInstall.prompt(); App.deferredInstall = null; render(); } }
        else if (a === "theme-toggle") {
          stop();
          App.settings.theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
          Store.saveSettings(); applyTheme(); render();
          toast(document.documentElement.classList.contains("dark") ? U.t("toast.themeDark") : U.t("toast.themeLight"), { type: "info" });
        }
        else if (a === "lang-toggle") { stop(); App.settings.lang = App.settings.lang === "fa" ? "en" : "fa"; Store.saveSettings(); applyLang(); render(); toast(U.t("toast.langChanged"), { type: "info" }); }
        else if (a === "open-sheet") { stop(); openSheet(); }
        else if (a === "close-sheet") { stop(); closeSheet(); }
        return;
      }
      const closer = e.target.closest("[data-close]");
      if (closer) { e.preventDefault(); closeModal(); return; }
      if (e.target.classList && e.target.classList.contains("backdrop")) { closeModal(); return; }
      // brand
      if (e.target.closest(".brand")) { e.preventDefault(); go("overview"); }
      // backdrop clicks
      if (e.target.id === "sheet-backdrop") closeSheet();
      // tx type / debt kind segmented inside forms
      const segBtn = e.target.closest(".seg[data-role] button");
      if (segBtn) {
        const seg = segBtn.parentElement;
        seg.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("on", b === segBtn));
        const form = seg.closest("form");
        const hidden = form ? form.querySelector('input[type="hidden"][name="type"], input[type="hidden"][name="kind"]') : null;
        if (hidden) hidden.value = segBtn.dataset.val;
        if (seg.dataset.role === "tx-type") {
          const sel = seg.parentElement.querySelector("select[name='category']");
          if (sel) {
            const cats = IVA.i18n.CATEGORIES[segBtn.dataset.val];
            sel.innerHTML = cats.map(c => '<option value="' + c.key + '">' + U.esc(U.t("cat." + c.key)) + "</option>").join("");
          }
        }
      }
      const swatch = e.target.closest(".swatch");
      if (swatch) { swatch.parentElement.querySelectorAll(".swatch").forEach(s => { s.classList.toggle("on", s === swatch); s.setAttribute("aria-checked", s === swatch); }); }
    });

    // form submits
    document.addEventListener("submit", e => {
      if (e.target.id === "item-root-form" || (e.target.closest && e.target.closest("#modal-root"))) { submitForm(e); return; }
      if (e.target.id === "welcome-form") {
        e.preventDefault();
        const name = $("#welcome-name").value.trim();
        if (name.length < 2) return;
        App.settings.name = name; Store.saveSettings();
        $("#welcome-backdrop").hidden = true;
        /* فیکس ریشه‌ای میان‌برها: فوکوس روی اینپوت مخفی welcome نماند (وگرنه typing=true و n/t مرده‌اند) */
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        render();
        toast(U.t("toast.welcome", { n: name }));
      }
    });

    // live filters on transactions page (full render keeps everything consistent; caret restored)
    document.addEventListener("input", e => {
      if (e.target.id === "tx-q") {
        App.txFilters.q = e.target.value; App.txLimit = 30;
        render();
        const q = $("#tx-q");
        if (q) { q.focus(); try { q.setSelectionRange(q.value.length, q.value.length); } catch (err) { } }
      }
      /* شماره کارت: گروه ۴رقمی با فاصله */
      if (e.target.classList && e.target.classList.contains("card-input")) {
        const el = e.target;
        const selStart = el.selectionStart != null ? el.selectionStart : el.value.length;
        const prevRaw = el._ivaPrev || "";
        const raw = U.toEnDigits(el.value).replace(/\D/g, "").slice(0, 16);
        el.value = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
        if (U.lang() === "fa") el.value = el.value.replace(/\d/g, x => U.faDigits[+x]);
        /* تایپ پیوسته در انتها (raw جدید ادامه‌ی قبلی است) → کرسر آخر؛
           در RTL گزارش selection گاهی بج می‌زند — این قاعده مستقل از آن است */
        if (prevRaw && raw.length > prevRaw.length && raw.slice(0, prevRaw.length) === prevRaw && selStart >= el._ivaPrevLen) {
          try { el.setSelectionRange(el.value.length, el.value.length); } catch (err) { }
        } else if (raw.length < prevRaw.length || !raw.startsWith(prevRaw.slice(0, raw.length))) {
          /* ویرایش/حذف وسط متن: بازگرداندن کرسر با شمردن رقم‌های قبل از caret */
          const digitsBefore = U.toEnDigits(el.value.slice(0, selStart)).replace(/\D/g, "").length;
          let seen = 0, pos = 0;
          while (pos < el.value.length && seen < digitsBefore) {
            if (/[0-9\u06F0-\u06F9]/.test(el.value[pos])) seen++;
            pos++;
          }
          try { el.setSelectionRange(pos, pos); } catch (err) { }
        } else {
          try { el.setSelectionRange(el.value.length, el.value.length); } catch (err) { }
        }
        el._ivaPrev = raw;
        el._ivaPrevLen = el.value.length;
        /* ابزارها: نمایش زنده بانک از ۶ رقم اول (مثل درگاه‌های پرداخت) */
        try { if (window.IVA.tools && IVA.tools.cardHint && !el.dataset.bin) IVA.tools.cardHint(el); } catch (err) { }
      }
      if (e.target.classList.contains("amt-input")) {
        const el = e.target;
        /* نرخ/کارمزد وام: اعشار مجاز و بدون گروه‌بندی — ابزارها خودش هندل می‌کند */
        if (el.dataset.loan === "rate" || el.dataset.loan === "fee") return;
        /* فیکس: فیلدهای اعشاری تبدیل‌گر (مبلغ ۰٫۵ بیت‌کوین، نرخ دستی ۲۰۵٫۵) —
           هندلر سراسری فقط صحیح گروه‌بندی می‌کند؛ نقطه را می‌بلعید و نرخ خراب می‌شد */
        if (el.name === "conv-amount" || el.name === "conv-mf" || el.name === "conv-mt") return;
        const selStart = el.selectionStart != null ? el.selectionStart : el.value.length;
        const digitsBeforeCaret = U.toEnDigits(el.value.slice(0, selStart)).replace(/[^\d]/g, "").length;
        const raw = U.toEnDigits(el.value).replace(/[^\d]/g, "");
        el.value = raw ? U.group(+raw) : "";
        // walk the reformatted value until we've passed the same number of digits the caret had before
        let seen = 0, pos = 0;
        while (pos < el.value.length && seen < digitsBeforeCaret) {
          if (/[0-9\u06F0-\u06F9]/.test(el.value[pos])) seen++;
          pos++;
        }
        try { el.setSelectionRange(pos, pos); } catch (err) { }
      }
    });
    document.addEventListener("change", e => {
      const map = { "tx-cat": "cat", "tx-acc": "acc", "tx-month": "month", "tx-sort": "sort" };
      if (map[e.target.id]) { App.txFilters[map[e.target.id]] = e.target.value; App.txLimit = 30; render(); const s = $("#" + e.target.id); if (s) s.focus(); }
      if (e.target.id === "rep-acc") { App.repAcc = e.target.value; render(); }
      if (e.target.id === "import-file" && e.target.files[0]) { importJSON(e.target.files[0]); e.target.value = ""; }
    });

    // hash routing
    addEventListener("hashchange", render);

    // keyboard
    document.addEventListener("keydown", e => {
      const ae = document.activeElement;
      const typing = !!ae && /input|textarea|select/i.test(ae.tagName);
      if (e.key === "Escape") {
        if (!$("#confirm-root").hidden) { const cancel = $('#confirm-root [data-r="0"]'); if (cancel) cancel.click(); return; }
        if (!$("#modal-root").hidden) { closeModal(); return; }
        if (!$("#sheet-backdrop").hidden) { closeSheet(); return; }
        if (!$("#welcome-backdrop").hidden && App.settings.name) { $("#welcome-backdrop").hidden = true; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }
        /* بند ۱۰: طبق متن تنظیمات، Esc پنجره را می‌بندد (فقط Electron؛ وقتی هیچ دیالوگی باز نبود) */
        /* فقط وقتی هیچ خوش‌آمدی باز نیست؛ در اجرای اول Esc نباید کل پنجره را ببندد */
        else if ($("#welcome-backdrop").hidden && window.ivaDesktop && window.ivaDesktop.escQuit) window.ivaDesktop.escQuit();
        return;
      }
      if (typing) return;
      /* فیکس: میان‌برها وقتی مودال/دیالوگ تأیید باز است کاری نکنند (Esc/Tab جدا مدیریت می‌شوند) */
      const dialogOpen = !$("#modal-root").hidden || !$("#confirm-root").hidden;
      if (!dialogOpen) {
        /* e.code = کلید فیزیکی؛ مستقل از چیدمان فارسی/انگلیسی — باگ «n و t کار نمی‌کنند» روی کیبورد فارسی */
        const kk = e.key || "";
        if (e.code === "KeyN" || kk === "n" || kk === "N" || kk === "ن") { e.preventDefault(); openForm("transaction"); }
        else if (kk === "/") { e.preventDefault(); go("transactions"); setTimeout(() => { const q = $("#tx-q"); if (q) q.focus(); }, 80); }
        else if (e.code === "KeyT" || kk === "t" || kk === "T" || kk === "ت") { e.preventDefault(); App.settings.theme = document.documentElement.classList.contains("dark") ? "light" : "dark"; Store.saveSettings(); applyTheme(); render(); }
      }
      // focus trap in modal / confirm dialog
      if (e.key === "Tab") {
        const activeRoot = !$("#confirm-root").hidden ? "#confirm-root" : !$("#modal-root").hidden ? "#modal-root" : null;
        if (!activeRoot) return;
        const f = $$(activeRoot + " button, " + activeRoot + " input, " + activeRoot + " select, " + activeRoot + " [tabindex]").filter(x => !x.disabled && x.offsetParent);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // system theme changes
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (App.settings.theme === "system") applyTheme(); });

    // PWA install
    addEventListener("beforeinstallprompt", e => { e.preventDefault(); App.deferredInstall = e; if (App.page === "settings") render(); });

    bindTooltip();

    /* اندروید Back: اول دیالوگ‌های درون‌برنامه‌ای بسته شوند (مودال/تأیید/شیت/خوش‌آمد)، بعد تاریخچه */
    window.__ivaBack = function () {
      const wb = $("#welcome-backdrop");
      if (wb && !wb.hidden) { if (App.settings.name) { wb.hidden = true; } return true; }
      const cf = $("#confirm-root");
      if (cf && !cf.hidden) { cf.hidden = true; cf.innerHTML = ""; return true; }
      const md = $("#modal-root");
      if (md && !md.hidden) { closeModal(); return true; }
      const sheet = $("#more-sheet");
      if (sheet && sheet.classList.contains("open")) { closeSheet(); return true; }
      return false;
    };
  }

  /* ============ 12. welcome ============ */
  function openWelcome() {
    $("#welcome-backdrop").hidden = false;
    const inp = $("#welcome-name");
    inp.value = App.settings.name || "";
    setTimeout(() => inp.focus(), 60);
  }

  /* ============ 13. boot ============ */
  function boot() {
    Store.loadSettings();
    App.settings = Store.settings;
    Store.load();
    applyTheme();
    applyLang();
    applyIcons();
    bind();
    if (!App.settings.name) openWelcome();
    render();
    // warn about storage failures (private mode etc.)
    try { localStorage.setItem("iva-test", "1"); localStorage.removeItem("iva-test"); }
    catch (e) { toast(U.t("toast.storageFail"), { type: "error" }); }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
