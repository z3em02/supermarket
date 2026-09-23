import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import {
  Scale,
  FileText,
  ShoppingCart,
  Truck,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Gavel,
  ArrowLeft,
  ArrowRight,
  Store
} from 'lucide-react';

export const AGB = () => {
  const { t, direction, language } = useLanguage();
  const { settings, getStoreName } = useStoreSettings();

  const storeName = getStoreName(language) || 'Hajar Supermarkt';
  const address = settings?.address || 'Koppreitergasse 8, 1120 Wien, Österreich';
  const phone = settings?.phone || '0681 20800852';
  const email = settings?.email || 'info@hajar-supermarkt.at';

  const minOrderValue = Number(settings?.minOrderValue) || 0;
  const deliveryFee = Number(settings?.deliveryFee) || 0;
  const deliveryFeePerKm = Number(settings?.deliveryFeePerKm) || 0;
  const freeDeliveryThreshold = Number(settings?.freeDeliveryThreshold) || 0;
  const maxDeliveryDistanceKm = Number(settings?.maxDeliveryDistanceKm) || 0;
  const allowedPostalCodes = (settings?.allowedPostalCodes && settings.allowedPostalCodes !== 'null')
    ? settings.allowedPostalCodes
    : '';
  const isKleinunternehmer = settings?.isKleinunternehmer !== false;
  const vatId = (settings?.vatId && settings.vatId !== 'null') ? settings.vatId : null;

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 transition-colors duration-200 font-sans ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-gray-800 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 h-14 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={storeName}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-xl bg-slate-50 dark:bg-gray-850 p-1 border border-slate-200 dark:border-gray-750 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block leading-tight truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                {storeName}
              </span>
              <span className="text-[10px] sm:text-[11px] text-blue-600 dark:text-blue-400 font-semibold block truncate">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <Gavel className="w-3.5 h-3.5 shrink-0" />
            <span>{language === 'ar' ? 'وفقاً لقانون حماية المستهلك النمساوي (KSchG, FAGG)' : 'Gemäß KSchG & FAGG (Österreich)'}</span>
          </div>
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('agb')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {language === 'ar'
              ? 'الشروط التالية تنطبق على جميع الطلبات التي يقدمها المستهلكون عبر متجرنا الإلكتروني لخدمة التوصيل المنزلي في النمسا.'
              : 'Die nachfolgenden Bedingungen gelten für alle Bestellungen von Verbrauchern über unseren Online-Shop mit Hauszustellung in Österreich.'}
          </p>
        </div>

        {language === 'ar' ? (
          /* ===================== Arabic AGB ===================== */
          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">

            {/* 1. Scope */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>1. نطاق السريان</span>
              </h2>
              <p>
                تنطبق هذه الشروط والأحكام العامة على جميع عقود الشراء التي يبرمها المستهلكون (وفقاً لتعريف قانون حماية المستهلك النمساوي KSchG) مع {storeName} عبر المتجر الإلكتروني، والمخصصة حصرياً للتوصيل المنزلي ضمن جمهورية النمسا.
              </p>
            </div>

            {/* 2. Contract Partner */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>2. الطرف المتعاقد</span>
              </h2>
              <p>
                طرف العقد هو {storeName} (HAJAR Alasiri Casa)، {address}. لمزيد من البيانات القانونية والتواصل، يرجى مراجعة <Link to="/impressum" className="text-blue-600 underline">بيانات النشر (Impressum)</Link>.
              </p>
            </div>

            {/* 3. Contract Formation */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>3. إبرام العقد</span>
              </h2>
              <p>
                يشكل عرض المنتجات في المتجر الإلكتروني دعوة لتقديم عرض شراء وليس عرضاً ملزماً. بإتمام عملية الطلب والضغط على زر "تأكيد الطلب"، يقدم العميل عرضاً ملزماً لشراء المنتجات المختارة.
              </p>
              <p>
                يُبرم العقد فعلياً عند قبول الطلب من قبلنا، ويتم ذلك عبر إرسال رسالة تأكيد الطلب بالبريد الإلكتروني أو عبر عرض حالة "مقبول" في حساب العميل. نحتفظ بالحق في رفض الطلبات، على سبيل المثال في حال نفاد المخزون أو وقوع الخطأ في عرض الأسعار.
              </p>
            </div>

            {/* 4. Prices & Payment */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>4. الأسعار وشروط الدفع</span>
              </h2>
              <p>
                جميع الأسعار المعروضة هي أسعار إجمالية نهائية. {isKleinunternehmer
                  ? 'بصفتنا منشأة صغيرة وفقاً للمادة § 6 Abs. 1 Z 27 UStG، لا يتم عرض أو تحصيل ضريبة القيمة المضافة بشكل منفصل.'
                  : `تشمل جميع الأسعار ضريبة القيمة المضافة القانونية. رقم ضريبة القيمة المضافة (UID): ${vatId || '[يُرجى الإكمال]'}.`}
              </p>
              <p>
                يتم الدفع حصراً عند تسليم الطلب إلى باب المنزل، نقداً أو بالبطاقة حسب توفر ذلك لدى مندوب التوصيل. لا يُطلب أي دفع مسبق أو بيانات بطاقة دفع عبر الموقع الإلكتروني.
              </p>
            </div>

            {/* 5. Minimum Order & Delivery Area */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>5. الحد الأدنى للطلب ومنطقة التوصيل</span>
              </h2>
              {minOrderValue > 0 && (
                <p>الحد الأدنى الحالي لقيمة الطلب هو <strong>€{minOrderValue.toFixed(2)}</strong>.</p>
              )}
              {allowedPostalCodes && (
                <p>نقوم حالياً بالتوصيل حصراً إلى الرموز البريدية التالية: <strong>{allowedPostalCodes}</strong>.</p>
              )}
              {maxDeliveryDistanceKm > 0 && (
                <p>أقصى مسافة توصيل من مقر المتجر هي <strong>{maxDeliveryDistanceKm} كم</strong>. لا يمكن تنفيذ الطلبات خارج هذا النطاق.</p>
              )}
              <p className="text-xs text-slate-500">
                يتم عرض القيم الفعلية والمحدثة (الحد الأدنى، منطقة التوصيل، رسوم التوصيل) بشكل تلقائي عند إتمام الطلب في سلة التسوق.
              </p>
            </div>

            {/* 6. Delivery Fee */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>6. رسوم التوصيل</span>
              </h2>
              <p>
                تتكون رسوم التوصيل من رسم أساسي ثابت{deliveryFee > 0 ? ` بقيمة €${deliveryFee.toFixed(2)}` : ''}{deliveryFeePerKm > 0 ? ` بالإضافة إلى رسم إضافي قدره €${deliveryFeePerKm.toFixed(2)} لكل كيلومتر من مسافة التوصيل الفعلية بين المتجر وعنوانكم` : ''}.
              </p>
              {freeDeliveryThreshold > 0 && (
                <p>يتم التوصيل مجاناً للطلبات التي تبلغ قيمتها €{freeDeliveryThreshold.toFixed(2)} أو أكثر.</p>
              )}
              <p className="text-xs text-slate-500">
                يتم عرض إجمالي رسوم التوصيل الدقيقة لعنوانكم قبل تأكيد الطلب مباشرة.
              </p>
            </div>

            {/* 7. Right of Withdrawal */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>7. حق الرجوع عن الشراء (Widerrufsrecht)</span>
              </h2>
              <p>
                يحق للمستهلكين بشكل عام الرجوع عن العقد خلال 14 يوماً دون إبداء أسباب، وفقاً لقانون العقود عن بُعد وخارج المحل التجاري (FAGG).
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-850 rounded-xl">
                <p className="font-bold text-amber-900 dark:text-amber-300 mb-1">استثناء هام للمواد الغذائية سريعة التلف:</p>
                <p className="text-xs">
                  وفقاً للمادة § 18 Abs. 1 Z 4 FAGG، لا يسري حق الرجوع على العقود الخاصة بتوريد سلع سريعة التلف أو التي ينتهي تاريخ صلاحيتها بسرعة (مثل الخضروات والفواكه الطازجة، منتجات الألبان، اللحوم، المخبوزات الطازجة). ونظراً لأن غالبية منتجاتنا من هذا النوع، فلا يمكن الرجوع عن شراء هذه الأصناف بعد استلامها.
                </p>
              </div>
              <p className="text-xs">
                بالنسبة للسلع الجافة طويلة الصلاحية والمعبأة أصلياً (مثل المعلبات، الأرز، المكسرات، المشروبات المعبأة)، يسري حق الرجوع القانوني، ما لم تُفتح العبوة الأصلية لأسباب صحية أو تتعلق بالنظافة بعد التسليم وتصبح غير صالحة للإرجاع (§ 18 Abs. 1 Z 5 FAGG).
              </p>
              <p>
                لممارسة حق الرجوع، يرجى إبلاغنا بقرار واضح (عبر البريد الإلكتروني <a href={`mailto:${email}`} className="text-blue-600 underline">{email}</a> أو الهاتف <a href={`tel:${phone}`} className="text-blue-600 underline">{phone}</a>) خلال المهلة المذكورة. في حال الرجوع الصحيح، سنقوم برد جميع المبالغ المستلمة خلال 14 يوماً كحد أقصى.
              </p>
            </div>

            {/* 8. Warranty */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>8. الضمان القانوني (Gewährleistung)</span>
              </h2>
              <p>
                نلتزم بأحكام الضمان القانوني وفقاً للقانون المدني العام النمساوي (ABGB). في حال استلام منتجات تالفة أو غير مطابقة أو منتهية الصلاحية عند التسليم، يرجى إبلاغ مندوب التوصيل فوراً أو التواصل معنا خلال أقصر وقت ممكن عبر بيانات الاتصال أعلاه، مع إرفاق صورة للمنتج إن أمكن، لتسهيل معالجة الشكوى واستبدال المنتج أو استرداد قيمته.
              </p>
            </div>

            {/* 9. Liability */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>9. المسؤولية</span>
              </h2>
              <p>
                نتحمل المسؤولية دون قيود عن الأضرار الناتجة عن التعمد أو الإهمال الجسيم، وكذلك عن الإصابات الجسدية أو الصحية أو الحياة. أما في حالات الإهمال البسيط، فتقتصر مسؤوليتنا على الأضرار المتوقعة والنموذجية للعقد. تبقى أحكام قانون مسؤولية المنتج (Produkthaftungsgesetz) دون تأثر بهذا البند.
              </p>
            </div>

            {/* 10. Data Protection */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>10. حماية البيانات</span>
              </h2>
              <p>
                لمعرفة كيفية جمع ومعالجة بياناتكم الشخصية، يرجى مراجعة <Link to="/datenschutz" className="text-blue-600 underline">سياسة الخصوصية</Link> الخاصة بنا.
              </p>
            </div>

            {/* 11. Dispute Resolution */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>11. تسوية النزاعات عبر الإنترنت</span>
              </h2>
              <p>
                يمكن للمستهلكين تقديم شكوى عبر منصة تسوية النزاعات الإلكترونية التابعة للاتحاد الأوروبي: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://ec.europa.eu/consumers/odr</a>. يمكنكم أيضاً التواصل معنا مباشرة عبر البريد الإلكتروني المذكور أعلاه.
              </p>
            </div>

            {/* 12. Final Provisions */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span>12. أحكام ختامية</span>
              </h2>
              <p>
                يسري القانون النمساوي على هذا العقد، دون الإخلال بالأحكام الإلزامية لحماية المستهلك في بلد إقامة العميل. في حال بطلان أحد بنود هذه الشروط، يبقى سريان باقي البنود دون تأثر.
              </p>
            </div>

          </div>
        ) : (
          /* ===================== German AGB ===================== */
          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">

            {/* 1. Geltungsbereich */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>1. Geltungsbereich</span>
              </h2>
              <p>
                Diese Allgemeinen Geschäftsbedingungen gelten für alle Kaufverträge, die Verbraucher (im Sinne des österreichischen Konsumentenschutzgesetzes, KSchG) mit {storeName} über unseren Online-Shop abschließen. Unser Angebot richtet sich ausschließlich an die Hauszustellung innerhalb Österreichs.
              </p>
            </div>

            {/* 2. Vertragspartner */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>2. Vertragspartner</span>
              </h2>
              <p>
                Vertragspartner ist {storeName} (HAJAR Alasiri Casa), {address}. Alle weiteren rechtlichen Angaben und Kontaktmöglichkeiten finden Sie in unserem <Link to="/impressum" className="text-blue-600 underline">Impressum</Link>.
              </p>
            </div>

            {/* 3. Vertragsabschluss */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>3. Vertragsabschluss</span>
              </h2>
              <p>
                Die Darstellung der Produkte in unserem Online-Shop stellt kein bindendes Angebot unsererseits dar, sondern eine Aufforderung zur Bestellung (invitatio ad offerendum). Mit Abschluss des Bestellvorgangs und Klick auf "Bestellung aufgeben" geben Sie ein verbindliches Angebot zum Kauf der ausgewählten Waren ab.
              </p>
              <p>
                Der Kaufvertrag kommt erst durch unsere Annahme zustande, die durch Übersendung einer Bestellbestätigung per E-Mail bzw. durch Anzeige des Status "Angenommen" in Ihrem Kundenkonto erfolgt. Wir behalten uns vor, Bestellungen abzulehnen, etwa bei Nichtverfügbarkeit der Ware oder offensichtlichen Preis- bzw. Eingabefehlern.
              </p>
            </div>

            {/* 4. Preise & Zahlung */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>4. Preise und Zahlungsbedingungen</span>
              </h2>
              <p>
                Alle angegebenen Preise sind Endpreise. {isKleinunternehmer
                  ? 'Als Kleinunternehmer gemäß § 6 Abs. 1 Z 27 UStG weisen wir keine Umsatzsteuer gesondert aus.'
                  : `Alle Preise enthalten die gesetzliche Umsatzsteuer. UID-Nummer: ${vatId || '[BITTE ERGÄNZEN]'}.`}
              </p>
              <p>
                Die Zahlung erfolgt ausschließlich bei Zustellung an der Haustür, wahlweise bar oder mit Karte (soweit vom Zusteller unterstützt). Eine Vorauszahlung oder Eingabe von Zahlungsdaten über die Website ist nicht erforderlich und nicht vorgesehen.
              </p>
            </div>

            {/* 5. Mindestbestellwert & Liefergebiet */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>5. Mindestbestellwert und Liefergebiet</span>
              </h2>
              {minOrderValue > 0 && (
                <p>Der aktuelle Mindestbestellwert beträgt <strong>€{minOrderValue.toFixed(2)}</strong>.</p>
              )}
              {allowedPostalCodes && (
                <p>Wir liefern derzeit ausschließlich an folgende Postleitzahlen: <strong>{allowedPostalCodes}</strong>.</p>
              )}
              {maxDeliveryDistanceKm > 0 && (
                <p>Die maximale Lieferdistanz ab unserem Standort beträgt <strong>{maxDeliveryDistanceKm} km</strong>. Bestellungen außerhalb dieses Bereichs können nicht ausgeführt werden.</p>
              )}
              <p className="text-xs text-slate-500">
                Die jeweils aktuellen Werte (Mindestbestellwert, Liefergebiet, Liefergebühr) werden automatisch beim Checkout im Warenkorb angezeigt.
              </p>
            </div>

            {/* 6. Liefergebühr */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>6. Liefergebühr</span>
              </h2>
              <p>
                Die Liefergebühr setzt sich aus einer fixen Grundgebühr{deliveryFee > 0 ? ` von €${deliveryFee.toFixed(2)}` : ''}{deliveryFeePerKm > 0 ? ` zuzüglich €${deliveryFeePerKm.toFixed(2)} pro Kilometer der tatsächlichen Fahrtstrecke zwischen unserem Geschäft und Ihrer Lieferadresse` : ''} zusammen.
              </p>
              {freeDeliveryThreshold > 0 && (
                <p>Ab einem Bestellwert von €{freeDeliveryThreshold.toFixed(2)} liefern wir kostenlos.</p>
              )}
              <p className="text-xs text-slate-500">
                Die exakte Liefergebühr für Ihre Adresse wird vor der verbindlichen Bestellung angezeigt.
              </p>
            </div>

            {/* 7. Widerrufsrecht */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>7. Widerrufsrecht</span>
              </h2>
              <p>
                Verbrauchern steht grundsätzlich ein Widerrufsrecht binnen 14 Tagen ohne Angabe von Gründen zu, gemäß dem Fern- und Auswärtsgeschäfte-Gesetz (FAGG). Die Widerrufsfrist beträgt 14 Tage ab dem Tag, an dem Sie bzw. ein von Ihnen benannter Dritter die Ware in Besitz genommen hat.
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-850 rounded-xl">
                <p className="font-bold text-amber-900 dark:text-amber-300 mb-1">Wichtige Ausnahme für schnell verderbliche Lebensmittel:</p>
                <p className="text-xs">
                  Gemäß § 18 Abs. 1 Z 4 FAGG besteht KEIN Widerrufsrecht bei Verträgen über die Lieferung von Waren, die schnell verderben können oder deren Verfallsdatum schnell überschritten würde (z. B. frisches Obst und Gemüse, Milchprodukte, Fleisch- und Wurstwaren, frische Backwaren). Da unser Sortiment überwiegend aus solchen Frischeprodukten besteht, ist ein Widerruf für diese Artikel nach Erhalt der Ware ausgeschlossen.
                </p>
              </div>
              <p className="text-xs">
                Für länger haltbare, originalverpackte Trockenwaren (z. B. Konserven, Reis, Nüsse, Getränke in Originalverpackung) besteht das gesetzliche Widerrufsrecht, sofern die Verpackung nicht aus Gründen des Gesundheitsschutzes oder der Hygiene nach der Lieferung geöffnet wurde und dadurch nicht mehr zur Rücksendung geeignet ist (§ 18 Abs. 1 Z 5 FAGG).
              </p>
              <p>
                Um Ihr Widerrufsrecht auszuüben, informieren Sie uns bitte mittels einer eindeutigen Erklärung (z. B. per E-Mail an <a href={`mailto:${email}`} className="text-blue-600 underline">{email}</a> oder telefonisch unter <a href={`tel:${phone}`} className="text-blue-600 underline">{phone}</a>) über Ihren Entschluss, innerhalb der Frist. Im Falle eines wirksamen Widerrufs erstatten wir alle erhaltenen Zahlungen unverzüglich, spätestens binnen 14 Tagen.
              </p>
            </div>

            {/* 8. Gewährleistung */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>8. Gewährleistung</span>
              </h2>
              <p>
                Es gelten die gesetzlichen Gewährleistungsbestimmungen des Allgemeinen Bürgerlichen Gesetzbuches (ABGB). Sollten Sie bei Zustellung beschädigte, mangelhafte oder abgelaufene Waren erhalten, bitten wir Sie, dies umgehend dem Zusteller zu melden oder uns ehestmöglich über die oben genannten Kontaktdaten zu kontaktieren — nach Möglichkeit mit einem Foto des betroffenen Produkts —, damit wir den Vorgang rasch bearbeiten und für Ersatz oder Rückerstattung sorgen können.
              </p>
            </div>

            {/* 9. Haftung */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>9. Haftung</span>
              </h2>
              <p>
                Wir haften unbeschränkt für Schäden aus Vorsatz oder grober Fahrlässigkeit sowie für Personenschäden (Verletzung von Leben, Körper oder Gesundheit). Bei leichter Fahrlässigkeit haften wir nur für den vertragstypisch vorhersehbaren Schaden. Die Bestimmungen des Produkthaftungsgesetzes bleiben von dieser Regelung unberührt.
              </p>
            </div>

            {/* 10. Datenschutz */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>10. Datenschutz</span>
              </h2>
              <p>
                Informationen zur Erhebung und Verarbeitung Ihrer personenbezogenen Daten finden Sie in unserer <Link to="/datenschutz" className="text-blue-600 underline">Datenschutzerklärung</Link>.
              </p>
            </div>

            {/* 11. Streitbeilegung */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>11. Online-Streitbeilegung</span>
              </h2>
              <p>
                Verbraucher haben die Möglichkeit, Beschwerden an die Online-Streitbeilegungsplattform der EU zu richten: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://ec.europa.eu/consumers/odr</a>. Sie können Ihre Beschwerde auch direkt an unsere oben genannte E-Mail-Adresse richten.
              </p>
            </div>

            {/* 12. Schlussbestimmungen */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Gavel className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span>12. Schlussbestimmungen</span>
              </h2>
              <p>
                Es gilt österreichisches Recht, unbeschadet zwingender verbraucherschutzrechtlicher Bestimmungen am gewöhnlichen Aufenthaltsort des Kunden. Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt.
              </p>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-slate-200/80 dark:border-gray-850 py-8 text-center text-xs text-slate-500 dark:text-gray-400">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} {storeName}. {language === 'ar' ? 'جميع الحقوق محفوظة.' : 'Alle Rechte vorbehalten.'}</span>
          <div className="flex items-center gap-4">
            <Link to="/impressum" className="hover:text-blue-600 underline underline-offset-2">{t('impressum')}</Link>
            <Link to="/datenschutz" className="hover:text-blue-600 underline underline-offset-2">{t('datenschutz')}</Link>
            <Link to="/" className="hover:text-blue-600">{t('backToHome')}</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default AGB;
