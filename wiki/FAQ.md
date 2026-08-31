# ❓ سوالات متداول | FAQ

> **🇮🇷 فارسی** | [🇬🇧 English](#-faq-english)

---

## 🇮🇷 سوالات متداول

### ❔ عمومی

#### IVA مخفف چیست؟
IVA مخفف «حسابدار هوشمند» است و در انگلیسی به معنی «I Value Assets» نیز هست. نام فارسی آن **«آیوا»** است.

#### آیا IVA رایگان است؟
بله! IVA کاملاً رایگان و متن‌باز تحت مجوز MIT است.

#### آیا برای استفاده به اینترنت نیاز دارم؟
بله. همه داده‌ها و محاسبات روی دستگاه شما انجام می‌شود و هیچ چیزی به سروری ارسال نمی‌گردد.

#### آیا IVA روی موبایل کار می‌کند؟
بله! IVA طراحی واکنش‌گرا دارد و روی دسکتاپ، تبلت و موبایل به خوبی کار می‌کند. می‌توانید آن را مثل یک اپ واقعی نصب کنید (PWA).

---

### ❔ داده‌ها

#### داده‌های من کجا ذخیره می‌شود؟
داده‌ها در `LocalStorage` مرورگر شما ذخیره می‌شوند و هیچ‌وقت به سرور فرستاده نمی‌شوند.

#### اگر LocalStorage پاک شود چه می‌شود؟
داده‌ها از دست می‌روند. توصیه می‌کنیم هر از گاهی از صفحه تنظیمات یک **پشتیبان JSON** بگیرید.

#### چگونه پشتیبان بگیرم؟
وارد **تنظیمات** شوید، بخش **داده‌ها** → **دانلود پشتیبان JSON** را بزنید. برای بازیابی از گزینه **بازیابی از پشتیبان** استفاده کنید.

#### آیا می‌توانم داده‌های نمونه را حذف کنم؟
بله. در **تنظیمات** → **داده‌ها** گزینه **بازنشانی داده‌های نمونه** را بزنید. البته می‌توانید با Undo آن را برگردانید.

---

### ❔ ویژگی‌ها

#### چگونه تراکنش جدید ثبت کنم؟
دکمه **«تراکنش جدید»** را در بالای صفحات یا دکمه شناور + (در موبایل) بزنید.

#### چگونه یک تراکنش را ویرایش یا حذف کنم؟
روی دکمه **مداد** (ویرایش) یا **سطل زباله** (حذف) کنار هر تراکنش کلیک کنید. بعد از حذف، دکمه **برگردان** برای بازگردانی فوری دارید.

#### چگونه یک حساب را حذف کنم و تراکنش‌هایش چه می‌شود؟
اگر حساب تراکنش داشته باشد، IVA به شما اخطار می‌دهد و با تأیید شما، هم حساب و هم تمام تراکنش‌های مرتبط حذف می‌شوند.

#### چگونه واحد پول را تغییر دهم؟
به **تنظیمات** → **ظاهر** → **واحد پول** بروید و بین تومان و ریال انتخاب کنید. توجه: مبالغ همیشه بر مبنای تومان ذخیره می‌شوند و در حالت ریال ضربدر ۱۰ نمایش داده می‌شوند.

#### آیا تقویم شمسی است؟
بله! IVA از تقویم شمسی (هجری شمسی) با استفاده از API داخلی مرورگر استفاده می‌کند. بدون هیچ کتابخانه اضافه‌ای.

---

### ❔ فنی

#### چه مرورگرهایی پشتیبانی می‌شوند؟
کروم، فایرفاکس، اج و سافاری (نسخه‌های جدید). برای PWA از کروم یا اج استفاده کنید.

#### آیا فریم‌ورک یا وابستگی خارجی دارد؟
خیر! IVA فقط با HTML، CSS و JavaScript خالص ساخته شده است. هیچ فریم‌ورک، کتابخانه خارجی یا Build Step ندارد.

#### فونت وزیرمتن چیست؟
وزیرمتن یک فونت متغیر فارسی با مجوز OFL است که درون پروژه جاسازی شده. برای نمایش زیبای متن فارسی در سراسر اپلیکیشن استفاده می‌شود.

#### چگونه می‌توانم مشارکت کنم؟
[راهنمای مشارکت](https://github.com/Kourosh242/iva-personal-finance/blob/main/CONTRIBUTING.md) را بخوانید و Pull Request ارسال کنید.

---

## ❓ FAQ (English)

### ❔ General

#### What does IVA stand for?
IVA is Persian for "Smart Accountant" and also suggests "I Value Assets." The Persian name is **آیوا** (pronounced "I-va").

#### Is IVA free?
Yes! IVA is completely free and open-source under the MIT license.

#### Do I need internet to use it?
Yes. All data and calculations happen on your device; nothing is uploaded anywhere.

#### Does IVA work on mobile?
Yes! IVA is fully responsive and works on desktop, tablet, and mobile. You can also install it as a PWA.

---

### ❔ Data

#### Where is my data stored?
In your browser's `LocalStorage`. It is never sent to any server.

#### What if LocalStorage is cleared?
Your data would be lost. We recommend taking a **JSON backup** regularly from Settings.

#### How do I backup?
Go to **Settings** → **Data** → **Download JSON backup**. To restore, use **Restore from backup**.

#### Can I remove sample data?
Yes. In **Settings** → **Data** → **Reset** will restore original sample data. You can Undo it.

---

### ❔ Features

#### How do I add a transaction?
Click **"New transaction"** or the FAB + button (mobile).

#### How do I edit or delete a transaction?
Click the **pencil** (edit) or **trash** (delete) button next to any transaction. After deletion, **Undo** is available.

#### How do I delete an account with transactions?
IVA warns you about linked transactions. On confirmation, both the account and its transactions are deleted.

#### How do I change currency?
Go to **Settings** → **Appearance** → **Currency** and choose Toman or Rial. Note: amounts are always stored in Toman; Rial mode multiplies display by 10.

#### Is the calendar Jalali (Persian)?
Yes! IVA uses the built-in `Intl.DateTimeFormat` API for the Jalali calendar with zero additional libraries.

---

### ❔ Technical

#### Which browsers are supported?
Chrome, Firefox, Edge, and Safari (modern versions). Use Chrome or Edge for PWA.

#### Any frameworks or dependencies?
None! IVA is built with pure HTML, CSS, and vanilla JavaScript. No frameworks, libraries, or build steps.

#### What is Vazirmatn font?
Vazirmatn is a variable Persian font (OFL license) embedded in the project for beautiful Persian text rendering.

#### How can I contribute?
Read the [Contributing Guide](https://github.com/Kourosh242/iva-personal-finance/blob/main/CONTRIBUTING.md) and submit a Pull Request.