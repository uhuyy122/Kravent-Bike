import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  CheckCircle,
  Bike as BikeIcon,
  Phone,
  MessageCircle,
  ShieldAlert,
  Send,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { Bike, Booking, PaymentMethod } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { useApp } from '../context/AppContext';
import { getDateRateInfo } from '../utils/pricingUtils';
import {
  getTodayDateStr,
  checkBikeBookingConflict,
  isPastHourToday
} from '../utils/scheduleUtils';

interface BookingModalProps {
  bike: Bike;
  initialDate?: string;
  initialStartTime?: string;
  initialDurationType?: 'jam' | 'hari';
  initialDurationValue?: number;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  onClose: () => void;
  onBookingSuccess?: (booking: Booking) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  bike,
  initialDate,
  initialStartTime,
  initialDurationType,
  initialDurationValue,
  initialCustomerName,
  initialCustomerPhone,
  onClose,
  onBookingSuccess,
}) => {
  const { addBooking, currentRole, bikes, bookings } = useApp();

  const isCustomer = currentRole === 'customer';
  const todayStr = getTodayDateStr();

  // Booking Form State
  const [selectedBikeId, setSelectedBikeId] = useState(bike.id);
  const activeBike = bikes.find(b => b.id === selectedBikeId) || bike;

  const [startDate, setStartDate] = useState(() => {
    return initialDate && initialDate >= todayStr ? initialDate : todayStr;
  });
  const [startTime, setStartTime] = useState(() => {
    if (initialStartTime) {
      if (initialStartTime < '06:00') return '06:00';
      if (initialStartTime > '23:00') return '23:00';
      return initialStartTime;
    }
    const curH = new Date().getHours();
    const nextH = Math.min(Math.max(curH + 1, 6), 23);
    return `${String(nextH).padStart(2, '0')}:00`;
  });
  const [durationType, setDurationType] = useState<'jam' | 'hari'>(initialDurationType || 'jam');
  const [durationValue, setDurationValue] = useState(initialDurationValue || 3);

  const [customerName, setCustomerName] = useState(
    initialCustomerName || (isCustomer ? '' : 'Pelanggan dari WhatsApp')
  );
  const [customerPhone, setCustomerPhone] = useState(
    initialCustomerPhone || (isCustomer ? '' : '08')
  );
  const [idCardNumber, setIdCardNumber] = useState('');
  const [notes, setNotes] = useState('Include helm & kunci gembok');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bayar_nanti');

  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Price calculations based on date rate info (hari biasa 8rb, weekend/libur 10rb)
  const rateInfo = getDateRateInfo(startDate);
  const rentalCost =
    durationType === 'jam'
      ? rateInfo.ratePerHour * durationValue
      : activeBike.pricePerDay * durationValue;

  const depositAmount = activeBike.depositRequired;
  const grandTotal = rentalCost;

  // Calculate return time
  const calculateEndTime = () => {
    if (durationType === 'jam') {
      const [hour, minute] = startTime.split(':').map(Number);
      const endHour = (hour + durationValue) % 24;
      const formattedHour = endHour.toString().padStart(2, '0');
      return `${formattedHour}:${minute.toString().padStart(2, '0')}`;
    } else {
      return startTime;
    }
  };

  const calculateEndDate = () => {
    if (durationType === 'jam') {
      return startDate;
    } else {
      const d = new Date(startDate);
      d.setDate(d.getDate() + durationValue);
      return d.toISOString().split('T')[0];
    }
  };

  const calculatedEndTime = calculateEndTime();
  const calculatedEndDate = calculateEndDate();

  // Pengecekan bentrok jadwal & sepeda di jalan
  const conflict = checkBikeBookingConflict(
    activeBike.id,
    startDate,
    startTime,
    calculatedEndTime,
    bookings,
    activeBike
  );

  // Admin / Staff submits booking directly to database
  const handleSubmitAdminBooking = (e: React.FormEvent) => {
    e.preventDefault();

    if (conflict.hasConflict) {
      alert(`TRANSAKSI DITOLAK: ${conflict.message}`);
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Mohon isi nama lengkap dan nomor telepon/WhatsApp pelanggan.');
      return;
    }

    const isPayLater = paymentMethod === 'bayar_nanti';
    const newBooking = addBooking({
      bikeId: activeBike.id,
      bikeName: activeBike.name,
      bikeImage: activeBike.imageUrl,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      idCardNumber: idCardNumber.trim() || undefined,
      startDate,
      startTime,
      endDate: calculatedEndDate,
      endTime: calculatedEndTime,
      durationType,
      durationValue,
      totalPrice: grandTotal,
      depositAmount,
      status: 'aktif', // langsung aktif tercatat di sistem
      paymentMethod,
      paymentStatus: isPayLater ? 'belum_lunas' : 'lunas',
      notes: notes.trim() || undefined,
      handoverBy: currentRole === 'admin' ? 'Admin Pemilik' : 'Staff Toko',
    });

    setConfirmedBooking(newBooking);
    if (onBookingSuccess) {
      onBookingSuccess(newBooking);
    }
  };

  // Customer triggers WhatsApp chat with prefilled message
  const handleCustomerSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();

    if (conflict.hasConflict) {
      alert(`Pemesanan tidak bisa dilakukan: ${conflict.message}`);
      return;
    }

    if (!customerName.trim()) {
      alert('Mohon masukkan nama Anda terlebih dahulu.');
      return;
    }

    const adminWhatsAppNumber = '6289647123671'; // Nomor WhatsApp Admin Kravent Bike (089647123671)

    const textLines = [
      `Halo Admin Kravent Bike! Saya ingin booking sewa sepeda:`,
      `• Unit: *${activeBike.name}* (${activeBike.licenseNumber})`,
      `• Tanggal Sewa: ${formatDateIndo(startDate)}`,
      `• Jam Mulai: ${startTime} WIB`,
      `• Durasi: ${durationValue} ${durationType} (Sampai ${calculatedEndTime} WIB)`,
      `• Estimasi Biaya: ${formatRupiah(grandTotal)}`,
      `• Pembayaran: *Bayar Nanti (Saat Pengembalian Sepeda)*`,
      `• Nama Pemesan: ${customerName}`,
      customerPhone ? `• No HP/WA: ${customerPhone}` : '',
      notes ? `• Catatan: ${notes}` : '',
      ``,
      `Mohon info ketersediaan unit sepeda ini untuk diinput ke sistem. Terima kasih!`
    ].filter(Boolean).join('\n');

    const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(textLines)}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto border border-slate-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              isCustomer ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
            }`}>
              {isCustomer ? <MessageCircle className="w-4 h-4" /> : <BikeIcon className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {confirmedBooking
                  ? 'Booking Berhasil Diinput Admin'
                  : isCustomer
                  ? 'Booking Sepeda via WhatsApp Admin'
                  : 'Input Booking Baru (Admin / Staff Kasir)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isCustomer
                  ? 'Pemesanan diverifikasi dan diinput oleh Admin via WhatsApp'
                  : 'Pencatatan data pesanan yang masuk dari WhatsApp atau Pelanggan Langsung'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* IF CONFIRMED (AFTER ADMIN INPUT) */}
        {confirmedBooking ? (
          <div className="p-6 space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-lg">Booking Berhasil Tercatat di Sistem!</h4>
              <p className="text-xs text-slate-600 mt-1">
                Data sepeda keluar, omzet hari ini, dan unit armada telah diperbarui secara otomatis.
              </p>
              <div className="inline-block mt-3 px-4 py-1.5 bg-white border border-emerald-300 rounded-xl font-mono font-bold text-emerald-800 text-sm shadow-xs">
                {confirmedBooking.bookingCode}
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Sepeda:</span>
                <span className="font-bold text-slate-800">{activeBike.name} ({activeBike.licenseNumber})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Penyewa:</span>
                <span className="font-bold text-slate-800">{confirmedBooking.customerName} ({confirmedBooking.customerPhone})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Jadwal Sewa:</span>
                <span className="font-bold text-slate-800">
                  {formatDateIndo(confirmedBooking.startDate)} ({confirmedBooking.startTime} - {confirmedBooking.endTime} WIB)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Total Tarif:</span>
                <span className="font-extrabold text-emerald-700 text-sm">{formatRupiah(confirmedBooking.totalPrice)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        ) : isCustomer ? (
          /* ========================================================= */
          /* CUSTOMER VIEW: BOOKING VIA WHATSAPP (NO WEB DIRECT BOOK)  */
          /* ========================================================= */
          <form onSubmit={handleCustomerSendWhatsApp} className="p-6 space-y-5">
            {/* Banner info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <strong>Booking Dilayani Langsung via WhatsApp Admin</strong>
                <p className="text-emerald-700 mt-0.5">
                  Untuk memastikan ketersediaan unit dan verifikasi cepat, silakan tentukan tanggal dan jam sewa di bawah ini, lalu klik tombol hijau untuk mengirim format booking ke WhatsApp Admin. Admin kami yang akan menginput pesanan Anda.
                </p>
              </div>
            </div>

            {/* Selected Bike Summary */}
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <img
                src={activeBike.imageUrl}
                alt={activeBike.name}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    {activeBike.licenseNumber}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {formatRupiah(activeBike.pricePerHour)}/jam • {formatRupiah(activeBike.pricePerDay)}/hari
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mt-1">{activeBike.name}</h4>
                <p className="text-xs text-slate-500">{activeBike.gearSystem} • {activeBike.frameSize}</p>
              </div>
            </div>

            {/* Date & Time Picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Rencana Tanggal & Jam Sewa Sepeda
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const y = now.getFullYear();
                      const m = String(now.getMonth() + 1).padStart(2, '0');
                      const d = String(now.getDate()).padStart(2, '0');
                      const h = String(Math.min(Math.max(now.getHours(), 6), 23)).padStart(2, '0');
                      const min = String(now.getMinutes()).padStart(2, '0');
                      setStartDate(`${y}-${m}-${d}`);
                      setStartTime(`${h}:${min}`);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-800 transition-colors cursor-pointer"
                    title="Gunakan tanggal dan jam sekarang"
                  >
                    ⚡ Jam Sekarang
                  </button>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setDurationType('jam');
                        setDurationValue(3);
                      }}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        durationType === 'jam'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Per Jam
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDurationType('hari');
                        setDurationValue(1);
                      }}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        durationType === 'hari'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Harian
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Tanggal Sewa
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={startDate}
                    onChange={e => {
                      const val = e.target.value;
                      if (val && val < todayStr) {
                        alert('Tanggal kemarin tidak dapat dipilih. Silakan pilih hari ini atau tanggal selanjutnya.');
                        setStartDate(todayStr);
                        return;
                      }
                      setStartDate(val);
                    }}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      Jam Mulai Ambil
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
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Durasi Sewa
                  </label>
                  <select
                    value={durationValue}
                    onChange={e => setDurationValue(parseInt(e.target.value, 10))}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-semibold"
                  >
                    {durationType === 'jam' ? (
                      <>
                        <option value={1}>1 Jam</option>
                        <option value={2}>2 Jam</option>
                        <option value={3}>3 Jam (Paling Populer)</option>
                        <option value={4}>4 Jam</option>
                        <option value={5}>5 Jam</option>
                        <option value={8}>8 Jam</option>
                      </>
                    ) : (
                      <>
                        <option value={1}>1 Hari (24 Jam)</option>
                        <option value={2}>2 Hari (Weekend)</option>
                        <option value={3}>3 Hari</option>
                        <option value={7}>1 Minggu</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Quick Jam Buttons (06:00 - 23:00) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[10px] text-slate-500 font-bold shrink-0">Pilihan Jam (06:00 - 23:00 WIB):</span>
                  <span className="text-[10px] text-emerald-700 font-extrabold font-mono">Pilihan: {startTime} WIB</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                  {[
                    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
                    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
                    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
                  ].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setStartTime(t)}
                      className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold font-mono transition-all shrink-0 cursor-pointer ${
                        startTime === t
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs scale-105'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pemberitahuan Tarif Sesuai Tanggal */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${rateInfo.badgeBg} ${rateInfo.badgeBorder}`}>
                <div className="flex items-center gap-2">
                  <span>{rateInfo.category === 'weekday' ? '🌿' : rateInfo.category === 'holiday' ? '🎉' : '🔥'}</span>
                  <div>
                    <span className={`font-bold ${rateInfo.badgeText}`}>{rateInfo.label}:</span>{' '}
                    <span className="text-slate-700 font-semibold">
                      {rateInfo.category === 'weekday' ? 'Rp 8.000/jam' : 'Rp 10.000/jam'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-white/70 px-2 py-0.5 rounded">
                  Otomatis Terhitung
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs text-slate-700">
                <span className="text-slate-500">Estimasi Selesai:</span>
                <span className="font-bold text-slate-800">
                  {formatDateIndo(calculatedEndDate)} pukul {calculatedEndTime} WIB
                </span>
              </div>
            </div>

            {/* Customer Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Anda *
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap Anda"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  No. WhatsApp Anda (Opsional)
                </label>
                <input
                  type="tel"
                  placeholder="0812xxxxxxxx"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                />
              </div>
            </div>

            {/* Peringatan bentrok pada Customer */}
            {conflict.hasConflict && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-900 block font-bold">Jadwal Bentrok / Sepeda Sedang di Jalan:</strong>
                  <span>{conflict.message}</span>
                </div>
              </div>
            )}

            {/* WhatsApp CTA Footer */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-slate-400 block">Estimasi Total Biaya:</span>
                <span className="text-xl font-extrabold text-emerald-400">
                  {formatRupiah(grandTotal)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Deposit: {formatRupiah(depositAmount)} (Dikembalikan setelah unit selesai)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs text-slate-300 hover:text-white"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={conflict.hasConflict}
                  className={`px-5 py-2.5 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                    conflict.hasConflict
                      ? 'bg-rose-950/70 border border-rose-800 text-rose-300 cursor-not-allowed opacity-80'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 cursor-pointer'
                  }`}
                  title={conflict.hasConflict ? 'Bentrok transaksi / sepeda masih di jalan' : 'Kirim'}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{conflict.hasConflict ? '⛔ Jam Bentrok / Di Jalan' : 'Kirim Booking via WhatsApp'}</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* ========================================================= */
          /* ADMIN & STAFF VIEW: INPUT PESANAN MASUK KE SISTEM         */
          /* ========================================================= */
          <form onSubmit={handleSubmitAdminBooking} className="p-6 space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
              <UserCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <strong>Mode Input Manual (Admin / Staf Kasir)</strong>
                <p className="text-amber-800 mt-0.5">
                  Gunakan form ini untuk mencatat pesanan customer yang masuk dari chat WhatsApp atau yang datang langsung ke outlet. Booking ini akan otomatis masuk ke data unit keluar dan grafik omzet.
                </p>
              </div>
            </div>

            {/* Bike selection */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Pilih Sepeda yang Disewa
              </label>
              <select
                value={selectedBikeId}
                onChange={e => setSelectedBikeId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
              >
                {bikes.map(b => (
                  <option key={b.id} value={b.id}>
                    [{b.licenseNumber}] {b.name} - ({b.status === 'tersedia' ? 'Tersedia' : b.status === 'disewa' ? 'Sedang Disewa' : 'Mentenest'})
                  </option>
                ))}
              </select>
            </div>

            {/* Date & Time Picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Jadwal Tanggal & Jam Sewa
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const y = now.getFullYear();
                      const m = String(now.getMonth() + 1).padStart(2, '0');
                      const d = String(now.getDate()).padStart(2, '0');
                      const h = String(Math.min(Math.max(now.getHours(), 6), 23)).padStart(2, '0');
                      const min = String(now.getMinutes()).padStart(2, '0');
                      setStartDate(`${y}-${m}-${d}`);
                      setStartTime(`${h}:${min}`);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-800 transition-colors cursor-pointer"
                    title="Gunakan tanggal dan jam sekarang"
                  >
                    ⚡ Jam Sekarang
                  </button>
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setDurationType('jam');
                        setDurationValue(3);
                      }}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        durationType === 'jam'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Sewa per Jam
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDurationType('hari');
                        setDurationValue(1);
                      }}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        durationType === 'hari'
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Sewa Harian
                    </button>
                  </div>
                </div>
              </div>

              {/* NOTIFIKASI SINKRONISASI DARI ALUR BOOKING */}
              {initialStartTime && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-xs text-emerald-900 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Jam Diselaraskan dari Alur Booking:</strong> Mulai <strong>{startTime} WIB</strong> (Durasi {durationValue} Jam ➔ Kembali {calculatedEndTime} WIB).
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2 py-0.5 rounded shrink-0">
                    Terhubung
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={startDate}
                    onChange={e => {
                      const val = e.target.value;
                      if (val && val < todayStr) {
                        alert('Tanggal kemarin tidak dapat dipilih. Silakan pilih hari ini atau tanggal selanjutnya.');
                        setStartDate(todayStr);
                        return;
                      }
                      setStartDate(val);
                    }}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      Jam Mulai Ambil
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
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Durasi ({durationType})
                  </label>
                  <select
                    value={durationValue}
                    onChange={e => setDurationValue(parseInt(e.target.value, 10))}
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-semibold"
                  >
                    {durationType === 'jam' ? (
                      <>
                        <option value={1}>1 Jam</option>
                        <option value={2}>2 Jam</option>
                        <option value={3}>3 Jam</option>
                        <option value={4}>4 Jam</option>
                        <option value={5}>5 Jam</option>
                        <option value={8}>8 Jam</option>
                        <option value={10}>10 Jam</option>
                        <option value={12}>12 Jam (Seharian)</option>
                      </>
                    ) : (
                      <>
                        <option value={1}>1 Hari (24 Jam)</option>
                        <option value={2}>2 Hari</option>
                        <option value={3}>3 Hari</option>
                        <option value={7}>1 Minggu (7 Hari)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Quick Jam Buttons (06:00 - 23:00) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[10px] text-slate-500 font-bold shrink-0">Pilihan Jam (06:00 - 23:00 WIB):</span>
                  <span className="text-[10px] text-emerald-700 font-extrabold font-mono">Pilihan: {startTime} WIB</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                  {[
                    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
                    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
                    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
                  ].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setStartTime(t)}
                      className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold font-mono transition-all shrink-0 cursor-pointer ${
                        startTime === t
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs scale-105'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rangkuman Jadwal Selesai */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between text-xs text-slate-700">
                <span className="text-slate-500">Estimasi Selesai / Kembali:</span>
                <span className="font-bold text-slate-800">
                  {formatDateIndo(calculatedEndDate)} pukul {calculatedEndTime} WIB
                </span>
              </div>

              {/* REAL-TIME COLLISION & AVAILABILITY NOTIFICATION IN ADMIN FORM */}
              {conflict.hasConflict ? (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-400 rounded-2xl flex items-start gap-3 text-xs text-rose-900 shadow-xs">
                  <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-sm">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-rose-900 block text-sm font-black">
                      ⛔ BENTROK TRANSAKSI: DILARANG DOUBLE TRANSAKSI!
                    </strong>
                    <p className="text-rose-800 mt-1 font-semibold leading-relaxed">
                      {conflict.message}
                    </p>
                    <span className="text-[11px] text-rose-600 block mt-1 font-medium">
                      ⚠️ Sistem secara ketat mencegah unit sepeda dan jam yang sama agar tidak terjadi double booking atau unit sedang di jalan.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Unit Bebas Bentrok:</strong> Sepeda [{activeBike.licenseNumber}] {activeBike.name} tersedia pada rentang jam {startTime} - {calculatedEndTime} WIB.
                  </span>
                </div>
              )}
            </div>

            {/* Customer Info Input */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Data Customer dari WhatsApp
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Nama Customer *
                  </label>
                  <input
                    type="text"
                    placeholder="Nama di WhatsApp"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    No WhatsApp Customer *
                  </label>
                  <input
                    type="tel"
                    placeholder="0812xxxxxxxx"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Metode Pembayaran *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-semibold text-slate-800"
                  >
                    <option value="bayar_nanti">💳 Bayar Nanti (Saat Pengembalian Sepeda - Default)</option>
                    <option value="cash">💵 Bayar Sekarang di Tempat (Cash)</option>
                    <option value="qris">📱 QRIS Sekarang (Lunas)</option>
                    <option value="transfer">🏦 Transfer Bank Sekarang (Lunas)</option>
                  </select>
                  {paymentMethod === 'bayar_nanti' && (
                    <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-snug">
                      ℹ️ <strong>SOP Bayar Nanti:</strong> Pembayaran sewa pokok ({formatRupiah(grandTotal)}) dan denda keterlambatan (jika ada) akan dihitung & ditagih saat customer mengembalikan sepeda.
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Catatan Khusus
                  </label>
                  <input
                    type="text"
                    placeholder="Ukuran helm, gembok, dll"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Admin Input Footer */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Omzet Dicatat:</span>
                <span className="text-xl font-extrabold text-emerald-400">
                  {formatRupiah(grandTotal)}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Deposit Jaminan: {formatRupiah(depositAmount)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={conflict.hasConflict}
                  className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
                    conflict.hasConflict
                      ? 'bg-rose-950/70 text-rose-300 border border-rose-800/80 cursor-not-allowed opacity-80'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer'
                  }`}
                  title={conflict.hasConflict ? 'Bentrok transaksi / sepeda masih di jalan' : 'Simpan'}
                >
                  <span>{conflict.hasConflict ? '⛔ Dilarang Double Transaksi' : 'Simpan Booking ke Sistem'}</span>
                  {!conflict.hasConflict && <CheckCircle className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
