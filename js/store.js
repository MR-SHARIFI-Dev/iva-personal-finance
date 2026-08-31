/* IVA v3 — data store: state, validation, empty seed, migration, snapshots */
"use strict";

const Store = {
  KEY: "iva-data-v3",
  SETTINGS_KEY: "iva-settings",
  SCHEMA: 3,

  state: null,
  settings: { lang: "fa", theme: "light", currency: "toman", name: "" },

  /* ------------ persistence ------------ */
  loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem(Store.SETTINGS_KEY));
      if (raw && typeof raw === "object") Store.settings = { ...Store.settings, ...raw };
    } catch (e) { console.warn("IVA: settings unreadable, using defaults"); }
    if (Store.settings.theme !== "dark" && Store.settings.theme !== "light" && Store.settings.theme !== "system") Store.settings.theme = "light";
    if (Store.settings.currency !== "toman" && Store.settings.currency !== "rial") Store.settings.currency = "toman";
    if (Store.settings.lang !== "fa" && Store.settings.lang !== "en") Store.settings.lang = "fa";
    return Store.settings;
  },
  saveSettings() {
    try { localStorage.setItem(Store.SETTINGS_KEY, JSON.stringify(Store.settings)); }
    catch (e) { console.warn("IVA: settings persist failed", e); }
  },

  load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(Store.KEY)); } catch (e) { console.warn("IVA: data corrupted, recovering"); }
    if (data && data.version === Store.SCHEMA) { Store.state = Store.sanitize(data); return Store.state; }
    // Older or different data exists: ignore it (demo removed) and start empty.
    Store.state = Store.seed(); Store.save(); return Store.state;
  },
  save() {
    try { localStorage.setItem(Store.KEY, JSON.stringify(Store.state)); }
    catch (e) { console.warn("IVA: data persist failed", e); }
  },

  /* ------------ undo snapshots ------------ */
  snapshot() { return JSON.stringify(Store.state); },
  restore(snap) {
    try { Store.state = JSON.parse(snap); Store.save(); return true; } catch (e) { return false; }
  },

  /* ------------ validation ------------ */
  num(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; },
  sanitize(d) {
    const knownCats = new Set(Object.keys(window.IVA.i18n.CATEGORY_MAP));
    const knownAccTypes = new Set(Object.keys(window.IVA.i18n.ACCOUNT_TYPE_MAP));
    const accIds = new Set();
    const accounts = [];
    if (Array.isArray(d.accounts)) {
      for (const a of d.accounts) {
        if (!a || typeof a.name !== "string" || !a.name.trim()) continue;
        const id = String(a.id || U.uid());
        accIds.add(id);
        accounts.push({
          id, name: a.name.slice(0, 60), type: knownAccTypes.has(a.type) ? a.type : "bank",
          balance: Store.num(a.balance), color: /^#[0-9a-f]{6}$/i.test(a.color || "") ? a.color : "#6756e8",
          note: typeof a.note === "string" ? a.note.slice(0, 140) : "",
          cardNumber: U.toEnDigits(typeof a.cardNumber === "string" ? a.cardNumber : "").replace(/\D/g, "").slice(0, 16)
        });
      }
    }
    const fallbackAcc = accounts[0] ? accounts[0].id : null;
    const transactions = [];
    if (Array.isArray(d.transactions)) {
      for (const t of d.transactions) {
        if (!t || typeof t.title !== "string" || !t.title.trim()) continue;
        const type = t.type === "income" ? "income" : "expense";
        const amount = Math.abs(Store.num(t.amount, 0)) * (type === "expense" ? -1 : 1);
        if (amount === 0) continue;
        transactions.push({
          id: String(t.id || U.uid()),
          title: t.title.slice(0, 80),
          type,
          amount,
          category: knownCats.has(t.category) ? t.category : (type === "income" ? "incomeOther" : "other"),
          accountId: accIds.has(String(t.accountId)) ? String(t.accountId) : fallbackAcc,
          date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : U.isoToday(),
          note: typeof t.note === "string" ? t.note.slice(0, 140) : ""
        });
      }
    }
    const budgets = [];
    if (Array.isArray(d.budgets)) {
      const used = new Set();
      for (const b of d.budgets) {
        if (!b || typeof b.name !== "string" || !b.name.trim()) continue;
        const cat = knownCats.has(b.category) ? b.category : "other";
        if (used.has(cat)) continue; used.add(cat);
        if (Store.num(b.amount) <= 0) continue;
        budgets.push({
          id: String(b.id || U.uid()), name: b.name.slice(0, 60), category: cat,
          amount: Store.num(b.amount),
          color: /^#[0-9a-f]{6}$/i.test(b.color || "") ? b.color : (window.IVA.i18n.CATEGORY_MAP[cat] ? window.IVA.i18n.CATEGORY_MAP[cat].color : "#6756e8")
        });
      }
    }
    const goals = [];
    if (Array.isArray(d.goals)) {
      for (const g of d.goals) {
        if (!g || typeof g.name !== "string" || !g.name.trim()) continue;
        if (Store.num(g.target) <= 0) continue;
        goals.push({
          id: String(g.id || U.uid()), name: g.name.slice(0, 60),
          target: Store.num(g.target), saved: Math.max(0, Store.num(g.saved)), /* فیکس: سرریز پس‌انداز در sanitize هم حفظ شود */
          deadline: /^\d{4}-\d{2}-\d{2}$/.test(g.deadline) ? g.deadline : "",
          color: /^#[0-9a-f]{6}$/i.test(g.color || "") ? g.color : "#6756e8"
        });
      }
    }
    const debts = [];
    if (Array.isArray(d.debts)) {
      for (const x of d.debts) {
        if (!x || typeof x.name !== "string" || !x.name.trim()) continue;
        if (Store.num(x.amount) === 0) continue;
        debts.push({
          id: String(x.id || U.uid()), name: x.name.slice(0, 60),
          kind: x.kind === "credit" ? "credit" : "debt",
          amount: Math.abs(Store.num(x.amount)),
          dueDate: /^\d{4}-\d{2}-\d{2}$/.test(x.dueDate) ? x.dueDate : "",
          settled: !!x.settled,
          note: typeof x.note === "string" ? x.note.slice(0, 140) : ""
        });
      }
    }
    /* یادداشت‌ها — متن آزاد کاربر (سقف ۵۰۰۰ نویسه، ۵۰۰ یادداشت؛ جدیدترین اول) */
    const notes = [];
    if (Array.isArray(d.notes)) {
      for (const n of d.notes) {
        if (!n || typeof n.text !== "string" || !n.text.trim()) continue;
        const ts = Store.num(n.ts, Date.now());
        notes.push({ id: String(n.id || U.uid()), text: n.text.slice(0, 5000), ts, up: Store.num(n.up, 0) });
      }
    }
    notes.sort((a, b) => b.ts - a.ts);
    if (notes.length > 500) notes.length = 500;
    return { version: Store.SCHEMA, transactions, accounts, budgets, goals, debts, notes };
  },

  /* ------------ empty initial state (no demo data) ------------ */
  seed() {
    return Store.sanitize({
      version: 3,
      accounts: [],
      transactions: [],
      budgets: [],
      goals: [],
      debts: [],
      notes: []
    });
  }
};

window.IVA.store = Store;
