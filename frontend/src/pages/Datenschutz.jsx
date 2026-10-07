import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  MapPin, 
  FileText, 
  UserCheck, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight,
  Store
} from 'lucide-react';

export const Datenschutz = () => {
  const { t, direction, language } = useLanguage();
  const { settings, getStoreName } = useStoreSettings();

  const storeName = getStoreName(language) || 'Hajar Supermarkt';
  const address = settings?.address || 'Koppreitergasse 8, 1120 Wien, Österreich';
  const phone = settings?.phone || '0681 20800852';
  const email = settings?.email || 'info@hajar-supermarkt.at';

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 transition-colors duration-200 font-sans ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-gray-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={storeName}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-xl bg-slate-50 dark:bg-gray-850 p-1 border border-slate-200 dark:border-gray-750 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block leading-tight truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                {storeName}
              </span>
              <span className="text-[10px] sm:text-[11px] text-brand-600 dark:text-brand-400 font-semibold block truncate">
                {language === 'ar' ? 'سوبرماركت وتوصيل منزلي' : 'Supermarkt & Lieferservice'}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <ThemeToggle />
            <LanguageSelector />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-750 text-xs font-bold transition touch-manipulation"
            >
              {direction === 'rtl' ? <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span className="hidden xs:inline">{t('backToHome')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-6 sm:py-14 space-y-6 sm:space-y-8">
        
        {/* Title */}
        <div className="text-center space-y-2.5 sm:space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200/60 dark:border-brand-800 text-brand-700 dark:text-brand-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{language === 'ar' ? 'الامتثال للائحة الأوروبية العامة لحماية البيانات (DSGVO)' : 'DSGVO & TKG 2021 Konform (Österreich)'}</span>
          </div>
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('datenschutz')}
          </h1>
          <p className="text-body-muted max-w-2xl mx-auto leading-relaxed">
            {language === 'ar'
              ? 'نولي حماية بياناتكم الشخصية أهمية بالغة. نوضح هنا كيفية جمع ومعالجة بياناتكم وفقاً للائحة العامة لحماية البيانات (GDPR/DSGVO) والقوانين النمساوية.'
              : 'Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir verarbeiten Ihre Daten ausschließlich auf Grundlage der gesetzlichen Bestimmungen (DSGVO, TKG 2021, DSG).'}
          </p>
        </div>

        {language === 'ar' ? (
          /* Arabic Privacy Policy */
          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            
            {/* 1. Controller */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>1. الجهة المسؤولة عن معالجة البيانات</span>
              </h2>
              <p>المسؤول عن معالجة البيانات على هذا الموقع وفقاً للمادة 4 الفقرة 7 من اللائحة العامة لحماية البيانات (DSGVO):</p>
              <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-1 font-mono text-xs">
                <p><strong>المنشأة:</strong> {storeName} (HAJAR Alasiri Casa)</p>
                <p><strong>العنوان:</strong> {address}</p>
                <p><strong>الهاتف:</strong> {phone}</p>
                <p><strong>البريد الإلكتروني:</strong> {email}</p>
              </div>
            </div>

            {/* 2. Server Logs */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>2. ملفات تسجيل الخادم (Server-Logfiles)</span>
              </h2>
              <p>
                عند زيارتكم لموقعنا، يقوم الخادم تلقائياً بجمع وتخزين معلومات يرسلها متصفحكم في ملفات السجل الفنية لضمان أمان واستقرار النظام، وتتضمن: نوع وإصدار المتصفح، نظام التشغيل، عنوان IP للجهاز الزائر (يُخزَّن لفترة قصيرة لأغراض أمن النظام ومكافحة إساءة الاستخدام)، وقت وتاريخ الزيارة، والصفحات المطلوبة.
              </p>
              <p className="text-xs text-slate-500">الأساس القانوني: المادة 6 الفقرة 1 البند (f) من DSGVO (المصلحة المشروعة في تشغيل الموقع بأمان).</p>
              {/* Only while the backend sends error reports (SENTRY_DSN set, README §4.8). */}
              {settings?.errorTracking && (
                <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-1.5 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">تقارير الأخطاء (Sentry)</p>
                  <p>
                    عند حدوث خطأ تقني على خادمنا، يرسل الخادم تقريراً عن الخطأ إلى خدمة Sentry (شركة Functional Software, Inc.، الولايات المتحدة) لنتمكن من إصلاحه بسرعة. تُخزَّن البيانات داخل الاتحاد الأوروبي (فرانكفورت). يحتوي التقرير على معلومات تقنية فقط: رسالة الخطأ، وموضعه في شيفرة البرنامج، ووقت حدوثه، ونوع الطلب ومساره (مثل GET /api/orders). لا يحتوي على عناوين IP أو ملفات تعريف الارتباط أو البيانات المُدخلة في النماذج، ويتم إخفاء عناوين البريد الإلكتروني وأرقام الهواتف قبل الإرسال.
                  </p>
                  <p className="text-slate-500">الأساس القانوني: المادة 6 الفقرة 1 البند (f) من DSGVO (المصلحة المشروعة في متجر آمن يعمل بشكل سليم). أبرمنا مع Sentry اتفاقية معالجة بيانات وفقاً للمادة 28 من DSGVO.</p>
                </div>
              )}
            </div>

            {/* 3. Customer Accounts & Home Delivery */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-promo-600 dark:text-promo-400" />
                <span>3. بيانات حسابات العملاء وخدمة التوصيل المنزلي</span>
              </h2>
              <p>
                بالنسبة للعملاء المسجلين للحصول على خدمة التوصيل إلى المنازل، نقوم بمعالجة بيانات العميل (الاسم الكامل، البريد الإلكتروني، رقم الهاتف، عنوان التوصيل السكني بالتفصيل، وملاحظات التسليم لسائق التوصيل وسجلات الطلبات).
              </p>
              <p>
                تُستخدم هذه البيانات حصراً لتوصيل الطلبات إلى منازلكم وتأكيد الهوية عبر رموز التحقق (OTP) وتجهيز الطلبات. يتم الاحتفاظ بسجلات الطلبات والبيانات المحاسبية لمدة 7 سنوات التزاماً بالقوانين الضريبية والمالية النمساوية (§ 132 BAO).
              </p>
              <p className="text-xs text-slate-500">الأساس القانوني: المادة 6 الفقرة 1 البندين (b) و (c) من DSGVO.</p>
            </div>

            {/* 4. Local Storage */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                <span>4. ملفات تعريف الارتباط والتخزين المحلي (Local Storage)</span>
              </h2>
              <p>
                لا نستخدم أي ملفات تعريف ارتباط لتتبع الإعلانات أو التجسس على المستخدمين. نستخدم تقنية التخزين المحلي الضرورية فقط لحفظ تفضيلاتك:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>حفظ لغة العرض المفضلة (العربية أو الألمانية).</li>
                <li>حفظ المظهر المفضل (الوضع الداكن أو الفاتح).</li>
                <li>رمز الجلسة الآمن الخاص بتسجيل دخول التجار لحماية حساباتهم.</li>
              </ul>
            </div>

            {/* 5. Google Maps & Reviews */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-danger-600 dark:text-danger-400" />
                <span>5. الخدمات الخارجية والاستضافة ومعالجو البيانات</span>
              </h2>
              <p>
                يستخدم موقعنا خدمة خرائط Google Maps المقدمة من Google Ireland Limited لتسهيل تحديد موقع المتجر وإيجاد مسار الوصول. عند التفاعل مع الخريطة، قد تقوم Google بمعالجة عنوان IP الخاص بك وفقاً لسياسة خصوصية Google.
              </p>
              <p>
                يتم جلب تقييمات العملاء الموثقة عبر خادمنا بصورة آمنة دون إرسال بيانات متصفحي الموقع الشخصية لجهات خارجية.
              </p>
              <p className="text-xs text-slate-500">الأساس القانوني: المادة 6 الفقرة 1 البند (f) من DSGVO (المصلحة المشروعة في تقديم موقع جذاب وتسهيل الوصول لمقرنا).</p>

              <div className="pt-3 space-y-3 border-t border-slate-200/70 dark:border-gray-800">
                <p className="pt-1">
                  <strong className="text-slate-900 dark:text-white">الاستضافة وقاعدة البيانات:</strong> يتم تشغيل التطبيق وقاعدة بيانات العملاء لدى Supabase (شركة Supabase, Inc.) في مركز بيانات داخل الاتحاد الأوروبي (منطقة فرانكفورت). ولأن الشركة الأم مقرها الولايات المتحدة، فقد تحدث في حالات الدعم الفني عملية نقل للبيانات إلى دولة خارج الاتحاد الأوروبي استناداً إلى البنود التعاقدية النموذجية للاتحاد الأوروبي. ويوجد لدينا مع المزوّد اتفاقية معالجة بيانات وفقاً للمادة 28 من DSGVO. كما أن بياناتكم الشخصية (الاسم، بيانات التواصل، عنوان التوصيل) مخزّنة هناك مشفّرة على مستوى الحقول.
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">التحقق من الهاتف (SMS):</strong> لتأكيد رقم هاتفكم عبر رمز لمرة واحدة (OTP) يتم إرسال رقمكم إلى مزوّد خدمة الرسائل النصية seven communications GmbH &amp; Co. KG (seven.io)، ألمانيا، كمعالج للبيانات (المادة 28 من DSGVO). تتم المعالجة داخل الاتحاد الأوروبي ولا يحدث أي نقل إلى دولة خارج الاتحاد الأوروبي. الأساس القانوني: المادة 6 الفقرة 1 البند (b) من DSGVO (تنفيذ العقد أو تدابير ما قبل التعاقد).
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">إرسال البريد الإلكتروني:</strong> لإرسال تأكيدات الطلبات ورموز التحقق نستعين بمزوّد خدمة بريد إلكتروني كمعالج للبيانات (المادة 28 من DSGVO) تُرسل إليه البيانات اللازمة لذلك (البريد الإلكتروني، الاسم، بيانات الطلب).
                </p>
              </div>
            </div>

            {/* 6. User Rights */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>6. حقوقك القانونية بموجب اللائحة العامة لحماية البيانات</span>
              </h2>
              <p>يحق لك في أي وقت ممارسة الحقوق التالية مجاناً بمجرد مراسلتنا:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>حق الوصول والاستعلام (المادة 15):</strong> معرفة ما إذا كانت بياناتك تُعالج والحصول على نسخة منها.</li>
                <li><strong>حق التصحيح (المادة 16):</strong> تصحيح البيانات غير الدقيقة أو استكمالها.</li>
                <li><strong>حق الحذف (المادة 17):</strong> المطالبة بمسح بياناتك متى لم تعد هناك ضرورة قانونية للاحتفاظ بها.</li>
                <li><strong>حق تقييد المعالجة (المادة 18) وحق نقل البيانات (المادة 20).</strong></li>
                <li><strong>حق الاعتراض (المادة 21):</strong> الاعتراض على معالجة البيانات القائمة على المصلحة المشروعة.</li>
              </ul>
            </div>

            {/* 7. Supervisory Authority Austria */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>7. حق تقديم شكوى إلى الهيئة الرقابية في النمسا</span>
              </h2>
              <p>
                إذا كنت تعتقد أن معالجة بياناتك تنتهك قانون حماية البيانات، يحق لك تقديم شكوى إلى الهيئة المختصة في النمسا:
              </p>
              <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-1 text-xs">
                <p className="font-bold text-slate-900 dark:text-white">الهيئة النمساوية لحماية البيانات (Österreichische Datenschutzbehörde - DSB)</p>
                <p>العنوان: Barichgasse 40-42, 1030 Wien</p>
                <p>الهاتف: +43 1 52 152-0</p>
                <p>البريد الإلكتروني: <a href="mailto:dsb@dsb.gv.at" className="text-brand-600 underline">dsb@dsb.gv.at</a></p>
                <p>الموقع: <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">www.dsb.gv.at</a></p>
              </div>
            </div>

          </div>
        ) : (
          /* German Privacy Policy */
          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            
            {/* 1. Verantwortlicher */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>1. Verantwortlicher für die Datenverarbeitung</span>
              </h2>
              <p>Verantwortlicher im Sinne von Art. 4 Z 7 DSGVO für diese Website ist:</p>
              <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-1 font-mono text-xs">
                <p><strong>Unternehmen:</strong> {storeName} (HAJAR Alasiri Casa)</p>
                <p><strong>Standort:</strong> {address}</p>
                <p><strong>Telefon:</strong> {phone}</p>
                <p><strong>E-Mail:</strong> {email}</p>
              </div>
            </div>

            {/* 2. Server Logfiles */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>2. Erhebung von Zugriffsdaten und Server-Logfiles</span>
              </h2>
              <p>
                Beim Aufrufen unserer Website werden durch den auf Ihrem Endgerät zum Einsatz kommenden Browser automatisch Informationen an den Server unserer Website gesendet. Diese Informationen werden temporär in sogenannten Server-Logfiles gespeichert:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Browsertyp und Browserversion</li>
                <li>Verwendetes Betriebssystem</li>
                <li>Referrer URL (die zuvor besuchte Seite)</li>
                <li>IP-Adresse des zugreifenden Geräts (zur Gewährleistung der Systemsicherheit und zur Missbrauchsabwehr kurzfristig gespeichert)</li>
                <li>Uhrzeit und Datum der Serveranfrage</li>
              </ul>
              <p className="text-xs text-slate-500">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der technischen Stabilität und Sicherheit unseres Webauftritts).</p>
              {/* Only while the backend sends error reports (SENTRY_DSN set, README §4.8). */}
              {settings?.errorTracking && (
                <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-1.5 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">Fehlerberichte (Sentry)</p>
                  <p>
                    Tritt auf unserem Server ein technischer Fehler auf, sendet der Server einen Fehlerbericht an den Dienst Sentry (Functional Software, Inc., USA), damit wir den Fehler schnell beheben können. Die Daten werden in der EU (Frankfurt am Main) gespeichert. Ein Bericht enthält nur technische Angaben: die Fehlermeldung, die betroffene Stelle im Programmcode, den Zeitpunkt sowie Art und Pfad der Anfrage (z. B. „GET /api/orders“). Er enthält keine IP-Adressen, Cookies oder Formulareingaben; E-Mail-Adressen und Telefonnummern werden vor dem Versand unkenntlich gemacht.
                  </p>
                  <p className="text-slate-500">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und funktionierenden Shop). Mit Sentry besteht ein Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO).</p>
                </div>
              )}
            </div>

            {/* 3. Kundenkonto & Hauszustellung */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-promo-600 dark:text-promo-400" />
                <span>3. Kundenkonto, Verifizierung & Hauszustellung</span>
              </h2>
              <p>
                Wenn Sie sich als Privatkunde für unseren Lieferservice registrieren oder Bestellungen aufgeben, erheben wir Ihre Kontaktdaten (Vollständiger Name, E-Mail-Adresse, Telefonnummer, genaue Lieferadresse samt Stockwerk/Türnummer sowie Hinweise für den Fahrer).
              </p>
              <p>
                Die Verarbeitung dieser Daten ist erforderlich, um Ihre Identität per SMS-/E-Mail-Code (OTP) zu verifizieren und Ihre Bestellung zuverlässig an Ihre Haustür zu liefern. Rechnungen und steuerrelevante Geschäftsunterlagen werden gemäß § 132 BAO für die gesetzliche Frist von 7 Jahren aufbewahrt.
              </p>
              <p className="text-xs text-slate-500">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung nach österreichischem Steuerrecht).</p>
            </div>

            {/* 4. Local Storage / Cookies */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                <span>4. Lokale Speicherung (Local Storage)</span>
              </h2>
              <p>
                Unsere Website verzichtet auf zustimmungspflichtige Marketing- und Werbe-Cookies. Wir setzen lediglich funktionale lokale Speicherungen (Local Storage) Ihres Browsers ein, um Ihre Nutzerpräferenzen zu sichern:
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Gewählte Spracheinstellung (Deutsch / Arabisch)</li>
                <li>Gewähltes Design (Hell- / Dunkelmodus)</li>
                <li>Verschlüsselter Authentifizierungs-Token für angemeldete Kunden</li>
              </ul>
              <p className="text-xs text-slate-500">Rechtsgrundlage: § 165 Abs. 3 TKG 2021 iVm Art. 6 Abs. 1 lit. f DSGVO (technisch notwendige Funktionen).</p>
            </div>

            {/* 5. Google Maps & Google Reviews */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-danger-600 dark:text-danger-400" />
                <span>5. Externe Dienste, Hosting & Auftragsverarbeiter</span>
              </h2>
              <p>
                Diese Website nutzt Google Maps zur visuellen Darstellung von Kartenmaterial und unseres Firmenstandorts. Dienstanbieter ist die Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.
              </p>
              <p>
                Bei der Nutzung von Google Maps können Informationen über die Benutzung dieser Website einschließlich Ihrer IP-Adresse an einen Server von Google übertragen werden. Weitere Informationen finden Sie in der Datenschutzerklärung von Google: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">https://policies.google.com/privacy</a>.
              </p>
              <p>
                Die auf der Seite dargestellten Google-Bewertungen werden über ein geschütztes Backend synchronisiert. Es findet keine Übermittlung persönlicher Trackingdaten unserer Websitebesucher an Dritte statt.
              </p>
              <p className="text-xs text-slate-500">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer ansprechenden Darstellung unseres Standorts und leichter Auffindbarkeit).</p>

              <div className="pt-3 space-y-3 border-t border-slate-200/70 dark:border-gray-800">
                <p className="pt-1">
                  <strong className="text-slate-900 dark:text-white">Hosting & Datenbank:</strong> Unsere Anwendung und die Kundendatenbank werden bei Supabase (Supabase, Inc.) in einem Rechenzentrum innerhalb der EU (Region Frankfurt) betrieben. Da die Muttergesellschaft ihren Sitz in den USA hat, kann im Supportfall eine Übermittlung in ein Drittland auf Grundlage der EU-Standardvertragsklauseln erfolgen. Mit dem Anbieter besteht ein Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO. Ihre personenbezogenen Daten (Name, Kontaktdaten, Lieferadresse) sind dort zusätzlich feldweise verschlüsselt gespeichert.
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Telefon-Verifizierung (SMS):</strong> Zur Bestätigung Ihrer Telefonnummer per Einmalcode (OTP) wird Ihre Nummer an unseren SMS-Dienstleister seven communications GmbH &amp; Co. KG (seven.io), Deutschland, als Auftragsverarbeiter (Art. 28 DSGVO) übermittelt. Die Verarbeitung erfolgt innerhalb der EU; eine Übermittlung in ein Drittland findet nicht statt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw. vorvertragliche Maßnahmen).
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">E-Mail-Versand:</strong> Für Bestellbestätigungen und Verifizierungscodes setzen wir einen E-Mail-Dienstleister als Auftragsverarbeiter (Art. 28 DSGVO) ein, an den die hierfür erforderlichen Daten (E-Mail-Adresse, Name, Bestelldaten) übermittelt werden.
                </p>
              </div>
            </div>

            {/* 6. Rechte der betroffenen Person */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>6. Ihre Rechte laut DSGVO</span>
              </h2>
              <p>Sie haben gegenüber uns bezüglich der Sie betreffenden personenbezogenen Daten folgende Rechte:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Recht auf Auskunft (Art. 15 DSGVO)</strong> über Ihre bei uns gespeicherten Daten.</li>
                <li><strong>Recht auf Berichtigung (Art. 16 DSGVO)</strong> unrichtiger oder unvollständiger Daten.</li>
                <li><strong>Recht auf Löschung (Art. 17 DSGVO)</strong>, sofern keine gesetzlichen Aufbewahrungsfristen entgegenstehen.</li>
                <li><strong>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</strong>.</li>
                <li><strong>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</strong> in einem gängigen Format.</li>
                <li><strong>Widerspruchsrecht (Art. 21 DSGVO)</strong> gegen die Verarbeitung aus Gründen Ihrer besonderen Situation.</li>
              </ul>
              <p className="pt-1">Zur Geltendmachung Ihrer Rechte wenden Sie sich bitte einfach per E-Mail an uns: <a href={`mailto:${email}`} className="text-brand-600 underline">{email}</a>.</p>
            </div>

            {/* 7. Aufsichtsbehörde Österreich */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-sm space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>7. Beschwerderecht bei der Aufsichtsbehörde</span>
              </h2>
              <p>
                Sollten Sie der Ansicht sein, dass die Verarbeitung Ihrer Daten gegen das Datenschutzrecht verstößt, steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde in Österreich zu:
              </p>
              <div className="p-3 bg-slate-50 dark:bg-gray-850 rounded-xl space-y-1 text-xs">
                <p className="font-bold text-slate-900 dark:text-white">Österreichische Datenschutzbehörde (DSB)</p>
                <p>Barichgasse 40-42, 1030 Wien</p>
                <p>Telefon: +43 1 52 152-0</p>
                <p>E-Mail: <a href="mailto:dsb@dsb.gv.at" className="text-brand-600 underline">dsb@dsb.gv.at</a></p>
                <p>Website: <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">www.dsb.gv.at</a></p>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-slate-200/80 dark:border-gray-850 py-8 text-center text-xs text-slate-500 dark:text-gray-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} {storeName}. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'Alle Rechte vorbehalten.'}</span>
          <div className="flex items-center gap-4">
            <Link to="/impressum" className="hover:text-brand-600 underline underline-offset-2">{t('impressum')}</Link>
            <Link to="/agb" className="hover:text-brand-600 underline underline-offset-2">{t('agb')}</Link>
            <Link to="/" className="hover:text-brand-600">{t('backToHome')}</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Datenschutz;
