# 🛠️ راهنمای توسعه | Development Guide

> **🇮🇷 فارسی** | [🇬🇧 English](#-development-guide-english)

---

## 🇮🇷 راهنمای توسعه‌دهندگان

این راهنما برای کسانی است که می‌خواهند در توسعه IVA مشارکت کنند یا ساختار کد را درک کنند.

---

### 🏗 معماری کد

IVA یک **اپلیکیشن تک صفحه‌ای (SPA)** است که از معماری ماژولار استفاده می‌کند. کد به ۵ ماژول اصلی تقسیم شده است:

```
index.html  →  بارگذاری ماژول‌ها به ترتیب
   │
   ├── js/i18n.js     📖 دیکشنری و متادیتا
   ├── js/utils.js    🔧 ابزارهای عمومی
   ├── js/store.js    💾 ذخیره‌ساز و وضعیت
   ├── js/charts.js   📊 موتور نمودار
   └── js/app.js      🚀 روتر، صفحات، اکشن‌ها
```

### 📦 ماژول i18n.js

مسئول **دوزبانه‌سازی** کامل برنامه:

- دیکشنری کامل فارسی و انگلیسی (`I18N.fa` و `I18N.en`)
- متادیتای دسته‌ها (`CATEGORIES`, `CATEGORY_MAP`)
- متادیتای نوع حساب‌ها (`ACCOUNT_TYPES`, `ACCOUNT_TYPE_MAP`)
- رنگ‌های انتخابی (`COLOR_SWATCHES`)

**نحوه کار ترجمه:**
```javascript
U.t("key.name")                    // ترجمه ساده
U.t("key.withParam", { n: value }) // ترجمه با پارامتر
```

### 🔧 ماژول utils.js

ابزارهای عمومی و پایه:

| تابع | توضیح |
|------|-------|
| `U.esc(s)` | جلوگیری از XSS با escape کاراکترهای HTML |
| `U.uid()` | تولید شناسه یکتا |
| `U.group(n)` | فرمت اعداد با جداکننده هزارگان (فارسی/انگلیسی) |
| `U.money(n)` | فرمت مبلغ با واحد پول |
| `U.compact(n)` | نمایش فشرده اعداد (میلیون/هزار) |
| `U.t(key, params)` | ترجمه با fallback به فارسی |
| `U.dateLabel(iso)` | نمایش تاریخ شمسی (امروز/دیروز/تاریخ کامل) |
| `U.monthLabel(key)` | نام ماه شمسی |
| `U.icon(name, size)` | آیکون SVG خطی |

**تقویم شمسی** بدون هیچ کتابخانه خارجی و فقط با `Intl.DateTimeFormat` مرورگر پیاده‌سازی شده است:
```javascript
// محاسبه کلید یکتای ماه (سال × ۱۲ + ماه)
monthKey(date) {
  const p = U._jParts(date);
  return p.year * 12 + p.month;
}
```

### 💾 ماژول store.js

مدیریت **وضعیت و ذخیره‌سازی**:

- `Store.state`: وضعیت اصلی برنامه (تراکنش‌ها، حساب‌ها، بودجه‌ها، اهداف، بدهی‌ها)
- `Store.settings`: تنظیمات کاربر (زبان، تم، واحد پول، نام)
- `Store.load()`: بارگذاری داده از LocalStorage با مهاجرت خودکار
- `Store.save()`: ذخیره در LocalStorage
- `Store.sanitize(data)`: اعتبارسنجی و پاک‌سازی کامل داده‌ها
- `Store.seed()`: تولید داده‌های نمونه شبیه‌سازی‌شده
- `Store.snapshot()` / `Store.restore()`: پشتیبانی از قابلیت Undo

**طرحواره داده (نسخه ۲):**
```javascript
{
  version: 2,
  transactions: [{ id, title, type, amount, category, accountId, date, note }],
  accounts: [{ id, name, type, balance, color, note }],
  budgets: [{ id, name, category, amount, color }],
  goals: [{ id, name, target, saved, deadline, color }],
  debts: [{ id, name, kind, amount, dueDate, settled, note }]
}
```

### 📊 ماژول charts.js

موتور نمودار **SVG اختصاصی** با انیمیشن:

| تابع | نوع نمودار |
|------|-----------|
| `Charts.sparkline()` | اسپارک‌لاین (خطی کوچک) |
| `Charts.bars()` | میله‌ای گروهی (درآمد/هزینه) |
| `Charts.line()` | خطی نرم با ناحیه |
| `Charts.donut()` | دونات (دایره‌ای) |
| `Charts.ring()` | حلقه پیشرفت |
| `Charts.animate()` | انیمیشن بعد از درج در DOM |

### 🚀 ماژول app.js

مرکز کنترل برنامه:

- **Router**: مسیریابی مبتنی بر هش (`#/overview`, `#/transactions`)
- **Pages**: ۸ صفحه اصلی (Overview, Transactions, Accounts, Budgets, Goals, Debts, Reports, Settings)
- **Forms**: فرم‌های مودال برای ثبت/ویرایش موجودیت‌ها
- **Actions**: مدیریت رویدادها (کلیک، کیبورد، تغییر فرم)
- **Undo**: قابلیت برگردان با Snapshot

---

### 🤝 مشارکت

قوانین مشارکت:

1. ریپو را **Fork** کنید
2. از **Branch** با نام مشخص استفاده کنید (مثل `feature/recurring-transactions`)
3. تغییرات را **کوچک و خوانا** نگه دارید
4. در **حالت روشن، تاریک، فارسی و انگلیسی** تست کنید
5. **Pull Request** ایجاد کنید با توضیح دقیق

---

## 🛠️ Development Guide (English)

This guide is for developers who want to contribute or understand IVA's code.

### 🏗 Code Architecture

IVA is a **Single Page Application (SPA)** with a modular architecture of 5 modules:

```
index.html  →  Loads modules in order
   │
   ├── js/i18n.js     📖 Dictionary & metadata
   ├── js/utils.js    🔧 Utility functions
   ├── js/store.js    💾 Data store & state
   ├── js/charts.js   📊 SVG chart engine
   └── js/app.js      🚀 Router, pages, actions
```

### 📦 Module: i18n.js

Handles **full bilingual support**:

- Complete Persian and English dictionary (`I18N.fa` & `I18N.en`)
- Category metadata (`CATEGORIES`, `CATEGORY_MAP`)
- Account type metadata (`ACCOUNT_TYPES`, `ACCOUNT_TYPE_MAP`)
- Color swatches (`COLOR_SWATCHES`)

### 🔧 Module: utils.js

Core utilities:

| Function | Description |
|----------|-------------|
| `U.esc(s)` | XSS prevention via HTML entity escaping |
| `U.uid()` | Unique ID generation |
| `U.group(n)` | Number formatting with thousands separator (FA/EN) |
| `U.money(n)` | Currency formatting with unit |
| `U.compact(n)` | Compact number display (M/K) |
| `U.t(key, params)` | Translation with Persian fallback |
| `U.dateLabel(iso)` | Jalali date display (today/yesterday/full) |
| `U.monthLabel(key)` | Jalali month name |
| `U.icon(name, size)` | Feather-style SVG icons |

**Jalali calendar** uses the browser's built-in `Intl.DateTimeFormat` with zero dependencies:
```javascript
monthKey(date) {
  const p = U._jParts(date);
  return p.year * 12 + p.month;
}
```

### 💾 Module: store.js

**State management & persistence**:

- `Store.state`: Main app state
- `Store.settings`: User preferences (lang, theme, currency, name)
- Auto-save, auto-migration from v1
- Full data validation via `Store.sanitize()`
- Snapshot-based Undo system

### 📊 Module: charts.js

**Custom SVG chart engine** with animation:

| Function | Chart Type |
|----------|-----------|
| `Charts.sparkline()` | Mini line sparkline |
| `Charts.bars()` | Grouped bar chart (income/expense) |
| `Charts.line()` | Smooth line chart with area |
| `Charts.donut()` | Donut/ring chart |
| `Charts.ring()` | Progress ring chart |
| `Charts.animate()` | Post-insertion animation |

### 🚀 Module: app.js

Application **main controller**:

- Hash-based routing (`#/overview`, `#/transactions`, etc.)
- 8 main pages with dynamic rendering
- Modal forms for CRUD operations
- Event delegation for click, keyboard, and form events
- Snapshot-based Undo/Redo

### 🤝 Contributing

Guidelines:

1. **Fork** the repository
2. Create a **descriptive branch** (e.g., `feature/recurring-transactions`)
3. Keep changes **small and focused**
4. **Test** in light/dark mode and FA/EN languages
5. Open a **Pull Request** with clear description