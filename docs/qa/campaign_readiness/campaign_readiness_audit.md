# ممیزی آمادگی کمپین و Measurement

تکمیل مرورگر ممیزی اصلی: در session موجود، Cookie preferences شامل Accept all و Reject all و گزینه‌های granular بود؛ Reject all، refresh و بازکردن دوباره، همهٔ گزینه‌های اختیاری را off نگه داشت. Google script مشاهده نشد و error log جدیدی ثبت نشد. این شاهد fresh-storage banner یا acceptance→GA4 receipt نیست. تصویر: `evidence/privacy-preferences.png`. گزارش W6 در عرض واقعی753px و1280px بررسی شد؛ viewport درخواستی390 اعمال نشد، پس mobile hardware تأیید نشده است. Production فعلی683c7f1 و CI آن موفق است؛ مسیرهای consent/measurement نسبت به baseline تغییر نکرده‌اند.

تاریخ: 2026-10-24؛ مبنا `2933fbc0353c4b55a1f6e0919b12dc707dc7b3c2`. این زیرممیزی code review و اجرای محلی است. تنظیم زندهٔ Google Ads/GA4، دادهٔ دریافت‌شدهٔ جدید در Google، یا فعالیت فعلی کمپین‌ها از کد قابل اثبات نیست. هیچ کمپین، بودجه، tag destination یا Production configuration تغییر نکرد؛ هزینه صفر.

## رفتار اندازه‌گیریِ تأییدشده

`MKT-01` در همان اجرای `SEC-01`، 10 تست measurement runtime/config و یک تست SQL measurement گذشتند؛ این‌ها زیرمجموعهٔ 52 تست گزارش‌شده‌اند، نه 11 تست اضافه.

* `lib/measurement/consent.ts:18`: Basic Mode فقط با رضایت هم‌زمان Analytics و Advertising measurement اجازهٔ بارگذاری shared tag می‌دهد؛ missing/expired/malformed consent پذیرش نیست. انتخاب personalization مستقل می‌ماند. این محدودیت در UI توضیح داده شده است.
* `components/measurement-controls.tsx:34`: نمایش banner از نبود تصمیم معتبر ناشی می‌شود، مستقل از فعال‌بودن measurement؛ خطای خواندن consent نیز banner را نمایش می‌دهد و tracking باز نمی‌شود. UI شامل Accept all، Reject all، Preferences و withdrawal است. رفتار بصری/keyboard واقعی را باید با نتایج browser ممیزی اصلی جمع کرد.
* `lib/measurement/runtime.ts:18–25`: یک loader، config دستی و `send_page_view:false`؛ رویدادها تنها به GA4 مشخص ارسال می‌شوند. جلوگیری از duplicate در remount/refresh با state و sessionStorage انجام می‌شود.
* `lib/measurement/events.ts`: URL واقعی گزارش، نام/آدرس ملک، query دلخواه و referrer خام در payload عمومی قرار نمی‌گیرند؛ مسیرها sanitise می‌شوند.
* `/api/measurement/purchase`: مالک دائمی، consent معتبر، mode/environment، verified payment و Session سروری را کنترل می‌کند. `verifiedCommerce` مبلغ واقعی Stripe را به GBP تبدیل می‌کند. SQL با lock و unique provider key یک dispatch authority می‌دهد؛ transaction ID ثابت `sf_<payment UUID>` است.
* `20261022180000_google_preview_debug.sql`: خرید controlled proof در Production به purchase تبلیغاتی تبدیل نمی‌شود؛ shared-property debug تنها با authorization محدود مجاز است. وجود debug_mode به‌تنهایی isolation نیست.

## یافته‌های تجاری و محدودیت‌ها

