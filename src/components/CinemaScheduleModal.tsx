import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  Sparkles,
  Info,
  ChevronRight,
  Plus,
  Bike as BikeIcon,
  Phone,
  Timer,
  Check
} from 'lucide-react';
import { Bike } from '../types';
import { useApp } from '../context/AppContext';
import {
  checkCustomTimeCollision,
  getUpcomingDates,
  getTodayDateStr,
  isPastHourToday,
  isTimeRangeOverlap
} from '../utils/scheduleUtils';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { getDateRateInfo } from '../utils/pricingUtils';
import { Tag } from 'lucide-react';

interface CinemaScheduleModalProps {
  bike: Bike;
  initialDate?: string;
  onClose: () => void;
  onAdminInputDirect?: (
    bike: Bike,
    date: string,
    startTime: string,
    duration: number,
    customerName?: string,
    customerPhone?: string
  ) => void;
}

export const CinemaScheduleModal: React.FC<CinemaScheduleModalProps> = ({
  bike,
  initialDate,
  onClose,
  onAdminInputDirect,
}) => {
  const { bookings, currentRole } = useApp();
  const isCustomer = currentRole === 'customer';

  const todayStr = getTodayDateStr();

  // Input waktu bebas (default hari ini, dilarang tanggal kemarin)
  const [selectedDate, setSelectedDate] = useState(() => {
    return initialDate && initialDate >= todayStr ? initialDate : todayStr;
  });

  // Tentukan jam mulai awal yang belum lewat untuk hari ini (06:00 s/d 23:00)
  const getInitialStartTime = () => {
    const now = new Date();
    const curH = now.getHours();
    if (selectedDate === todayStr) {
      const nextH = Math.min(Math.max(curH + 1, 6), 23);
      return `${String(nextH).padStart(2, '0')}:00`;
    }
    return '06:00';
  };

  const [startTime, setStartTime] = useState(getInitialStartTime);
  const [durationHours, setDurationHours] = useState(3);

  // Customer info for quick WhatsApp booking
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const upcomingDates = getUpcomingDates(todayStr, 7);

  // Hitung jam selesai otomatis
  const calculateEndTime = (start: string, duration: number): string => {
    try {
      const [h, m] = start.split(':').map(Number);
      const endH = (h + duration) % 24;
      return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } catch {
      return '10:00';
    }
  };

  const endTime = calculateEndTime(startTime, durationHours);

  // Cek ketersediaan real-time berdasarkan unit sepeda, tanggal, & jam yang diinput
  const { isAvailable, conflictingBooking, conflictReason, bookedList } = checkCustomTimeCollision(
    bike.id,
    selectedDate,
    startTime,
    endTime,
    bookings,
    bike
  );

  // Cek tarif berdasarkan tanggal: hari biasa 8rb, sabtu/minggu & libur 10rb
  const rateInfo = getDateRateInfo(selectedDate);
  const totalCost = rateInfo.ratePerHour * durationHours;

  // Handle WhatsApp Submission
  const handleSendToWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAvailable) {
      alert(`Transaksi dilarang: ${conflictReason || 'Jam yang Anda pilih bentrok atau unit sepeda masih di jalan. Silakan pilih jam kosong lain.'}`);
      return;
    }
    if (!customerName.trim()) {
      alert('Mohon masukkan nama Anda terlebih dahulu.');
      return;
    }

    const adminWhatsAppNumber = '6289647123671';
    const message = [
      `Halo Admin Kravent Bike! Saya ingin booking sewa sepeda:`,
      `• Unit Sepeda: *${bike.name}* (${bike.licenseNumber})`,
      `• Tanggal Sewa: *${formatDateIndo(selectedDate)}* (${rateInfo.label})`,
      `• Jam Sewa: *${startTime} - ${endTime} WIB* (${durationHours} Jam @ ${formatRupiah(rateInfo.ratePerHour)}/jam)`,
      `• Estimasi Biaya: *${formatRupiah(totalCost)}*`,
      `• Nama Pemesan: ${customerName}`,
      customerPhone ? `• No WhatsApp: ${customerPhone}` : '',
      ``,
      `⚠️ *Penting:* Pesanan yang telah dikirim ke WhatsApp ini WAJIB tetap dikonfirmasi oleh staf toko terlebih dahulu sebelum unit dapat diambil / digunakan.`,
      `Saya sudah cek jam tersebut berstatus KOSONG di katalog. Mohon konfirmasi & input ke sistem. Terima kasih!`
    ].filter(Boolean).join('\n');

    const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  // Timeline jam operasional harian (06:00 s/d 23:00)
  const timelineHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto border border-slate-200 flex flex-col max-h-[94vh]">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <BikeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-400 text-slate-950 uppercase tracking-wider">
                  Alur Booking
                </span>
                <span className="text-xs text-slate-400 font-mono">{bike.licenseNumber}</span>
              </div>
              <h3 className="font-extrabold text-base text-white mt-0.5">
                Pilih Tanggal & Jam Sewa Sepeda
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step-by-Step Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* ======================================================== */}
          {/* LANGKAH 1: SEPEDA YANG DIPILIH                            */}
          {/* ======================================================== */}
          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">
                1
              </span>
              Sepeda yang Dipilih:
            </span>

            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <img
                src={bike.imageUrl}
                alt={bike.name}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {bike.licenseNumber}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-700">
                    {formatRupiah(bike.pricePerHour)}/jam
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{bike.name}</h4>
                <p className="text-[11px] text-slate-500">{bike.gearSystem} • {bike.frameSize}</p>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* LANGKAH 2: PILIH TANGGAL BERAPA                           */}
          {/* ======================================================== */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">
                  2
                </span>
                Pilih Tanggal Berapa:
              </span>
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={e => {
                  const val = e.target.value;
                  if (val && val < todayStr) {
                    alert('Tanggal kemarin tidak dapat dipilih. Silakan pilih hari ini atau tanggal selanjutnya.');
                    setSelectedDate(todayStr);
                    return;
                  }
                  setSelectedDate(val);
                }}
                className="text-xs font-semibold px-2.5 py-1 border border-slate-300 rounded-lg bg-white focus:outline-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {upcomingDates.map(item => {
                const isActive = selectedDate === item.dateStr;
                const itemRate = getDateRateInfo(item.dateStr);
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`flex flex-col items-center justify-center py-2 px-3.5 rounded-2xl border transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md font-bold scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                      {item.dayName}
                    </span>
                    <span className="text-base font-extrabold">{item.dayNum}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                      isActive
                        ? 'bg-amber-400 text-slate-950'
                        : itemRate.category === 'weekday'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {itemRate.ratePerHour === 8000 ? '8rb/jam' : '10rb/jam'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* PEMBERITAHUAN TARIF SESUAI TANGGAL DIPILIH */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${rateInfo.badgeBg} ${rateInfo.badgeBorder}`}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">
                  {rateInfo.category === 'weekday' ? '🌿' : rateInfo.category === 'holiday' ? '🎉' : '🔥'}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-extrabold text-xs ${rateInfo.badgeText}`}>{rateInfo.label}</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                      rateInfo.category === 'weekday' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {rateInfo.category === 'weekday' ? 'Tarif Hari Biasa' : 'Tarif Weekend / Libur'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    {rateInfo.description} (Diberitahukan otomatis di sini)
                  </span>
                </div>
              </div>

              <div className="text-right pl-2">
                <span className={`text-base font-black ${rateInfo.badgeText} block`}>
                  {formatRupiah(rateInfo.ratePerHour)}
                </span>
                <span className="text-[10px] text-slate-500">/jam</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* LANGKAH 3: PILIH JAMNYA (INPUT JAM MULAI & DURASI)       */}
          {/* ======================================================== */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">
                  3
                </span>
                Pilih Jamnya:
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Tentukan jam mulai ambil sepeda dan berapa jam durasinya.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {/* Jam Mulai */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jam Mulai Ambil
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
                  className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-mono"
                  required
                />
              </div>

              {/* Durasi Jam */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Durasi Sewa
                </label>
                <select
                  value={durationHours}
                  onChange={e => setDurationHours(parseInt(e.target.value, 10))}
                  className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                >
                  <option value={1}>1 Jam</option>
                  <option value={2}>2 Jam</option>
                  <option value={3}>3 Jam</option>
                  <option value={4}>4 Jam</option>
                  <option value={5}>5 Jam</option>
                  <option value={6}>6 Jam</option>
                  <option value={8}>8 Jam</option>
                  <option value={10}>10 Jam</option>
                  <option value={12}>12 Jam (Seharian)</option>
                </select>
              </div>

              {/* Jam Selesai Terhitung */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jam Kembali
                </label>
                <div className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 flex items-center justify-between">
                  <span>{endTime} WIB</span>
                  <span className="text-[10px] text-slate-500 font-normal">({durationHours} Jam)</span>
                </div>
              </div>
            </div>

            {/* Quick Hour Selection Buttons (06:00 - 23:00) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[10px] text-slate-500 font-bold shrink-0">
                  Pilihan Jam Operasional (06:00 - 23:00 WIB):
                </span>
                <span className="text-[10px] text-emerald-700 font-extrabold font-mono">
                  Terpilih: {startTime} WIB
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-[11px]">
                {[
                  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
                  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
                  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
                ].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStartTime(t)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold font-mono transition-all shrink-0 cursor-pointer ${
                      startTime === t
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* STATUS JADWAL TERISI / KOSONG PADA TANGGAL INI */}
            {bookedList.length > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Jadwal yang Sudah Terisi pada {formatDateIndo(selectedDate)}:
                </span>
                <div className="flex flex-wrap gap-2">
                  {bookedList.map((b, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 text-rose-700 font-mono text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Pukul {b.startTime} - {b.endTime} WIB (Sudah Dibooking)
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-amber-800">
                  💡 <strong>Tips:</strong> Jam di luar jadwal di atas masih kosong dan bebas Anda sewa!
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Sepeda Kosong Seharian Penuh</strong> pada {formatDateIndo(selectedDate)}. Anda bebas memilih jam kapan saja!
                </span>
              </div>
            )}

            {/* REAL-TIME AVAILABILITY NOTIFICATION */}
            {isAvailable ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-emerald-800 block text-xs">
                    JAM INI KOSONG & BISA DIBOOKING!
                  </strong>
                  <span className="text-emerald-700">
                    Sepeda bebas digunakan pada <strong>{startTime} - {endTime} WIB</strong> tanggal {formatDateIndo(selectedDate)}.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-400 rounded-2xl flex items-start gap-3 text-xs text-rose-900 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-sm">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-rose-900 block text-sm font-black">
                    ⛔ TRANSAKSI DITOLAK / DILARANG DOUBLE BOOKING!
                  </strong>
                  <p className="text-rose-800 mt-1 font-semibold leading-relaxed">
                    {conflictReason || `Unit sepeda sudah dibooking pada jam ${conflictingBooking?.startTime} - ${conflictingBooking?.endTime} WIB (${conflictingBooking?.customerName || ''}).`}
                  </p>
                  <span className="text-[11px] text-rose-600 block mt-1 font-medium">
                    ⚠️ Transaksi tidak bisa diproses jika unit sepeda sudah dibooking pada jam tersebut atau sepeda masih aktif di jalan.
                  </span>
                </div>
              </div>
            )}

            {/* Bagan Jam Harian - Seperti Kursi Bioskop */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-emerald-600" />
                  Bagan Jadwal Jam (Pilih Jam Mulai Langsung di Bawah):
                </span>
                <span className="text-[11px] text-slate-500">
                  {bookedList.length === 0 ? '🟢 Semua jam masih kosong' : `🔴 ${bookedList.length} jadwal terisi`}
                </span>
              </div>

              {/* Grid Kursi/Jam (06:00 s/d 23:00) */}
              <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-9 lg:grid-cols-[repeat(18,minmax(0,1fr))] gap-1 sm:gap-1.5 text-center">
                {timelineHours.map(h => {
                  const hourStr = `${String(h).padStart(2, '0')}:00`;
                  const nextHourStr = h === 23 ? '24:00' : `${String(h + 1).padStart(2, '0')}:00`;
                  const isHourPast = isPastHourToday(selectedDate, h);
                  const isHourBooked = bookedList.some(
                    b => isTimeRangeOverlap(b.startTime, b.endTime, hourStr, nextHourStr)
                  );
                  const isUserSelected = isTimeRangeOverlap(startTime, endTime, hourStr, nextHourStr);

                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        if (isHourPast) {
                          alert(`Pukul ${hourStr} WIB sudah lewat hari ini. Pilih jam sekarang atau jam selanjutnya.`);
                        } else if (isHourBooked) {
                          alert(`Pukul ${hourStr} - ${nextHourStr} WIB sudah dibooking / sepeda masih di jalan. Silakan klik jam lain yang berwarna hijau.`);
                        } else {
                          setStartTime(hourStr);
                        }
                      }}
                      className={`p-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isHourPast
                          ? 'bg-slate-200/90 text-slate-400 border border-slate-300 font-medium cursor-not-allowed opacity-60'
                          : isHourBooked
                          ? 'bg-rose-500 text-white font-extrabold shadow-xs hover:bg-rose-600'
                          : isUserSelected
                          ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-500 shadow-sm scale-105'
                          : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200 hover:border-emerald-400 font-semibold'
                      }`}
                      title={
                        isHourPast
                          ? `Pukul ${hourStr} SUDAH LEWAT HARI INI`
                          : isHourBooked
                          ? `Pukul ${hourStr} SUDAH DIBOOKING`
                          : isUserSelected
                          ? `Pukul ${hourStr} TERPILIH`
                          : `Klik untuk mulai sewa pukul ${hourStr}`
                      }
                    >
                      <span className="text-[11px] font-mono leading-none">{String(h).padStart(2, '0')}</span>
                      <span className="text-[8px] uppercase tracking-tighter mt-0.5 opacity-90">
                        {isHourPast ? 'Lewat' : isHourBooked ? 'Terisi' : isUserSelected ? 'Pilih' : 'Free'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Keterangan Warna / Legenda */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-slate-200/80 text-[10px] text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-white border border-slate-300"></span>
                  <strong>Putih:</strong> Jam Kosong (Bebas Dipilih)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-400 border border-amber-500"></span>
                  <strong>Kuning:</strong> Jam Pilihan Anda
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-500"></span>
                  <strong>Merah:</strong> Sudah Terisi / Di Jalan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-200 border border-slate-300"></span>
                  <strong>Abu:</strong> Sudah Lewat Hari Ini
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* LANGKAH 4: DATA DIRI & KIRIM KE WHATSAPP                */}
          {/* ======================================================== */}
          {isCustomer && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">
                  4
                </span>
                Data Diri Anda:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Nama Lengkap Anda *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Budi Santoso"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Nomor WhatsApp Anda
                  </label>
                  <input
                    type="tel"
                    placeholder="0812xxxxxxxx"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-medium"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Footer Drawer */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Jadwal:</span>
              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold text-xs">
                {formatDateIndo(selectedDate)}, {startTime} - {endTime} WIB
              </span>
            </div>

            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-emerald-400">
                {formatRupiah(totalCost)}
              </span>
              <span className="text-[11px] text-slate-400">
                ({durationHours} Jam @ {formatRupiah(rateInfo.ratePerHour)}/jam • {rateInfo.label})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Batal
            </button>

            {isCustomer ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={handleSendToWhatsApp}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md ${
                    isAvailable
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 cursor-pointer'
                      : 'bg-rose-950/70 text-rose-300 border border-rose-800/80 cursor-not-allowed opacity-80'
                  }`}
                  title={!isAvailable ? 'Jadwal bentrok atau unit masih di jalan' : 'Pesan'}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{isAvailable ? 'Pesan via WhatsApp' : '⛔ Jam Bentrok / Di Jalan'}</span>
                </button>

                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    if (onAdminInputDirect) {
                      onAdminInputDirect(bike, selectedDate, startTime, durationHours, customerName, customerPhone);
                    }
                  }}
                  className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md ${
                    isAvailable
                      ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-70'
                  }`}
                  title="Lanjut isi form booking langsung ke sistem"
                >
                  <Plus className="w-4 h-4" />
                  <span>Isi Form Booking</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  if (onAdminInputDirect) {
                    onAdminInputDirect(bike, selectedDate, startTime, durationHours, customerName, customerPhone);
                  }
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
                  isAvailable
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer'
                    : 'bg-rose-950/70 text-rose-300 border border-rose-800/80 cursor-not-allowed opacity-80'
                }`}
                title={!isAvailable ? 'Double booking dilarang' : 'Input'}
              >
                <Plus className="w-4 h-4" />
                <span>{isAvailable ? 'Input Booking Jam Ini' : '⛔ Dilarang Double Transaksi'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
