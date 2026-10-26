import React, { useState, useMemo } from 'react';
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
  AlertTriangle,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  User,
  CreditCard,
  Layers,
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react';
import { Bike, Booking, PaymentMethod } from '../types';
import { formatRupiah, formatDateIndo, getCategoryLabel } from '../utils/formatters';
import { useApp } from '../context/AppContext';
import { getDateRateInfo } from '../utils/pricingUtils';
import {
  getTodayDateStr,
  checkBikeBookingConflict
} from '../utils/scheduleUtils';

interface BookingModalProps {
  bike?: Bike;
  initialSelectedBikeIds?: string[];
  initialDate?: string;
  initialStartTime?: string;
  initialDurationType?: 'jam' | 'hari';
  initialDurationValue?: number;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialStep?: 1 | 2 | 3;
  onClose: () => void;
  onBookingSuccess?: (bookings: Booking[]) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  bike,
  initialSelectedBikeIds,
  initialDate,
  initialStartTime,
  initialDurationType,
  initialDurationValue,
  initialCustomerName,
  initialCustomerPhone,
  initialStep = 1,
  onClose,
  onBookingSuccess,
}) => {
  const { addBooking, currentRole, bikes, bookings } = useApp();

  const isCustomer = currentRole === 'customer';
  const todayStr = getTodayDateStr();

  // Wizard Step: 1 = Atas Nama Dulu, 2 = Pilih Sepeda (Bisa > 2), 3 = Waktu & Bayar di Akhir
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep);

  // STEP 1: Data Identitas Pemesan (Atas Nama Dulu)
  const [customerName, setCustomerName] = useState(
    initialCustomerName || (isCustomer ? '' : '')
  );
  const [customerPhone, setCustomerPhone] = useState(
    initialCustomerPhone || ''
  );
  const [notes, setNotes] = useState('Include helm & kunci gembok');

  // STEP 2: Pilih Sepeda yang Diinginkan (Bisa Lebih Dari 2 Sepeda)
  const [selectedBikeIds, setSelectedBikeIds] = useState<string[]>(() => {
    if (initialSelectedBikeIds && initialSelectedBikeIds.length > 0) {
      return initialSelectedBikeIds;
    }
    if (bike) {
      return [bike.id];
    }
    return bikes.length > 0 ? [bikes[0].id] : [];
  });
  const [bikeSearchQuery, setBikeSearchQuery] = useState('');
  const [bikeCategoryFilter, setBikeCategoryFilter] = useState('all');

  // STEP 3: Waktu Menyewa & Pembayaran di Akhir
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
  // Default payment method: "bayar_nanti" (Pembayaran di akhir jika penyewa sudah datang lagi)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bayar_nanti');

  // Success state for multiple bookings
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[] | null>(null);
  const [groupBookingCode, setGroupBookingCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected bike objects
  const selectedBikes = useMemo(() => {
    return bikes.filter(b => selectedBikeIds.includes(b.id));
  }, [bikes, selectedBikeIds]);

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

  // Price calculations based on date rate info (hari biasa vs weekend/libur)
  const rateInfo = getDateRateInfo(startDate);

  // Price per bike and grand totals
  const pricingPerBike = useMemo(() => {
    return selectedBikes.map(b => {
      const ratePerHour = rateInfo.ratePerHour;
      const unitRentalCost =
        durationType === 'jam'
          ? ratePerHour * durationValue
          : b.pricePerDay * durationValue;
      return {
        bike: b,
        unitRentalCost,
        depositAmount: b.depositRequired || 0,
      };
    });
  }, [selectedBikes, rateInfo, durationType, durationValue]);

  const grandTotalCost = pricingPerBike.reduce((sum, item) => sum + item.unitRentalCost, 0);
  const grandTotalDeposit = pricingPerBike.reduce((sum, item) => sum + item.depositAmount, 0);

  // Check conflicts for ALL selected bikes
  const bikeConflicts = useMemo(() => {
    return selectedBikes.map(b => {
      const conflict = checkBikeBookingConflict(
        b.id,
        startDate,
        startTime,
        calculatedEndTime,
        bookings,
        b
      );
      return {
        bike: b,
        hasConflict: conflict.hasConflict,
        message: conflict.message,
      };
    });
  }, [selectedBikes, startDate, startTime, calculatedEndTime, bookings]);

  const hasAnyConflict = bikeConflicts.some(c => c.hasConflict);
  const conflictItems = bikeConflicts.filter(c => c.hasConflict);

  // Bike filtering for step 2
  const filteredBikes = useMemo(() => {
    return bikes.filter(b => {
      const matchesSearch =
        b.name.toLowerCase().includes(bikeSearchQuery.toLowerCase()) ||
        b.brand.toLowerCase().includes(bikeSearchQuery.toLowerCase()) ||
        b.licenseNumber.toLowerCase().includes(bikeSearchQuery.toLowerCase());
      const matchesCategory =
        bikeCategoryFilter === 'all' || b.category === bikeCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [bikes, bikeSearchQuery, bikeCategoryFilter]);

  // Toggle bike selection
  const handleToggleBike = (bikeId: string) => {
    setSelectedBikeIds(prev => {
      if (prev.includes(bikeId)) {
        return prev.filter(id => id !== bikeId);
      } else {
        return [...prev, bikeId];
      }
    });
  };

  const handleSelectAllAvailable = () => {
    const availableIds = bikes.filter(b => b.status === 'tersedia').map(b => b.id);
    setSelectedBikeIds(availableIds);
  };

  const handleClearSelection = () => {
    setSelectedBikeIds([]);
  };

  // Step 1 Validation & Proceed
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Mohon isi Atas Nama / Nama Lengkap penyewa terlebih dahulu.');
      return;
    }
    if (!customerPhone.trim()) {
      alert('Mohon isi Nomor WhatsApp / HP penyewa.');
      return;
    }
    setCurrentStep(2);
  };

  // Step 2 Validation & Proceed
  const handleProceedToStep3 = () => {
    if (selectedBikeIds.length === 0) {
      alert('Silakan pilih minimal 1 sepeda untuk disewa. Anda dapat memilih 2, 3, atau lebih sepeda!');
      return;
    }
    setCurrentStep(3);
  };

  // Admin / Staff submits multi-bike booking to database
  const handleSubmitAdminMultiBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedBikes.length === 0) {
      alert('Pilih minimal 1 sepeda yang akan disewa.');
      return;
    }

    if (hasAnyConflict) {
      const conflictMsg = conflictItems
        .map(c => `• [${c.bike.licenseNumber}] ${c.bike.name}: ${c.message}`)
        .join('\n');
      alert(`TRANSAKSI DITOLAK KARENA BENTROK JADWAL:\n${conflictMsg}`);
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Mohon lengkapi nama dan nomor WhatsApp penyewa.');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const datePart = startDate.replace(/-/g, '').slice(4);
      const generatedGroupCode = `GRP-${datePart}-${randomSuffix}`;
      setGroupBookingCode(generatedGroupCode);

      const createdList: Booking[] = [];
      const isPayLater = paymentMethod === 'bayar_nanti';

      // Save a booking document for each selected bike
      for (let i = 0; i < pricingPerBike.length; i++) {
        const item = pricingPerBike[i];
        const newBooking = await addBooking({
          bikeId: item.bike.id,
          bikeName: item.bike.name,
          bikeImage: item.bike.imageUrl,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          startDate,
          startTime,
          endDate: calculatedEndDate,
          endTime: calculatedEndTime,
          durationType,
          durationValue,
          totalPrice: item.unitRentalCost,
          depositAmount: item.depositAmount,
          status: 'aktif', // Langsung aktif beroperasi
          paymentMethod,
          paymentStatus: isPayLater ? 'belum_lunas' : 'lunas',
          notes: notes.trim()
            ? `${notes.trim()} (Rombongan ${i + 1}/${pricingPerBike.length} - ${generatedGroupCode})`
            : `Rombongan ${i + 1}/${pricingPerBike.length} - ${generatedGroupCode}`,
          handoverBy: currentRole === 'admin' ? 'Admin Pemilik' : 'Staff Toko Kasir',
          groupBookingCode: generatedGroupCode,
          groupItemIndex: i + 1,
          groupItemTotal: pricingPerBike.length,
        });
        createdList.push(newBooking);
      }

      setConfirmedBookings(createdList);
      if (onBookingSuccess) {
        onBookingSuccess(createdList);
      }
    } catch (err) {
      console.error('Gagal menyimpan booking rombongan:', err);
      alert('Gagal mencatat booking: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Customer triggers WhatsApp chat with multi-bike booking format
  const handleCustomerSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedBikes.length === 0) {
      alert('Silakan pilih minimal 1 sepeda terlebih dahulu.');
      return;
    }

    if (hasAnyConflict) {
      const conflictMsg = conflictItems
        .map(c => `• [${c.bike.licenseNumber}] ${c.bike.name}: ${c.message}`)
        .join('\n');
      alert(`Pemesanan tidak dapat dikirim karena ada sepeda yang bentrok:\n${conflictMsg}`);
      return;
    }

    if (!customerName.trim()) {
      alert('Mohon masukkan nama Anda terlebih dahulu.');
      setCurrentStep(1);
      return;
    }

    const adminWhatsAppNumber = '6289647123671'; // Nomor WhatsApp Admin Kravent Bike (089647123671)

    // Format list of selected bikes
    const bikeListText = pricingPerBike
      .map(
        (item, idx) =>
          `  ${idx + 1}. *${item.bike.name}* (${item.bike.licenseNumber}) - ${formatRupiah(item.unitRentalCost)}`
      )
      .join('\n');

    const textLines = [
      `Halo Admin Kravent Bike! Saya ingin booking sewa sepeda:`,
      `* Unit (${selectedBikes.length} Sepeda):`,
      bikeListText,
      `* Tanggal Sewa: ${formatDateIndo(startDate)}`,
      `* Jam Mulai: ${startTime} WIB`,
      `* Durasi: ${durationValue} ${durationType} (Sampai ${calculatedEndTime} WIB)`,
      `* Total Estimasi Biaya: ${formatRupiah(grandTotalCost)} (${selectedBikes.length} unit sepeda)`,
      `* Pembayaran: *Bayar Nanti (Saat Pengembalian Sepeda)*`,
      `* Atas Nama Pemesan: ${customerName}`,
      customerPhone ? `* No HP/WA: ${customerPhone}` : '',
      notes ? `* Catatan: ${notes}` : '',
      ``,
      `⚠️ *Catatan Penting:* Pesanan yang telah dikirim ke WhatsApp ini WAJIB tetap dikonfirmasi oleh staf toko terlebih dahulu sebelum unit sepeda dapat diambil atau digunakan.`,
      `Mohon info konfirmasi ketersediaan unit sepeda ini untuk diinput ke sistem. Terima kasih!`
    ].filter(Boolean).join('\n');

    const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(textLines)}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex min-h-full items-start sm:items-center justify-center p-2 sm:p-4 overscroll-contain">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-2 sm:my-6 border border-slate-200 flex flex-col max-h-[94vh]">
        
        {/* MODAL HEADER WITH 3-STEP PROGRESS */}
        <div className="bg-slate-900 text-white px-5 py-4 shrink-0 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shadow-xs ${
                isCustomer ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
              }`}>
                {isCustomer ? <MessageCircle className="w-4 h-4" /> : <BikeIcon className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                  {confirmedBookings
                    ? `Booking Berhasil Diinput (${confirmedBookings.length} Sepeda)`
                    : isCustomer
                    ? 'Sewa Sepeda (Bisa Banyak Sepeda Sekaligus)'
                    : 'Input Booking & Sewa Sepeda (Bisa > 2 Sepeda)'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Alur: (1) Atas nama dulu ➔ (2) Pilih sepeda yang diinginkan ➔ (3) Waktu sewa & bayar di akhir
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3 STEP WIZARD INDICATOR */}
          {!confirmedBookings && (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 1
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">1. Atas Nama Dulu</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!customerName.trim()) {
                    alert('Isi atas nama dulu pada langkah 1.');
                    return;
                  }
                  setCurrentStep(2);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 2
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <BikeIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">2. Pilih Sepeda ({selectedBikeIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!customerName.trim()) {
                    alert('Isi atas nama dulu pada langkah 1.');
                    return;
                  }
                  if (selectedBikeIds.length === 0) {
                    alert('Pilih minimal 1 sepeda pada langkah 2.');
                    return;
                  }
                  setCurrentStep(3);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 3
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">3. Waktu & Bayar</span>
              </button>
            </div>
          )}
        </div>

        {/* MODAL BODY (SCROLLABLE ON MOBILE & DESKTOP) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ========================================================= */}
          {/* STATE: CONFIRMED BOOKING SUCCESS SCREEN (MULTI-UNIT)      */}
          {/* ========================================================= */}
          {confirmedBookings ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-lg">
                  Booking Berhasil Tercatat untuk {confirmedBookings.length} Unit Sepeda!
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  Semua unit telah aktif beroperasi di sistem, tercatat atas nama <strong className="text-slate-900">{customerName}</strong>, dan siap dikembalikan dengan sistem <strong>Bayar di Akhir</strong>.
                </p>
                {groupBookingCode && (
                  <div className="inline-block mt-3 px-4 py-1.5 bg-white border border-emerald-300 rounded-xl font-mono font-bold text-emerald-800 text-sm shadow-xs">
                    Kode Rombongan: {groupBookingCode}
                  </div>
                )}
              </div>

              {/* List of booked units */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Rincian Tiket Booking Per Unit Sepeda:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {confirmedBookings.map((b, idx) => (
                    <div
                      key={b.id}
                      className="border border-slate-200 rounded-2xl p-3 bg-slate-50/70 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={b.bikeImage}
                          alt={b.bikeName}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded block w-fit mb-0.5">
                            {b.bookingCode}
                          </span>
                          <p className="font-bold text-slate-900 truncate">{b.bikeName}</p>
                          <p className="text-[11px] text-slate-500">
                            {b.startTime} - {b.endTime} WIB ({b.durationValue} {b.durationType})
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-slate-900 block">{formatRupiah(b.totalPrice)}</span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Bayar Nanti
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-900 text-white space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Atas Nama:</span>
                  <span className="font-bold text-white">{customerName} ({customerPhone})</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Jadwal Sewa:</span>
                  <span className="font-bold text-white">
                    {formatDateIndo(startDate)} ({startTime} - {calculatedEndTime} WIB)
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Status Pembayaran:</span>
                  <span className="font-bold text-amber-300">
                    Belum Lunas (Bayar di Akhir saat unit dikembalikan)
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="text-sm font-bold text-slate-300">Total Tagihan ({confirmedBookings.length} Sepeda):</span>
                  <span className="text-lg font-extrabold text-emerald-400">{formatRupiah(grandTotalCost)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          ) : currentStep === 1 ? (
            /* ========================================================= */
            /* STEP 1: ISI ATAS NAMA DULU                                */
            /* ========================================================= */
            <form onSubmit={handleProceedToStep2} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <User className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Langkah 1 dari 3: Isi Atas Nama Dulu</strong>
                  <p className="text-amber-800 mt-0.5">
                    Silakan masukkan identitas pemesan terlebih dahulu. Satu nama pemesan ini dapat langsung menyewa <strong>2, 3, atau lebih sepeda</strong> sekaligus dalam 1 transaksi rombongan.
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Atas Nama / Nama Lengkap Pemesan *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Contoh: Bpk. Taat / Rombongan Gowes Pagi"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-medium"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Nama yang akan tercantum pada tiket sewa dan penagihan saat pengembalian sepeda.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nomor WhatsApp / HP Aktif *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123456789 atau 081818"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-mono font-medium"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Digunakan untuk konfirmasi jadwal dan koordinasi serah terima unit.
                  </span>
                </div>


                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Catatan Pemesanan / Fasilitas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Include helm & kunci gembok"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                  {/* Quick Suggestions */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[10px] text-slate-400 font-semibold">Saran Cepat:</span>
                    {[
                      'Include helm & kunci gembok',
                      'Include pompa & toolkit',
                      'Rombongan Kantor',
                      'Rombongan Keluarga',
                    ].map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setNotes(sug)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* FOOTER STEP 1 */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>Lanjut: Pilih Sepeda (Bisa &gt; 2)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : currentStep === 2 ? (
            /* ========================================================= */
            /* STEP 2: PILIH SEPEDA YANG DIINGINKAN (BISA LEBIH DARI 2)  */
            /* ========================================================= */
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <BikeIcon className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-950 leading-relaxed">
                    <strong>Langkah 2 dari 3: Pilih Sepeda yang Diinginkan</strong>
                    <p className="text-emerald-800 mt-0.5">
                      Atas Nama: <strong className="text-emerald-950">{customerName}</strong> ({customerPhone}).
                      Centang sepeda yang ingin disewa. Anda dapat memilih <strong>2, 3, atau lebih sepeda</strong> sekaligus!
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold px-3 py-1 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs">
                  {selectedBikeIds.length} Sepeda Dipilih
                </span>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative w-full flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama sepeda, tipe, kode unit (KB-01)..."
                    value={bikeSearchQuery}
                    onChange={e => setBikeSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'road', label: 'Road' },
                    { id: 'mtb', label: 'MTB' },
                    { id: 'folding', label: 'Lipat' },
                    { id: 'ebike', label: 'E-Bike' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setBikeCategoryFilter(cat.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        bikeCategoryFilter === cat.id
                          ? 'bg-slate-900 text-white font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Klik pada kartu sepeda untuk memilih/batal memilih:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllAvailable}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    + Pilih Semua Tersedia
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Kosongkan Pilihan
                  </button>
                </div>
              </div>

              {/* Grid of Bikes to Select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[46vh] overflow-y-auto pr-1">
                {filteredBikes.map(b => {
                  const isSelected = selectedBikeIds.includes(b.id);
                  const isMaintenance = b.status === 'maintenance';

                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        if (isMaintenance) {
                          alert(`Sepeda [${b.licenseNumber}] sedang dalam maintenance bengkel dan tidak dapat disewa.`);
                          return;
                        }
                        handleToggleBike(b.id);
                      }}
                      className={`relative p-3 rounded-2xl border-2 transition-all cursor-pointer flex gap-3 text-xs ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      } ${isMaintenance ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
                    >
                      {/* Checkbox indicator */}
                      <div className="absolute top-3 right-3">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'border-2 border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Bike image */}
                      <img
                        src={b.imageUrl}
                        alt={b.name}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                      />

                      <div className="flex-1 min-w-0 pr-7">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-900 text-white">
                            {b.licenseNumber}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              b.status === 'tersedia'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.status === 'disewa'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {b.status === 'tersedia' ? 'Tersedia' : b.status === 'disewa' ? 'Sedang Disewa' : 'Mentenest'}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-slate-900 truncate">{b.name}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{b.gearSystem} • {b.frameSize}</p>

                        <div className="mt-1.5 text-[11px] font-bold text-emerald-700">
                          {formatRupiah(b.pricePerHour)}/jam • {formatRupiah(b.pricePerDay)}/hari
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Pills Summary */}
              {selectedBikeIds.length > 0 && (
                <div className="p-3 bg-slate-100 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
                    <span className="font-bold text-slate-700 shrink-0">Terpilih:</span>
                    {selectedBikes.map(sb => (
                      <span
                        key={sb.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-300 font-bold text-slate-900 shrink-0"
                      >
                        <span>{sb.licenseNumber} - {sb.name}</span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleToggleBike(sb.id);
                          }}
                          className="hover:text-rose-600 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <span className="font-extrabold text-emerald-700 shrink-0 text-sm">
                    {selectedBikeIds.length} Unit
                  </span>
                </div>
              )}

              {/* FOOTER STEP 2 */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali (Atas Nama)</span>
                </button>
                <button
                  type="button"
                  onClick={handleProceedToStep3}
                  disabled={selectedBikeIds.length === 0}
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                    selectedBikeIds.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Lanjut: Waktu & Bayar di Akhir ({selectedBikeIds.length} Sepeda)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* STEP 3: MEMILIH WAKTU MENYEWA & PEMBAYARAN DI AKHIR       */
            /* ========================================================= */
            <div className="space-y-4">
              {/* Header Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Penyewa & Unit Terpilih:
                  </span>
                  <p className="font-bold text-sm text-amber-300">
                    {customerName} <span className="text-slate-300 font-normal">({customerPhone})</span>
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Total {selectedBikes.length} Sepeda: {selectedBikes.map(b => b.licenseNumber).join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors self-start sm:self-auto cursor-pointer"
                >
                  Ubah Pilihan Sepeda
                </button>
              </div>

              {/* RENTAL TIME CONFIGURATION */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Jadwal & Waktu Sewa Rombongan
                  </span>
                  <div className="flex items-center bg-slate-200 p-0.5 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setDurationType('jam');
                        setDurationValue(3);
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        durationType === 'jam'
                          ? 'bg-white text-emerald-800 shadow-xs'
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
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        durationType === 'hari'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Sewa Harian
                    </button>
                  </div>
                </div>

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
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        Jam Mulai Ambil
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const h = String(Math.min(Math.max(now.getHours(), 6), 23)).padStart(2, '0');
                          const min = String(now.getMinutes()).padStart(2, '0');
                          setStartTime(`${h}:${min}`);
                        }}
                        className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        ⚡ Sekarang
                      </button>
                    </div>
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
                      className="w-full text-xs font-bold font-mono px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Durasi ({durationType === 'jam' ? 'Jam' : 'Hari'})
                    </label>
                    <select
                      value={durationValue}
                      onChange={e => setDurationValue(parseInt(e.target.value, 10))}
                      className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                    >
                      {durationType === 'jam' ? (
                        <>
                          <option value={1}>1 Jam</option>
                          <option value={2}>2 Jam</option>
                          <option value={3}>3 Jam (Populer)</option>
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
                    <span className="text-[10px] text-slate-500 font-bold">Pilihan Cepat Jam Mulai (06:00 - 23:00 WIB):</span>
                    <span className="text-[10px] text-emerald-700 font-extrabold font-mono">{startTime} WIB</span>
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
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Return Schedule Summary */}
                <div className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs text-slate-700">
                  <span className="text-slate-500">Estimasi Selesai / Waktu Pengembalian:</span>
                  <span className="font-extrabold text-slate-900">
                    {formatDateIndo(calculatedEndDate)} pukul {calculatedEndTime} WIB
                  </span>
                </div>

                {/* Real-Time Conflict Alerts Across All Selected Bikes */}
                {hasAnyConflict ? (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-400 rounded-2xl space-y-2 text-xs text-rose-900 shadow-xs">
                    <div className="flex items-center gap-2 font-black text-sm text-rose-900">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>⛔ BENTROK JADWAL: ADA SEPEDA YANG SUDAH DIPESAN / DI JALAN</span>
                    </div>
                    <div className="space-y-1 pl-7">
                      {conflictItems.map(c => (
                        <p key={c.bike.id} className="font-bold text-rose-800">
                          • [{c.bike.licenseNumber}] {c.bike.name}: {c.message}
                        </p>
                      ))}
                    </div>
                    <p className="text-[11px] text-rose-700 pl-7">
                      Silakan ganti jam mulai/durasi, atau kembali ke Langkah 2 untuk memilih sepeda lain yang tersedia.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Semua {selectedBikes.length} Sepeda Bebas Bentrok:</strong> Siap disewa pada rentang jam {startTime} - {calculatedEndTime} WIB.
                    </span>
                  </div>
                )}
              </div>

              {/* RENTAL COST BREAKDOWN FOR ALL BIKES */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Rincian Biaya Sewa ({selectedBikes.length} Unit Sepeda)
                </span>
                <div className="space-y-2 divide-y divide-slate-100">
                  {pricingPerBike.map((item, idx) => (
                    <div key={item.bike.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900">{item.bike.name}</span>
                          <span className="text-slate-500 ml-1.5 font-mono text-[11px]">({item.bike.licenseNumber})</span>
                        </div>
                      </div>
                      <span className="font-extrabold text-slate-900">{formatRupiah(item.unitRentalCost)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Total Estimasi Biaya Sewa:</span>
                  <span className="text-lg font-black text-emerald-700">{formatRupiah(grandTotalCost)}</span>
                </div>
              </div>

              {/* MANDATORY PAYMENT REQUIREMENT: "PEMBAYARAN DI AKHIR JIKA SUDAH DATANG LAGI KE TEMPAT" */}
              <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <CreditCard className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                      Ketentuan Pembayaran: Bayar di Akhir (Default & Rekomendasi)
                    </h5>
                    <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                      Sesuai SOP rental Kravent Bike, <strong>pembayaran dilakukan di akhir</strong> saat penyewa sudah datang kembali ke tempat untuk mengembalikan seluruh unit sepeda.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Pilihan Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full text-xs font-bold px-3.5 py-2.5 border border-amber-300 rounded-xl bg-white text-slate-900 focus:outline-emerald-500"
                  >
                    <option value="bayar_nanti">
                      💳 Bayar di Akhir (Saat Pengembalian Sepeda - Default SOP)
                    </option>
                    {!isCustomer && (
                      <>
                        <option value="cash">💵 Bayar Cash Sekarang di Tempat (Lunas)</option>
                        <option value="qris">📱 QRIS Sekarang (Lunas)</option>
                        <option value="transfer">🏦 Transfer Bank Sekarang (Lunas)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="p-2.5 bg-white border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Tagihan ditagih saat pengembalian sepeda:</span>
                  </div>
                  <p className="text-slate-600 pl-5">
                    Biaya sewa pokok <strong>{formatRupiah(grandTotalCost)}</strong> ({selectedBikes.length} sepeda) ditambah denda keterlambatan jika terlambat akan dihitung secara otomatis saat serah terima pengembalian.
                  </p>
                </div>
              </div>

              {/* FOOTER STEP 3 (SUBMIT BUTTONS) */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center justify-center gap-1.5 cursor-pointer order-2 sm:order-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali ke Pilih Sepeda</span>
                </button>

                {isCustomer ? (
                  <button
                    type="button"
                    onClick={handleCustomerSendWhatsApp}
                    disabled={hasAnyConflict}
                    className={`px-6 py-3 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 order-1 sm:order-2 cursor-pointer ${
                      hasAnyConflict
                        ? 'bg-rose-950/70 border border-rose-800 text-rose-300 cursor-not-allowed opacity-80'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>
                      {hasAnyConflict
                        ? '⛔ Jam Bentrok: Ganti Jam atau Sepeda'
                        : `Kirim Booking (${selectedBikes.length} Sepeda) ke WhatsApp Admin`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitAdminMultiBooking}
                    disabled={hasAnyConflict || isSubmitting}
                    className={`px-6 py-3 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 order-1 sm:order-2 cursor-pointer ${
                      hasAnyConflict
                        ? 'bg-rose-950/70 border border-rose-800 text-rose-300 cursor-not-allowed opacity-80'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    }`}
                  >
                    {isSubmitting ? (
                      <span>Menyimpan {selectedBikes.length} Booking...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          {hasAnyConflict
                            ? '⛔ Dilarang Double Transaksi'
                            : `Konfirmasi & Input Booking (${selectedBikes.length} Sepeda)`}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
