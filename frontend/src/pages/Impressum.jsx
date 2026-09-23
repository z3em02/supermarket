import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelector } from '../components/LanguageSelector';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight,
  Store, 
  Scale, 
  FileText, 
  Copyright
} from 'lucide-react';

export const Impressum = () => {
  const { t, direction, language } = useLanguage();
  const { settings, getStoreName } = useStoreSettings();

  const storeName = getStoreName(language) || 'Hajar Supermarkt';
  const address = settings?.address || 'Koppreitergasse 8, 1120 Wien, Österreich';
  const phone = settings?.phone || '0681 20800852';
  const email = settings?.email || 'info@hajar-supermarkt.at';

  const legalOwnerName = (settings?.legalOwnerName && settings.legalOwnerName !== 'null') ? settings.legalOwnerName : null;
  const gisaNumber = (settings?.gisaNumber && settings.gisaNumber !== 'null') ? settings.gisaNumber : null;
  const isKleinunternehmer = settings?.isKleinunternehmer !== false;
  const vatId = (settings?.vatId && settings.vatId !== 'null') ? settings.vatId : null;
  const businessPurposeDe = settings?.businessPurposeDe || 'Groß- und Einzelhandel mit Lebensmitteln und orientalischen Spezialitäten';
  const businessPurposeAr = settings?.businessPurposeAr || 'تجارة الجملة والتجزئة للمواد الغذائية والمنتجات الاستهلاكية';

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5 shrink-0" />
            <span>{language === 'ar' ? 'الإشعار القانوني وحقوق النشر (النمسا)' : 'Rechtliche Hinweise & Impressum (Österreich)'}</span>
          </div>
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('impressum')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {language === 'ar' 
              ? 'معلومات قانونية وفقاً لقانون التجارة الإلكترونية النمساوي (§ 5 ECG) وقانون الشركات وقانون الإعلام'
              : 'Informationspflicht laut § 5 E-Commerce Gesetz (ECG), § 14 Unternehmensgesetzbuch (UGB) und § 25 Mediengesetz (MedienG)'}
          </p>
        </div>

        {language === 'ar' ? (
          /* Arabic Content */
          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            
            {/* Box 1: Store & Operator */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>بيانات صاحب النشاط والمسؤول عن النشر</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">اسم المنشأة التجارية:</span>
                  <span>{storeName} (HAJAR Alasiri Casa)</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">المالك / الشخص المسؤول:</span>
                  {legalOwnerName ? (
                    <span>{legalOwnerName}</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">[يُرجى الإكمال – الاسم القانوني الكامل]</span>
                  )}
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">طبيعة النشاط:</span>
                  <span>{businessPurposeAr}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">العنوان والمقر:</span>
                  <span>{address}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">البلد:</span>
                  <span>جمهورية النمسا (Österreich)</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">رقم GISA / رخصة العمل:</span>
                  {gisaNumber ? (
                    <span>{gisaNumber}</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">[يُرجى الإكمال]</span>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">ضريبة القيمة المضافة:</span>
                  {isKleinunternehmer ? (
                    <span>منشأة صغيرة وفقاً للمادة § 6 Abs. 1 Z 27 UStG – لا يتم عرض ضريبة القيمة المضافة.</span>
                  ) : (
                    <span>رقم ضريبة القيمة المضافة (UID): {vatId || '[يُرجى الإكمال]'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Box 2: Contact Details */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>بيانات التواصل المباشر</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">الهاتف:</span>
                  <a href={`tel:${phone}`} className="text-blue-600 hover:underline">{phone}</a>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">البريد الإلكتروني:</span>
                  <a href={`mailto:${email}`} className="text-blue-600 hover:underline">{email}</a>
                </div>
              </div>
            </div>

            {/* Box 3: Chamber & Authority */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>الغرفة التجارية والهيئة الرقابية المختصة</span>
              </h2>
              <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm">
                <li><strong>عضوية الغرفة التجارية:</strong> الغرفة الاقتصادية لفيينا (Wirtschaftskammer Wien - WKO) - شعبة تجارة الأغذية.</li>
                <li><strong>الهيئة الرقابية والتنظيمية:</strong> دائرة بلدية الحي الثاني عشر بفيينا (Magistratisches Bezirksamt für den 12. Bezirk).</li>
                <li><strong>القوانين المهنية المعمول بها:</strong> نظام التجارة النمساوي (Gewerbeordnung 1994 - GewO) وقانون التجارة الإلكترونية (ECG)، متاح عبر بوابة القوانين الاتحادية (<a href="https://www.ris.bka.gv.at" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">www.ris.bka.gv.at</a>).</li>
              </ul>
            </div>

            {/* Box 4: Copyright */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Copyright className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>حقوق الطبع والنشر والملكية الفكرية (Copyright)</span>
              </h2>
              <p>
                جميع المواد المنشورة على هذا الموقع (بما في ذلك النصوص، الصور الفوتوغرافية، التصاميم، الشعارات، والبرمجيات) محمية بموجب قانون حقوق المؤلف النمساوي (Österreichisches Urheberrechtsgesetz - UrhG) والاتفاقيات الدولية ذات الصلة.
              </p>
              <p>
                يُحظر تماماً أي نسخ، تعديل، توزيع، أو إعادة استخدام تجاري لأي جزء من محتويات الموقع دون الحصول على إذن خطي مسبق من المالك القانوني.
              </p>
            </div>

            {/* Box 5: Liability Disclaimer */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>إخلاء المسؤولية عن المحتوى والروابط الخارجية</span>
              </h2>
              <p>
                نحرص دائماً على تدقيق وصحة المعلومات المعروضة في متجرنا الرقمي. ومع ذلك، لا نتحمل المسؤولية القانونية عن الأخطاء غير المقصودة أو دقة المحتوى التابع لروابط خارجية تديرها جهات خارجية، حيث تقع المسؤولية الكاملة على مشغلي تلك المواقع.
              </p>
            </div>

          </div>
        ) : (
          /* German Content */
          <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            
            {/* Box 1: Diensteanbieter */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Diensteanbieter & Medieninhaber</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">Unternehmensbezeichnung:</span>
                  <span>{storeName} (HAJAR Alasiri Casa)</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">Inhaber / Verantwortliche Person:</span>
                  {legalOwnerName ? (
                    <span>{legalOwnerName}</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">[BITTE ERGÄNZEN – vollständiger rechtlicher Name]</span>
                  )}
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">Unternehmensgegenstand:</span>
                  <span>{businessPurposeDe}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">Standort / Anschrift:</span>
                  <span>{address}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">Staat:</span>
                  <span>Österreich</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">GISA-Zahl / Gewerbeschein:</span>
                  {gisaNumber ? (
                    <span>{gisaNumber}</span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400">[BITTE ERGÄNZEN]</span>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">Umsatzsteuer:</span>
                  {isKleinunternehmer ? (
                    <span>Kleinunternehmer gemäß § 6 Abs. 1 Z 27 UStG – es wird keine Umsatzsteuer ausgewiesen.</span>
                  ) : (
                    <span>UID-Nummer: {vatId || '[BITTE ERGÄNZEN]'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Box 2: Kontakt */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Kontaktdaten</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">Telefon:</span>
                  <a href={`tel:${phone}`} className="text-blue-600 hover:underline">{phone}</a>
                </div>
                <div>
                  <span className="block font-bold text-slate-900 dark:text-white mb-0.5">E-Mail:</span>
                  <a href={`mailto:${email}`} className="text-blue-600 hover:underline">{email}</a>
                </div>
              </div>
            </div>

            {/* Box 3: Kammer & Behörde */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Kammerzugehörigkeit & Gewerbebehörde</span>
              </h2>
              <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm">
                <li><strong>Kammerzugehörigkeit:</strong> Wirtschaftskammer Wien (WKO), Sparte Handel.</li>
                <li><strong>Zuständige Aufsichtsbehörde / Gewerbebehörde:</strong> Magistratisches Bezirksamt für den 12. Bezirk (Wien).</li>
                <li><strong>Anwendbare Rechtsvorschriften:</strong> Österreichische Gewerbeordnung (GewO 1994), E-Commerce-Gesetz (ECG), abrufbar im Rechtsinformationssystem des Bundes (<a href="https://www.ris.bka.gv.at" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">www.ris.bka.gv.at</a>).</li>
              </ul>
            </div>

            {/* Box 4: Urheberrecht (Copyright) */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Copyright className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>Urheberrechtshinweis (Copyright)</span>
              </h2>
              <p>
                Die auf dieser Website veröffentlichten Inhalte, Werke, Bilder, Produktbeschreibungen und Layouts unterliegen dem österreichischen Urheberrechtsgesetz (UrhG).
              </p>
              <p>
                Jede Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der vorherigen schriftlichen Zustimmung des jeweiligen Urhebers bzw. Betreibers.
              </p>
            </div>

            {/* Box 5: Haftung für Inhalte & Links */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>Haftung für Inhalte und externe Links</span>
              </h2>
              <p>
                Wir entwickeln die Inhalte dieser Website ständig weiter und bemühen uns, korrekte und aktuelle Informationen bereitzustellen. Für die Richtigkeit aller Inhalte können wir jedoch keine Haftung übernehmen.
              </p>
              <p>
                Unsere Website enthält Links zu anderen Websites, für deren Inhalt wir nicht verantwortlich sind. Sollten Ihnen rechtswidrige Links auffallen, bitten wir Sie, uns umgehend zu kontaktieren.
              </p>
            </div>

            {/* Box 6: Streitbeilegung */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-gray-850 shadow-2xs space-y-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>EU-Streitschlichtung</span>
              </h2>
              <p>
                Verbraucher haben die Möglichkeit, Beschwerden an die Online-Streitbeilegungsplattform der EU zu richten: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://ec.europa.eu/consumers/odr</a>. Sie können Ihre Beschwerde auch direkt bei uns unter der oben angegebenen E-Mail-Adresse einreichen.
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
            <Link to="/datenschutz" className="hover:text-blue-600 underline underline-offset-2">{t('datenschutz')}</Link>
            <Link to="/agb" className="hover:text-blue-600 underline underline-offset-2">{t('agb')}</Link>
            <Link to="/" className="hover:text-blue-600">{t('backToHome')}</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Impressum;
