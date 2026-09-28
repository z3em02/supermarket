import { Truck, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

export const DeliveryBanner = () => {
  const { language, direction } = useLanguage();
  const { isAuthenticated: isCustomerLoggedIn } = useCustomerAuth();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 text-white p-8 sm:p-12 shadow-md">
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-xs">
            <Truck className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'خدمة التوصيل المنزلي' : 'Lieferservice direkt nach Hause'}</span>
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {language === 'ar' ? 'اطلب الآن وادفع عند استلام مشترياتك عند الباب' : 'Jetzt bestellen & erst bei Erhalt an der Haustür bezahlen'}
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
            {language === 'ar' ? 'نوفر لكم تشكيلة واسعة من المواد الغذائية الطازجة والمنتجات الشرقية والعالمية مع توصيل سريع وموثوق إلى عنوانكم.' : 'Genießen Sie frische orientalische und internationale Spezialitäten, zuverlässig und bequem zu Ihnen nach Hause geliefert.'}
          </p>
          <div className="pt-2">
            <Link
              to={isCustomerLoggedIn ? "/account" : "/customer/register"}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-black text-sm shadow-sm transition-all cursor-pointer"
            >
              <span>{isCustomerLoggedIn ? (language === 'ar' ? 'عرض حسابي وطلباتي' : 'Mein Konto & Bestellungen') : (language === 'ar' ? 'إنشاء حساب عميل مجاني' : 'Kostenloses Kundenkonto erstellen')}</span>
              {direction === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
