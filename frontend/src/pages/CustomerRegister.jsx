import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import {
  sendPhoneVerificationCode,
  confirmPhoneVerificationCode,
  resetRecaptcha,
  isFirebasePhoneAuthConfigured
} from '../utils/firebaseClient';
import { LanguageSelector } from '../components/LanguageSelector';
import { ThemeToggle } from '../components/ThemeToggle';
import { 
  UserPlus, 
  Mail, 
  Phone, 
  Lock, 
  User, 
  MapPin, 
  Home, 
  Building, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Truck, 
  RotateCcw,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const CustomerRegister = () => {
  const { register, verifyEmail, verifyPhone, resendOtp } = useCustomerAuth();
  const { t, direction, language } = useLanguage();
  const { getStoreName } = useStoreSettings();
  const navigate = useNavigate();

  const isAr = language === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  // Multi-step: 1 = Basic Info & Address, 2 = Verification (Email & Phone OTP), 3 = Success
  const [step, setStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
    floorApartment: '',
    deliveryNotes: ''
  });

  // Verification State
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [devOtp, setDevOtp] = useState(null);
  // Firebase confirmationResult between "send SMS code" and "confirm code"
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState(null);
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const PHONE_RECAPTCHA_CONTAINER_ID = 'firebase-phone-recaptcha-container-register';

  const resolvePhoneError = (err) => {
    if (err?.response?.data?.error) return err.response.data.error;
    const messages = {
      'auth/invalid-verification-code': isAr ? 'رمز التحقق غير صحيح' : 'Ungültiger Verifizierungscode',
      'auth/code-expired': isAr ? 'انتهت صلاحية الرمز، يرجى طلب رمز جديد' : 'Der Code ist abgelaufen, bitte fordern Sie einen neuen an',
      'auth/too-many-requests': isAr ? 'محاولات كثيرة جداً، حاول لاحقاً' : 'Zu viele Versuche, bitte später erneut versuchen',
      'auth/invalid-phone-number': isAr ? 'رقم الهاتف غير صالح' : 'Ungültige Telefonnummer',
      'auth/missing-phone-number': isAr ? 'رقم الهاتف مفقود' : 'Telefonnummer fehlt',
      'auth/captcha-check-failed': isAr ? 'فشل التحقق الأمني، حاول مرة أخرى' : 'Sicherheitsprüfung fehlgeschlagen, bitte erneut versuchen',
      'auth/quota-exceeded': isAr ? 'تم تجاوز الحد المسموح للرسائل، حاول لاحقاً' : 'SMS-Kontingent überschritten, bitte später erneut versuchen'
    };
    return messages[err?.code] || err?.message || (isAr ? 'حدث خطأ أثناء التحقق من الهاتف' : 'Fehler bei der Telefonverifizierung');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password) {
      setError(isAr ? 'يرجى ملء جميع الحقول الأساسية المطلوبة' : 'Bitte füllen Sie alle erforderlichen Pflichtfelder aus');
      return;
    }

    if (formData.password.length < 8) {
      setError(isAr ? 'كلمة المرور يجب أن تكون 8 خانات على الأقل' : 'Das Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await register({
        ...formData,
        preferredLanguage: language
      });

      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }

      setStep(2);
      setSuccessMsg(
        isAr 
          ? 'تم إنشاء الحساب بنجاح! يُرجى إدخال رموز التحقق المرسلة إلى بريدك وهاتفك لتفعيل الطلبات.' 
          : 'Konto erstellt! Bitte geben Sie die Bestätigungscodes für E-Mail und Telefon ein.'
      );
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.error || (isAr ? 'فشل إنشاء الحساب' : 'Registrierung fehlgeschlagen'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode.trim()) return;
    try {
      setLoading(true);
      setError('');
      await verifyEmail(emailCode.trim());
      setEmailVerified(true);
      setSuccessMsg(isAr ? 'تم التحقق من البريد بنجاح!' : 'E-Mail erfolgreich verifiziert!');
    } catch (err) {
      setError(err.response?.data?.error || (isAr ? 'رمز البريد غير صالح' : 'Ungültiger E-Mail-Code'));
    } finally {
      setLoading(false);
    }
  };

  // Firebase sends the SMS directly to the customer's phone (no backend call
  // for this step) via an invisible reCAPTCHA check.
  const handleSendPhoneCode = async () => {
    if (!isFirebasePhoneAuthConfigured()) {
      setError(isAr ? 'Telefonverifizierung ist derzeit nicht verfügbar.' : 'Telefonverifizierung ist derzeit nicht verfügbar.');
      return;
    }
    try {
      setSendingPhoneCode(true);
      setError('');
      const confirmation = await sendPhoneVerificationCode(formData.phone, PHONE_RECAPTCHA_CONTAINER_ID);
      setPhoneConfirmationResult(confirmation);
      setSuccessMsg(isAr ? 'تم إرسال رمز عبر الرسائل القصيرة' : 'SMS-Code wurde gesendet');
    } catch (err) {
      console.error('Firebase phone send error:', err);
      setError(resolvePhoneError(err));
      resetRecaptcha();
    } finally {
      setSendingPhoneCode(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneCode.trim() || !phoneConfirmationResult) return;
    try {
      setLoading(true);
      setError('');
      const idToken = await confirmPhoneVerificationCode(phoneConfirmationResult, phoneCode.trim());
      await verifyPhone(idToken);
      setPhoneVerified(true);
      setPhoneConfirmationResult(null);
      resetRecaptcha();
      setSuccessMsg(isAr ? 'تم التحقق من رقم الهاتف بنجاح!' : 'Telefonnummer erfolgreich verifiziert!');
    } catch (err) {
      setError(resolvePhoneError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      setError('');
      const res = await resendOtp('email');
      if (res.devOtp) {
        setDevOtp(prev => ({ ...prev, emailOtp: res.devOtp }));
      }
      setSuccessMsg(isAr ? 'تمت إعادة إرسال رمز التحقق (البريد)' : 'Neuer Code gesendet (E-Mail)');
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Senden');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 transition-colors">
      {/* Top Header */}
      <header className="px-3 xs:px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-sm sm:text-base md:text-lg text-slate-900 dark:text-white block leading-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
              {getStoreName()}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 block truncate">
              {isAr ? 'تسجيل حساب عميل جديد' : 'Neues Kundenkonto'}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-3 xs:px-4 py-6 sm:py-10">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-gray-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-4 sm:p-6 md:p-10">

          {/* Stepper Header */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <div className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition ${step === 1 ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>{isAr ? 'البيانات والعنوان' : 'Daten & Adresse'}</span>
            </div>
            <div className="w-4 sm:w-6 h-0.5 bg-slate-200 dark:bg-gray-800" />
            <div className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition ${step === 2 ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30' : 'bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400'}`}>
              <span className="w-4 h-4 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px]">2</span>
              <span>{isAr ? 'التحقق' : 'Verifizierung'}</span>
            </div>
          </div>

          {error && (
            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
              <span className="break-words">{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Registration & Home Delivery Address */}
          {step === 1 && (
            <form onSubmit={handleRegisterSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{isAr ? 'إنشاء حساب التوصيل المنزلي' : 'Konto für Hauszustellung anlegen'}</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {isAr 
                    ? 'أدخل بياناتك للتوصيل السريع إلى باب منزلك مع الدفع عند الاستلام نقداً أو بالبطاقة' 
                    : 'Geben Sie Ihre Daten für die schnelle Lieferung an Ihre Haustür ein (Barzahlung bei Erhalt).'}
                </p>
              </div>

              {/* Personal Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {isAr ? 'الاسم الكامل *' : 'Vollständiger Name *'}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={isAr ? 'مثال: أحمد محمد' : 'z.B. Max Mustermann'}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {isAr ? 'رقم الهاتف * (للتأكيد)' : 'Telefonnummer * (für Bestätigung)'}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={isAr ? 'مثال: 01511234567 أو +43660...' : 'z.B. +43 660 1234567'}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {isAr ? 'البريد الإلكتروني *' : 'E-Mail-Adresse *'}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    {isAr ? 'كلمة المرور *' : 'Passwort *'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Delivery Address Section */}
              <div className="pt-4 border-t border-slate-100 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {isAr ? 'عنوان التوصيل للمنزل' : 'Lieferadresse für Hauszustellung'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'اسم الشارع' : 'Straße'}
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder={isAr ? 'مثال: شارع المحطة' : 'z.B. Hauptstraße'}
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'رقم البناء / المنزل' : 'Hausnummer'}
                    </label>
                    <input
                      type="text"
                      name="houseNumber"
                      value={formData.houseNumber}
                      onChange={handleChange}
                      placeholder="z.B. 12A"
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'الرمز البريدي (PLZ)' : 'Postleitzahl'}
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="z.B. 1010"
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'المدينة' : 'Stadt'}
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="z.B. Wien"
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'الطابق / رقم الشقة' : 'Stock / Tür'}
                    </label>
                    <input
                      type="text"
                      name="floorApartment"
                      value={formData.floorApartment}
                      onChange={handleChange}
                      placeholder="z.B. 2. Stock / Tür 14"
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 mb-1">
                      {isAr ? 'ملاحظات للسائق (اختياري)' : 'Lieferhinweis für den Fahrer (optional)'}
                    </label>
                    <input
                      type="text"
                      name="deliveryNotes"
                      value={formData.deliveryNotes}
                      onChange={handleChange}
                      placeholder={isAr ? 'مثال: يرجى الاتصال عند الوصول، الجرس لا يعمل' : 'z.B. Bitte bei Müller klingeln, 3. Stock'}
                      className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Zero Payment Method Notice */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 sm:gap-3">
                <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <strong className="block font-bold">
                    {isAr ? 'لا حاجة لأي بطاقة بنكية أو وسيلة دفع مسبقة' : 'Keine Kreditkarte oder Online-Zahlung erforderlich!'}
                  </strong>
                  <span>
                    {isAr 
                      ? 'جميع الطلبات تسدد مباشرة عند الاستلام عند باب منزلك (نقداً أو بالبطاقة)' 
                      : 'Sie bezahlen Ihre Bestellung erst bequem bei Erhalt an der Haustür in bar oder mit Karte.'}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 sm:py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 touch-manipulation"
              >
                {loading ? (
                  <span>{isAr ? 'جارٍ الحفظ...' : 'Wird erstellt...'}</span>
                ) : (
                  <>
                    <span>{isAr ? 'متابعة إلى خطوة التحقق' : 'Weiter zur Verifizierung'}</span>
                    <ArrowIcon className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center text-xs text-slate-500 dark:text-gray-400 pt-1 sm:pt-2">
                <span>{isAr ? 'لديك حساب بالفعل؟ ' : 'Bereits registriert? '}</span>
                <Link to="/customer/login" className="font-bold text-emerald-600 hover:underline touch-manipulation">
                  {isAr ? 'تسجيل الدخول' : 'Jetzt anmelden'}
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Dual Verification (Email & Phone OTP) */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {isAr ? 'تأكيد الحساب (البريد والهاتف)' : 'Konto verifizieren (E-Mail & Telefon)'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                  {isAr
                    ? 'لتتمكن من تقديم الطلبات، يرجى تأكيد بريدك الإلكتروني بإدخال الرمز المكون من 6 أرقام. تأكيد رقم الهاتف اختياري ويمكن إتمامه لاحقاً.'
                    : 'Um Bestellungen aufgeben zu können, bestätigen Sie bitte Ihre E-Mail-Adresse mit dem 6-stelligen Code. Die Telefonnummer ist optional und kann später bestätigt werden.'}
                </p>
              </div>

              {/* Dev Helper Callout (email only — phone codes come from Firebase SMS) */}
              {devOtp?.emailOtp && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-850 text-amber-800 dark:text-amber-200 text-xs flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      {isAr ? 'رمز التحقق السريع (تجريبي):' : 'Schnelltest-Code:'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 font-mono font-bold">
                    <span className="bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded inline-flex items-center gap-1">
                      <Mail className="w-3 h-3 text-amber-700 dark:text-amber-300" />
                      {devOtp.emailOtp}
                    </span>
                  </div>
                </div>
              )}

              {/* Verification Boxes */}
              <div className="space-y-4">
                {/* 1. Email Verification */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition ${emailVerified ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800'}`}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-gray-200 truncate">
                        {isAr ? 'رمز تأكيد البريد الإلكتروني' : 'E-Mail-Bestätigungscode'}
                      </span>
                    </div>
                    {emailVerified ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" /> {isAr ? 'تم التحقق' : 'Verifiziert'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendEmail}
                        className="text-xs text-slate-500 hover:text-emerald-600 font-medium flex items-center gap-1 cursor-pointer shrink-0 touch-manipulation"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isAr ? 'إعادة الإرسال' : 'Erneut senden'}</span>
                      </button>
                    )}
                  </div>

                  {!emailVerified ? (
                    <div className="flex flex-col xs:flex-row gap-2 mt-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        placeholder="123456"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-mono tracking-widest text-center text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyEmail}
                        disabled={loading || emailCode.length < 6}
                        className="w-full xs:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer touch-manipulation shrink-0"
                      >
                        {isAr ? 'تأكيد' : 'Bestätigen'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      {isAr ? 'تم تأكيد عنوان بريدك الإلكتروني بنجاح.' : 'Ihre E-Mail-Adresse wurde erfolgreich bestätigt.'}
                    </p>
                  )}
                </div>

                {/* 2. Phone Verification */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition ${phoneVerified ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' : 'bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800'}`}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-gray-200 truncate">
                        {isAr ? 'رمز تأكيد رقم الهاتف (SMS) - اختياري' : 'Telefon-Bestätigungscode (SMS) – optional'}
                      </span>
                    </div>
                    {phoneVerified ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" /> {isAr ? 'تم التحقق' : 'Verifiziert'}
                      </span>
                    ) : phoneConfirmationResult ? (
                      <button
                        type="button"
                        onClick={handleSendPhoneCode}
                        disabled={sendingPhoneCode}
                        className="text-xs text-slate-500 hover:text-emerald-600 font-medium flex items-center gap-1 cursor-pointer shrink-0 touch-manipulation disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isAr ? 'إعادة الإرسال' : 'Erneut senden'}</span>
                      </button>
                    ) : null}
                  </div>

                  {!phoneVerified ? (
                    phoneConfirmationResult ? (
                      <div className="flex flex-col xs:flex-row gap-2 mt-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value)}
                          placeholder="123456"
                          className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 font-mono tracking-widest text-center text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyPhone}
                          disabled={loading || phoneCode.length < 6}
                          className="w-full xs:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer touch-manipulation shrink-0"
                        >
                          {isAr ? 'تأكيد' : 'Bestätigen'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendPhoneCode}
                        disabled={sendingPhoneCode}
                        className="mt-2 w-full xs:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer touch-manipulation"
                      >
                        {sendingPhoneCode
                          ? (isAr ? 'جارٍ الإرسال...' : 'Wird gesendet...')
                          : (isAr ? 'إرسال رمز عبر الرسائل القصيرة' : 'SMS-Code senden')}
                      </button>
                    )
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      {isAr ? 'تم تأكيد رقم هاتفك بنجاح.' : 'Ihre Telefonnummer wurde erfolgreich bestätigt.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Invisible reCAPTCHA host for Firebase Phone Auth */}
              <div id={PHONE_RECAPTCHA_CONTAINER_ID} />

              {/* Complete & Enter Store Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className={`w-full py-3.5 sm:py-4 px-6 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation ${
                    emailVerified
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                      : 'bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="break-words text-center">
                    {emailVerified
                      ? (isAr ? 'ابدأ التسوق الآن' : 'Jetzt einkaufen')
                      : (isAr ? 'الدخول للمتجر (تأكيد البريد مطلوب لاحقاً للطلب)' : 'Zum Shop (E-Mail-Bestätigung für Bestellungen erforderlich)')}
                  </span>
                  <ArrowIcon className="w-4 h-4 shrink-0" />
                </button>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-gray-600 border-t border-slate-200/50 dark:border-gray-900">
        &copy; {new Date().getFullYear()} {getStoreName()} &bull; {isAr ? 'خدمة التوصيل المباشر إلى المنزل' : 'Direkter Lieferservice nach Hause'}
      </footer>
    </div>
  );
};
