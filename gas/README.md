# إعداد قاعدة البيانات (Google Sheets + Apps Script) والخادم (Netlify)

التطبيق يعمل بدون هذا الإعداد (البيانات تبقى على الجهاز). هذه الخطوات تفعّل:
تسجيل الدخول للمساعدين والأطباء، مزامنة الفحوصات، ومساهمات الأطباء في Google Sheets.

## ١. Google Sheets + Apps Script
1. أنشئ Google Sheet جديد باسم مثل: `Body Care Data`.
2. من القائمة: **Extensions → Apps Script**.
3. احذف المحتوى الموجود والصق محتوى الملف `gas/Code.gs` بالكامل، ثم احفظ.
4. من الأعلى اختر الدالة **`setup`** واضغط **Run** ← وافق على الصلاحيات.
   - ستُنشأ الأوراق: `Users` و `Records` و `Contributions`.
   - افتح **Execution log** وانسخ قيمة `GAS_API_KEY`.
5. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone** (وليس "Anyone with Google account")
6. انسخ رابط الـ **Web app** الذي ينتهي بـ `/exec`.

> بعد أي تعديل على `Code.gs`: **Deploy → Manage deployments → Edit → New version → Deploy** (الرابط لا يتغير).

## ٢. كلمة مرور المدير (على جهازك فقط)
```bash
node scripts/admin-hash.mjs "كلمة-مرور-قوية-للمدير"
```
ينتج ٣ قيم: `SETTINGS_ADMIN_PASSWORD_HASH` و `SETTINGS_ADMIN_PASSWORD_SALT` و `SETTINGS_ADMIN_PEPPER`.

## ٣. متغيرات Netlify
Netlify → المشروع → **Project configuration → Environment variables**:

| المتغير | القيمة |
|---|---|
| `SETTINGS_SESSION_SECRET` | سلسلة عشوائية طويلة — ولّدها بالأمر: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `APPS_SCRIPT_URL` | رابط `/exec` من الخطوة ١ |
| `GAS_API_KEY` | المفتاح من سجل `setup` |
| `SETTINGS_ADMIN_PASSWORD_HASH` / `_SALT` / `SETTINGS_ADMIN_PEPPER` | من الخطوة ٢ |
| `NETLIFY_ACCESS_TOKEN` + `NETLIFY_SITE_ID` | اختياري: ليتمكن المدير من تحديث رابط Apps Script من لوحة الإدارة |

ثم أعد النشر: `npx netlify-cli deploy --prod --dir dist` (أو Deploys → Trigger deploy).

## ٤. التحقق
- افتح `/#/admin` وادخل بكلمة مرور المدير ← يجب أن تظهر كل النقاط باللون الأخضر.
- سجّل حساب طبيب من صفحة الحساب ← يظهر في لوحة الإدارة بحالة "بانتظار التوثيق" ← اضغط **توثيق**.
- رابط الأطباء المباشر: `https://iad-caregiver-tool.netlify.app/#/doctor`

## ما الذي يُحفظ؟
- **Records**: فحوصات المساعدين — رمز المريض فقط (بدون أسماء)، الفئة العمرية، الجنس، الجزء، الملاحظات، الشدة، الألم، درجة الإلحاح، والتغير عن الفحص السابق.
- **Contributions**: مساهمات الأطباء (تأكيد / تعديل / إضافة / تعليق) مع حالة المراجعة — تُصدَّر من لوحة الإدارة بصيغة JSON أو CSV لبناء النسخة التالية.
- **Users**: المستخدمون (كلمات المرور مخزنة كـ PBKDF2 hash فقط). بيانات المدير **لا** تُخزَّن في Sheets.
