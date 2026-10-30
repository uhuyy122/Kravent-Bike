import React, { useState, useMemo, useEffect } from 'react';
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
  DollarSign,
  PackagePlus,
  Plus,
  Minus,
  Luggage
} from 'lucide-react';
import { Bike, Booking, PaymentMethod, BookingAddonItem } from '../types';
import { formatRupiah, formatDateIndo, getCategoryLabel } from '../utils/formatters';
import { useApp } from '../context/AppContext';
import { getDateRateInfo } from '../utils/pricingUtils';
import {
  getTodayDateStr,
  checkBikeBookingConflict,
  VALID_OPERATING_START_HOURS,
  isPastHourToday
} from '../utils/scheduleUtils';
import { OFFICIAL_ADDONS } from '../data/addons';

interface BookingModalProps {
  bike?: Bike;
  initialSelectedBikeIds?: string[];
  initialDate?: string;
  initialStartTime?: string;
  initialDurationType?: 'jam' | 'hari';
  initialDurationValue?: number;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialStep?: 1 | 2 | 3 | 4;
  onClose: () => void;
  onBookingSuccess?: (bookings: Booking[]) => void;
}

// Opsi Cepat Fasilitas Penitipan Barang di Outlet Kravent Bike (Default Kosong)
const CUSTODY_PRESETS = [
  { id: 'motor', label: 'Titip Motor', icon: '🏍️' },
  { id: 'tas', label: 'Titip Tas / Ransel', icon: '🎒' },
  { id: 'helm', label: 'Titip Helm Pribadi', icon: '⛑️' },
  { id: 'jaket', label: 'Titip Jaket', icon: '🧥' },
  { id: 'kunci', label: 'Titip Kunci Kendaraan', icon: '🔑' },
  { id: 'sepatu', label: 'Titip Sepatu', icon: '👟' },
];

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

  // ALUR PROSES BISNIS RESMI OWNER:
  // LANGKAH 1: INPUT DULU DATA DIRI & FASILITAS PENITIPAN
  // LANGKAH 2: PILIH JAM (ORDER 06:00 - 21:00, TUTUP MAKSIMAL 23:00)
  // LANGKAH 3: PILIH SEPEDA YANG READY DI JAM TERSEBUT (BISA > 1 UNIT)
  // LANGKAH 4: TAMBAHAN YANG LAINNYA (ADDONS & ACC WHATSAPP)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(initialStep);

  // LANGKAH 1: DATA DIRI & FASILITAS PENITIPAN
  const [customerName, setCustomerName] = useState(initialCustomerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone || '');
  // Catatan penitipan default KOSONG sesuai instruksi owner
  const [notes, setNotes] = useState('');

  // LANGKAH 2: WAKTU & JADWAL SEWA
  const [startDate, setStartDate] = useState(() => {
    return initialDate && initialDate >= todayStr ? initialDate : todayStr;
  });

  const [startTime, setStartTime] = useState(() => {
    if (initialStartTime) {
      if (initialStartTime < '06:00') return '06:00';
      if (initialStartTime > '21:00') return '21:00';
      return initialStartTime;
    }
    const curH = new Date().getHours();
    const nextH = Math.min(Math.max(curH + 1, 6), 21);
    return `${String(nextH).padStart(2, '0')}:00`;
  });

  const [durationType, setDurationType] = useState<'jam' | 'hari'>(initialDurationType || 'jam');
  const [durationValue, setDurationValue] = useState(initialDurationValue || 2);

  // LANGKAH 3: PILIH SEPEDA
  const [selectedBikeIds, setSelectedBikeIds] = useState<string[]>(() => {
    if (initialSelectedBikeIds && initialSelectedBikeIds.length > 0) {
      return initialSelectedBikeIds;
    }
    if (bike) {
      return [bike.id];
    }
    return [];
  });
  const [bikeSearchQuery, setBikeSearchQuery] = useState('');
  const [bikeCategoryFilter, setBikeCategoryFilter] = useState('all');

  // LANGKAH 4: TAMBAHAN & PEMBAYARAN
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bayar_nanti');
  const [selectedAddons, setSelectedAddons] = useState<{ [id: string]: number }>({});

  const handleUpdateAddonQty = (addonId: string, delta: number) => {
    setSelectedAddons(prev => {
      const cur = prev[addonId] || 0;
      const target = OFFICIAL_ADDONS.find(a => a.id === addonId);
      const max = target ? target.maxStock : 99;
      const next = Math.max(0, Math.min(cur + delta, max));
      return { ...prev, [addonId]: next };
    });
  };

  const selectedAddonList: BookingAddonItem[] = useMemo(() => {
    return OFFICIAL_ADDONS
      .filter(a => (selectedAddons[a.id] || 0) > 0)
      .map(a => ({
        id: a.id,
        name: a.name,
        price: a.price, // Flat sekali sewa
        quantity: selectedAddons[a.id],
      }));
  }, [selectedAddons]);

  const grandTotalAddonCost = useMemo(() => {
    return selectedAddonList.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedAddonList]);

  // Success state for multiple bookings
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[] | null>(null);
  const [groupBookingCode, setGroupBookingCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState<string>('');

  // Selected bike objects
  const selectedBikes = useMemo(() => {
    return bikes.filter(b => selectedBikeIds.includes(b.id));
  }, [bikes, selectedBikeIds]);

  // Hitung jam selesai otomatis (Maksimal tutup 23:00)
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
      const [hour] = startTime.split(':').map(Number);
      if (hour + durationValue >= 24) {
        const d = new Date(startDate);
        const daysToAdd = Math.floor((hour + durationValue) / 24);
        d.setDate(d.getDate() + daysToAdd);
        return d.toISOString().split('T')[0];
      }
      return startDate;
    } else {
      const d = new Date(startDate);
      d.setDate(d.getDate() + durationValue);
      return d.toISOString().split('T')[0];
    }
  };

  const calculatedEndTime = calculateEndTime();
  const calculatedEndDate = calculateEndDate();

  // Auto-switch startTime ke jam aktif pertama jika jam terpilih sudah lewat untuk hari ini
  useEffect(() => {
    if (startDate === todayStr && isPastHourToday(startDate, startTime)) {
      const firstValidHour = VALID_OPERATING_START_HOURS.find(t => !isPastHourToday(startDate, t));
      if (firstValidHour) {
        setStartTime(firstValidHour);
      }
    }
  }, [startDate, startTime, todayStr]);

  // Evaluasi ketersediaan sepeda real-time pada rentang jam yang dipilih
  const bikeAvailabilityMap = useMemo(() => {
    const map = new Map<string, { isAvailable: boolean; message?: string }>();
    bikes.forEach(b => {
      const conflict = checkBikeBookingConflict(
        b.id,
        startDate,
        startTime,
        calculatedEndTime,
        bookings,
        b
      );
      map.set(b.id, {
        isAvailable: !conflict.hasConflict,
        message: conflict.message,
      });
    });
    return map;
  }, [bikes, startDate, startTime, calculatedEndTime, bookings]);

  // Cek bentrok khusus untuk unit sepeda yang telah dicentang
  const selectedBikeConflicts = useMemo(() => {
    return selectedBikes.map(b => {
      const info = bikeAvailabilityMap.get(b.id);
      return {
        bike: b,
        hasConflict: info ? !info.isAvailable : false,
        message: info?.message,
      };
    });
  }, [selectedBikes, bikeAvailabilityMap]);

  const hasAnyConflict = selectedBikeConflicts.some(c => c.hasConflict);
  const conflictItems = selectedBikeConflicts.filter(c => c.hasConflict);

  // Price calculations (khusus staf dan owner)
  const rateInfo = getDateRateInfo(startDate);

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
  const finalTotalWithAddons = grandTotalCost + grandTotalAddonCost;

  // Filter sepeda
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
    const avail = bikeAvailabilityMap.get(bikeId);
    if (avail && !avail.isAvailable) {
      alert(`Sepeda ini tidak dapat dipilih: ${avail.message || 'Bentrok jadwal dengan penyewa lain di jam tersebut.'}`);
      return;
    }

    setSelectedBikeIds(prev => {
      if (prev.includes(bikeId)) {
        return prev.filter(id => id !== bikeId);
      } else {
        return [...prev, bikeId];
      }
    });
  };

  const handleSelectAllAvailable = () => {
    const availableIds = bikes
      .filter(b => {
        const info = bikeAvailabilityMap.get(b.id);
        return info && info.isAvailable;
      })
      .map(b => b.id);
    setSelectedBikeIds(availableIds);
  };

  const handleClearSelection = () => {
    setSelectedBikeIds([]);
  };

  // Toggle Catatan Penitipan Barang
  const handleToggleCustodyPreset = (presetLabel: string) => {
    setNotes(prev => {
      const currentList = prev
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const exists = currentList.some(item => item.toLowerCase() === presetLabel.toLowerCase());
      if (exists) {
        return currentList.filter(item => item.toLowerCase() !== presetLabel.toLowerCase()).join(', ');
      } else {
        return currentList.length > 0 ? `${prev.trim()}, ${presetLabel}` : presetLabel;
      }
    });
  };

  // Validasi Step 1: Input Data Diri ➔ Lanjut Pilih Jam
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Mohon isi nama lengkap / atas nama pemesan terlebih dahulu.');
      return;
    }
    if (!customerPhone.trim()) {
      alert('Mohon isi nomor WhatsApp aktif pemesan.');
      return;
    }
    setCurrentStep(2);
  };

  // Validasi Step 2: Pilih Jam ➔ Lanjut Pilih Sepeda
  const handleProceedToStep3 = (e: React.FormEvent) => {
    e.preventDefault();

    if (startTime < '06:00' || startTime > '21:00') {
      alert('Jam order sewa adalah mulai pukul 06:00 hingga 21:00 WIB.');
      return;
    }

    if (durationType === 'jam') {
      const [sh] = startTime.split(':').map(Number);
      if (sh + durationValue > 23) {
        alert(`Jam pengembalian (${startTime} + ${durationValue} jam = ${calculatedEndTime} WIB) melebihi jam tutup maksimal toko Kravent Bike (23:00 WIB). Silakan kurangi durasi sewa atau pilih jam mulai lebih awal.`);
        return;
      }
    }

    setCurrentStep(3);
  };

  // Validasi Step 3: Pilih Sepeda ➔ Lanjut Tambahan & Konfirmasi
  const handleProceedToStep4 = () => {
    if (selectedBikeIds.length === 0) {
      alert('Silakan pilih minimal 1 sepeda yang ready di jam tersebut.');
      return;
    }
    if (hasAnyConflict) {
      const conflictMsg = conflictItems
        .map(c => `• [${c.bike.licenseNumber}] ${c.bike.name}: ${c.message}`)
        .join('\n');
      alert(`Ada sepeda yang bentrok dengan penyewa lain di jam tersebut:\n${conflictMsg}\n\nSilakan hapus pilihan sepeda yang bentrok.`);
      return;
    }
    setCurrentStep(4);
  };

  // Submit Admin/Staff Langsung
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

    setIsSubmitting(true);

    try {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const datePart = startDate.replace(/-/g, '').slice(4);
      const generatedGroupCode = `GRP-${datePart}-${randomSuffix}`;
      setGroupBookingCode(generatedGroupCode);

      const createdList: Booking[] = [];
      const isPayLater = paymentMethod === 'bayar_nanti';

      for (let i = 0; i < pricingPerBike.length; i++) {
        const item = pricingPerBike[i];
        const addonShare = i === 0 ? grandTotalAddonCost : 0;
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
          totalPrice: item.unitRentalCost + addonShare,
          depositAmount: item.depositAmount,
          status: 'aktif',
          paymentMethod,
          paymentStatus: isPayLater ? 'belum_lunas' : 'lunas',
          notes: notes.trim()
            ? `${notes.trim()} (Rombongan ${i + 1}/${pricingPerBike.length} - ${generatedGroupCode})`
            : `Rombongan ${i + 1}/${pricingPerBike.length} - ${generatedGroupCode}`,
          handoverBy: currentRole === 'admin' ? 'Admin Pemilik' : 'Staff Toko Kasir',
          groupBookingCode: generatedGroupCode,
          groupItemIndex: i + 1,
          groupItemTotal: pricingPerBike.length,
          addons: i === 0 ? selectedAddonList : [],
          addonTotalCost: addonShare,
          approvedAt: new Date().toISOString(),
          approvedBy: currentRole === 'admin' ? 'Admin Pemilik' : 'Staff Toko Kasir',
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

  // Submit Customer ➔ Simpan Pending ke Firestore + Buka WhatsApp Admin
  const handleCustomerSendWhatsApp = async (e: React.FormEvent) => {
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

    setIsSubmitting(true);

    try {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const datePart = startDate.replace(/-/g, '').slice(4);
      const generatedGroupCode = `GRP-${datePart}-${randomSuffix}`;
      setGroupBookingCode(generatedGroupCode);

      const createdList: Booking[] = [];

      for (let i = 0; i < pricingPerBike.length; i++) {
        const item = pricingPerBike[i];
        const addonShare = i === 0 ? grandTotalAddonCost : 0;
        const newBooking = await addBooking({
          bikeId: item.bike.id,
          bikeName: item.bike.name,
          bikeImage: item.bike.imageUrl,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || '-',
          startDate,
          startTime,
          endDate: calculatedEndDate,
          endTime: calculatedEndTime,
          durationType,
          durationValue,
          totalPrice: item.unitRentalCost + addonShare,
          depositAmount: item.depositAmount,
          status: 'pending', // Menunggu ACC Admin
          paymentMethod: 'bayar_nanti',
          paymentStatus: 'belum_lunas',
          notes: notes.trim()
            ? `${notes.trim()} (Rombongan ${i + 1}/${pricingPerBike.length} - ${generatedGroupCode})`
            : `Rombongan ${i + 1}/${pricingPerBike.length} - ${generatedGroupCode}`,
          handoverBy: 'Menunggu ACC Admin',
          groupBookingCode: generatedGroupCode,
          groupItemIndex: i + 1,
          groupItemTotal: pricingPerBike.length,
          addons: i === 0 ? selectedAddonList : [],
          addonTotalCost: addonShare,
        });
        createdList.push(newBooking);
      }

      setConfirmedBookings(createdList);

      const adminWhatsAppNumber = '6289647123671'; // Nomor WhatsApp Admin Kravent Bike

      const bikeListText = selectedBikes
        .map((b, idx) => `  ${idx + 1}. *${b.name}* (Kode: ${b.licenseNumber})`)
        .join('\n');

      const addonListText = selectedAddonList.length > 0
        ? selectedAddonList.map(a => `  • ${a.name} (${a.quantity}x)`).join('\n')
        : '  • Tidak ada perlengkapan tambahan';

      const bookingCodesList = createdList.map(b => b.bookingCode).join(', ');

      const textLines = [
        `Halo Admin Kravent Bike! Ada pesanan sewa baru dari website:`,
        `* Kode Booking: *${bookingCodesList}*`,
        `* Kode Rombongan: *${generatedGroupCode}*`,
        `* Atas Nama: *${customerName}*`,
        customerPhone ? `* No WhatsApp: ${customerPhone}` : '',
        `* Jadwal Sewa: ${formatDateIndo(startDate)}`,
        `* Jam Sewa: ${startTime} - ${calculatedEndTime} WIB (${durationValue} ${durationType})`,
        `* Unit Sepeda (${selectedBikes.length} Unit):`,
        bikeListText,
        `* Tambahan Lainnya (Addons):`,
        addonListText,
        notes.trim() ? `* Fasilitas / Catatan Titipan Barang: *${notes.trim()}*` : '',
        `* Pembayaran: *Bayar di Akhir (Saat Pengembalian Unit)*`,
        ``,
        `⚠️ *Status:* Pesanan telah tersimpan di website Kravent Bike dan menunggu tombol *ACC Pesanan* dari Admin.`,
        `Mohon konfirmasi ACC ketersediaan unit ini. Terima kasih! 🚴‍♂️`
      ].filter(Boolean).join('\n');

      const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(textLines)}`;
      setLastWhatsAppUrl(whatsappUrl);
      window.open(whatsappUrl, '_blank');

      if (onBookingSuccess) {
        onBookingSuccess(createdList);
      }
    } catch (err) {
      console.error('Gagal memproses pesanan customer:', err);
      alert('Gagal memproses pesanan: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex min-h-full items-start sm:items-center justify-center p-2 sm:p-4 overscroll-contain">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-2 sm:my-6 border border-slate-200 flex flex-col max-h-[94vh]">
        
        {/* MODAL HEADER WITH 4-STEP PROGRESS */}
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
                    ? isCustomer
                      ? `Pesanan Berhasil Dikirim (${confirmedBookings.length} Sepeda)`
                      : `Booking Berhasil Diinput (${confirmedBookings.length} Sepeda)`
                    : isCustomer
                    ? 'Form Pemesanan Sepeda Kravent Bike'
                    : 'Input Booking Sepeda Kravent Bike'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Alur: (1) Data Diri ➔ (2) Pilih Jam ➔ (3) Pilih Sepeda ➔ (4) Tambahan &amp; ACC
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

          {/* 4 STEP WIZARD INDICATOR */}
          {!confirmedBookings && (
            <div className="grid grid-cols-4 gap-1 sm:gap-2 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 1
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">1. Data Diri</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!customerName.trim() || !customerPhone.trim()) {
                    alert('Mohon isi nama dan no. WhatsApp pada Langkah 1 terlebih dahulu.');
                    return;
                  }
                  setCurrentStep(2);
                }}
                className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 2
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3 h-3 shrink-0" />
                <span className="truncate">2. Pilih Jam</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!customerName.trim() || !customerPhone.trim()) {
                    alert('Mohon isi data diri terlebih dahulu.');
                    setCurrentStep(1);
                    return;
                  }
                  setCurrentStep(3);
                }}
                className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 3
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <BikeIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">3. Sepeda ({selectedBikeIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedBikeIds.length === 0) {
                    alert('Pilih minimal 1 sepeda pada Langkah 3 terlebih dahulu.');
                    setCurrentStep(3);
                    return;
                  }
                  setCurrentStep(4);
                }}
                className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                  currentStep === 4
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <PackagePlus className="w-3 h-3 shrink-0" />
                <span className="truncate">4. Tambahan</span>
              </button>
            </div>
          )}
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ========================================================= */}
          {/* STATE: CONFIRMED BOOKING SUCCESS SCREEN                   */}
          {/* ========================================================= */}
          {confirmedBookings ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-md">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-lg">
                  {isCustomer
                    ? `Pesanan Berhasil Disimpan & Menunggu ACC Admin!`
                    : `Booking Berhasil Diinput untuk ${confirmedBookings.length} Unit Sepeda!`}
                </h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  {isCustomer
                    ? `Data pesanan Anda telah masuk ke sistem Kravent Bike atas nama ${customerName}. Admin hanya perlu klik ACC dan sepeda langsung siap Anda ambil.`
                    : `Data telah tersimpan di sistem. Status unit sepeda otomatis diperbarui menjadi sedang disewa.`}
                </p>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800">
                  <span>Kode Booking: {groupBookingCode}</span>
                </div>
              </div>

              {/* Unit Sepeda Terpilih */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Unit Sepeda ({confirmedBookings.length} Unit):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {confirmedBookings.map((b, idx) => (
                    <div key={b.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                      <img src={b.bikeImage} alt={b.bikeName} className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" />
                      <div className="min-w-0 flex-1 text-xs">
                        <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                          Unit #{idx + 1}: {b.bookingCode}
                        </span>
                        <h5 className="font-bold text-slate-900 truncate mt-0.5">{b.bikeName}</h5>
                        <p className="text-[11px] text-slate-500">{b.startTime} - {b.endTime} WIB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Addons List */}
              {selectedAddonList.length > 0 && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-amber-950 block text-[11px] uppercase">
                    Perlengkapan Tambahan Terpilih:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedAddonList.map(a => (
                      <span key={a.id} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium text-[11px]">
                        {a.name} ({a.quantity}x) {!isCustomer && `• ${formatRupiah(a.price * a.quantity)}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Catatan Titip Barang */}
              {notes.trim() && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-blue-950 block text-[11px] uppercase flex items-center gap-1.5">
                    <Luggage className="w-3.5 h-3.5 text-blue-600" />
                    Fasilitas / Catatan Barang Titipan di Outlet:
                  </span>
                  <p className="text-blue-900 font-medium text-[12px]">{notes.trim()}</p>
                </div>
              )}

              {/* Ringkasan Akhir */}
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
                    Bayar di Akhir (Saat Pengembalian Sepeda)
                  </span>
                </div>
                {!isCustomer ? (
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="text-sm font-bold text-slate-300">Total Tagihan ({confirmedBookings.length} Sepeda + Addon):</span>
                    <span className="text-lg font-extrabold text-emerald-400">{formatRupiah(finalTotalWithAddons)}</span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-300 flex items-center justify-between">
                    <span>Status Pesanan:</span>
                    <span className="font-extrabold uppercase">Tersimpan di Sistem • Menunggu ACC Admin</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                {lastWhatsAppUrl && (
                  <a
                    href={lastWhatsAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Buka WhatsApp Admin</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer ml-auto"
                >
                  Selesai &amp; Tutup
                </button>
              </div>
            </div>
          ) : currentStep === 1 ? (
            /* ========================================================= */
            /* LANGKAH 1: INPUT DULU DATA DIRI & FASILITAS PENITIPAN     */
            /* ========================================================= */
            <form onSubmit={handleProceedToStep2} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <User className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Langkah 1 dari 4: Input Data Diri Pemesan</strong>
                  <p className="text-amber-800 mt-0.5">
                    Silakan masukkan nama dan nomor WhatsApp Anda terlebih dahulu. Anda juga dapat memilih fasilitas penitipan kendaraan atau barang di outlet Kravent Bike.
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Atas Nama / Nama Lengkap Pemesan *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Contoh: Bpk. Taat / Rombongan Gowes Salatiga"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full text-base sm:text-sm px-3.5 py-2.5 sm:py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-medium"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Nama yang akan tercantum pada tiket sewa dan penagihan saat pengembalian sepeda.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Nomor WhatsApp / HP Aktif *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123456789"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full text-base sm:text-sm px-3.5 py-2.5 sm:py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-mono font-medium"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Digunakan untuk konfirmasi ACC pesanan dan koordinasi serah terima unit di Kravent Bike.
                  </span>
                </div>

                {/* FASILITAS PENITIPAN BARANG DI OUTLET & CATATAN */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Luggage className="w-4 h-4 text-blue-700" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-blue-950">
                        Fasilitas Penitipan Barang di Outlet (Opsional)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      Aman di Kasir Kravent
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Customer dapat menitipkan kendaraan (motor/mobil), tas/ransel, helm, jaket, atau kunci di outlet secara gratis selama bersepeda:
                  </p>

                  {/* Quick Toggle Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {CUSTODY_PRESETS.map(preset => {
                      const isChecked = notes.toLowerCase().includes(preset.label.toLowerCase());
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleToggleCustodyPreset(preset.label)}
                          className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.label}</span>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Textarea untuk catatan bebas (default kosong) */}
                  <div>
                    <textarea
                      rows={2}
                      placeholder="Catatan barang titipan atau permintaan khusus (default kosong)..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full text-base sm:text-xs p-3 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-medium"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Contoh: Titip motor Vario plat H 1234 XX, titip tas ransel hitam &amp; jaket.
                    </span>
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
                  <span>Lanjut: Pilih Jam Sewa</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : currentStep === 2 ? (
            /* ========================================================= */
            /* LANGKAH 2: PILIH JAM (ORDER 06:00 - 21:00, TUTUP 23:00)   */
            /* ========================================================= */
            <form onSubmit={handleProceedToStep3} className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <strong>Langkah 2 dari 4: Tentukan Jadwal &amp; Jam Sewa</strong>
                  <p className="text-emerald-800 mt-0.5">
                    Atas Nama: <strong className="text-emerald-950">{customerName}</strong> ({customerPhone}).
                    Jam order sewa dapat dimulai dari pukul <strong>06:00 s/d 21:00 WIB</strong>, dengan waktu pengembalian maksimal toko tutup pukul <strong>23:00 WIB</strong>.
                  </p>
                </div>
              </div>

              {/* Tanggal Sewa */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Pilih Tanggal Sewa Sepeda:
                </label>
                <input
                  type="date"
                  min={todayStr}
                  value={startDate}
                  onChange={e => {
                    const val = e.target.value;
                    if (val && val < todayStr) {
                      alert('Tanggal kemarin tidak dapat dipilih.');
                      setStartDate(todayStr);
                      return;
                    }
                    setStartDate(val);
                  }}
                  className="w-full text-base sm:text-sm px-3.5 py-2.5 sm:py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-bold"
                />
              </div>

              {/* Tipe Sewa: Jam vs Hari */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700">Pilihan Tipe Sewa:</span>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDurationType('jam');
                      setDurationValue(2);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      durationType === 'jam'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
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
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      durationType === 'hari'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sewa Seharian
                  </button>
                </div>
              </div>

              {/* Jam Mulai (06:00 - 21:00) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Pilih Jam Mulai Order (06:00 – 21:00 WIB):
                  </span>
                  <span className="font-extrabold text-emerald-700 font-mono">
                    Mulai: {startTime} WIB
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
                  {VALID_OPERATING_START_HOURS.map(t => {
                    const isPast = isPastHourToday(startDate, t);
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={isPast}
                        onClick={() => setStartTime(t)}
                        title={isPast ? 'Jam ini sudah lewat untuk hari ini' : `Pilih jam mulai ${t} WIB`}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all shrink-0 ${
                          isPast
                            ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed line-through opacity-50'
                            : startTime === t
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105 cursor-pointer'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                {startDate === todayStr && (
                  <p className="text-[10px] text-slate-500 italic">
                    * Jam yang telah lewat pada hari ini otomatis dinonaktifkan (coret).
                  </p>
                )}
              </div>

              {/* Pilihan Durasi */}
              {durationType === 'jam' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Durasi Sewa:</span>
                    <span className="font-extrabold text-emerald-700">
                      Selesai: {calculatedEndTime} WIB ({durationValue} Jam)
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5, 6].map(hours => {
                      const [sh] = startTime.split(':').map(Number);
                      const isPastClosing = sh + hours > 23;

                      return (
                        <button
                          key={hours}
                          type="button"
                          disabled={isPastClosing}
                          onClick={() => setDurationValue(hours)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            durationValue === hours
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : isPastClosing
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {hours} Jam
                        </button>
                      );
                    })}
                  </div>
                  {(() => {
                    const [sh] = startTime.split(':').map(Number);
                    if (sh + durationValue > 23) {
                      return (
                        <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Melebihi jam tutup maksimal toko 23:00 WIB. Silakan kurangi durasi sewa.</span>
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Berapa Hari Sewa:</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 5, 7].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDurationValue(d)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          durationValue === d
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {d} Hari
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Summary Box */}
              <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Jadwal Gowes Terpilih:
                  </span>
                  <p className="font-extrabold text-sm text-emerald-400 mt-0.5">
                    {formatDateIndo(startDate)} • {startTime} - {calculatedEndTime} WIB
                  </p>
                  <p className="text-slate-300 text-[11px]">
                    Durasi: {durationValue} {durationType}
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                    Order 06:00 - 21:00 • Tutup 23:00
                  </span>
                </div>
              </div>

              {/* FOOTER STEP 2 */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali (Data Diri)</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>Lanjut: Pilih Sepeda Ready di Jam Ini</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : currentStep === 3 ? (
            /* ========================================================= */
            /* LANGKAH 3: PILIH SEPEDA YANG READY DI JAM TERSEBUT         */
            /* ========================================================= */
            <div className="space-y-4">
              {/* Selected Window Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <BikeIcon className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-950 leading-relaxed">
                    <strong>Langkah 3 dari 4: Pilih Sepeda yang Siap Gowes</strong>
                    <p className="text-emerald-800 mt-0.5">
                      Jadwal: <strong>{formatDateIndo(startDate)}</strong> pukul <strong>{startTime} - {calculatedEndTime} WIB</strong>.
                      Centang sepeda yang ingin Anda sewa (Bisa pilih <strong>lebih dari 1 sepeda</strong> untuk rombongan!).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-2.5 py-1 text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg font-bold shrink-0 cursor-pointer"
                >
                  Ganti Jam
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative w-full flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama sepeda, tipe, kode unit (KB-01)..."
                    value={bikeSearchQuery}
                    onChange={e => setBikeSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-medium"
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
                <span>Klik kartu sepeda untuk memilih:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllAvailable}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    + Pilih Semua yang Ready
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              {/* Grid of Bikes to Select */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[46vh] overflow-y-auto pr-1">
                {filteredBikes.map(b => {
                  const isSelected = selectedBikeIds.includes(b.id);
                  const avail = bikeAvailabilityMap.get(b.id);
                  const isAvailable = avail ? avail.isAvailable : true;
                  const isMaintenance = b.status === 'maintenance';

                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        if (isMaintenance) {
                          alert(`Sepeda [${b.licenseNumber}] sedang perbaikan/maintenance.`);
                          return;
                        }
                        if (!isAvailable) {
                          alert(`Sepeda [${b.licenseNumber}] sudah dipesan penyewa lain pada jam ${startTime} - ${calculatedEndTime} WIB.`);
                          return;
                        }
                        handleToggleBike(b.id);
                      }}
                      className={`relative p-3 rounded-2xl border-2 transition-all cursor-pointer flex gap-3 text-xs ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                          : isAvailable && !isMaintenance
                          ? 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                          : 'border-slate-200 bg-slate-100/80 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* Checkbox indicator */}
                      <div className="absolute top-3 right-3">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isAvailable && !isMaintenance
                              ? 'border-2 border-slate-300 bg-white'
                              : 'border border-slate-300 bg-slate-200 text-slate-400'
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
                              !isAvailable
                                ? 'bg-rose-100 text-rose-800'
                                : isMaintenance
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {!isAvailable ? 'Terpakai di Jam Ini' : isMaintenance ? 'Perbaikan' : 'Ready Gowes'}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-slate-900 truncate">{b.name}</h4>
                        <p className="text-[11px] text-slate-500 truncate">{b.gearSystem} • {b.frameSize}</p>

                        {!isCustomer ? (
                          <div className="mt-1 text-[11px] font-bold text-emerald-700">
                            {formatRupiah(b.pricePerHour)}/jam
                          </div>
                        ) : (
                          <div className="mt-1 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                            {isAvailable && !isMaintenance ? (
                              <>
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Unit Siap Dipakai</span>
                              </>
                            ) : (
                              <span className="text-rose-600 font-medium">Tidak tersedia di jam ini</span>
                            )}
                          </div>
                        )}
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
                          className="hover:text-rose-600 ml-1 cursor-pointer font-bold"
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

              {/* FOOTER STEP 3 */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali (Atur Jam)</span>
                </button>
                <button
                  type="button"
                  onClick={handleProceedToStep4}
                  disabled={selectedBikeIds.length === 0}
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                    selectedBikeIds.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Lanjut: Tambahan &amp; Konfirmasi ({selectedBikeIds.length} Sepeda)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* LANGKAH 4: TAMBAHAN YANG LAINNYA (ADDONS & KONFIRMASI)    */
            /* ========================================================= */
            <div className="space-y-4">
              {/* Header Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Penyewa &amp; Unit Terpilih:
                  </span>
                  <p className="font-bold text-sm text-amber-300">
                    {customerName} <span className="text-slate-300 font-normal">({customerPhone})</span>
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {selectedBikes.length} Unit • {formatDateIndo(startDate)} ({startTime} - {calculatedEndTime} WIB)
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Ubah Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Ubah Sepeda
                  </button>
                </div>
              </div>

              {/* MENU BIAYA TAMBAHAN OPSIONAL (ADDONS - FLAT SEKALI SEWA) */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <PackagePlus className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-950">
                      Menu Tambahan Opsional (Addons)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                    Biaya Flat Sekali Sewa
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Pilih perlengkapan tambahan jika diperlukan (harga bukan per jam, berlaku sekali sewa).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {OFFICIAL_ADDONS.map(addon => {
                    const currentQty = selectedAddons[addon.id] || 0;
                    const isMax = currentQty >= addon.maxStock;

                    return (
                      <div
                        key={addon.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          currentQty > 0
                            ? 'bg-white border-emerald-400 shadow-2xs'
                            : 'bg-white/80 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{addon.icon}</span>
                            <span className="text-xs font-bold text-slate-900">{addon.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {!isCustomer ? (
                              <span className="font-extrabold text-emerald-700 font-mono">
                                {formatRupiah(addon.price)} <span className="text-[10px] font-normal text-slate-400">/sewa</span>
                              </span>
                            ) : (
                              <span className="text-slate-500">Perlengkapan Resmi</span>
                            )}
                            {addon.maxStock < 99 && (
                              <span className="text-[10px] text-slate-400 ml-1.5">(Maks {addon.maxStock})</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleUpdateAddonQty(addon.id, -1)}
                            disabled={currentQty === 0}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                              currentQty === 0
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'bg-white text-slate-800 hover:bg-slate-200 shadow-2xs cursor-pointer'
                            }`}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-xs text-slate-900">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateAddonQty(addon.id, 1)}
                            disabled={isMax}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                              isMax
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'bg-white text-emerald-700 hover:bg-emerald-100 shadow-2xs cursor-pointer'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rincian Barang Titipan */}
              {notes.trim() && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs space-y-1">
                  <span className="font-bold text-blue-950 block text-[11px] uppercase flex items-center gap-1.5">
                    <Luggage className="w-3.5 h-3.5 text-blue-600" />
                    Barang Titipan di Outlet:
                  </span>
                  <p className="text-blue-900 font-medium text-[12px]">{notes.trim()}</p>
                </div>
              )}

              {/* Staff/Admin: Pricing & Profit Sharing Breakdown */}
              {!isCustomer && (
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-900 text-white space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-amber-400">Rincian Tarif Resmi Toko (Staf &amp; Owner):</span>
                    <span className="text-[11px] text-slate-400">
                      {rateInfo.label} ({formatRupiah(rateInfo.ratePerHour)}/jam)
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between">
                      <span>Total Sewa {selectedBikes.length} Unit:</span>
                      <span className="font-bold text-white">{formatRupiah(grandTotalCost)}</span>
                    </div>
                    {grandTotalAddonCost > 0 && (
                      <div className="flex justify-between text-amber-300">
                        <span>Biaya Perlengkapan Tambahan:</span>
                        <span className="font-bold">+{formatRupiah(grandTotalAddonCost)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-sm">
                      <span className="font-bold text-white">Grand Total Tagihan:</span>
                      <span className="font-black text-emerald-400 text-base">{formatRupiah(finalTotalWithAddons)}</span>
                    </div>
                  </div>

                  {/* Payment Method Selector for Admin/Staff */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Metode Pembayaran:</span>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold"
                    >
                      <option value="bayar_nanti">Bayar di Akhir (Saat Pengembalian)</option>
                      <option value="cash">Tunai (Cash di Awal)</option>
                      <option value="qris">QRIS</option>
                      <option value="transfer">Transfer Bank</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Customer: SOP & ACC Notice (Estimasi Biaya Dihilangkan) */}
              {isCustomer && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-xs space-y-2 text-emerald-950">
                  <div className="flex items-center gap-2 font-extrabold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>SOP Pembayaran &amp; Persetujuan Pesanan</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Setelah Anda menekan tombol di bawah, pesanan akan <strong>otomatis tersimpan ke sistem Kravent Bike</strong> dan membuka chat WhatsApp Admin untuk di-ACC.
                  </p>
                  <div className="p-2.5 bg-white border border-emerald-200 rounded-xl flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Sistem Pembayaran:</span>
                    <span className="font-extrabold text-emerald-800">Bayar di Akhir (Saat Pengembalian Sepeda)</span>
                  </div>
                </div>
              )}

              {/* FOOTER STEP 4 */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Kembali (Pilih Sepeda)</span>
                </button>

                {isCustomer ? (
                  <button
                    type="button"
                    onClick={handleCustomerSendWhatsApp}
                    disabled={isSubmitting || selectedBikes.length === 0}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{isSubmitting ? 'Menyimpan...' : 'Kirim Pesanan ke WhatsApp Admin (Menunggu ACC) ➔'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitAdminMultiBooking}
                    disabled={isSubmitting || selectedBikes.length === 0}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>{isSubmitting ? 'Menyimpan...' : `Simpan Booking (${selectedBikes.length} Sepeda)`}</span>
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
