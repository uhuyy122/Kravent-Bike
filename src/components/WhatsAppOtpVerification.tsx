import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getSessionToken } from '../session';

interface WhatsAppOtpVerificationProps {
  phone: string;
  verified: boolean;
  onVerified: (phone: string) => void;
}

interface ApiResult {
  error?: string;
  message?: string;
}

export const WhatsAppOtpVerification: React.FC<WhatsAppOtpVerificationProps> = ({
  phone,
  verified,
  onVerified,
}) => {
  const [code, setCode] = useState('');
  const [hasSentCode, setHasSentCode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);
  const normalizedPhoneInput = phone.trim();

  useEffect(() => {
    setCode('');
    setHasSentCode(false);
    setError('');
    setResendAt(0);
    setSecondsUntilResend(0);
  }, [normalizedPhoneInput]);

  useEffect(() => {
    if (!resendAt) return;
    const updateCountdown = () => {
      setSecondsUntilResend(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  const requestCode = async () => {
    if (!normalizedPhoneInput || isSending || secondsUntilResend > 0) return;
    setIsSending(true);
    setError('');
    try {
      const token = await getSessionToken();
      const response = await fetch('/api/whatsapp/send-otp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: normalizedPhoneInput }),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok) {
        throw new Error(result.error || `Gagal mengirim kode (${response.status}).`);
      }
      setHasSentCode(true);
      setResendAt(Date.now() + 60_000);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal mengirim kode verifikasi.');
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || isVerifying) return;
    setIsVerifying(true);
    setError('');
    try {
      const token = await getSessionToken();
      const response = await fetch('/api/whatsapp/verify-otp', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: normalizedPhoneInput, code }),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok) {
        throw new Error(result.error || `Gagal memverifikasi kode (${response.status}).`);
      }
      onVerified(normalizedPhoneInput);
    } catch (verificationError) {
      setError(verificationError instanceof Error
        ? verificationError.message
        : 'Gagal memverifikasi kode.');
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  if (verified && normalizedPhoneInput) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800" role="status">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
        <span>Nomor WhatsApp berhasil diverifikasi.</span>
      </div>
    );
  }

  if (!normalizedPhoneInput) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900" role="note">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
        <span>Masukkan nomor WhatsApp aktif untuk menerima kode verifikasi.</span>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      {!hasSentCode ? (
        <button
          type="button"
          onClick={() => void requestCode()}
          disabled={isSending || secondsUntilResend > 0}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSending ? 'Mengirim kode...' : 'Kirim kode verifikasi WhatsApp'}
        </button>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-wrap items-center gap-2">
          <label htmlFor="whatsapp-otp-code" className="sr-only">Kode verifikasi WhatsApp</label>
          <input
            id="whatsapp-otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6 digit kode"
            className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center font-mono text-sm tracking-widest"
          />
          <button
            type="submit"
            disabled={code.length !== 6 || isVerifying}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isVerifying ? 'Memeriksa...' : 'Verifikasi'}
          </button>
          <button
            type="button"
            onClick={() => void requestCode()}
            disabled={isSending || secondsUntilResend > 0}
            className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {secondsUntilResend > 0 ? `Kirim ulang (${secondsUntilResend}s)` : 'Kirim ulang kode'}
          </button>
        </form>
      )}
      {hasSentCode && !error && (
        <p className="text-[11px] text-slate-600" role="status">
          Kode berlaku 5 menit. Periksa WhatsApp {normalizedPhoneInput}.
        </p>
      )}
      {error && (
        <p className="text-[11px] font-medium text-rose-700" role="alert">{error}</p>
      )}
    </div>
  );
};
