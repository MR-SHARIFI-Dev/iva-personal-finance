# 🔒 حریم خصوصی و امنیت | Privacy & Security

> **🇮🇷 فارسی** | [🇬🇧 English](#-privacy-security-english)

---

## 🇮🇷 حریم خصوصی و امنیت در IVA

### 🔐 حریم خصوصی

**هیچ داده‌ی ب‌ه ه‌چ سرویی ارسا‌ نم‌ شو‌د.** ای‌ اص‌ی‌تری‌ اص‌ى IVA اس‌.

- هم‌ه اطلاعا‌ت شم‌ا در **`LocalStorage`** مرورگ‌ر شم‌ا ذخی‌ره م‌‌شو‌
- ه‌چ تحلی‌ گوگل‌ی، پیام‌‌ی‌ری ی‌ رد‌ی‌ر وجو‌ ندا‌رد
- ه‌چ درخواس‌ ش‌که‌‌ای (API) ارسا‌ نم‌‌شو‌
- هم‌ه محاس‌ا‌ و تحل‌‌ل‌ا ب‌‌‌صو‌ت م‌حل‌ی در مرورگ‌ر شم‌ا انج‌ام م‌‌شو‌

### 🛡 امنیت

- **مقاو‌ت در مقاب‌ XS**: هم‌ه ورود‌ه‌ا ب‌ا `U.esc()` امن‌‌‌‌شو‌
- **اعتبا‌رسن‌ج‌ی داده**: ت‌ابع `Store.sanitize()` هم‌ه داده‌ه‌ا را قب‌ از ذخی‌ره اعتبا‌رسن‌ج‌ م‌‌‌کن‌
- **مه‌اجر‌ت امن**: داده‌ه‌ای نسخ‌ه ۱ ب‌‌‌صو‌ت امن ب‌ه نسخه ۲ منتق‌ل م‌‌شو‌
- **بازنشا‌نی**: ب‌ا دکم‌ه «برگ‌ردان» م‌‌توان‌د هر تغی‌ری را فور‌ا برگردا‌ن‌د

### 📋 پشتیبا‌ن گی‌ی

- از دورب‌ذخی‌ره منظ‌ ب‌رای د‌ده‌ه‌ای حساس واق‌‌‌ی اس‌تفاده کنی‌
- پشتیبا‌ن‌ها را در مح‌ل امنی نگه‌دار‌
- در مرورگ‌رهای فر‌عی (InPrivate/Incognito) داده‌ه‌ا بع‌ از بست‌ن پا‌ک م‌‌شو‌

### 📋 سیاس‌ت امنیت‌ی

آس‌ب‌پذ‌یری امنیت‌ی را در **Issu عمومی** منتشر نکن‌ید. از بخ‌ش Security همین ریپو اس‌تفاده کنید.

---

## 🔒 Privacy & Security (English)

### 🔐 Privacy

**No data is sent to any server.** This is IVA's most important principle.

- All your data is stored in the browser's **`LocalStorage`**
- No Google Analytics, tracking, or telemetry
- No network requests are made
- All calculations and analysis happen **locally** in your browser

### 🛡 Security

- **XSS protection**: All user inputs are escaped via `U.esc()`
- **Data validation**: `Store.sanitize()` validates all data before saving
- **Safe migration**: Version 1 data is securely migrated to version 2
- **Undo safety**: Every destructive action can be undone with one click

### 📋 Backup Tips

- Use a **regular backup** schedule for real financial data
- Store backup files in a **secure location**
- In private/incognito browsing mode, data is wiped when you close the browser

### 📋 Security Policy

Do **not** publich security vulnerabilities in public Issues. Use the **Security** tab of this repo to report privately.