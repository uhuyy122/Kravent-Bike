import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Bike,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Tag,
  Zap,
  Info,
  ChevronRight,
  Shield,
  Sparkles,
  MessageCircle,
  Plus,
  Phone,
  Timer,
  Check,
  Camera,
  Upload,
  RefreshCw,
  Pencil,
  X,
  Eye,
  FileImage,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Bike as BikeType, BikeCategory, Booking } from '../types';
import { formatRupiah, formatDateIndo, getCategoryLabel, getBikeStatusBadge } from '../utils/formatters';
import { getDateRateInfo } from '../utils/pricingUtils';
import {
  getUpcomingDates,
  getTodayDateStr,
  checkBikeBookingConflict,
  VALID_OPERATING_START_HOURS,
  isPastHourToday
} from '../utils/scheduleUtils';
import { compressImageFile } from '../utils/imageCompressor';
import { BookingModal } from './BookingModal';
import { CinemaScheduleModal } from './CinemaScheduleModal';

export const Catalog: React.FC = () => {
  const { bikes, bookings, currentRole, updateBike } = useApp();

  const isCustomer = currentRole === 'customer';
  const isAdmin = currentRole === 'admin';
  const todayStr = getTodayDateStr();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCatalogDate, setSelectedCatalogDate] = useState<string>(todayStr);
  const [selectedCatalogStartTime, setSelectedCatalogStartTime] = useState<string>(() => {
    const curH = new Date().getHours();
    const nextH = Math.min(Math.max(curH + 1, 6), 20);
    return `${String(nextH).padStart(2, '0')}:00`;
  });
  const [selectedCatalogDuration, setSelectedCatalogDuration] = useState<number>(2);
  const [showPosterModal, setShowPosterModal] = useState<boolean>(false);
  const [activePosterTab, setActivePosterTab] = useState<'city1' | 'city2' | 'vintage' | 'mtb'>('city1');

  // Auto-advance jam jika tanggal hari ini dan jam awal terpilih sudah lewat
  useEffect(() => {
    if (selectedCatalogDate === todayStr && isPastHourToday(selectedCatalogDate, selectedCatalogStartTime)) {
      const nextAvailable = VALID_OPERATING_START_HOURS.find(
        h => !isPastHourToday(selectedCatalogDate, h)
      );
      if (nextAvailable) {
        setSelectedCatalogStartTime(nextAvailable);
      }
    }
  }, [selectedCatalogDate, selectedCatalogStartTime, todayStr]);

  const selectedCatalogEndTime = useMemo(() => {
    const [h, m] = selectedCatalogStartTime.split(':').map(Number);
    const endH = (h + selectedCatalogDuration) % 24;
    return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, [selectedCatalogStartTime, selectedCatalogDuration]);

  // Quick upcoming dates (mulai hari ini dan ke depan, tidak ada kemarin)
  const quickDates = getUpcomingDates(todayStr, 7);
  const catalogRateInfo = getDateRateInfo(selectedCatalogDate);

  const [bookingPrefill, setBookingPrefill] = useState<{
    bike: BikeType;
    date?: string;
    startTime?: string;
    duration?: number;
    customerName?: string;
    customerPhone?: string;
  } | null>(null);
  const [showMultiBookingModal, setShowMultiBookingModal] = useState(false);
  const [detailBike, setDetailBike] = useState<BikeType | null>(null);
  const [scheduleBike, setScheduleBike] = useState<BikeType | null>(null);

  // Quick edit bike info directly from catalog for staff/admin
  const [editingBikeInCatalog, setEditingBikeInCatalog] = useState<BikeType | null>(null);
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editPriceHour, setEditPriceHour] = useState('');
  const [editPriceDay, setEditPriceDay] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleOpenEditBike = (b: BikeType) => {
    setEditingBikeInCatalog(b);
    setEditName(b.name);
    setEditBrand(b.brand);
    setEditPriceHour(b.pricePerHour.toString());
    setEditPriceDay(b.pricePerDay.toString());
    setEditDesc(b.description);
  };

  const handleSaveEditBike = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBikeInCatalog) return;
    const updatedName = editName.trim() || editingBikeInCatalog.name;
    const updatedBrand = editBrand.trim() || editingBikeInCatalog.brand;
    const updatedPriceH = parseInt(editPriceHour, 10) || editingBikeInCatalog.pricePerHour;
    const updatedPriceD = parseInt(editPriceDay, 10) || editingBikeInCatalog.pricePerDay;
    const updatedDesc = editDesc.trim() || editingBikeInCatalog.description;

    updateBike(editingBikeInCatalog.id, {
      name: updatedName,
      brand: updatedBrand,
      pricePerHour: updatedPriceH,
      pricePerDay: updatedPriceD,
      description: updatedDesc,
    });

    if (detailBike && detailBike.id === editingBikeInCatalog.id) {
      setDetailBike(prev => prev ? {
        ...prev,
        name: updatedName,
        brand: updatedBrand,
        pricePerHour: updatedPriceH,
        pricePerDay: updatedPriceD,
        description: updatedDesc,
      } : null);
    }
    setEditingBikeInCatalog(null);
  };

  // Device upload state on catalog
  const [uploadingBikeId, setUploadingBikeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetBikeForUpload, setTargetBikeForUpload] = useState<string | null>(null);

  const handleTriggerUpload = (bikeId: string) => {
    setTargetBikeForUpload(bikeId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleDeviceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetBikeForUpload) return;

    setUploadingBikeId(targetBikeForUpload);
    try {
      const result = await compressImageFile(file, 900, 700, 0.72);
      updateBike(targetBikeForUpload, { imageUrl: result.dataUrl });
      if (detailBike && detailBike.id === targetBikeForUpload) {
        setDetailBike(prev => prev ? { ...prev, imageUrl: result.dataUrl } : null);
      }
    } catch (err) {
      alert('Gagal mengompresi foto: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploadingBikeId(null);
      setTargetBikeForUpload(null);
    }
  };

  // Filtered bikes
  const filteredBikes = bikes.filter(bike => {
    const matchesSearch =
      bike.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bike.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bike.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bike.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || bike.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'available' && bike.status === 'tersedia') ||
      (selectedStatus === 'rented' && bike.status === 'disewa');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'Semua Sepeda (25 Unit Asli)' },
    { id: 'city', label: 'Sepeda Santai / City (12 Model)' },
    { id: 'road', label: 'Vintage & Federal (6 Model)' },
    { id: 'mtb', label: 'MTB Series (6 Model)' },
    { id: 'folding', label: 'Mini Cruiser (Leoni)' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-10 shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Katalog Resmi Kravent Bike</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            {currentRole === 'karyawan'
              ? 'Katalog Armada Sepeda Kravent Bike'
              : 'Sewa Sepeda Kravent Bike, Bisa Langsung 2, 3, atau Lebih!'}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            {currentRole === 'karyawan'
              ? 'Mode Staf: Pantau daftar sepeda, ketersediaan unit, jam kosong, dan tarif sewa resmi toko (Hanya Lihat / Read-Only).'
              : isCustomer
              ? 'Proses sewa cepat & transparan: Isi nama dulu, pilih sepeda yang diinginkan (bisa lebih dari 2 unit), atur waktu sewa, dan bayar di akhir saat sepeda dikembalikan!'
              : 'Pencatatan rental rombongan / multi-unit. Input nama pemesan, pilih banyak sepeda sekaligus, dan simpan ke sistem.'}
          </p>

          {/* 4 Step Instruction Pills (Hanya untuk Pelanggan / Admin) */}
          {currentRole !== 'karyawan' ? (
            <div className="pt-2">
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                    1
                  </span>
                  Data Diri &amp; Titip Barang
                </span>
                <span className="text-slate-400 hidden sm:inline">➔</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[11px] font-black">
                    2
                  </span>
                  Pilih Jam (Order 06:00 - 21:00)
                </span>
                <span className="text-slate-400 hidden sm:inline">➔</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[11px] font-black">
                    3
                  </span>
                  Pilih Sepeda Ready
                </span>
                <span className="text-slate-400 hidden sm:inline">➔</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-200">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[11px] font-black">
                    4
                  </span>
                  Tambahan &amp; ACC
                </span>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 text-zinc-300 text-xs font-semibold border border-white/15">
                <span>🔒 Mode Staf: Khusus Melihat Status Ketersediaan & Stok Unit (Input & Booking Dilakukan oleh Admin)</span>
              </span>
            </div>
          )}

          {/* Action Buttons: Booking & Lihat Brosur Poster */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {currentRole !== 'karyawan' && (
              <button
                type="button"
                onClick={() => setShowMultiBookingModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-lg shadow-emerald-500/30 cursor-pointer"
              >
                <Bike className="w-4 h-4 stroke-[2.5]" />
                <span>+ Sewa Sepeda (Bisa Banyak Sepeda Sekaligus)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPosterModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs sm:text-sm font-bold border border-white/20 transition-all cursor-pointer backdrop-blur-xs shadow-md"
            >
              <Eye className="w-4 h-4 text-amber-300" />
              <span>Lihat Brosur / Poster Resmi (4 Lembar)</span>
            </button>
          </div>
        </div>

        {/* Ambient decorative circle */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none"></div>
      </div>

      {/* 📅 PEMILIHAN WAKTU & CEK KETERSEDIAAN READY OTOMATIS */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              Tentukan Waktu Gowes (Katalog Otomatis Menyaring Unit Ready):
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pilih tanggal, jam mulai (06:00 – 21:00 WIB), dan durasi sewa di bawah. Unit yang siap gowes langsung tampil di atas!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Tanggal:</span>
            <input
              type="date"
              min={todayStr}
              value={selectedCatalogDate}
              onChange={e => {
                const val = e.target.value;
                if (val && val < todayStr) {
                  alert('Tanggal kemarin tidak dapat dipilih.');
                  setSelectedCatalogDate(todayStr);
                  return;
                }
                setSelectedCatalogDate(val);
              }}
              className="text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-500"
            />
          </div>
        </div>

        {/* Quick Date Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {quickDates.map(item => {
            const isActive = selectedCatalogDate === item.dateStr;
            const itemRate = getDateRateInfo(item.dateStr);
            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => setSelectedCatalogDate(item.dateStr)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all shrink-0 cursor-pointer border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className="font-bold">{item.dayName}, {item.dayNum}</span>
                {!isCustomer && (
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-amber-400 text-slate-950'
                      : itemRate.category === 'weekday'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {itemRate.ratePerHour === 8000 ? '8rb/jam' : '10rb/jam'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Start Hour Quick Pills (06:00 - 20:00 WIB) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Pilih Jam Mulai (06:00 – 21:00 WIB):
            </span>
            <span className="text-[11px] font-extrabold text-emerald-700 font-mono">
              {selectedCatalogStartTime} s/d {selectedCatalogEndTime} WIB ({selectedCatalogDuration} Jam)
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {VALID_OPERATING_START_HOURS.map(t => {
              const isPast = isPastHourToday(selectedCatalogDate, t);
              const isSelected = selectedCatalogStartTime === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={isPast}
                  onClick={() => setSelectedCatalogStartTime(t)}
                  title={isPast ? `Jam ${t} sudah terlewat untuk hari ini` : `Pilih jam ${t}`}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all shrink-0 ${
                    isPast
                      ? 'bg-slate-100 text-slate-300 border-slate-200 line-through cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105 cursor-pointer'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration Pills */}
        <div className="flex items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-700">Durasi Gowes:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[1, 2, 3, 4, 5].map(hrs => (
              <button
                key={hrs}
                type="button"
                onClick={() => setSelectedCatalogDuration(hrs)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  selectedCatalogDuration === hrs
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {hrs} Jam
              </button>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🚲</span>
            <div>
              <span className="font-extrabold text-xs text-emerald-950">
                Jadwal Terpilih: {formatDateIndo(selectedCatalogDate)} ({selectedCatalogStartTime} - {selectedCatalogEndTime} WIB)
              </span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                Katalog di bawah otomatis menandai unit sepeda yang <strong>Ready</strong> di jam ini.
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0">
            Order 06:00 - 21:00 • Tutup 23:00 WIB
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama sepeda (Sky, Sopia, Lucy, Hana, Mazara, Baskara, Foster, dsb) atau kode unit (KB-01 s/d KB-25)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-emerald-500 transition-all font-medium"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Ketersediaan:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="available">Hanya Yang Tersedia</option>
              <option value="rented">Sedang Disewa</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* CATALOG GRID */}
      {filteredBikes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <Bike className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-base">Tidak ada sepeda yang cocok</h3>
          <p className="text-xs text-slate-400 mt-1">
            Coba ganti kata kunci pencarian atau ubah filter kategori.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedStatus('all');
            }}
            className="mt-4 px-4 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBikes.map(bike => {
            const badge = getBikeStatusBadge(bike.status);

            return (
              <div
                key={bike.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group hover:border-emerald-300"
              >
                {/* Bike Image Container */}
                <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={bike.imageUrl}
                    alt={bike.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Category badge */}
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-900/80 backdrop-blur-xs text-white">
                    {getCategoryLabel(bike.category)}
                  </span>

                  {/* Status badge */}
                  <span
                    className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-xs flex items-center gap-1.5 ${badge.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                    {badge.label}
                  </span>

                  {/* License plate number */}
                  <span className="absolute bottom-2 left-3 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-white/90 text-slate-800 shadow-xs">
                    {bike.licenseNumber}
                  </span>

                  {/* Tombol Upload / Ganti Foto dari Perangkat untuk Admin */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerUpload(bike.id);
                      }}
                      disabled={uploadingBikeId === bike.id}
                      title="Unggah Foto Baru dari HP / Kamera Perangkat (Otomatis Diringankan)"
                      className="absolute bottom-2 right-2.5 p-1.5 rounded-lg bg-slate-900/80 hover:bg-emerald-600 text-white backdrop-blur-xs transition-colors flex items-center gap-1 text-[10px] font-bold shadow-md cursor-pointer"
                    >
                      {uploadingBikeId === bike.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                          <span className="hidden sm:inline">Mengompresi...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ganti Foto</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Bike Details Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span>{bike.brand}</span>
                      <span>{bike.totalRentedCount}x Disewa</span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base mt-0.5 leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors">
                      {bike.name}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {bike.description}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] text-slate-600 font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100">
                        {bike.frameSize}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100">
                        {bike.gearSystem}
                      </span>
                    </div>

                    {/* STATUS JADWAL PADA TANGGAL & JAM DIPILIH */}
                    {(() => {
                      const conflict = checkBikeBookingConflict(
                        bike.id,
                        selectedCatalogDate,
                        selectedCatalogStartTime,
                        selectedCatalogEndTime,
                        bookings,
                        bike
                      );

                      if (bike.status === 'maintenance') {
                        return (
                          <div className="mt-2.5 p-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-bold">
                            🔧 Sedang Maintenance Bengkel
                          </div>
                        );
                      }

                      if (conflict.hasConflict) {
                        return (
                          <div className="mt-2.5 p-2 rounded-xl bg-rose-50 border border-rose-200 flex flex-col gap-0.5 text-[11px]">
                            <span className="text-rose-900 font-extrabold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              Terpakai di Jam Ini ({selectedCatalogStartTime} - {selectedCatalogEndTime})
                            </span>
                            <span className="text-rose-700 text-[10px]">
                              {conflict.message || 'Sudah dibooking pada jam tersebut'}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-[11px]">
                          <span className="text-emerald-800 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            Siap Gowes di Jam Ini
                          </span>
                          <span className="text-emerald-700 font-extrabold text-[10px]">
                            {selectedCatalogStartTime} - {selectedCatalogEndTime} WIB
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Price & Primary Action */}
                  <div className="pt-3 border-t border-slate-100">
                    {!isCustomer ? (
                      <div className="flex items-baseline justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-medium">Tarif Sewa:</span>
                            <span className={`text-[9px] font-bold px-1 rounded ${
                              catalogRateInfo.category === 'weekday' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {catalogRateInfo.category === 'weekday' ? '8rb /jam' : '10rb /jam'}
                            </span>
                          </div>
                          <span className="text-base font-extrabold text-emerald-700">
                            {formatRupiah(catalogRateInfo.ratePerHour)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal"> /jam</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Tarif Harian:</span>
                          <span className="text-xs font-bold text-slate-700">
                            {formatRupiah(bike.pricePerDay)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal"> /hari</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold truncate">{bike.frameSize} • {bike.gearSystem}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          bike.status === 'tersedia' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {bike.status === 'tersedia' ? 'Unit Siap Gowes' : 'Sedang Dipakai'}
                        </span>
                      </div>
                    )}

                    {currentRole === 'karyawan' ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setDetailBike(bike)}
                          className="w-full py-2.5 px-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="Lihat spesifikasi lengkap unit"
                        >
                          <Info className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detail Unit</span>
                        </button>

                        <button
                          onClick={() => setScheduleBike(bike)}
                          className="w-full py-2.5 px-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="Lihat ketersediaan jam"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Cek Jam</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setScheduleBike(bike)}
                          className="w-full py-2.5 px-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="Lihat ketersediaan jam"
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Cek Jam</span>
                        </button>

                        {/* UTAMA: SEWA SEPEDA (ALUR 3 LANGKAH MULTI-UNIT) */}
                        {(() => {
                          const conflict = checkBikeBookingConflict(
                            bike.id,
                            selectedCatalogDate,
                            selectedCatalogStartTime,
                            selectedCatalogEndTime,
                            bookings,
                            bike
                          );
                          const isDisabled = bike.status === 'maintenance' || conflict.hasConflict;

                          return (
                            <button
                              onClick={() => setBookingPrefill({
                                bike,
                                date: selectedCatalogDate,
                                startTime: selectedCatalogStartTime,
                                duration: selectedCatalogDuration
                              })}
                              disabled={isDisabled}
                              className={`w-full py-2.5 px-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                isDisabled
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                              }`}
                            >
                              <span>{conflict.hasConflict ? 'Terpakai di Jam Ini' : 'Sewa Unit Ini'}</span>
                              {!isDisabled && <ChevronRight className="w-4 h-4" />}
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🎬 MODAL ALUR: SEPEDA TERPILIH ➔ PILIH TANGGAL ➔ PILIH JAM ➔ WA */}
      {scheduleBike && (
        <CinemaScheduleModal
          bike={scheduleBike}
          initialDate={selectedCatalogDate}
          onClose={() => setScheduleBike(null)}
          onAdminInputDirect={(b, date, startTime, duration, customerName, customerPhone) => {
            setScheduleBike(null);
            setBookingPrefill({
              bike: b,
              date,
              startTime,
              duration,
              customerName,
              customerPhone,
            });
          }}
        />
      )}

      {/* DETAIL MODAL */}
      {detailBike && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="relative aspect-video w-full bg-slate-100">
              <img
                src={detailBike.imageUrl}
                alt={detailBike.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setDetailBike(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
              >
                ✕
              </button>
              <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white text-slate-900 shadow-md">
                Kode: {detailBike.licenseNumber}
              </span>

              {/* Upload Foto Langsung dari Device di Detail Modal */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleTriggerUpload(detailBike.id)}
                  disabled={uploadingBikeId === detailBike.id}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-emerald-600 text-white text-xs font-bold backdrop-blur-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  {uploadingBikeId === detailBike.id ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>Mengompresi Foto...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>Ganti Foto dari Perangkat</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs uppercase font-bold text-emerald-600">
                    {getCategoryLabel(detailBike.category)} • {detailBike.brand}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditBike(detailBike)}
                      className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Edit Nama dan Spesifikasi Sepeda"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Nama Sepeda</span>
                    </button>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">{detailBike.name}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {detailBike.description}
                </p>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[11px]">Ukuran Frame:</span>
                  <span className="font-bold text-slate-800">{detailBike.frameSize}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Drivetrain & Gear:</span>
                  <span className="font-bold text-slate-800">{detailBike.gearSystem}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Warna Unit:</span>
                  <span className="font-bold text-slate-800">{detailBike.color}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Syarat Jaminan:</span>
                  <span className="font-bold text-emerald-700">
                    {!isCustomer ? formatRupiah(detailBike.depositRequired) : 'KTP / KTM / SIM Asli'}
                  </span>
                </div>
              </div>

              {!isCustomer ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2 text-xs">
                  <span className="font-extrabold text-emerald-950 block text-[11px] uppercase tracking-wider">
                    Daftar Tarif Sewa Unit Resmi:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-xl bg-white border border-emerald-200 shadow-2xs">
                      <span className="text-slate-500 text-[10px] block font-medium">Hari Biasa (Senin - Jumat):</span>
                      <span className="text-base font-black text-emerald-700">Rp 8.000</span>
                      <span className="text-[10px] text-slate-400"> /jam</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-amber-200 shadow-2xs">
                      <span className="text-slate-500 text-[10px] block font-medium">Sabtu, Minggu & Libur:</span>
                      <span className="text-base font-black text-amber-700">Rp 10.000</span>
                      <span className="text-[10px] text-slate-400"> /jam</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600">
                    <span>Paket Sewa Harian:</span>
                    <span className="font-bold text-slate-800">{formatRupiah(detailBike.pricePerDay)} /hari</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs">
                  <span className="font-extrabold text-emerald-950 block text-[11px] uppercase tracking-wider">
                    Informasi Reservasi & ACC Unit
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Unit sepeda siap digunakan, sudah dicek rem dan rantai. Setelah Anda klik sewa, pesanan akan langsung diteruskan ke WhatsApp Admin untuk di-ACC.
                  </p>
                </div>
              )}

              {/* Pricing & CTA */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {!isCustomer ? (
                    <>
                      <span className="text-[11px] text-slate-400 block font-medium">Tarif Tanggal Dipilih:</span>
                      <span className="text-xl font-extrabold text-emerald-700">
                        {formatRupiah(catalogRateInfo.ratePerHour)}
                      </span>
                      <span className="text-xs text-slate-400"> /jam ({catalogRateInfo.category === 'weekday' ? 'Hari Biasa' : 'Weekend/Libur'})</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] text-slate-400 block font-medium">Status Ketersediaan:</span>
                      <span className="text-base font-extrabold text-emerald-700">
                        {detailBike.status === 'tersedia' ? 'Unit Siap Gowes' : 'Sedang Dipakai'}
                      </span>
                    </>
                  )}
                </div>

                {currentRole === 'karyawan' ? (
                  <button
                    onClick={() => setDetailBike(null)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Tutup (Mode Lihat)
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const b = detailBike;
                      setDetailBike(null);
                      setBookingPrefill({ bike: b });
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Sewa Sepeda Ini (Bisa Tambah Unit) ➔</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input File Tersembunyi untuk Kompresi & Upload Foto dari Perangkat */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleDeviceFileChange}
        className="hidden"
      />

      {/* BOOKING MODAL (PREFILLED FROM CINEMA SCHEDULE) */}
      {bookingPrefill && (
        <BookingModal
          key={`${bookingPrefill.bike.id}-${bookingPrefill.date || ''}-${bookingPrefill.startTime || ''}-${bookingPrefill.duration || ''}`}
          bike={bookingPrefill.bike}
          initialDate={bookingPrefill.date}
          initialStartTime={bookingPrefill.startTime}
          initialDurationType="jam"
          initialDurationValue={bookingPrefill.duration}
          initialCustomerName={bookingPrefill.customerName}
          initialCustomerPhone={bookingPrefill.customerPhone}
          onClose={() => setBookingPrefill(null)}
          onBookingSuccess={() => {
            // Keep open so confirmation is shown
          }}
        />
      )}

      {/* MULTI-BIKE DIRECT BOOKING MODAL */}
      {showMultiBookingModal && (
        <BookingModal
          onClose={() => setShowMultiBookingModal(false)}
        />
      )}

      {/* ADMIN & STAF: QUICK EDIT INFORMASI SEPEDA */}
      {editingBikeInCatalog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Edit Nama & Info Sepeda</h3>
                  <p className="text-[11px] text-slate-400">Kode Unit: {editingBikeInCatalog.licenseNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBikeInCatalog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBike} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama / Tipe Sepeda: *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Contoh: Polygon Strattos S3 Disc"
                  className="w-full text-xs font-bold px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Merk / Brand:
                  </label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={e => setEditBrand(e.target.value)}
                    placeholder="Polygon / United / dll"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Tarif Harian (Rp):
                  </label>
                  <input
                    type="number"
                    value={editPriceDay}
                    onChange={e => setEditPriceDay(e.target.value)}
                    placeholder="50000"
                    className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Deskripsi Singkat:
                </label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBikeInCatalog(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIHAT POSTER BROSUR RESMI KRAVENT BIKE (3 LEMBAR) */}
      {showPosterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                  <FileImage className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                    Brosur &amp; Poster Resmi Kravent Bike
                  </h3>
                  <p className="text-xs text-slate-400">
                    Katalog asli toko (3 Seri Model Sepeda)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPosterModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Poster Sheet Tabs */}
            <div className="px-4 py-3 bg-slate-950/60 border-b border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActivePosterTab('city1')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  activePosterTab === 'city1'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>🚲 Katalog Sepeda 1 (Sky, Noah, Arlo, Hana, Rose, Blue)</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePosterTab('city2')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  activePosterTab === 'city2'
                    ? 'bg-teal-400 text-slate-950 shadow-md font-extrabold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>🚲 Katalog Sepeda 2 (Sopia, Lucy, Lime, Nina, Leo, Jose)</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePosterTab('vintage')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  activePosterTab === 'vintage'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>⭐ Katalog Vintage / Federal (7 Model)</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePosterTab('mtb')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  activePosterTab === 'mtb'
                    ? 'bg-blue-500 text-white shadow-md font-extrabold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>⛰️ Katalog MTB Series (6 Model)</span>
              </button>
            </div>

            {/* Poster Content & Image Viewer */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/40 flex flex-col items-center justify-center">
              {activePosterTab === 'city1' && (
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="text-center">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      Model: Sky • Noah • Arlo • Hana • Rose • Blue
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Sepeda santai santun &amp; commuter dengan keranjang depan / rak barang.
                    </p>
                  </div>
                  <div className="max-w-2xl w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-white">
                    <img
                      src="/catalog/katalog-sepeda-city.jpeg"
                      alt="Poster Brosur Sepeda City Kravent Bike 1"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              )}

              {activePosterTab === 'city2' && (
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="text-center">
                    <span className="text-xs font-bold text-teal-300 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                      Model: Sopia • Lucy • Lime • Nina • Leo • Jose
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Koleksi warna cerah, sadel leopard print, dan varian klasik hijau army / zaitun.
                    </p>
                  </div>
                  <div className="max-w-2xl w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-white">
                    <img
                      src="/catalog/katalog-sepeda-city-2.jpeg"
                      alt="Poster Brosur Sepeda City Kravent Bike 2"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              )}

              {activePosterTab === 'vintage' && (
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="text-center">
                    <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      Model: Baskara • Candy • Budi • Zilpher • Ocean • Roxo • Leoni
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Sepeda bergaya vintage, touring federal classic, dan mini cruiser aesthetic.
                    </p>
                  </div>
                  <div className="max-w-2xl w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-white">
                    <img
                      src="/catalog/katalog-sepeda-vintage.jpeg"
                      alt="Poster Brosur Sepeda Vintage Kravent Bike"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              )}

              {activePosterTab === 'mtb' && (
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="text-center">
                    <span className="text-xs font-bold text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                      Model: Mazara Black • Mazara Neon • Phoniex Beige • Phoniex Biru • Foster • Fastron
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Sepeda gunung tangguh, suspensi depan empuk, dan ban kembang tapak lebar.
                    </p>
                  </div>
                  <div className="max-w-2xl w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-white">
                    <img
                      src="/catalog/katalog-sepeda-mtb.jpeg"
                      alt="Poster Brosur Sepeda MTB Kravent Bike"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-900 flex flex-wrap items-center justify-between gap-3">
              <a
                href={
                  activePosterTab === 'city1'
                    ? '/catalog/katalog-sepeda-city.jpeg'
                    : activePosterTab === 'city2'
                    ? '/catalog/katalog-sepeda-city-2.jpeg'
                    : activePosterTab === 'vintage'
                    ? '/catalog/katalog-sepeda-vintage.jpeg'
                    : '/catalog/katalog-sepeda-mtb.jpeg'
                }
                target="_blank"
                rel="noreferrer"
                className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1.5 font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Gambar Asli Resolusi Penuh</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const catMap: Record<'city1' | 'city2' | 'vintage' | 'mtb', string> = {
                      city1: 'city',
                      city2: 'city',
                      vintage: 'road',
                      mtb: 'mtb',
                    };
                    setSelectedCategory(catMap[activePosterTab]);
                    setShowPosterModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Saring Unit Seri Ini di Katalog
                </button>
                <button
                  type="button"
                  onClick={() => setShowPosterModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
