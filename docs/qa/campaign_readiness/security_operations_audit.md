# ممیزی مستقل امنیت، پرداخت و عملیات

تکمیل ممیزی اصلی: [نتایج](test_results.md) خواندن زندهٔ read-only را اضافه کرده است. بودجهٔ مالک $23.39 مؤثر، $0.492003 تسویه، صفر رزرو فعال و $22.897997 باقی‌مانده بود. دیتابیس 378,574,515 بایت و 107 migration محلی/اعمال‌شده هم‌خوان بود. Cron فعال هر پنج دقیقه و 288 اجرای SQL موفق در 24 ساعت مشاهده شد؛ پس «وجود scheduler نامعلوم» در زیرکار به این حد بسته شد، اما دریافت موفق HTTP پس‌زمینه و تحویل کامل از موفقیت SQL اثبات نمی‌شود. هیچ URL یا secret مربوط به runner منتشر نشده است. Production در طول ممیزی به `683c7f1` تغییر کرد؛ فقط headers/CI/smoke/docs تغییر داشت و مسیرهای امنیت/پرداخت بررسی‌شده ثابت بودند. dependency audit تولیدی صفر advisory گزارش کرد؛ این malware certification نیست.

تاریخ: 2026-10-24. بازبینی کد در `2933fbc0353c4b55a1f6e0919b12dc707dc7b3c2`؛ این SHA شاخهٔ محلی است، نه ادعای شناسایی مستقل نسخهٔ مستقر. هیچ تنظیم، داده، پرداخت، migration یا مجوز Production در این زیرممیزی تغییر نکرد. هزینهٔ خارجی: صفر.

## شواهد اجراشده

`SEC-01` — دستور زیر در محیط محلی اجرا شد؛ **52 passed، 0 failed، 0 skipped**، مدت گزارش‌شدهٔ runner حدود 104 ثانیه:

```powershell
node --conditions=react-server --test tests/auth.test.ts tests/purchase-auth.test.ts tests/payment-webhook.test.ts tests/payment-checkout.test.ts tests/payment-reversals.test.ts tests/payment-recovery.test.ts tests/payment-provider-validation.test.ts tests/measurement.test.ts tests/measurement-database.test.ts
```

این 52 تست بخشی از مجموعهٔ موجودند و نباید دوباره به تعداد کل تست‌های suite اضافه شوند. آزمون Stripe از SDK امضای واقعی و اشیای شبیه‌سازی‌شده استفاده می‌کند؛ پرداخت خارجی نیست. آزمون measurement از migration واقعی در PostgreSQL تعبیه‌شدهٔ PGlite استفاده می‌کند؛ رقابت `Promise.all` روی یک موتور تعبیه‌شده، اثبات رقابت چند اتصال مستقل در Production نیست. تست render واقعی React، معادل مرورگر واقعی و تحویل واقعی PDF نیست.

## مرزهای دفاعی تأییدشده در کد و تست

| حوزه | شاهد | نتیجهٔ محدود و قابل دفاع |
| --- | --- | --- |
| احراز هویت | `lib/supabase/server.ts:38` و `tests/auth.test.ts` | سرور `getUser()` را فراخوانی می‌کند؛ callback مختلط، redirect خارجی و خطا fail closed هستند. اعتبار نشست زندهٔ تمام کاربران در این آزمون بررسی نشده است. |
| Checkout | `app/purchase/checkout/route.ts:25` و `tests/payment-checkout.test.ts` | مالکیت Snapshot، هویت دائمی، consent قرارداد و binding سروری کنترل می‌شوند؛ retry همان idempotency key و پارامترهای ثابت را حفظ می‌کند. |
| تأیید پرداخت | `lib/payments/webhook.ts` و `app/api/stripe/webhook/route.ts:17` | امضای raw body، حساب/mode، Price، Session، Intent، metadata، GBP و 2900 pence مستقل از پارامتر success URL اعتبارسنجی می‌شوند. شکست provider/DB retryable است؛ event نامرتبط خرید نمی‌سازد. |
| رویداد دیررس/برگشت وجه | `tests/payment-webhook.test.ts`, `tests/payment-reversals.test.ts` | مشاهدهٔ قدیمی نمی‌تواند reversal جدید را پاک کند؛ revision مانع ثبت مشاهدات stale می‌شود. |
| گزارش و PDF | `lib/report-dashboard/read.ts:15`, `app/reports/[id]/pdf/route.ts:14` | مسیر مشترک verified session + owned paid report وجود دارد؛ PDF ناقص Production رد می‌شود، پاسخ‌ها private/no-store هستند. نفوذ چندحسابی زنده در این زیرممیزی اجرا نشده است. |
| مرز داخلی | `lib/fulfilment/auth.ts:6` | runner به bearer ثابت با مقایسهٔ timing-safe وابسته است؛ نبودن secret fail closed می‌شود. |
| خروجی HTML | جست‌وجوی `dangerouslySetInnerHTML`, `eval`, `new Function`, `innerHTML`, `document.write` در app/components/lib | تنها مورد `dangerouslySetInnerHTML` مشاهده‌شده JSON-LD مقاله با serializer است؛ این جست‌وجو گواه malware-free بودن سایت نیست. |
| ledger تحلیلی | `tests/measurement-database.test.ts` | claims خصوصی، unique fence، عدم تغییر تاریخچه، mode/owner و exclusion خرید کنترل‌شده آزموده شدند. RLS واقعی Production نیازمند شاهد hosted مستقل است. |