| شناسه | شدت/نوع | مشاهده و اثر | اقدام حداقلی |
| --- | --- | --- | --- |
| MKT-02 | High، شرط واقعی لانچ | authority فروش عمومی در `lib/release/policy.ts` false است؛ checkout کنترل‌شده فقط مالک را می‌پذیرد. خرید مالک اثبات funnel مشتری عمومی نیست. | قبل از traffic، activation مجاز و یک مسیر غیرمالک در محیط ایزوله تأیید شود؛ این ممیزی کنترل را باز نمی‌کند. |
| MKT-03 | Medium، محدودیت تأییدشدهٔ اندازه‌گیری | `lib/measurement/client.ts:15` و SQL claim قبل از تحویل Google، at-most-once هستند. بسته‌شدن tab، blocker یا پاسخ گم‌شده پس از claim می‌تواند purchase را کم بشمارد. | GA4 را ledger درآمد تلقی نکنید؛ خرید و delivery را با Stripe/DB reconcile کنید. افزودن ارسال مجدد نامطمئن، اصلاح قابل قبول نیست. |
| MKT-04 | Medium، معنای event | `full_analysis_completed` در `components/report-dashboard/dashboard.tsx:46` هنگام مشاهدهٔ dashboard صادر می‌شود؛ `free_analysis_completed` نیز روی view صادر می‌شود. گزارش آماده ولی بازنشده در این event ثبت نمی‌شود. | برای نرخ واقعی delivery از وضعیت DB استفاده کنید؛ در dashboard کمپین صریحاً completed-and-viewed را از server completion جدا کنید. صرف شمارش eventها سلامت pipeline را نمی‌سنجد. |
| MKT-05 | Medium، شرط پیکربندی | `lib/measurement/attribution.ts:3` فقط `campaign-01/02/03` و مجموعهٔ بستهٔ term/content را نگه می‌دارد؛ نام دلخواه کمپین یا `{keyword}` عموماً حذف می‌شود. | exact Final URL/URL suffix فعلی کمپین با allowlist تطبیق داده شود؛ در نبود دسترسی به حساب، attribution واقعی تأییدنشده است. هیچ تغییر خودکار کمپین انجام نشد. |
| MKT-06 | محدودیت مورد انتظار consent | Analytics-only بدون Advertising measurement هیچ shared Google tag بارگذاری نمی‌کند؛ reject/late consent/cookie loss attribution را کم می‌کند. | نرخ conversion فقط بین consented users تفسیر شود؛ unattributed را خودکار organic ننامید. این تصمیم معماری پذیرفته‌شده را صرفاً برای بهبود شمارش تغییر ندهید. |
| MKT-07 | External blocker، نتیجهٔ تاریخی کاربر | Google Ads همچنان Malicious software / Compromised Site گزارش کرده و پروندهٔ فنی باز است؛ indicator مشخص ارائه نشده است. | همهٔ کمپین‌ها Paused بمانند؛ پاسخ فنی پرونده را دنبال کنید. نتیجهٔ code review یا Safe Browsing به‌تنهایی رفع policy نیست. |

## نسبت شواهد فعلی و قبلی

تست Sandbox، تک purchase در Tag Assistant و تست dedup قبلاً گزارش شده‌اند؛ در این زیرممیزی دوباره پرداخت انجام نشد. DebugView طبق تصمیم مالک nonblocking است و دوباره troubleshoot نشد. هیچ ادعایی مبنی بر اینکه import خرید در Ads، Primary/Every/GBP، absence duplicate Primary یا conversion bidding اکنون با UI حساب بازبینی شده نداریم. این موارد را از اسناد قدیمی «آماده‌سازی» نمی‌توان saved/current فرض کرد.

متن `docs/google-launch-measurement.md` تاریخچهٔ مرحله‌ای دارد و بعضی بندهای قدیمی آن می‌گویند Production measurement هنوز خاموش است یا shared debugging مطلقاً ممنوع است؛ کد جدید مسیر مجاز محدود را دارد. برای تصمیم runtime، تاریخ و شاهد configuration واقعی بر عبارت تاریخی مقدم است؛ لازم نیست تصمیم معماری دوباره باز شود.

## معیار آزمایش محدود تبلیغات

فروش عمومی باید عملاً قابل استفاده باشد؛ یک fresh pipeline فعلی بدون operator recovery به نتیجهٔ معتبر برسد؛ paid report/PDF ایزولهٔ current revision تأیید شود؛ queue و هزینه قابل پایش باشد؛ actual campaign destination/UTM و یک Primary Purchase بدون duplication از حساب خوانده شود؛ Google policy اجازهٔ serving بدهد. تا قبل از این شروط، این زیرممیزی **تبلیغات عمومی را توصیه نمی‌کند**. کیفیت landing و صحت گزارش‌ها در اسناد UX/گزارش اصلی جداگانه ارزیابی می‌شوند؛ کد analytics به‌تنهایی مجوز GO نیست.
