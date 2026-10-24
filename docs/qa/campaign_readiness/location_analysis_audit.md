# ممیزی مستقل تحلیل مکانی

تاریخ: 2026-10-24. مبنای محلی بررسی: `2933fbc0353c4b55a1f6e0919b12dc707dc7b3c2`؛ این شناسه با merge commit پروداکشن یکی نیست. نتیجهٔ این سند به‌تنهایی تأیید استقرار نیست.

## روش و شواهد

164 فایل موجود در `docs/` پیش از نگارش خوانده شدند. کد مسیر `queryPoint → residentialMaterial → catchmentAllocationOperands → residentialFromEvidence → competitionForSnapshot → collectCompetition → recommendationFromScores` و مرزهای PDF و اقتصاد بررسی شد.

| شناسه | اجرا و محیط | نتیجه |
| --- | --- | --- |
| GEO-01 | محلی؛ `node --conditions=react-server --test tests/competition.test.ts tests/catchment-operands.test.ts tests/residential-catchment.test.ts tests/recommendation.test.ts tests/economics.test.ts tests/report-section.test.ts` | 36 تست، 36 موفق، صفر شکست/skip؛ 60.08 ثانیه. شامل تولید واقعی بایت‌های PDF از fixture؛ بدون API واقعی |
| GEO-02 | محلی؛ `.vercel/audit-geo-independent.mjs`، seed=`2401024` | 1,000 بردار تصادفی مرتب؛ 3,000 assertion برای دامنهٔ امتیاز، افزایش جمعیت و افزایش رقبا؛ همه موفق |
| GEO-03 | همان اسکریپت؛ مرزهای 0/39/40/59/60/79/80/100 | 64 ترکیب Demand/Competition مطابق ترتیب قواعد تصمیم؛ موفق |
| GEO-04 | پاسخ شبیه‌سازی‌شدهٔ HTTP200 با `FeatureCollection` خالی | `ready`, score=100, `coverageVerified=true` بازتولید شد؛ محدودیت پوشش مستقل زیر توضیح داده شده است |
| GEO-05 | امتیاز محاسبه‌شده با metadata دارای آرایه‌های provenance خالی | `validateResidentialScore` می‌پذیرد؛ `recommendationFromScores` با `invalid_recommendation_metric` رد می‌کند؛ ناسازگاری مرز اعتبارسنجی بازتولید شد |

GEO-02 و GEO-03 تعداد تست‌های Node نیستند؛ assertion/حالت داده هستند. این زیرکار **صفر اجرای مکانی تازه و صفر فراخوانی خارجی** ایجاد کرده است. نمونه‌های تازه‌ای که تیم ممیزی اجرا کند باید جداگانه در `test_results.md` ثبت شوند. هزینهٔ افزودهٔ این زیرکار صفر است.

## محل‌های تاریخی: بازپخش، نه موفقیت تازه

| محل و مفهوم کسب‌وکار | شواهد تاریخی بررسی‌شده | نتیجه و محدودیت |
| --- | --- | --- |
| The Kiosk، TW1 1RD؛ Coffee Shop | کد اصلاح extent و شرح رخداد؛ شواهد قبلی | مشکل مرز BFC/BFE توضیح فنی سازگار دارد؛ امتیاز بازیابی‌شدهٔ 47 ادعای بررسی پیشین است، نه اجرای مستقل جدید این سند. Competition جمع‌آوری‌نشده را نباید صفر دانست |
| Trindle Stores، TW9 3PZ؛ Restaurant | همان مسیر بازیابی | مقدار Demand30 مربوط به بازخوانی قبلی است؛ تازگی و تکمیل خودکار مسیر اثبات نمی‌شود |
| Odeon، SW15 1SN؛ Coffee Shop | شواهد و قرارداد اصلاح native partition | Demand47 بازخوانی قبلی؛ Competition قبلاً جمع‌آوری نشده. این نمونه موفقیت کامل دو امتیاز نیست |
| Riverside Studios، W6 9BN؛ Coffee Shop | فایل محلی خصوصی `.vercel/coverage-final-readback.json` | رکورد پیشین Demand52، Competition33، counts3/21/37 و یک Ready edition دارد. ابتدا در ذخیره در 7/8 شکست خورده و با finalisation اپراتوری به نسخه2 رسیده است؛ **موفقیت بدون دخالت از ابتدا تا انتها روی نسخه نهایی نیست** |

منبع ثبت‌شدهٔ این جدول، رسیدهای اجرای قبلی است. آدرس، موجودیت تجاری و وضعیت فعلی معاملهٔ این چهار ملک در این زیرکار با منبع مستقل تازه تأیید نشدند؛ آنها را به‌عنوان نمونهٔ آزمایش تاریخی به‌کار می‌بریم.

