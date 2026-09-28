import { ShieldCheck } from 'lucide-react';

export const VerifyContactModal = ({
  handleCancelVerify,
  handleSubmitVerifyOtp,
  isAr,
  otpInput,
  phoneConfirmationResult,
  profileError,
  setOtpInput,
  verifyingLoading,
  verifyingType
}) => (
    <div className="mb-6 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
          <span>
            {isAr 
              ? `إدخال رمز التحقق لـ ${verifyingType === 'email' ? 'البريد الإلكتروني' : 'رقم الهاتف'}` 
              : `Verifizierungscode für ${verifyingType === 'email' ? 'E-Mail' : 'Telefon'} eingeben`}
          </span>
        </h3>
        <button
          onClick={handleCancelVerify}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer touch-manipulation"
        >
          {isAr ? 'إلغاء' : 'Abbrechen'}
        </button>
      </div>

      {profileError && (
        <div className="text-xs bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 px-3 py-1.5 rounded-lg mb-3">
          {profileError}
        </div>
      )}

      {verifyingType === 'phone' && !phoneConfirmationResult ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {verifyingLoading
            ? (isAr ? 'جارٍ إرسال رمز عبر الرسائل القصيرة...' : 'SMS-Code wird gesendet...')
            : (isAr ? 'تعذر إرسال الرمز.' : 'Code konnte nicht gesendet werden.')}
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            maxLength={6}
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value)}
            placeholder="123456"
            className="w-full sm:w-48 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-amber-300 dark:border-amber-700 font-mono tracking-widest text-center font-bold text-base outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={handleSubmitVerifyOtp}
            disabled={verifyingLoading || otpInput.length < 6}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 touch-manipulation"
          >
            {verifyingLoading ? '...' : (isAr ? 'تأكيد الرمز' : 'Code bestätigen')}
          </button>
        </div>
      )}
    </div>
);
