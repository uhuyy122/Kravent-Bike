import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Bike as BikeIcon,
  Phone,
  MessageCircle,
  DollarSign,
  FileText,
  ShieldCheck,
  ArrowRight,
  Zap,
  Sparkles
} from 'lucide-react';
import { Booking } from '../types';
import { useApp } from '../context/AppContext';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { calculateLateFee, getDateRateInfo } from '../utils/pricingUtils';
import { getCurrentTimeStr, getTodayDateStr } from '../utils/scheduleUtils';

interface ReturnBookingModalProps {
  booking: Booking;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReturnBookingModal: React.FC<ReturnBookingModalProps> = ({
  booking,
  onClose,
  onSuccess,
}) => {
  const { updateBookingStatus, bikes, currentRole } = useApp();

  const bike = bikes.find(b => b.id === booking.bikeId);
  const todayStr = getTodayDateStr();
  const currentTimeStr = getCurrentTimeStr();

  // Waktu kepulangan aktual (bisa disesuaikan jika pengembalian terjadi beberapa menit lalu)
  const [returnDate, setReturnDate] = useState(booking.actualReturnDate || todayStr);
  const [returnTime, setReturnTime] = useState(booking.actualReturnTime || currentTimeStr);
  const [returnNotes, setReturnNotes] = useState(
    booking.returnNotes || 'Unit sepeda kembali dalam kondisi baik dan lengkap (helm & kunci gembok).'
  );
  const [feePaymentMethod, setFeePaymentMethod] = useState<'cash' | 'qris' | 'transfer'>('cash');

  // Menentukan tarif per jam untuk denda (mengikuti tarif tanggal kepulangan: hari biasa 8rb, weekend/libur 10rb)
  const ratePerHour = useMemo(() => {
    const dateRate = getDateRateInfo(returnDate || booking.startDate);
    return dateRate.ratePerHour;
  }, [returnDate, booking.startDate]);

  // Kalkulasi denda keterlambatan secara dinamis berdasarkan input waktu kepulangan
  const lateCalculation = useMemo(() => {
    return calculateLateFee(
      booking.endDate || booking.startDate,
      booking.endTime,
      returnDate,
      returnTime,
      ratePerHour
    );
  }, [booking.endDate, booking.startDate, booking.endTime, returnDate, returnTime, ratePerHour]);

  // Total akhir tagihan = Harga sewa awal + Denda keterlambatan
  const finalTotal = booking.totalPrice + lateCalculation.lateFee;

  // Cek apakah booking ini bayar nanti (belum lunas) atau sudah lunas di awal
  const isPreviouslyUnpaid = booking.paymentStatus === 'belum_lunas' || booking.paymentMethod === 'bayar_nanti';
  const amountToCollectNow = isPreviouslyUnpaid ? finalTotal : lateCalculation.lateFee;

  const handleConfirmReturn = () => {
    const returnIso = `${returnDate}T${returnTime}:00`;
    updateBookingStatus(booking.id, 'selesai', {
      returnedAt: returnIso,
      actualReturnDate: returnDate,
      actualReturnTime: returnTime,
      lateMinutes: lateCalculation.lateMinutes,
      lateExtraHours: lateCalculation.extraHours,
      lateFee: lateCalculation.lateFee,
      finalTotalPrice: finalTotal,
      returnNotes: returnNotes,
      handoverBy: currentRole === 'admin' ? 'Admin Kravent Bike' : 'Karyawan Shift',
      paymentMethod: feePaymentMethod, // Pelunasan dengan metode ini
      paymentStatus: 'lunas', // Status pembayaran menjadi LUNAS
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  // WhatsApp message untuk struk/rincian pengembalian & denda
  const generateWaMessage = () => {
    const cleanPhone = booking.customerPhone.replace(/^0/, '62').replace(/\D/g, '');
    let msg = `*STRUK PENGEMBALIAN SEPEDA - KRAVENT BIKE*%0A`;
    msg += `-----------------------------------%0A`;
    msg += `No. Booking: *${booking.bookingCode}*%0A`;
    msg += `Penyewa: *${booking.customerName}*%0A`;
    msg += `Unit: *${booking.bikeName}*%0A`;
    msg += `Jadwal Selesai: *${booking.endTime} WIB*%0A`;
    msg += `Jam Kepulangan: *${returnTime} WIB* (${formatDateIndo(returnDate)})%0A`;
    msg += `-----------------------------------%0A`;

    if (lateCalculation.lateMinutes > 0) {
      msg += `Status: ⚠️ *Terlambat ${lateCalculation.lateMinutes} Menit*%0A`;
      msg += `Aturan Denda: ${lateCalculation.ruleApplied}%0A`;
      if (lateCalculation.extraHours > 0) {
        msg += `Biaya Tambahan (${lateCalculation.extraHours} Jam): *${formatRupiah(lateCalculation.lateFee)}*%0A`;
      } else {
        msg += `Biaya Tambahan: *Rp 0 (Toleransi < 15 Menit)*%0A`;
      }
    } else {
      msg += `Status: ✅ *Tepat Waktu / Lebih Awal*%0A`;
      msg += `Biaya Tambahan: *Rp 0*%0A`;
    }

    msg += `Biaya Sewa Pokok: *${formatRupiah(booking.totalPrice)}*%0A`;
    msg += `*TOTAL AKHIR: ${formatRupiah(finalTotal)}*%0A`;
    msg += `Metode Pembayaran: *${feePaymentMethod.toUpperCase()}*%0A`;
    msg += `Catatan Kondisi: ${returnNotes}%0A`;
    msg += `-----------------------------------%0A`;
    msg += `Terima kasih telah menyewa di Kravent Bike! CS: 0896-4712-3671`;

    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  // Shortcut penyesuaian jam kembali
  const setQuickTime = (minutesOffset: number) => {
    const [h, m] = booking.endTime.split(':').map(Number);
    const d = new Date(`${booking.startDate}T${booking.endTime}:00`);
    d.setMinutes(d.getMinutes() + minutesOffset);
    const newH = String(d.getHours()).padStart(2, '0');
    const newM = String(d.getMinutes()).padStart(2, '0');
    setReturnTime(`${newH}:${newM}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  Serah Terima Pengembalian Sepeda
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  {booking.bookingCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Catat jam kepulangan sepeda dan hitung otomatis biaya keterlambatan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Unit & Customer Info Banner */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={booking.bikeImage}
                alt={booking.bikeName}
                className="w-14 h-14 rounded-xl object-cover border border-slate-300 shadow-2xs shrink-0"
              />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                  Unit Sewa
                </span>
                <h4 className="font-bold text-slate-900 text-sm">{booking.bikeName}</h4>
                <p className="text-xs text-slate-500">
                  Penyewa: <strong className="text-slate-700">{booking.customerName}</strong> ({booking.customerPhone})
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-slate-200 text-right shrink-0">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                Jadwal Sewa Terjadwal
              </span>
              <span className="font-bold text-slate-800 text-xs block">
                {booking.startTime} - {booking.endTime} WIB
              </span>
              <span className="text-[11px] text-slate-500 block">
                Durasi: {booking.durationValue} {booking.durationType} ({formatRupiah(booking.totalPrice)})
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                isPreviouslyUnpaid
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}>
                {isPreviouslyUnpaid ? '💳 Bayar Nanti (Belum Lunas)' : '✓ Sewa Sudah Lunas'}
              </span>
            </div>
          </div>

          {/* Input Jam Kepulangan - Ditentukan oleh Karyawan atau Admin Real-Time */}
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                  Waktu Kepulangan (Real-Time Sistem)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const y = now.getFullYear();
                  const m = String(now.getMonth() + 1).padStart(2, '0');
                  const d = String(now.getDate()).padStart(2, '0');
                  const h = String(now.getHours()).padStart(2, '0');
                  const min = String(now.getMinutes()).padStart(2, '0');
                  setReturnDate(`${y}-${m}-${d}`);
                  setReturnTime(`${h}:${min}`);
                }}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Sinkronkan ke Jam Sekarang (Real-Time)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tanggal Pengembalian (Real-Time):
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Jam Kepulangan (Real-Time):
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="time"
                    value={returnTime}
                    onChange={e => setReturnTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Quick Time Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-semibold text-slate-500 mr-1">Pintasan Jam:</span>
              <button
                type="button"
                onClick={() => {
                  setReturnDate(todayStr);
                  setReturnTime(currentTimeStr);
                }}
                className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 transition-colors"
              >
                Jam Sekarang ({currentTimeStr})
              </button>
              <button
                type="button"
                onClick={() => setQuickTime(0)}
                className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 transition-colors"
              >
                Tepat Jadwal ({booking.endTime})
              </button>
              <button
                type="button"
                onClick={() => setQuickTime(10)}
                className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 transition-colors"
              >
                +10 Mnt (&lt; 15 mnt: Rp 0)
              </button>
              <button
                type="button"
                onClick={() => setQuickTime(20)}
                className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 transition-colors"
              >
                +20 Mnt (15-30 mnt: 0.5 Jam)
              </button>
              <button
                type="button"
                onClick={() => setQuickTime(45)}
                className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 transition-colors"
              >
                +45 Mnt (&gt; 30 mnt: 1 Jam)
              </button>
              <button
                type="button"
                onClick={() => setQuickTime(80)}
                className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 transition-colors"
              >
                +1 Jam 20 Mnt (1.5 Jam)
              </button>
            </div>
          </div>

          {/* Aturan & Kalkulasi Denda Keterlambatan */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-500" />
                Rincian Analisis Keterlambatan & Biaya Tambahan
              </h4>
              <span className="text-[10px] text-slate-500 font-semibold">
                Tarif Unit: {formatRupiah(ratePerHour)}/jam
              </span>
            </div>

            {/* Aturan Panduan Singkat */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <div className={`p-1.5 rounded-lg border ${lateCalculation.lateMinutes > 0 && lateCalculation.remMinutes < 15 ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold' : 'border-transparent text-slate-600'}`}>
                <span className="block font-bold">&lt; 15 Menit</span>
                <span>Hitungan ke sejam sebelumnya (Rp 0 / Bebas Denda)</span>
              </div>
              <div className={`p-1.5 rounded-lg border ${lateCalculation.remMinutes >= 15 && lateCalculation.remMinutes <= 30 ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold' : 'border-transparent text-slate-600'}`}>
                <span className="block font-bold">15 - 30 Menit</span>
                <span>Dihitung setengah jam (+0.5 jam tarif)</span>
              </div>
              <div className={`p-1.5 rounded-lg border ${lateCalculation.remMinutes > 30 ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold' : 'border-transparent text-slate-600'}`}>
                <span className="block font-bold">&gt; 30 Menit</span>
                <span>Dihitung ke jam berikutnya (+1 jam penuh)</span>
              </div>
            </div>

            {/* Status Keterlambatan */}
            <div className="p-3 rounded-xl border bg-slate-50/70 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  {lateCalculation.isLate ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Terlambat {lateCalculation.lateMinutes} Menit
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tepat Waktu / Lebih Awal
                    </span>
                  )}
                  <span className="text-xs text-slate-600 font-medium">
                    {lateCalculation.ruleApplied}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {lateCalculation.breakdownText}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Denda Keterlambatan
                </span>
                <span className={`text-base font-extrabold ${lateCalculation.lateFee > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatRupiah(lateCalculation.lateFee)}
                </span>
              </div>
            </div>

            {/* Total Pembayaran & Pelunasan Sekarang */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">
                  {isPreviouslyUnpaid ? '💳 Pelunasan Bayar Nanti (Sewa + Denda)' : 'Pelunasan Biaya Pengembalian'}
                </span>
                <span className="text-[11px] text-slate-300">
                  {isPreviouslyUnpaid
                    ? `Sewa Pokok ${formatRupiah(booking.totalPrice)} + Denda ${formatRupiah(lateCalculation.lateFee)}`
                    : `Sewa Pokok ${formatRupiah(booking.totalPrice)} (Sudah Lunas) + Denda ${formatRupiah(lateCalculation.lateFee)}`}
                </span>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] text-slate-400 block">Wajib Diterima Kasir:</span>
                <span className="text-xl font-black text-emerald-400 tracking-tight">
                  {formatRupiah(amountToCollectNow)}
                </span>
              </div>
            </div>
          </div>

          {/* Catatan Kondisi & Pilihan Metode Bayar Pelunasan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Metode Pembayaran Pelunasan yang Diterima:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'qris', 'transfer'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setFeePaymentMethod(method)}
                    className={`py-2 text-xs font-bold rounded-xl border uppercase transition-all cursor-pointer ${
                      feePaymentMethod === method
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {method === 'cash' ? '💵 Cash' : method === 'qris' ? '📱 QRIS' : '🏦 Transfer'}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Pelanggan membayar {formatRupiah(amountToCollectNow)} via <strong>{feePaymentMethod.toUpperCase()}</strong>.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Catatan Kondisi Unit Saat Kembali:
              </label>
              <textarea
                value={returnNotes}
                onChange={e => setReturnNotes(e.target.value)}
                rows={2}
                placeholder="Catat kondisi sepeda, kelengkapan helm/gembok, lecet jika ada..."
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <a
            href={generateWaMessage()}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Kirim Struk Pengembalian ke WA</span>
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmReturn}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Konfirmasi Pengembalian & Terima Pembayaran</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
