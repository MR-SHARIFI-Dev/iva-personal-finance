# 🚀 شروع به کار | Getting Started

> **🇮🇷 فارسی** | [🇬🇧 English](#-getting-started-english)

---

## 🇮🇷 شروع به کار با آیوا

### نصب و اجرا

IVA یک اپلیکیشن تحت وب بدون نیاز به نصب است. دو روش برای اجرا دارید:

#### روش ۱ — اجرای مستقیم (ساده)

```bash
# ۱. پروژه را Clone کنید
git clone https://github.com/Kourosh242/iva-personal-finance.git

# ۲. وارد پوشه شوید
cd iva-personal-finance

# ۳. فایل index.html را با مرورگر باز کنید
```

#### روش ۲ — اجرا با سرور محلی (توصیه‌شده)

```bash
# گزینه A — با Node.js
npx serve .

# گزینه B — با پایتون
python3 -m http.server 8080
```

سپس مرورگر را به آدرس `http://localhost:8080` باز کنید.

### شروع استفاده

۱. **اولین اجرا**: صفحه خوش‌آمدگویی ظاهر می‌شود و از شما نام‌تان را می‌پرسد.
۲. **داده‌های نمونه**: IVA به‌طور پیش‌فرض با داده‌های شبیه‌سازی‌شده (۶ ماه تراکنش واقعی) راه‌اندازی می‌شود.
۳. **کاوش آزاد**: می‌توانید داده‌های نمونه را ویرایش کنید یا از تنظیمات گزینه «بازنشانی داده‌های نمونه» را بزنید.

### تنظیمات اولیه

از صفحه **تنظیمات** (آیکون چرخ‌دنده) می‌توانید:

- 🌐 **زبان**: بین فارسی و انگلیسی جابه‌جا شوید
- 🎨 **پوسته**: روشن، تاریک یا سیستمی
- 💰 **واحد پول**: تومان یا ریال
- ✏️ **نام نمایشی**: تغییر نام

### نصب PWA

در مرورگرهای کروم و اج:
۱. دکمه نصب (📱) در نوار آدرس یا در صفحه تنظیمات ظاهر می‌شود
۲. روی آن کلیک کنید تا IVA مثل یک اپ واقعی نصب شود
۳. کاملاً خصوصی است — داده‌ها روی دستگاه شما

---

## 🚀 Getting Started (English)

### Setup & Run

IVA is a web app with no installation required. Two ways to run:

#### Method 1 — Direct (simple)

```bash
# 1. Clone the project
git clone https://github.com/Kourosh242/iva-personal-finance.git

# 2. Enter the folder
cd iva-personal-finance

# 3. Open index.html in your browser
```

#### Method 2 — Local server (recommended)

```bash
# Option A — Node.js
npx serve .

# Option B — Python
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

### First Launch

1. **Welcome screen**: Enter your name when prompted
2. **Sample data**: IVA comes with 6 months of realistic sample data pre-loaded
3. **Explore**: Edit sample data freely or reset it from Settings

### Initial Configuration

From the **Settings** page (gear icon):

- 🌐 **Language**: Toggle between Persian and English
- 🎨 **Theme**: Light, Dark, or System mode
- 💰 **Currency**: Toman or Rial display
- ✏️ **Display name**: Change your name

### PWA Installation

On Chrome and Edge browsers:
1. The install button (📱) appears in the address bar or on Settings page
2. Click it to install IVA like a native app
3. Fully private — your data stays on your device