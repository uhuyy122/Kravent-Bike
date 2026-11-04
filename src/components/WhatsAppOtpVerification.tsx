import React, { useEffect, useState } from 'react';
import { CheckCircle, LoaderCircle, MessageCircle } from 'lucide-react';
import { getWhatsAppVerificationIdToken } from '../utils/whatsappVerification';

interface WhatsAppOtpVerificationProps {
  phone: string;
  verified: boolean;
  onVerified: () => void;
}

export const WhatsAppOtpVerification: React.FC<WhatsAppOtpVerificationProps> = ({
  phone,
  verified,
  onVerified,
}) => {
  const [requestedPhone, setRequestedPhone] = useState('');
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const normalizedPhoneInput = phone.trim();
  const hasCurrentChallenge = requestedPhone === normalizedPhoneInput && Boolean(requestedPhone);

  useEffect(() => {
    if (requestedPhone && requestedPhone !== normalizedPhoneInput) {
      setRequestedPhone('');
      setCode('');
      setMessage('');
      setError('');
    }
  }, [normalizedPhoneInput, requestedPhone]);

  const sendCode = async () => {
    if (!normalizedPhoneInput) {
      setError('Masukkan nomor WhatsApp terlebih dahulu.');
      return;
    }

    setIsSending(true);
    setError('');
    setMessage('');

    try {
      const idToken = await getWhatsAppVerificationIdToken();
      const response = await fetch('/api/whatsapp/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ phone: normalizedPhoneInput }),
      });
      const result = await response.json() as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengirim kode verifikasi.');
      }

      setRequestedPhone(normalizedPhoneInput);
      setCode('');
      setMessage(result.message || 'Kode verifikasi dikirim ke WhatsApp tersebut.');
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Gagal mengirim kode verifikasi.');
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    if (!hasCurrentChallenge) {
      setError('Kirim kode verifikasi ke nomor ini terlebih dahulu.');
      return;
    }

    setIsVerifying(true);
    setError('');
    setMessage('');

    try {
      const idToken = await getWhatsAppVerificationIdToken();
      const response = await fetch('/api/whatsapp/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ phone: normalizedPhoneInput, code }),
      });
      const result = await response.json() as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error || 'Kode verifikasi tidak valid.');
      }

      onVerified();
      setMessage(result.message || 'Nomor WhatsApp berhasil diverifikasi.');
      setCode('');
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Gagal memverifikasi kode.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700" role="status">
        <CheckCircle className="h-4 w-4" />
        Nomor WhatsApp aktif dan sudah terverifikasi.
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {hasCurrentChallenge && (
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, ''))}
            placeholder="Masukkan 6 digit kode"
            aria-label="Kode verifikasi WhatsApp"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-emerald-500"
          />
          <button
            type="button"
            onClick={verifyCode}
            disabled={isVerifying || code.length !== 6}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isVerifying ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            Verifikasi
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={sendCode}
        disabled={isSending || isVerifying || !normalizedPhoneInput}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
        {hasCurrentChallenge ? 'Kirim ulang kode WhatsApp' : 'Kirim kode verifikasi WhatsApp'}
      </button>

      {message && <p className="text-[11px] text-emerald-700" role="status">{message}</p>}
      {error && <p className="text-[11px] text-rose-700" role="alert">{error}</p>}
    </div>
  );
};
