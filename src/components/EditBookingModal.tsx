import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Bike as BikeIcon,
  Calendar,
  Clock,
  User,
  Phone,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Save,
  ShieldAlert,
  DollarSign,
  Zap,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Booking, BookingStatus, Bike, PaymentMethod } from '../types';
import { useApp } from '../context/AppContext';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { getDateRateInfo, calculateLateFee } from '../utils/pricingUtils';
import { checkBikeBookingConflict, getTodayDateStr } from '../utils/scheduleUtils';

interface EditBookingModalProps {
  booking: Booking;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  booking,
  onClose,
  onSuccess,
}) => {
  const { bikes, bookings, updateBooking } = useApp();

  // Helper waktu real-time sistem saat ini
  const getRealTimeNow = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: `${hours}:${minutes}`,
      boundedTimeStr: hours < '06' ? '06:00' : hours > '23' ? '23:00' : `${hours}:${minutes}`
    };
  };

  const realTimeNow = getRealTimeNow();

  // State Form Edit
  const [bikeId, setBikeId] = useState(booking.bikeId);
  const [startDate, setStartDate] = useState(booking.startDate);
  // Pastikan jam mulai berada di rentang 06:00 s/d 23:00
  const [startTime, setStartTime] = useState(() => {
    if (booking.startTime < '06:00') return '06:00';
    if (booking.startTime > '23:00') return '23:00';
    return booking.startTime;
  });
  const [durationType, setDurationType] = useState<'jam' | 'hari'>(booking.durationType);
  const [durationValue, setDurationValue] = useState(booking.durationValue);
  const [status, setStatus] = useState<BookingStatus>(booking.status);

  // Customer Data
  const [customerName, setCustomerName] = useState(booking.customerName);
  const [customerPhone, setCustomerPhone] = useState(booking.customerPhone);
  const [idCardNumber, setIdCardNumber] = useState(booking.idCardNumber || '');
  const [notes, setNotes] = useState(booking.notes || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(booking.paymentMethod);
  const [paymentStatus, setPaymentStatus] = useState<'lunas' | 'belum_lunas'>(booking.paymentStatus);

  // Late return / jam kepulangan (default ke waktu real-time jika berstatus selesai)
  const [actualReturnDate, setActualReturnDate] = useState(
    booking.actualReturnDate || realTimeNow.dateStr
  );
  const [actualReturnTime, setActualReturnTime] = useState(
    booking.actualReturnTime || realTimeNow.timeStr
  );
  const [returnNotes, setReturnNotes] = useState(booking.returnNotes || '');

  // Sinkronkan Tanggal & Jam Mulai Ambil ke Waktu Saat Ini
  const syncStartPickupToRealTime = () => {
    const rt = getRealTimeNow();
    setStartDate(rt.dateStr);
    setStartTime(rt.boundedTimeStr);
  };

  // Otomatis sinkronkan jam kepulangan menjadi real-time saat status diubah menjadi selesai
  const handleSetStatus = (newStatus: BookingStatus) => {
    setStatus(newStatus);
    if (newStatus === 'selesai') {
      const rt = getRealTimeNow();
      setActualReturnDate(rt.dateStr);
      setActualReturnTime(rt.timeStr);
      setPaymentStatus('lunas'); // transaksi beres pembayaran lunas
    }
  };

  const syncToCurrentRealTime = () => {
    const rt = getRealTimeNow();
    setActualReturnDate(rt.dateStr);
    setActualReturnTime(rt.timeStr);
  };

  const selectedBike = bikes.find(b => b.id === bikeId) || bikes[0];

  // Hitung jam selesai otomatis
  const calculateEndTime = () => {
    if (durationType === 'jam') {
      const [h, m] = startTime.split(':').map(Number);
      const endH = (h + durationValue) % 24;
      return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return startTime;
  };

  const calculateEndDate = () => {
    if (durationType === 'jam') {
      return startDate;
    }
    const d = new Date(startDate);
    d.setDate(d.getDate() + durationValue);
    return d.toISOString().split('T')[0];
  };

  const calculatedEndTime = calculateEndTime();
  const calculatedEndDate = calculateEndDate();

  // Hitung tarif sewa pokok berdasarkan tanggal & durasi
  const rateInfo = getDateRateInfo(startDate);
  const baseRentalCost =
    durationType === 'jam'
      ? (rateInfo.ratePerHour || selectedBike.pricePerHour) * durationValue
      : selectedBike.pricePerDay * durationValue;

  // Hitung biaya tambahan keterlambatan jika status 'selesai'
  const lateCalculation = useMemo(() => {
    if (status !== 'selesai') {
      return { lateMinutes: 0, extraHours: 0, lateFee: 0, isLate: false, ruleApplied: '' };
    }
    const returnRateInfo = getDateRateInfo(actualReturnDate || calculatedEndDate);
    const bikeRate = returnRateInfo.ratePerHour;
    return calculateLateFee(
      calculatedEndDate,
      calculatedEndTime,
      actualReturnDate,
      actualReturnTime,
      bikeRate
    );
  }, [status, calculatedEndDate, calculatedEndTime, actualReturnDate, actualReturnTime]);

  const finalTotalPrice = baseRentalCost + lateCalculation.lateFee;

  // Validasi bentrok jam / double transaksi untuk sepeda & jam baru (mengecualikan booking saat ini!)
  const conflictCheck = useMemo(() => {
    return checkBikeBookingConflict(
      bikeId,
      startDate,
      startTime,
      calculatedEndTime,
      bookings,
      selectedBike,
      booking.id // Kecualikan booking ini dari pemeriksaan bentrok
    );
  }, [bikeId, startDate, startTime, calculatedEndTime, bookings, selectedBike, booking.id]);

  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = () => {
    if (conflictCheck.hasConflict) {
      setErrorMessage(conflictCheck.message || 'Waktu atau sepeda bentrok dengan transaksi lain.');
      return;
    }

    try {
      updateBooking(booking.id, {
        bikeId,
        bikeName: selectedBike.name,
        bikeImage: selectedBike.imageUrl,
        startDate,
        startTime,
        endDate: calculatedEndDate,
        endTime: calculatedEndTime,
        durationType,
        durationValue,
        totalPrice: baseRentalCost,
        status,
        customerName,
        customerPhone,
        idCardNumber,
        notes,
        paymentMethod,
        paymentStatus,
        ...(status === 'selesai'
          ? {
              actualReturnDate,
              actualReturnTime,
              lateMinutes: lateCalculation.lateMinutes,
              lateExtraHours: lateCalculation.extraHours,
              lateFee: lateCalculation.lateFee,
              finalTotalPrice,
              returnNotes,
              returnedAt: `${actualReturnDate}T${actualReturnTime}:00`,
            }
          : {}),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      setErrorMessage(e?.message || 'Gagal menyimpan perubahan.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30">
              <BikeIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  Edit Booking & Serah Terima
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold">
                  {booking.bookingCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ganti unit sepeda, ubah jam sewa, tanggal, status pengembalian, atau data pelanggan.
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
          {/* Conflict Warning Banner */}
          {conflictCheck.hasConflict && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-xs font-bold">
                  ⛔ BENTROK TRANSAKSI TERDETEKSI:
                </strong>
                <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                  {conflictCheck.message}
                </p>
                <span className="text-[11px] text-rose-600 mt-1 block">
                  Pilih unit sepeda lain atau geser jam agar tidak tumpang tindih.
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Section 1: Ganti Unit Sepeda */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              1. Pilih / Ganti Unit Sepeda:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-2xl bg-slate-50/50">
              {bikes.map(b => {
                const isSelected = b.id === bikeId;
                const isMaintenance = b.status === 'maintenance';
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={isMaintenance}
                    onClick={() => {
                      setBikeId(b.id);
                      setErrorMessage('');
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : isMaintenance
                        ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={b.imageUrl}
                      alt={b.name}
                      className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 truncate block">
                          {b.name}
                        </span>
                        <span className="text-[9px] font-mono px-1 rounded bg-slate-100 text-slate-600">
                          {b.licenseNumber}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {formatRupiah(b.pricePerHour)}/jam • {b.category.toUpperCase()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Ganti Tanggal, Jam, dan Durasi Sewa (Sinkron & Bebas Bingung) */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-bold text-slate-800">
                  2. Tanggal & Jam Mulai Ambil Unit:
                </label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  rateInfo.isWeekend || rateInfo.isHoliday
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}>
                  {rateInfo.isHoliday
                    ? `🎉 ${rateInfo.holidayName} (Rp 10.000/jam)`
                    : rateInfo.isWeekend
                    ? '🏖️ Weekend (Rp 10.000/jam)'
                    : '💼 Hari Biasa (Rp 8.000/jam)'}
                </span>
              </div>

              <button
                type="button"
                onClick={syncStartPickupToRealTime}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-700 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                title="Samakan tanggal mulai dan jam ambil dengan waktu sekarang"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Samakan ke Waktu Sekarang (Real-Time)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Tanggal Mulai / Ambil:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    Jam Mulai Ambil:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">06:00 - 23:00</span>
                </label>
                <input
                  type="time"
                  min="06:00"
                  max="23:00"
                  value={startTime}
                  onChange={e => {
                    let val = e.target.value;
                    if (val && val < '06:00') val = '06:00';
                    if (val && val > '23:00') val = '23:00';
                    setStartTime(val);
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Durasi Sewa:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={durationValue}
                    onChange={e => setDurationValue(Math.max(1, Number(e.target.value)))}
                    className="w-20 px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs"
                  />
                  <select
                    value={durationType}
                    onChange={e => setDurationType(e.target.value as 'jam' | 'hari')}
                    className="flex-1 px-2.5 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs"
                  >
                    <option value="jam">Jam</option>
                    <option value="hari">Hari</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Jam Buttons (06:00 - 23:00) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <span className="text-[10px] text-slate-400 font-semibold shrink-0">Pilihan Jam (06:00 - 23:00):</span>
              {['06:00', '07:00', '08:00', '10:00', '13:00', '15:00', '17:00', '19:00', '21:00', '23:00'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setStartTime(t)}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all shrink-0 ${
                    startTime === t
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-2 border-t border-slate-200/80 gap-1">
              <span className="text-slate-600">
                Jadwal Sewa: <strong>{startDate} ({startTime})</strong> ➔ Selesai: <strong>{calculatedEndDate} ({calculatedEndTime} WIB)</strong>
              </span>
              <span className="font-extrabold text-emerald-700">
                Tarif Pokok: {formatRupiah(baseRentalCost)}
              </span>
            </div>
          </div>

          {/* Section 3: Status Booking & Kepulangan */}
          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-800">
              3. Status Booking & Pengembalian:
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'pending', label: 'Menunggu Diambil', color: 'border-sky-300 text-sky-800 bg-sky-50' },
                { id: 'aktif', label: 'Sedang di Luar', color: 'border-amber-300 text-amber-800 bg-amber-50' },
                { id: 'selesai', label: 'Sudah Kembali (Selesai)', color: 'border-emerald-300 text-emerald-800 bg-emerald-50' },
                { id: 'dibatalkan', label: 'Dibatalkan', color: 'border-slate-300 text-slate-700 bg-slate-50' },
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleSetStatus(st.id as BookingStatus)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    status === st.id
                      ? `${st.color} ring-2 ring-slate-900/10 shadow-xs font-extrabold`
                      : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Jika Status 'selesai': Form Jam Kepulangan & Biaya Tambahan Keterlambatan Real-Time */}
            {status === 'selesai' && (
              <div className="mt-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      Waktu Kepulangan Real-Time & Hitungan Denda:
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Jadwal selesai sewa sebelumnya: {calculatedEndTime} WIB
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={syncToCurrentRealTime}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Gunakan tanggal & jam real-time saat ini"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Set Real-Time Sekarang</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tanggal Pengembalian (Real-Time):
                    </label>
                    <input
                      type="date"
                      value={actualReturnDate}
                      onChange={e => setActualReturnDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Jam Kepulangan (Real-Time):
                    </label>
                    <input
                      type="time"
                      value={actualReturnTime}
                      onChange={e => setActualReturnTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Ringkasan Denda */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {lateCalculation.isLate
                        ? `⚠️ Terlambat ${lateCalculation.lateMinutes} Menit (${lateCalculation.ruleApplied})`
                        : '✅ Tepat Waktu / Sebelum Jadwal Selesai'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {lateCalculation.extraHours > 0
                        ? `Dikenakan +${lateCalculation.extraHours} jam denda keterlambatan`
                        : 'Bebas biaya denda tambahan (Toleransi terpenuhi)'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">
                      Denda Keterlambatan
                    </span>
                    <span className="font-black text-rose-600 text-sm">
                      {formatRupiah(lateCalculation.lateFee)}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-xl text-[11px] text-emerald-900 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Transaksi beres: Pendapatan senilai {formatRupiah(finalTotalPrice)} resmi masuk ke total omzet bisnis.
                  </span>
                </div>
              </div>
            )}

            {status !== 'selesai' && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  <strong>Catatan Omzet:</strong> Total pendapatan transaksi ini belum masuk ke laporan omzet sebelum unit sepeda dikembalikan dan berstatus selesai.
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Data Pelanggan & Pembayaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Nama Penyewa:
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                No. WhatsApp Penyewa:
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Metode Pembayaran:
              </label>
              <select
                value={paymentMethod}
                onChange={e => {
                  const val = e.target.value as PaymentMethod;
                  setPaymentMethod(val);
                  if (val === 'bayar_nanti') {
                    setPaymentStatus('belum_lunas');
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-medium"
              >
                <option value="bayar_nanti">💳 Bayar Nanti (Saat Pengembalian)</option>
                <option value="cash">💵 Tunai (Cash)</option>
                <option value="qris">📱 QRIS</option>
                <option value="transfer">🏦 Transfer Bank</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Status Pembayaran:
              </label>
              <select
                value={paymentStatus}
                onChange={e => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-medium"
              >
                <option value="lunas">Lunas</option>
                <option value="belum_lunas">Belum Lunas</option>
              </select>
            </div>
          </div>

          {/* Total Tagihan Akhir */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Tagihan Final:</span>
              <span className="text-[10px] text-slate-400 block">
                Sewa: {formatRupiah(baseRentalCost)} {lateCalculation.lateFee > 0 && `+ Denda: ${formatRupiah(lateCalculation.lateFee)}`}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mt-1 ${
                status === 'selesai'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {status === 'selesai'
                  ? '✓ Dihitung ke Total Pendapatan'
                  : '⏳ Belum Masuk Total Pendapatan (Belum Selesai)'}
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              {formatRupiah(finalTotalPrice)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={conflictCheck.hasConflict}
            onClick={handleSave}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
              conflictCheck.hasConflict
                ? 'bg-slate-400 text-white cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