هیچ آسیب‌پذیری احراز هویت یا پرداخت با قابلیت بازتولید در این زیرممیزی تأیید نشد. این جمله گواه نبودن هر آسیب‌پذیری نیست؛ penetration test جامع، بررسی log دسترسی میزبان، scanner وابستگی به‌روز و آزمون چندحساب زنده انجام نشده‌اند.

## یافته‌ها و ریسک عملیاتی

### SEC-02 — دروازهٔ فروش عمومی هنوز بسته است: High برای لانچ، کنترل درست برای ایمنی

`lib/release/policy.ts:5–8` مقادیر `productionApproved`, `paidExecutionApproved`, `sourceCollectionApproved` را false نگه می‌دارد. `app/purchase/checkout/route.ts:36` در controlled trial مالک مجاز را الزام می‌کند؛ `lib/proof/trial-policy.ts` تنها ایمیل مالک تأییدشده را می‌پذیرد. حتی تنظیم environment تجاری به‌تنهایی این authority را true نمی‌کند.

این یک bypass یا آسیب‌پذیری نیست. نتیجهٔ تجاری آن این است که موفقیت حساب مالک، تأیید توانایی خرید مشتری جدید نیست. تا activation جداگانه، مجاز و آزمون مسیر یک مشتری غیرمالک در محیط ایزوله انجام نشده، acquisition عمومی قابل پذیرش نیست. این ممیزی دروازه را باز نکرد.

### SEC-03 — وابستگی kick اولیهٔ fulfilment به email flag: ریسک Medium، نه خرابی فعلی اثبات‌شده

در `app/api/stripe/webhook/route.ts:27` اجرای `after(...fulfilOne...)` زیر شرط `SITEFIT_ZOHO_EMAIL_ENABLED==='1'` است. در مقابل، `app/api/internal/fulfilment/route.ts:29` runner مستقل وجود دارد. بنابراین خاموش‌شدن email flag بدون runner زمان‌بندی‌شده می‌تواند پرداخت تأییدشده را بدون شروع فوری گزارش رها کند؛ تغییر flag در این ممیزی انجام نشد و توقف فعلی خرید از این علت اثبات نشده است.

آزمون لازم قبل از عمومی‌سازی: در محیط ایزوله، email خاموش/ناموفق، یک job مجاز و scheduler مشخص؛ تأیید شروع/بازیابی گزارش بدون دخالت دستی. از «مسیر داخلی در کد موجود است» نباید «scheduler در Production فعال و سالم است» نتیجه گرفت. بررسی runtime cron/queue باید در نتایج اصلی ممیزی ثبت شود.

### SEC-04 — بازیابی محافظه‌کارانه ایمن است، اما تحویل بی‌وقفه را تضمین نمی‌کند

`lib/fulfilment/worker.ts:19–25` dispatch مبهم یا invalid را به intervention می‌برد؛ authority غیرفعال به awaiting_authorisation می‌رود. این کار جلوی هزینهٔ تکراری را می‌گیرد ولی برای مشتری paid SLA نیست. آزمون موجود صرفاً عدم بازپردازش خطرناک را ثابت می‌کند؛ زمان پاسخ اپراتور، هشدار queue و ظرفیت روزانه نیازمند شاهد عملیاتی هستند.

## تصمیم امنیتی محدود

از این شواهد دلیلی برای حذف تصادفی کتابخانه‌ها، تغییر RLS، rotation عمومی یا بازنویسی checkout به دست نیامد. مسیر مناسب، حفظ کنترل‌های موجود و تکمیل شاهد hosted مالکیت، scheduler، تحویل و محدودیت‌های واقعی است. نتیجهٔ Google Ads Compromised Site همچنان یک finding سیاستی حل‌نشدهٔ Google است و از این code review نه تأیید و نه رد قطعی می‌شود.