## صحت و محدودیت‌های هندسی

واقعیت کد: جمعیت با سهم مساحت تقاطع OA تخصیص می‌یابد؛ جمعیت داخل مسیر واقعاً شمرده نشده است. دادهٔ Census2021، ورودی مکانی و نسخه‌های frozen حفظ می‌شوند. `queryPoint` تنها در identity matched از نقطهٔ qualified building استفاده می‌کند؛ در غیر این صورت ممکن است مرکز کدپستی مبنا باشد. بنابراین مسیر پیاده و امتیاز برای ورودی تقریبی، اندازه‌گیری ورودی واقعی مغازه نیست.

اصلاح v4 جمع مساحت OA را با union مستقل native مقایسه می‌کند، نه ساحل region با tessellation متفاوت. نوار 0.001m فقط برای تشخیص gap است؛ allocation یا polygon ارائه‌دهنده buffer نمی‌شود. حد منطقه‌ای و نبود سلول همچنان می‌تواند امتیاز را partial کند. تست‌های موجود این قرارداد را می‌پوشانند؛ ممیزی مستقل سراسری کیفیت فایل کامل لندن انجام نشده است.

محدودیت 100 ring، 10,000 position و 102,400 UTF-8 byte پیش از Places بررسی می‌شود؛ کد فرض geometry ID معتبر ندارد و oversized را unavailable می‌کند. هر POI محلی داخل polygon آزموده می‌شود؛ بیرون‌بودن حتی یک رکورد scoring را متوقف می‌کند. این رفتار محافظه‌کارانه است و می‌تواند availability را کاهش دهد، ولی صفر مصنوعی نمی‌سازد.

## یافته‌های جدید و سطح اطمینان

**GEO-F01 — Medium، پوشش provider به‌طور مستقل اثبات نشده است.** برای cafe/restaurant/hairdresser، پاسخ خالی و کاملِ معتبر به‌تنهایی `coverageVerified=true` می‌سازد. `collectCompetition` نشانگر مستقل usable provider coverage دریافت نمی‌کند. GEO-04 ثابت می‌کند پاسخ خالیِ ناشی از نبود پوشش و پاسخ خالیِ صحیح از دید این تابع یکسان‌اند. فرمول100 برای صفر مصوب است و نباید تغییر کند؛ مشکل در eligibility صفر است. این اثبات نمی‌کند Geoapify در محل واقعی پاسخ غلط داده است. حداقل اقدام: قرارداد و شواهد پوشش قابل اتکا برای دسته/منطقه را مشخص و آزمون کنید؛ عبارت «هیچ رقیبی وجود ندارد» همچنان ممنوع بماند. برای beauty، نبود match معتبر صریحاً score را unavailable نگه می‌دارد.

**GEO-F02 — Medium، ناسازگاری قرارداد provenance.** `validateResidentialScore` آرایه‌های خالی evidence/snapshot/release/retrievedAt را قبول می‌کند، ولی Recommendation حداقل یک evidenceId می‌خواهد. GEO-05 این شکاف را اثبات می‌کند. مسیر عادی `residentialFromEvidence` این آرایه‌ها را پر می‌کند؛ دسترسی کاربر به تولید این حالت در پروداکشن اثبات نشده است. پیشنهاد کوچک: هم‌راستاسازی اعتبارسنج‌ها و تست ترکیبی؛ نه تغییر امتیاز یا بازنویسی Ready.

**GEO-GAP01 — High acceptance gap، اثبات اجرای تازه بدون finalisation دستی.** تست pure مربوط به `earlyReportSection` حذف metadata تصمیم را می‌پوشاند، اما به‌تنهایی receipt، ساخت evidence، SQL persistence و read rendering را در یک اجرای تازه نمی‌آزماید. W6 شاهد نتیجهٔ بازیابی‌شده است. این شکاف با موفقیت 36 تست بسته نمی‌شود؛ نتیجهٔ اجرای تازهٔ مستقل تیم باید ملاک باشد.

## نتیجهٔ مکانی

محاسبات deterministic و مرزهای شناخته‌شده در تست‌های محلی سازگارند. ادعای «تمام نقاط قابل اتکا هستند» از این شواهد حاصل نمی‌شود. availability وابسته به لندن، geometry قابل ارسال، پوشش taxonomy، completeness و provider budget است. محدودهٔ عرضه و متن خروجی باید همین محدودیت‌ها را حفظ کنند؛ Missing را نباید با صفر یا امتیاز favorable جایگزین کرد.
