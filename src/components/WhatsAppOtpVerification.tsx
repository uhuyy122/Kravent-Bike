import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WhatsAppOtpVerificationProps {
  phone: string;
  verified: boolean;
  onVerified: () => void;
}

export const WhatsAppOtpVerification: React.FC<WhatsAppOtpVerificationProps> = ({
  phone,
  verified,
}) => {
  const normalizedPhoneInput = phone.trim();

  if (verified && normalizedPhoneInput) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800" role="status">
        <AlertTriangle className="h-4 w-4 shrink-0 text-emerald-700" />
        <span>Nomor WhatsApp sudah terisi. Pastikan nomor yang dimasukkan benar, karena booking dan konfirmasi akan dikirim ke nomor ini.</span>
      </div>
    );
  }

  if (!normalizedPhoneInput) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900" role="note">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
        <span>Masukkan nomor WhatsApp terlebih dahulu. Pastikan nomor yang diisi sesuai dengan nomor pelanggan yang aktif.</span>
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900" role="status">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
      <span>Pastikan nomor WhatsApp sudah sesuai sebelum melanjutkan. Booking dan notifikasi akan dikirim ke nomor tersebut.</span>
    </div>
  );
};
