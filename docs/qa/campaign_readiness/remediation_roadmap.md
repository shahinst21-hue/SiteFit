# نقشهٔ اصلاحات اولویت‌دار

هدف: رسیدن به یک آزمایش محدود بازار با معیار خروج روشن؛ نه بازطراحی یا مرحلهٔ توسعهٔ تازه. این ممیزی هیچ اصلاحی را merge/deploy نمی‌کند.

## پیش از ترافیک پولی

| اولویت | کار حداقلی | معیار خروج قابل بررسی | پیچیدگی / ریسک |
| --- | --- | --- | --- |
|1 | محیط writable واقعاً جدا و fail-closed برای هدف Production | QA-01 سبز؛ missing/preview/development هرگز Production را برای generation نپذیرد؛ کلیدها فقط امن | کوچک تا متوسط؛ خطر اتصال اشتباه، نیاز به تست clients |
|1a | تطبیق schema محیط Development با Preview فعلی | اختلاف زندهٔ98/107 بررسی و قراردادهای Competition/coverage/recovery لازم حاضر شوند؛ بازبینی هر migration قبل از اعمال | متوسط؛ نیاز به مجوز migration جدا، نه replay کورکورانهٔ9فایل |
|2 | پایان‌دادن امن به منبع اختیاریِ دیررس | fault fixture کامل generator→SQL با unavailable معتبر و بدون dispatch مجدد؛ Ready مستقل از منبع اختیاری | متوسط؛ accounting/cancellation نباید تضعیف شود |
|3 | eligibility صفر رقبا بر اساس پوشش معتبر | QA-02 سبز؛ empty-success از insufficient-coverage تفکیک شود؛ فرمول100 دست‌نخورده | کوچک تا متوسط؛ تعریف پوشش نیازمند شاهد provider است |
|4 | fresh normal-path acceptance روی نسخهٔ فعلی | حداقل دو محل واقعی متنوع در محیط جدا؛ ordinaryReady و receipt settlement بدون اپراتور؛ یک salon در حد بودجه اگر ممکن شد | تست محدود، بدون livecharge؛ سقف کل£5 حفظ شود |
|5 | paid delivery/PDF فعلی در Sandbox و مسیر غیرمالک | پرداخت موفق فقط همان entitlement؛ failure/cancel هیچ دسترسی؛ PDF valid+readable؛ repeated notification بدون duplicate | تست integration، نه خرید واقعی |
|6 | تصمیم رسمی فعال‌سازی عمومی پس از معیارهای بالا | سیاست برنامه و DB هماهنگ؛ ادعای no-account با رفتار غیرمالک سازگار | تغییر Production نیازمند مجوز جدا؛ در این ممیزی ممنوع |
|7 | وضعیت Google policy | indicator فنی/نتیجه پرونده روشن و serving مجاز؛ کمپین هنوز Paused تا تصمیم شروع | مانع خارجی؛ نه حذف کتابخانه یا تغییر حدسی سایت |

QA-01/02 در `tests/qa/campaign-readiness.test.ts` عمداً شکست فعلی را ثبت می‌کنند؛ expectation را عوض نکنید تا عدد سبز ساخته شود. GEO-F02 هم‌راستایی provenance را با همان اصلاح کوچک validators ببندید؛ Ready تاریخی بازنویسی نشود.

`UI-07` نیز اصلاح کوچک قبل از عرضه است: در Competition evidence تعداد شناسهٔ snapshot نباید جای completeness سه بازه بنشیند. یک fixture دارای یک snapshot و سه جمعیت معتبر باید متن «available for all three walking bands» بدهد؛ حالت ناقص همچنان صریح بماند. نیازی به تغییر فرمول یا طراحی نیست.

## پیش از افزایش مقیاس

- دو worker مستقل با همان nonce و simulated counting provider: یک intent/هزینه و یک report؛ تست SQL چندجلسه‌ای واقعی، نه فقط embedded sequential.
- نمایش و هشدار serverReady/failure/age/held budget مستقل از dashboardview؛ تطبیق درآمدDB/Stripe با purchaseهای consentedGA4.
- exactUTM کمپین با allowlist و یکPrimaryPurchase بررسی شود؛ این کار نیاز به بهینه‌سازی گسترده ندارد.
- ظرفیتVercel و رشدDB در baseline محدود اندازه‌گیری؛ 0% infrastructure error یا288cron success معادل کیفیت گزارش نیست.

## پس از نخستین آزمایش محدود مشتری

- نمونه‌برداری کیفیت از چند گزارش واقعی و بازخورد «چه تصمیمی را تغییر داد»؛ missing مهم پیش از خرید روشن باشد.
- بررسی دوره‌ای taxonomy/coverage و freshness، به‌خصوص beauty و مکان‌های مرزی.
- reconciliation routine با receipt و هشدار intervention؛ auto retry برای ambiguous spend ممنوع بماند.

## فعلاً عمداً تغییر نکند

فرمول‌ها/آستانه‌های مصوب، قالب برند، معماری رضایت پذیرفته‌شده، immutabilityReady، RLS، مسیرStripeverified و spendinggovernor. DebugView دوباره باز نشود. ارتقایVercel، تعویضZoho، ابزار پولی تازه، اسکن عمومی حاوی اطلاعات مشتری یا appeal حدسی جزو این نقشه نیست.
