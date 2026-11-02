import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  User,
  Phone,
  Bike,
  Trash2,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  MessageCircle,
  FileSpreadsheet,
  Pencil,
  AlertTriangle,
  RefreshCw,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowLeftRight,
  Eye,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Booking, BookingStatus, Bike as BikeType } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { BookingModal } from './BookingModal';
import { PrintReportModal } from './PrintReportModal';
import { ReturnBookingModal } from './ReturnBookingModal';
import { EditBookingModal } from './EditBookingModal';

export const BookingList: React.FC = () => {
  const {
    bookings,
    updateBookingStatus,
    updateBooking,
    addBooking,
    deleteBooking,
    currentRole,
    bikes,
    financialBreakdown,
    financialSettings,
    accGroupBookings,
    startGroupBookings,
    swapBookingBike,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<Booking | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [returningBooking, setReturningBooking] = useState<Booking | null>(null);
  const [swappingBooking, setSwappingBooking] = useState<Booking | null>(null);
  const [newBikeForSwap, setNewBikeForSwap] = useState<string>('');
  
  // State Modal Detail Lengkap Persepeda
  const [selectedDetailBookingId, setSelectedDetailBookingId] = useState<string | null>(null);
  const [showAddBikeInDetail, setShowAddBikeInDetail] = useState(false);
  const [selectedBikeToAdd, setSelectedBikeToAdd] = useState<string>('');
  const [isAddingBike, setIsAddingBike] = useState(false);
  const [addBikeSuccessNotice, setAddBikeSuccessNotice] = useState<string | null>(null);

  const isAdmin = currentRole === 'admin';
  const isKaryawan = currentRole === 'karyawan';
  const canManage = isAdmin || isKaryawan;
  const staffActorName = isAdmin ? 'Owner Kravent' : 'Staff Toko';

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch =
        b.customerName.toLowerCase().includes(search.toLowerCase()) ||
        b.customerPhone.includes(search) ||
        b.bookingCode.toLowerCase().includes(search.toLowerCase()) ||
        b.bikeName.toLowerCase().includes(search.toLowerCase()) ||
        (b.groupBookingCode && b.groupBookingCode.toLowerCase().includes(search.toLowerCase()));

      let matchesStatus = true;
      if (filterStatus === 'all') {
        matchesStatus = true;
      } else if (filterStatus === 'sedang di luar') {
        matchesStatus = b.status === 'sedang di luar' || b.status === 'aktif';
      } else {
        matchesStatus = b.status === filterStatus;
      }

      const matchesDate = !filterDate || b.startDate === filterDate;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [bookings, search, filterStatus, filterDate]);

  // Kelompokkan booking rombongan yang masih pending atau booking
  const pendingOrBookingGroups = useMemo(() => {
    const groups: Record<string, Booking[]> = {};
    bookings.forEach(b => {
      if (b.status === 'pending' || b.status === 'booking') {
        const key = b.groupBookingCode || `SINGLE-${b.id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(b);
      }
    });
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [bookings]);

  // Tombol 1: ACC (Persepeda)
  const handleAccSingle = (booking: Booking) => {
    updateBookingStatus(booking.id, 'booking', {
      approvedAt: new Date().toISOString(),
      approvedBy: staffActorName,
      handoverBy: staffActorName,
    });

    // Buka konfirmasi WhatsApp ke pelanggan jika nomor ada
    if (booking.customerPhone && booking.customerPhone !== '-') {
      sendWhatsAppNotification(
        booking.customerPhone,
        `Halo Kak *${booking.customerName}*!\n` +
        `Pesanan sewa unit *${booking.bikeName}* (Kode: ${booking.bookingCode}) di *Kravent Bike Salatiga* telah kami *ACC* dan berstatus *Booking*.\n\n` +
        `📅 Tanggal: ${formatDateIndo(booking.startDate)}\n` +
        `⏰ Sesi: ${booking.bookingSession === 'pagi' ? 'Pagi (06:00 - 12:00 WIB)' : 'Siang (13:00 - 21:00 WIB)'}\n` +
        `💰 Total: ${formatRupiah(booking.totalPrice + (booking.addonTotalCost || 0))}\n\n` +
        `Unit telah kami siapkan di outlet Kravent Bike. Terima kasih! 🚴‍♂️`
      );
    }
  };

  // Tombol 1: ACC Rombongan (Seluruh sepeda dalam rombongan sekaligus)
  const handleAccGroup = async (groupCode: string, groupItems: Booking[]) => {
    await accGroupBookings(groupCode, staffActorName);

    const first = groupItems[0];
    if (first && first.customerPhone && first.customerPhone !== '-') {
      const bikeNames = groupItems.map((b, i) => `  ${i + 1}. *${b.bikeName}*`).join('\n');
      const totalAll = groupItems.reduce((sum, b) => sum + b.totalPrice + (b.addonTotalCost || 0), 0);
      sendWhatsAppNotification(
        first.customerPhone,
        `Halo Kak *${first.customerName}*!\n` +
        `Pesanan *Rombongan* (${groupItems.length} Unit Sepeda) kode *${groupCode}* di *Kravent Bike Salatiga* telah kami *ACC* dan berstatus *Booking*!\n\n` +
        `📅 Tanggal: ${formatDateIndo(first.startDate)}\n` +
        `⏰ Sesi: ${first.bookingSession === 'pagi' ? 'Pagi (06:00 - 12:00 WIB)' : 'Siang (13:00 - 21:00 WIB)'}\n` +
        `🚴‍♂️ Daftar Unit:\n${bikeNames}\n` +
        `💰 Total Tagihan: ${formatRupiah(totalAll)}\n\n` +
        `Semua unit rombongan telah kami siapkan di outlet Kravent Bike. Terima kasih! 🚴‍♂️`
      );
    }
  };

  // Tombol 2: Mulai (Persepeda) -> Status menjadi 'sedang di luar'
  const handleStartSingle = (booking: Booking) => {
    updateBookingStatus(booking.id, 'sedang di luar', {
      handoverBy: staffActorName,
    });
  };

  // Tombol 2: Mulai Rombongan -> Status seluruh sepeda menjadi 'sedang di luar'
  const handleStartGroup = async (groupCode: string) => {
    await startGroupBookings(groupCode, staffActorName);
  };

  // Tombol 3: Terima Kembali (Persepeda) -> Buka ReturnBookingModal -> Status 'selesai'
  const handleOpenReturnModal = (booking: Booking) => {
    setReturningBooking(booking);
  };

  // Poin 4: Batal Persepeda (bisa persepeda tidak perrombongan)
  const handleCancelSingle = (booking: Booking) => {
    if (window.confirm(`Batalkan unit ${booking.bikeName} (${booking.bookingCode})?`)) {
      updateBookingStatus(booking.id, 'dibatalkan');
    }
  };

  // Poin 4: Tukar Persepeda (bisa persepeda tidak perrombongan)
  const handleOpenSwapModal = (booking: Booking) => {
    setSwappingBooking(booking);
    setNewBikeForSwap('');
  };

  const handleConfirmSwap = async () => {
    if (!swappingBooking || !newBikeForSwap) return;
    try {
      await swapBookingBike(swappingBooking.id, newBikeForSwap, staffActorName);
      setSwappingBooking(null);
      setNewBikeForSwap('');
      alert('Unit sepeda berhasil ditukar!');
    } catch (err) {
      alert('Gagal menukar sepeda: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const sendWhatsAppNotification = (phone: string, text: string) => {
    const clean = phone.replace(/\D/g, '');
    const formatted = clean.startsWith('0') ? '62' + clean.slice(1) : clean;
    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Sepeda yang tersedia untuk ditukar
  const availableBikesForSwap = useMemo(() => {
    return bikes.filter(b => b.status === 'tersedia');
  }, [bikes]);

  // Detail booking yang sedang dipilih
  const selectedDetailBooking = useMemo(() => {
    return bookings.find(b => b.id === selectedDetailBookingId) || null;
  }, [bookings, selectedDetailBookingId]);

  // Sepeda lain dalam satu rombongan yang sama
  const groupSiblingBookings = useMemo(() => {
    if (!selectedDetailBooking || !selectedDetailBooking.groupBookingCode) return [];
    return bookings.filter(
      b => b.groupBookingCode === selectedDetailBooking.groupBookingCode && b.id !== selectedDetailBooking.id
    );
  }, [bookings, selectedDetailBooking]);

  // Sepeda yang tersedia untuk ditambahkan ke pesanan ini
  const availableBikesToAdd = useMemo(() => {
    if (!selectedDetailBooking) return [];
    const busyBikeIds = new Set(
      bookings
        .filter(
          b =>
            b.startDate === selectedDetailBooking.startDate &&
            b.bookingSession === selectedDetailBooking.bookingSession &&
            b.status !== 'selesai' &&
            b.status !== 'dibatalkan'
        )
        .map(b => b.bikeId)
    );
    return bikes.filter(b => b.status !== 'maintenance' && !busyBikeIds.has(b.id));
  }, [bikes, bookings, selectedDetailBooking]);

  // Handler Tambah Sepeda ke Pesanan Ini
  const handleAddBikeToGroup = async () => {
    if (!selectedDetailBooking || !selectedBikeToAdd) return;
    const bikeObj = bikes.find(b => b.id === selectedBikeToAdd);
    if (!bikeObj) return;

    setIsAddingBike(true);
    try {
      const todayShort = (selectedDetailBooking.startDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '').slice(4);
      let groupCode = selectedDetailBooking.groupBookingCode;

      if (!groupCode) {
        groupCode = `GRP-${todayShort}-${Math.floor(100 + Math.random() * 900)}`;
        await updateBooking(selectedDetailBooking.id, {
          groupBookingCode: groupCode,
          groupItemIndex: 1,
          groupItemTotal: 2,
        });
      } else {
        const siblings = bookings.filter(b => b.groupBookingCode === groupCode);
        const newTotal = siblings.length + 1;
        for (const s of siblings) {
          await updateBooking(s.id, { groupItemTotal: newTotal });
        }
      }

      const totalH = selectedDetailBooking.totalHours || (selectedDetailBooking.bookingSession === 'pagi' ? 6 : 8);
      await addBooking({
        bikeId: bikeObj.id,
        bikeName: bikeObj.name,
        bikeImage: bikeObj.image,
        customerName: selectedDetailBooking.customerName,
        customerPhone: selectedDetailBooking.customerPhone,
        startDate: selectedDetailBooking.startDate,
        endDate: selectedDetailBooking.endDate || selectedDetailBooking.startDate,
        startTime: selectedDetailBooking.startTime,
        endTime: selectedDetailBooking.endTime,
        bookingSession: selectedDetailBooking.bookingSession,
        totalHours: totalH,
        pricePerHour: bikeObj.pricePerHour,
        totalPrice: bikeObj.pricePerHour * totalH,
        status: selectedDetailBooking.status === 'sedang di luar' ? 'sedang di luar' : selectedDetailBooking.status === 'booking' ? 'booking' : 'pending',
        paymentMethod: selectedDetailBooking.paymentMethod || 'bayar_nanti',
        paymentStatus: selectedDetailBooking.paymentStatus || 'belum_lunas',
        notes: `Tambahan unit sepeda ke rombongan (${groupCode})`,
        groupBookingCode: groupCode,
        groupItemIndex: (selectedDetailBooking.groupItemTotal || 1) + 1,
        groupItemTotal: (selectedDetailBooking.groupItemTotal || 1) + 1,
      });

      setSelectedBikeToAdd('');
      setShowAddBikeInDetail(false);
      setAddBikeSuccessNotice(`✅ Berhasil menambahkan ${bikeObj.name} ke pesanan rombongan!`);
      setTimeout(() => setAddBikeSuccessNotice(null), 3500);
    } catch (err) {
      alert(`Gagal menambah sepeda: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAddingBike(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Manajemen Booking & Transaksi Sepeda
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
              {bookings.length} Transaksi
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Alur Status Resmi: <strong>Booking</strong> ➔ <strong>Sedang di Luar</strong> ➔ <strong>Selesai</strong>.
            Tombol Operasional: <strong>ACC</strong> ➔ <strong>Mulai</strong> ➔ <strong>Terima Kembali</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Ekstrak Laporan (PDF & Excel)</span>
          </button>

          {canManage && bikes.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Input Booking (Bisa Banyak Sepeda)</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode booking, rombongan (GRP-...), nama penyewa, nomor HP, atau sepeda..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-emerald-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector (Poin 2: Booking -> Sedang di Luar -> Selesai) */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu ACC</option>
            <option value="booking">Booking (Sudah Di-ACC)</option>
            <option value="sedang di luar">Sedang di Luar</option>
            <option value="selesai">Selesai (Sudah Kembali)</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>

          {/* Date filter */}
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
          />

          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-xs text-rose-600 hover:underline px-2"
            >
              Hapus Tanggal
            </button>
          )}
        </div>
      </div>

      {/* TABEL DATA BOOKING */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-3">
            <CalendarCheck className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
            <div>
              <p className="text-sm font-bold text-slate-700">Belum ada data transaksi yang sesuai filter.</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Pesanan masuk dari website customer atau input langsung kasir akan tampil di sini.
              </p>
            </div>
            {canManage && bikes.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Input Booking Baru</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3.5 pl-4">Kode &amp; Tanggal</th>
                  <th className="py-3.5">Unit Sepeda</th>
                  <th className="py-3.5">Penyewa &amp; Kontak</th>
                  <th className="py-3.5">Sesi &amp; Waktu</th>
                  <th className="py-3.5">Total &amp; Catatan Pembayaran</th>
                  <th className="py-3.5">Status Rental</th>
                  <th className="py-3.5 text-right pr-4">Aksi Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map(b => (
                  <tr
                    key={b.id}
                    onClick={e => {
                      const target = e.target as HTMLElement;
                      if (!target.closest('button') && !target.closest('a')) {
                        setSelectedDetailBookingId(b.id);
                      }
                    }}
                    className="hover:bg-blue-50/70 transition-colors cursor-pointer group"
                    title="Klik baris ini untuk melihat detail lengkap, edit, tambah, hapus, & terima kembali"
                  >
                    {/* Kode & Tanggal */}
                    <td className="py-3.5 pl-4">
                      <span className="font-mono font-bold text-slate-900 block">
                        {b.bookingCode}
                      </span>
                      {b.groupBookingCode && (
                        <span className="text-[10px] font-mono text-amber-700 font-bold block">
                          👥 {b.groupBookingCode} ({b.groupItemIndex || 1}/{b.groupItemTotal || 1})
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        {formatDateIndo(b.startDate)}
                      </span>
                    </td>

                    {/* Unit Sepeda */}
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={b.bikeImage}
                          alt={b.bikeName}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{b.bikeName}</span>
                          {b.swappedFromBikeName && (
                            <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 block">
                              Ditukar dari: {b.swappedFromBikeName}
                            </span>
                          )}
                          {b.addons && b.addons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {b.addons.map((a, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200"
                                >
                                  +{a.name} ({a.quantity}x)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Penyewa & Kontak */}
                    <td className="py-3.5">
                      <div className="font-semibold text-slate-800">{b.customerName}</div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <a
                          href={`https://wa.me/62${b.customerPhone.replace(/\D/g, '').replace(/^0/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline hover:text-emerald-600 font-mono"
                        >
                          {b.customerPhone}
                        </a>
                      </div>
                      {b.notes && (
                        <div
                          className="mt-1 text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 max-w-[180px] truncate"
                          title={b.notes}
                        >
                          📦 {b.notes}
                        </div>
                      )}
                    </td>

                    {/* Sesi & Jam */}
                    <td className="py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-800 mb-0.5">
                        {b.bookingSession === 'pagi' ? '🌅 Sesi Pagi' : '☀️ Sesi Siang'}
                      </span>
                      <div className="font-medium text-slate-800">
                        {b.startTime} - {b.endTime} WIB
                      </div>
                      {b.status === 'selesai' && b.actualReturnTime && (
                        <div className="mt-1 space-y-0.5">
                          <span className="text-[10px] text-slate-600 font-semibold block">
                            Kembali: {b.actualReturnTime} WIB
                          </span>
                          {b.lateMinutes && b.lateMinutes > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Telat {b.lateMinutes} mnt (+{b.lateExtraHours} jam)
                            </span>
                          ) : (
                            <span className="text-[9px] text-emerald-600 font-semibold block">
                              ✓ Tepat Waktu
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Total & Catatan Pembayaran (Poin 10) */}
                    <td className="py-3.5">
                      <span className="font-bold text-slate-900 block">
                        {formatRupiah(b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0)))}
                      </span>
                      {b.lateFee && b.lateFee > 0 ? (
                        <span className="text-[9px] text-rose-600 font-semibold block">
                          Termasuk denda: {formatRupiah(b.lateFee)}
                        </span>
                      ) : null}

                      {/* Status Pembayaran & Catatan Pembayaran (Poin 10) */}
                      {b.status === 'selesai' ? (
                        <div className="mt-1 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md inline-block shadow-2xs">
                            ✓ Lunas ({b.feePaymentMethod || b.paymentMethod})
                          </span>
                          {b.paymentNotes && (
                            <div className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              📝 <strong>Note:</strong> {b.paymentNotes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md inline-block mt-1 shadow-2xs">
                          💳 Bayar di Akhir (Belum Lunas)
                        </span>
                      )}
                    </td>

                    {/* Status Rental (Poin 2) */}
                    <td className="py-3.5">
                      {b.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3" />
                          Menunggu ACC
                        </span>
                      )}
                      {b.status === 'booking' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                          <CheckCircle2 className="w-3 h-3 text-sky-600" />
                          Booking (Sudah Di-ACC)
                        </span>
                      )}
                      {(b.status === 'sedang di luar' || b.status === 'aktif') && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Sedang di Luar
                        </span>
                      )}
                      {b.status === 'selesai' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Selesai (Kembali)
                        </span>
                      )}
                      {b.status === 'dibatalkan' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 line-through">
                          Dibatalkan
                        </span>
                      )}
                    </td>

                    {/* Aksi Operasional (Poin 2 & Poin 4) */}
                    <td className="py-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Lihat Detail */}
                        <button
                          onClick={() => setSelectedDetailBookingId(b.id)}
                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer border border-sky-200 flex items-center gap-1 shadow-2xs"
                          title="Buka Detail Lengkap, Edit, Tambah Sepeda, Terima Kembali, dll."
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-600" />
                          <span>Detail</span>
                        </button>

                        {canManage && (
                          <>
                            {/* Tombol 1: ACC jika pending */}
                            {b.status === 'pending' && (
                              <button
                                onClick={() => handleAccSingle(b)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[11px] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                                title="ACC Pesanan ini"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>ACC</span>
                              </button>
                            )}

                            {/* Tombol 2: Mulai jika status 'booking' */}
                            {b.status === 'booking' && (
                              <button
                                onClick={() => handleStartSingle(b)}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-[11px] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                                title="Mulai: Sepeda dibawa keluar toko oleh penyewa"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Mulai</span>
                              </button>
                            )}

                            {/* Tombol 3: Terima Kembali jika 'sedang di luar' atau 'aktif' */}
                            {(b.status === 'sedang di luar' || b.status === 'aktif') && (
                              <button
                                onClick={() => handleOpenReturnModal(b)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[11px] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                                title="Terima Kembali Sepeda & Input Catatan Pembayaran"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Terima Kembali</span>
                              </button>
                            )}

                            {/* Poin 4: Tombol Tukar Sepeda (Persepeda) */}
                            {b.status !== 'selesai' && b.status !== 'dibatalkan' && (
                              <button
                                onClick={() => handleOpenSwapModal(b)}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                title="Tukar Unit Sepeda Ini"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Poin 4: Tombol Batal Sepeda (Persepeda) */}
                            {b.status !== 'selesai' && b.status !== 'dibatalkan' && (
                              <button
                                onClick={() => handleCancelSingle(b)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Batalkan Unit Ini"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Edit booking */}
                            <button
                              onClick={() => setEditingBooking(b)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Data Pemesan"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Lihat Resi / Cetak Struk */}
                        <button
                          onClick={() => setSelectedReceipt(b)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Cetak Struk"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Admin Delete */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus booking ${b.bookingCode}?`)) {
                                deleteBooking(b.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Data (Owner)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 👁️ MODAL DETAIL LENGKAP & KELOLA PERSEPEDA                      */}
      {/* (Bisa Edit, Hapus, Tambah, Terima Kembali, Tukar, & Batal)     */}
      {/* ============================================================== */}
      {selectedDetailBookingId && selectedDetailBooking && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setSelectedDetailBookingId(null);
          }}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 my-auto">
            {/* Header Modal */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={selectedDetailBooking.bikeImage}
                  alt={selectedDetailBooking.bikeName}
                  className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0 bg-white"
                />
                <div className="truncate">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-white truncate">
                      {selectedDetailBooking.bikeName}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                      ID: {selectedDetailBooking.bikeId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 font-mono">
                    <span>{selectedDetailBooking.bookingCode}</span>
                    {selectedDetailBooking.groupBookingCode && (
                      <span className="text-amber-400 font-bold">
                        • 👥 Rombongan ({selectedDetailBooking.groupBookingCode})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailBookingId(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Tutup Detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Konten Scrollable */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Notifikasi Tambah Sepeda Sukses */}
              {addBikeSuccessNotice && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-2xl flex items-center gap-2 font-bold animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{addBikeSuccessNotice}</span>
                </div>
              )}

              {/* Status Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Status Saat Ini:</span>
                  <div className="mt-0.5">
                    {selectedDetailBooking.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                        <Clock className="w-3.5 h-3.5" />
                        Menunggu ACC Kasir
                      </span>
                    )}
                    {selectedDetailBooking.status === 'booking' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-sky-100 text-sky-900 border border-sky-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                        Booking (Sudah Di-ACC)
                      </span>
                    )}
                    {(selectedDetailBooking.status === 'sedang di luar' || selectedDetailBooking.status === 'aktif') && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Sedang di Luar (Dipakai Penyewa)
                      </span>
                    )}
                    {selectedDetailBooking.status === 'selesai' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Selesai (Sudah Kembali ke Toko)
                      </span>
                    )}
                    {selectedDetailBooking.status === 'dibatalkan' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Dibatalkan
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Biaya:</span>
                  <span className="text-base font-black text-emerald-700">
                    {formatRupiah(selectedDetailBooking.finalTotalPrice ?? (selectedDetailBooking.totalPrice + (selectedDetailBooking.lateFee || 0)))}
                  </span>
                </div>
              </div>

              {/* Grid 2 Kolom Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Kolom 1: Data Penyewa & Jadwal */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      Informasi Penyewa
                    </span>
                    {selectedDetailBooking.customerPhone && selectedDetailBooking.customerPhone !== '-' && (
                      <button
                        onClick={() => {
                          const text = `Halo Kak *${selectedDetailBooking.customerName}*, terkait pesanan sewa sepeda unit *${selectedDetailBooking.bikeName}* (Kode: ${selectedDetailBooking.bookingCode}) di Kravent Bike Salatiga...`;
                          sendWhatsAppNotification(selectedDetailBooking.customerPhone, text);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px] transition-colors cursor-pointer"
                        title="Chat pelanggan via WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>Chat WA</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Nama Lengkap:</span>
                      <span className="font-bold text-slate-900">{selectedDetailBooking.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">No. WhatsApp:</span>
                      <span className="font-mono font-bold text-slate-800">{selectedDetailBooking.customerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tanggal Rental:</span>
                      <span className="font-semibold text-slate-800">{formatDateIndo(selectedDetailBooking.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pilihan Sesi:</span>
                      <span className="font-bold text-emerald-700">
                        {selectedDetailBooking.bookingSession === 'pagi' ? '🌅 Sesi Pagi (06:00 - 12:00 WIB)' : '☀️ Sesi Siang (13:00 - 21:00 WIB)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Jam Ambil & Selesai:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedDetailBooking.startTime} - {selectedDetailBooking.endTime} WIB
                      </span>
                    </div>
                    {selectedDetailBooking.notes && (
                      <div className="pt-1 mt-1 border-t border-slate-100">
                        <span className="text-slate-500 block text-[10px]">Catatan / Jaminan:</span>
                        <span className="text-slate-800 font-medium block bg-slate-50 p-1.5 rounded-lg border border-slate-200 mt-0.5">
                          {selectedDetailBooking.notes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kolom 2: Keuangan & Pengembalian */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                      Status Pembayaran & Pengembalian
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                      {selectedDetailBooking.feePaymentMethod || selectedDetailBooking.paymentMethod || 'Bayar di Akhir'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Biaya Sewa Unit:</span>
                      <span className="font-semibold text-slate-800">{formatRupiah(selectedDetailBooking.totalPrice)}</span>
                    </div>
                    {selectedDetailBooking.addons && selectedDetailBooking.addons.length > 0 && (
                      <div className="flex justify-between text-amber-800">
                        <span>Aksesori Tambahan:</span>
                        <span className="font-semibold">+{formatRupiah(selectedDetailBooking.addonTotalCost || 0)}</span>
                      </div>
                    )}
                    {selectedDetailBooking.lateFee && selectedDetailBooking.lateFee > 0 ? (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Denda Terlambat ({selectedDetailBooking.lateMinutes} mnt):</span>
                        <span>+{formatRupiah(selectedDetailBooking.lateFee)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between pt-1 border-t border-slate-100">
                      <span className="font-bold text-slate-800">Total Tagihan:</span>
                      <span className="font-extrabold text-emerald-700 text-sm">
                        {formatRupiah(selectedDetailBooking.finalTotalPrice ?? (selectedDetailBooking.totalPrice + (selectedDetailBooking.lateFee || 0)))}
                      </span>
                    </div>

                    {/* Catatan Pembayaran Kasir (Poin 10) */}
                    {selectedDetailBooking.paymentNotes ? (
                      <div className="pt-1.5 mt-1 border-t border-slate-100">
                        <span className="text-slate-500 block text-[10px] font-bold">Catatan Pembayaran Kasir:</span>
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[11px] mt-0.5">
                          📝 {selectedDetailBooking.paymentNotes}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 text-[11px] text-slate-500 italic">
                        {selectedDetailBooking.status === 'selesai'
                          ? '✓ Pembayaran telah diselesaikan'
                          : 'Belum ada catatan pembayaran (akan diinput saat Terima Kembali)'}
                      </div>
                    )}

                    {selectedDetailBooking.actualReturnTime && (
                      <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                        <span>Jam Kembali Aktual:</span>
                        <span className="font-bold">{selectedDetailBooking.actualReturnTime} WIB</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sepeda Lain dalam Rombongan yang Sama (Jika Rombongan) */}
              {groupSiblingBookings.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-700" />
                      Unit Lain dalam Rombongan Ini ({groupSiblingBookings.length + 1} Sepeda Total)
                    </span>
                    <span className="text-[10px] text-amber-800 font-medium">
                      Klik salah satu untuk beralih unit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {groupSiblingBookings.map(sb => (
                      <button
                        key={sb.id}
                        type="button"
                        onClick={() => setSelectedDetailBookingId(sb.id)}
                        className="flex items-center justify-between p-2 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-200 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={sb.bikeImage}
                            alt={sb.bikeName}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block text-xs group-hover:text-amber-900 truncate">
                              {sb.bikeName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {sb.bookingCode}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${
                            sb.status === 'pending'
                              ? 'bg-amber-100 text-amber-900'
                              : sb.status === 'booking'
                              ? 'bg-sky-100 text-sky-900'
                              : sb.status === 'sedang di luar'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {sb.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Panel Tambah Sepeda ke Pesanan / Rombongan Ini */}
              {canManage && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-emerald-600" />
                        Tambah Sepeda ke Pesanan Ini
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Tambahkan unit sepeda tambahan untuk penyewa <strong>{selectedDetailBooking.customerName}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddBikeInDetail(prev => !prev)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{showAddBikeInDetail ? 'Batal Tambah' : '+ Tambah Sepeda'}</span>
                    </button>
                  </div>

                  {showAddBikeInDetail && (
                    <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                      <label className="font-bold text-slate-700 block text-[11px]">
                        Pilih Sepeda yang Tersedia ({availableBikesToAdd.length} Unit Siap):
                      </label>
                      {availableBikesToAdd.length === 0 ? (
                        <div className="p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                          Semua unit sepeda sudah terbooking atau sedang maintenance pada tanggal & sesi ini.
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select
                            value={selectedBikeToAdd}
                            onChange={e => setSelectedBikeToAdd(e.target.value)}
                            className="flex-1 p-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-emerald-500 bg-white"
                          >
                            <option value="">-- Pilih Unit Sepeda Tambahan --</option>
                            {availableBikesToAdd.map(b => (
                              <option key={b.id} value={b.id}>
                                [{b.licenseNumber}] {b.name} ({b.category === 'mtb' ? 'MTB' : 'Commuter Bike'} • Rp {b.pricePerHour.toLocaleString('id-ID')}/jam)
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={handleAddBikeToGroup}
                            disabled={!selectedBikeToAdd || isAddingBike}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center gap-1.5"
                          >
                            {isAddingBike ? (
                              <span>Menyimpan...</span>
                            ) : (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Konfirmasi Tambah</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Aksi Lengkap Operasional Persepeda */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              {/* Tombol Hapus & Edit di Kiri */}
              <div className="flex items-center gap-1.5">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Yakin ingin menghapus booking unit ${selectedDetailBooking.bikeName} (${selectedDetailBooking.bookingCode})?`)) {
                        deleteBooking(selectedDetailBooking.id);
                        setSelectedDetailBookingId(null);
                      }
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                    title="Hapus Booking Transaksi (Owner)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {canManage && (
                  <button
                    type="button"
                    onClick={() => setEditingBooking(selectedDetailBooking)}
                    className="flex items-center gap-1 px-3 py-2 text-slate-700 hover:bg-slate-200 rounded-xl border border-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    title="Edit Data Pemesan & Waktu"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedReceipt(selectedDetailBooking)}
                  className="flex items-center gap-1 px-3 py-2 text-slate-700 hover:bg-slate-200 rounded-xl border border-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  title="Cetak Struk Resmi"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Struk</span>
                </button>
              </div>

              {/* Tombol Aksi Operasional Status di Kanan */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {canManage && (
                  <>
                    {/* ACC jika pending */}
                    {selectedDetailBooking.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleAccSingle(selectedDetailBooking)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>⚡ ACC Pesanan</span>
                      </button>
                    )}

                    {/* Mulai jika booking */}
                    {selectedDetailBooking.status === 'booking' && (
                      <button
                        type="button"
                        onClick={() => handleStartSingle(selectedDetailBooking)}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>▶️ Mulai (Keluar)</span>
                      </button>
                    )}

                    {/* Terima Kembali Persepeda jika sedang di luar / aktif */}
                    {(selectedDetailBooking.status === 'sedang di luar' || selectedDetailBooking.status === 'aktif' || selectedDetailBooking.status === 'booking') && (
                      <button
                        type="button"
                        onClick={() => handleOpenReturnModal(selectedDetailBooking)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                        title="Terima Kembali Sepeda & Input Catatan Pembayaran"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>📥 Terima Kembali</span>
                      </button>
                    )}

                    {/* Tukar Sepeda */}
                    {selectedDetailBooking.status !== 'selesai' && selectedDetailBooking.status !== 'dibatalkan' && (
                      <button
                        type="button"
                        onClick={() => handleOpenSwapModal(selectedDetailBooking)}
                        className="flex items-center gap-1 px-3 py-2 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-300 font-bold text-xs transition-colors cursor-pointer"
                        title="Tukar unit sepeda ini dengan unit lain"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>Tukar</span>
                      </button>
                    )}

                    {/* Batalkan Unit */}
                    {selectedDetailBooking.status !== 'selesai' && selectedDetailBooking.status !== 'dibatalkan' && (
                      <button
                        type="button"
                        onClick={() => handleCancelSingle(selectedDetailBooking)}
                        className="flex items-center gap-1 px-3 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-300 font-bold text-xs transition-colors cursor-pointer"
                        title="Batalkan sewa unit sepeda ini saja"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Batalkan</span>
                      </button>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDetailBookingId(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔄 MODAL TUKAR UNIT SEPEDA PERSEPEDA (POIN 4 REVISI)             */}
      {/* ============================================================== */}
      {swappingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-base">Tukar Unit Sepeda</h3>
              </div>
              <button
                onClick={() => setSwappingBooking(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Penyewa:</span>
                <span className="font-extrabold text-slate-900 text-sm">{swappingBooking.customerName}</span>
                <span className="text-slate-500 block mt-1 text-[11px]">Sepeda Saat Ini:</span>
                <span className="font-bold text-amber-800 text-xs">
                  {swappingBooking.bikeName} (ID: {swappingBooking.bikeId})
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Pilih Sepeda Pengganti yang Tersedia:
                </label>
                {availableBikesForSwap.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                    Tidak ada unit sepeda lain yang berstatus &apos;tersedia&apos; saat ini.
                  </div>
                ) : (
                  <select
                    value={newBikeForSwap}
                    onChange={e => setNewBikeForSwap(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-emerald-500 bg-white"
                  >
                    <option value="">-- Pilih Unit Sepeda Tersedia --</option>
                    {availableBikesForSwap.map(bike => (
                      <option key={bike.id} value={bike.id}>
                        [{bike.licenseNumber}] {bike.name} ({bike.category === 'mtb' ? 'MTB' : 'Commuter Bike'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleConfirmSwap}
                disabled={!newBikeForSwap}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer"
              >
                Konfirmasi Tukar Sepeda
              </button>
              <button
                onClick={() => setSwappingBooking(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRUK / RESI MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Struk Rental Sepeda</h3>
                <span className="text-xs text-slate-400 font-mono">{selectedReceipt.bookingCode}</span>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                <span className="text-slate-500">Tanggal Rental:</span>
                <span className="font-semibold text-slate-800">{formatDateIndo(selectedReceipt.startDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                <span className="text-slate-500">Unit Sepeda:</span>
                <span className="font-bold text-slate-800">{selectedReceipt.bikeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                <span className="text-slate-500">Penyewa:</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                <span className="text-slate-500">No. WhatsApp:</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.customerPhone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                <span className="text-slate-500">Sesi Sewa:</span>
                <span className="font-semibold text-slate-800">
                  {selectedReceipt.bookingSession === 'pagi' ? 'Sesi Pagi (06:00 - 12:00 WIB)' : 'Sesi Siang (13:00 - 21:00 WIB)'}
                </span>
              </div>
              {selectedReceipt.actualReturnTime && (
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Jam Kepulangan:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedReceipt.actualReturnTime} WIB {selectedReceipt.lateMinutes ? `(Telat ${selectedReceipt.lateMinutes} mnt)` : ''}
                  </span>
                </div>
              )}
              {selectedReceipt.lateFee && selectedReceipt.lateFee > 0 ? (
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200 text-rose-600 font-semibold">
                  <span>Denda Keterlambatan:</span>
                  <span>+{formatRupiah(selectedReceipt.lateFee)}</span>
                </div>
              ) : null}
              <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                <span className="text-slate-500">Metode Pembayaran:</span>
                <span className="font-bold text-slate-900">
                  {selectedReceipt.feePaymentMethod || selectedReceipt.paymentMethod}
                </span>
              </div>
              {selectedReceipt.paymentNotes && (
                <div className="p-2 bg-slate-50 rounded-lg text-slate-700 border border-slate-200 text-[11px]">
                  <strong>Catatan Pembayaran:</strong> {selectedReceipt.paymentNotes}
                </div>
              )}
              <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-xl font-bold">
                <span className="text-slate-700">Total Tarif:</span>
                <span className="text-emerald-700 text-sm">
                  {formatRupiah(selectedReceipt.finalTotalPrice ?? (selectedReceipt.totalPrice + (selectedReceipt.lateFee || 0)))}
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Cetak Struk
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT BOOKING */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
        />
      )}

      {/* MODAL TERIMA KEMBALI & CATATAN PEMBAYARAN (POIN 10) */}
      {returningBooking && (
        <ReturnBookingModal
          booking={returningBooking}
          onClose={() => setReturningBooking(null)}
        />
      )}

      {/* MODAL INPUT BOOKING BARU */}
      {showAddModal && (
        <BookingModal
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* MODAL EKSTRAK LAPORAN */}
      {showReportModal && (
        <PrintReportModal
          bookings={bookings}
          financialBreakdown={financialBreakdown}
          financialSettings={financialSettings}
          periodName="Oktober 2026"
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};
