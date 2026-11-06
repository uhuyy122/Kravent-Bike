import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
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
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Booking, BookingStatus } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { BookingModal } from './BookingModal';
import { PrintReportModal } from './PrintReportModal';
import { ReturnBookingModal } from './ReturnBookingModal';
import { EditBookingModal } from './EditBookingModal';
import { checkBikeBookingConflict, getCurrentTimeStr, getTodayDateStr } from '../utils/scheduleUtils';
import { getBookingAddonTotal, getBookingTotalPrice } from '../utils/bookingUtils';

export const BookingList: React.FC = () => {
  const { bookings, addBooking, updateBooking, updateBookingStatus, deleteBooking, currentRole, bikes, financialBreakdown, financialSettings } = useApp();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [tableView, setTableView] = useState<'today' | 'upcoming' | 'history' | 'all' | 'date'>('today');
  const [todayDate, setTodayDate] = useState(getTodayDateStr);
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr);
  const [selectedReceipt, setSelectedReceipt] = useState<Booking | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [returningBooking, setReturningBooking] = useState<Booking | null>(null);
  const [returningGroupBooking, setReturningGroupBooking] = useState<Booking[] | null>(null);
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<Booking[] | null>(null);
  const [showAddBikeForm, setShowAddBikeForm] = useState(false);
  const [selectedBikeToAdd, setSelectedBikeToAdd] = useState('');
  const [isAddingBike, setIsAddingBike] = useState(false);

  const isAdmin = currentRole === 'admin';

  const normalizePhone = (value?: string) => (value || '').replace(/\D/g, '');

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const currentDate = getTodayDateStr();
      setTodayDate(previousDate => previousDate === currentDate ? previousDate : currentDate);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setSelectedGroupDetail(current =>
      current ? current.map(item => bookings.find(booking => booking.id === item.id) || item) : null
    );
  }, [bookings]);

  const getGroupStatus = (items: Booking[]) => {
    if (items.some(item => item.status === 'pending')) return 'pending';
    if (items.some(item => item.status === 'booking')) return 'booking';
    if (items.some(item => item.status === 'sedang di luar' || item.status === 'aktif')) return 'sedang di luar';
    if (items.some(item => item.status === 'dibatalkan')) return 'dibatalkan';
    return 'selesai';
  };

  const getGroupItemsForBooking = (booking: Booking) => {
    if (booking.groupBookingCode) {
      return bookings.filter(b => b.groupBookingCode === booking.groupBookingCode);
    }

    return [booking];
  };

  const getNextBooking = (booking: Booking) =>
    bookings
      .filter(b =>
        b.id !== booking.id &&
        b.bikeId === booking.bikeId &&
        b.startDate === booking.startDate &&
        b.startTime > booking.startTime &&
        b.status !== 'dibatalkan' &&
        b.status !== 'selesai'
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

  const groupedBookings = bookings.reduce<Array<{ key: string; items: Booking[]; primary: Booking }>>((acc, booking) => {
    const key = booking.groupBookingCode || booking.id;
    const group = acc.find(item => item.key === key);

    if (group) {
      group.items.push(booking);
      if (new Date(booking.createdAt).getTime() < new Date(group.primary.createdAt).getTime()) {
        group.primary = booking;
      }
      return acc;
    }

    acc.push({ key, items: [booking], primary: booking });
    return acc;
  }, []);

  const searchedBookings = groupedBookings.filter(group => {
    const items = group.items;
    const searchText = [
      group.primary.customerName,
      group.primary.customerPhone,
      group.primary.bookingCode,
      ...items.map(item => item.bikeName),
      ...items.map(item => item.bookingCode),
    ].join(' ').toLowerCase();

    const matchesSearch =
      searchText.includes(search.toLowerCase()) ||
      group.primary.customerName.toLowerCase().includes(search.toLowerCase()) ||
      group.primary.customerPhone.includes(search) ||
      group.primary.bookingCode.toLowerCase().includes(search.toLowerCase()) ||
      items.some(item => item.bikeName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || (
      tableView === 'history'
        ? items.some(item =>
            item.status === filterStatus &&
            (item.status === 'selesai' || item.status === 'dibatalkan')
          )
        : getGroupStatus(items) === filterStatus
    );

    return matchesSearch && matchesStatus;
  });

  const matchesSelectedDate = (items: Booking[], date: string) =>
    items.some(item =>
      item.startDate === date ||
      item.actualStartDate === date ||
      item.actualReturnDate === date
    );

  const isClosed = (status: BookingStatus) =>
    status === 'selesai' || status === 'dibatalkan';

  const isForToday = (items: Booking[]) =>
    items.some(item => (
      item.startDate === todayDate ||
      ((item.status === 'sedang di luar' || item.status === 'aktif') && !isClosed(item.status)) ||
      item.actualStartDate === todayDate ||
      item.actualReturnDate === todayDate
    ));

  const isUpcoming = (items: Booking[]) =>
    items.some(item =>
      (item.status === 'pending' || item.status === 'booking') &&
      item.startDate > todayDate
    );

  const isHistory = (items: Booking[]) => items.some(item => isClosed(item.status));

  const filteredBookings = searchedBookings.flatMap(group => {
    const visibleItems = tableView === 'history'
      ? group.items.filter(item =>
          isClosed(item.status) && (filterStatus === 'all' || item.status === filterStatus)
        )
      : group.items;
    if (tableView === 'history' && visibleItems.length === 0) return [];

    const visibleGroup = visibleItems === group.items
      ? group
      : {
          ...group,
          items: visibleItems,
          primary: visibleItems.find(item => item.id === group.primary.id) || visibleItems[0],
        };
    const groupStatus = getGroupStatus(visibleGroup.items);
    if (tableView !== 'history' && groupStatus === 'selesai') return [];

    let matchesView: boolean;
    switch (tableView) {
      case 'today':
        matchesView = isForToday(visibleGroup.items);
        break;
      case 'upcoming':
        matchesView = isUpcoming(visibleGroup.items);
        break;
      case 'history':
        matchesView = isHistory(visibleGroup.items);
        break;
      case 'date':
        matchesView = matchesSelectedDate(visibleGroup.items, selectedDate);
        break;
      default:
        matchesView = true;
    }
    return matchesView ? [visibleGroup] : [];
  });

  const todayBookingCount = searchedBookings.filter(group => isForToday(group.items)).length;
  const upcomingBookingCount = searchedBookings.filter(group => isUpcoming(group.items)).length;
  const historyBookingCount = searchedBookings.filter(group => isHistory(group.items)).length;

  const getStatusLabel = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return 'Menunggu Persetujuan';
      case 'booking':
        return 'Booking';
      case 'sedang di luar':
      case 'aktif':
        return 'Sedang di Luar';
      case 'selesai':
        return 'Selesai';
      case 'dibatalkan':
        return 'Dibatalkan';
      default:
        return status;
    }
  };

  const handleAccBooking = (booking: Booking) => {
    const staffName = isAdmin ? 'Admin Owner' : 'Karyawan Shift';
    const groupItems = getGroupItemsForBooking(booking);

    groupItems.filter(item => item.status === 'pending').forEach(item => {
      updateBookingStatus(item.id, 'booking', {
        approvedAt: new Date().toISOString(),
        approvedBy: staffName,
        handoverBy: staffName,
      });
    });

    const primaryBooking = groupItems[0] || booking;
    if (primaryBooking.customerPhone && primaryBooking.customerPhone !== '-') {
      const cleanPhone = normalizePhone(primaryBooking.customerPhone);
      const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
      const textMsg = [
        `Halo Kak!`,
        ``,
        `Terima kasih sudah melakukan booking sepeda. Booking Kakak sudah kami ACC dan dikonfirmasi ya.`,
        ``,
        `Mohon diperhatikan beberapa ketentuannya ya, Kak:`,
        `* Mohon datang tepat waktu sesuai jadwal booking. Jika mengalami keterlambatan, mohon segera konfirmasi melalui WhatsApp ini.`,
        `* Mohon tidak melakukan cancel atau reschedule secara mendadak, kecuali apabila kondisi cuaca/hujan tidak memungkinkan untuk bermain.`,
        `* Pembayaran dilakukan di akhir setelah selesai bermain dan akan dihitung berdasarkan durasi pemakaian sepeda.`,
        `* Tersedia parkir untuk motor dan mobil di lokasi.`,
        ``,
        `Terima kasih atas pengertiannya, Kak.`,
        `Sampai ketemu dan selamat bermain!`
      ].join('\n');
      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(textMsg)}`;
      window.open(waUrl, '_blank');
    }
  };

  const handleStartGroupBooking = (booking: Booking) => {
    const actualStartDate = getTodayDateStr();
    const actualStartTime = getCurrentTimeStr();

    getGroupItemsForBooking(booking)
      .filter(item => item.status === 'booking')
      .forEach(item => {
        updateBookingStatus(item.id, 'sedang di luar', {
          actualStartDate,
          actualStartTime,
          handoverBy: isAdmin ? 'Admin Owner' : 'Karyawan Shift',
        });
      });
  };

  const handleStartSingleBooking = (booking: Booking) => {
    updateBookingStatus(booking.id, 'sedang di luar', {
      actualStartDate: getTodayDateStr(),
      actualStartTime: getCurrentTimeStr(),
      handoverBy: isAdmin ? 'Admin Owner' : 'Karyawan Shift',
    });
  };

  const handleReturnGroupBooking = (booking: Booking) => {
    const groupItems = getGroupItemsForBooking(booking)
      .filter(item => item.status === 'sedang di luar' || item.status === 'aktif');
    setReturningGroupBooking(groupItems);
  };

  const handleCancelSingleUnit = (booking: Booking) => {
    if (window.confirm(`Batalkan satu unit ${booking.bikeName} atas nama ${booking.customerName}?`)) {
      updateBookingStatus(booking.id, 'dibatalkan');
    }
  };

  const handleSwapBike = (booking: Booking) => {
    setEditingBooking(booking);
  };

  const activeGroupBookings = selectedGroupDetail?.filter(item =>
    item.status === 'pending' ||
    item.status === 'booking' ||
    item.status === 'sedang di luar' ||
    item.status === 'aktif'
  ) ?? [];
  const addBikeTemplate = activeGroupBookings.find(item =>
    item.status === 'sedang di luar' || item.status === 'aktif'
  ) || activeGroupBookings.find(item => item.status === 'booking') || activeGroupBookings[0];
  const isAddingToActiveRental =
    addBikeTemplate?.status === 'sedang di luar' || addBikeTemplate?.status === 'aktif';
  const addBikeStartDate = isAddingToActiveRental ? getTodayDateStr() : addBikeTemplate?.startDate;
  const addBikeStartTime = isAddingToActiveRental ? getCurrentTimeStr() : addBikeTemplate?.startTime;
  const availableBikesToAdd = selectedGroupDetail && addBikeTemplate && addBikeStartDate && addBikeStartTime
    ? bikes.filter(bike => {
        if (selectedGroupDetail.some(item => item.bikeId === bike.id && item.status !== 'dibatalkan')) return false;
        return !checkBikeBookingConflict(
          bike.id,
          addBikeStartDate,
          addBikeStartTime,
          isAddingToActiveRental ? '' : addBikeTemplate.endTime,
          bookings,
          bike,
          undefined,
          true
        ).hasConflict;
      })
    : [];

  const handleAddBikeToBooking = async () => {
    if (!isAdmin || !selectedGroupDetail || !addBikeTemplate || !selectedBikeToAdd || isAddingBike) return;
    const bike = bikes.find(item => item.id === selectedBikeToAdd);
    if (!bike || !availableBikesToAdd.some(item => item.id === bike.id)) {
      alert('Sepeda sudah tidak tersedia pada jadwal tersebut. Silakan pilih unit lain.');
      return;
    }

    const groupCode = addBikeTemplate.groupBookingCode ||
      `GRP-${addBikeTemplate.startDate.replace(/-/g, '').slice(4)}-${Math.floor(100 + Math.random() * 900)}`;
    const nextGroupCount = selectedGroupDetail.length + 1;
    const newStatus: BookingStatus = isAddingToActiveRental ? 'sedang di luar' : addBikeTemplate.status;

    setIsAddingBike(true);
    try {
      const newBooking = await addBooking({
        bikeId: bike.id,
        bikeName: bike.name,
        bikeImage: bike.imageUrl,
        customerName: addBikeTemplate.customerName,
        customerPhone: addBikeTemplate.customerPhone,
        customerEmail: addBikeTemplate.customerEmail,
        idCardNumber: addBikeTemplate.idCardNumber,
        startDate: addBikeStartDate!,
        startTime: addBikeStartTime!,
        endDate: addBikeStartDate!,
        endTime: '',
        actualStartDate: isAddingToActiveRental ? addBikeStartDate : undefined,
        actualStartTime: isAddingToActiveRental ? addBikeStartTime : undefined,
        durationType: addBikeTemplate.durationType,
        bookingSession: isAddingToActiveRental ? undefined : addBikeTemplate.bookingSession,
        totalPrice: 0,
        depositAmount: bike.depositRequired || 0,
        status: newStatus,
        paymentMethod: addBikeTemplate.paymentMethod,
        paymentStatus: addBikeTemplate.paymentStatus,
        notes: addBikeTemplate.notes?.replace(/\s*\(Rombongan \d+\/\d+ - [^)]+\)$/, ''),
        handoverBy: isAddingToActiveRental
          ? (isAdmin ? 'Admin Owner' : 'Karyawan Shift')
          : addBikeTemplate.handoverBy,
        groupBookingCode: groupCode,
        groupItemIndex: nextGroupCount,
        groupItemTotal: nextGroupCount,
        addons: [],
        addonTotalCost: 0,
        approvedAt: addBikeTemplate.approvedAt,
        approvedBy: addBikeTemplate.approvedBy,
      });

      await Promise.all(selectedGroupDetail.map((item, index) =>
        updateBooking(item.id, {
          groupBookingCode: groupCode,
          groupItemIndex: index + 1,
          groupItemTotal: nextGroupCount,
        })
      ));

      setSelectedGroupDetail(current => current ? [...current, newBooking] : current);
      setSelectedBikeToAdd('');
      setShowAddBikeForm(false);
    } catch (error) {
      alert(`Gagal menambahkan sepeda ke booking: ${error instanceof Error ? error.message : String(error)}`);
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
              Manajemen Booking & Serah Terima Sepeda
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
              {bookings.length} Total Data
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Pantau status sepeda keluar, terima pengembalian, dan catat booking masuk dari WhatsApp ke dalam sistem.
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

          {isAdmin ? (
            bikes.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Input Booking (Bisa Banyak Sepeda)</span>
              </button>
            )
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200">
              <span>Mode Staf: Hanya Melihat Data (Input & Edit oleh Admin)</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode booking (BOK-...), nama customer, atau no HP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-emerald-500 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu Persetujuan</option>
            <option value="booking">Booking</option>
            <option value="sedang di luar">Sedang di Luar</option>
            <option value="selesai">Selesai</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>

          <button
            type="button"
            onClick={() => setTableView('today')}
            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
              tableView === 'today'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Hari Ini ({todayBookingCount})
          </button>
          <button
            type="button"
            onClick={() => setTableView('upcoming')}
            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
              tableView === 'upcoming'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Booking Mendatang ({upcomingBookingCount})
          </button>
          <button
            type="button"
            onClick={() => setTableView('history')}
            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
              tableView === 'history'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Riwayat ({historyBookingCount})
          </button>
          <button
            type="button"
            onClick={() => setTableView('all')}
            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
              tableView === 'all'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Semua Data
          </button>

          {/* Filter tanggal tertentu untuk mencari data lama */}
          <input
            type="date"
            aria-label="Lihat booking berdasarkan tanggal"
            value={tableView === 'date' ? selectedDate : ''}
            onChange={e => {
              if (!e.target.value) return;
              setSelectedDate(e.target.value);
              setTableView('date');
            }}
            className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-3">
            <CalendarCheck className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
            <div>
              <p className="text-sm font-bold text-slate-700">
                {tableView === 'today'
                  ? 'Belum ada booking terjadwal hari ini atau sepeda yang masih di luar.'
                  : tableView === 'upcoming'
                    ? 'Belum ada booking mendatang.'
                    : tableView === 'history'
                      ? 'Belum ada transaksi selesai atau dibatalkan.'
                      : 'Belum ada data booking yang sesuai filter.'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Data booking tetap tersimpan. Gunakan pencarian, filter tanggal, atau Semua Data untuk melihat catatan lainnya.
              </p>
            </div>
            {isAdmin && bikes.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Input Booking Baru Sekarang</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3.5 pl-4">Kode & Tanggal</th>
                  <th className="py-3.5">Unit Sepeda</th>
                  <th className="py-3.5">Tambahan</th>
                  <th className="py-3.5">Penyewa & Kontak</th>
                  <th className="py-3.5">Jadwal Jam Sewa</th>
                  <th className="py-3.5">Total & Metode</th>
                  <th className="py-3.5">Status Rental</th>
                  <th className="py-3.5 text-right pr-4">Aksi Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map(group => {
                  const primary = group.primary;
                  const groupStatus = getGroupStatus(group.items);
                  const totalGroupPrice = group.items.reduce((sum, item) => {
                    return sum + getBookingTotalPrice(item);
                  }, 0);
                  const groupBikePrice = group.items.reduce((sum, item) => sum + item.totalPrice, 0);
                  const groupAddonTotal = group.items.reduce((sum, item) => sum + getBookingAddonTotal(item), 0);
                  const itemsWithAddons = group.items.filter(item => getBookingAddonTotal(item) > 0);
                  const isGroupCompleted = group.items.every(item => item.status === 'selesai');

                  return (
                    <tr key={group.key} className="hover:bg-slate-50/70 transition-colors align-top">
                      <td className="py-3.5 pl-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {group.items.length > 1 ? 'GRUP BOOKING' : primary.bookingCode}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatDateIndo(primary.startDate)}
                        </span>
                        {group.items.length > 1 && (
                          <span className="mt-1 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 uppercase tracking-wide">
                            {group.items.length} Unit
                          </span>
                        )}
                      </td>

                      <td className="py-3.5">
                        <div className="space-y-2 min-w-[180px]">
                          {group.items.map(item => (
                            <div key={item.id} className="flex items-center gap-2">
                              <img
                                src={item.bikeImage}
                                alt={item.bikeName}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate">{item.bikeName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">ID: {item.bikeId}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5">
                        {itemsWithAddons.length > 0 ? (
                          <div className="space-y-1.5 min-w-[150px]">
                            {itemsWithAddons.map(item => (
                              <div key={item.id} className="text-[11px]">
                                <span className="font-bold text-slate-800">{item.bikeName}</span>
                                {item.addons?.length ? item.addons.map(addon => (
                                  <span key={addon.id} className="block text-slate-700">
                                    {addon.name} x{addon.quantity}
                                    <span className="block text-[10px] text-emerald-700">
                                      {formatRupiah(addon.price * addon.quantity)}
                                    </span>
                                  </span>
                                )) : (
                                  <span className="block text-slate-700">
                                    Tambahan booking lama: {formatRupiah(getBookingAddonTotal(item))}
                                  </span>
                                )}
                              </div>
                            ))}
                            <div className="border-t border-slate-200 pt-1 text-[10px] font-bold text-emerald-800">
                              Total tambahan: {formatRupiah(groupAddonTotal)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Tidak ada</span>
                        )}
                      </td>

                      <td className="py-3.5">
                        <div className="font-semibold text-slate-800">{primary.customerName}</div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <a
                            href={`https://wa.me/62${primary.customerPhone.replace(/^0/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline hover:text-emerald-600 font-mono"
                          >
                            {primary.customerPhone}
                          </a>
                        </div>
                        {primary.notes && (
                          <div className="mt-1 text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 max-w-[180px] truncate" title={primary.notes}>
                            📦 {primary.notes}
                          </div>
                        )}
                        {group.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedGroupDetail(group.items)}
                            className="mt-2 inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Detail booking ({group.items.length} sepeda)
                          </button>
                        )}
                      </td>

                      <td className="py-3.5">
                        <div className="font-medium text-slate-800">
                          Mulai {primary.actualStartTime || primary.startTime} WIB
                        </div>
                        <span className="text-[11px] text-slate-500 block">
                          {primary.status === 'selesai' && primary.durationValue !== undefined
                            ? `Mulai ${primary.actualStartTime || primary.startTime} WIB • Durasi aktual: ${primary.durationValue.toFixed(2)} jam`
                            : primary.actualStartTime
                              ? `Mulai aktual ${primary.actualStartTime} WIB • Biaya saat kembali`
                              : 'Durasi dihitung sejak tombol Mulai'}
                        </span>
                        {group.items.length > 1 && (
                          <span className="mt-1 inline-flex items-center text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded">
                            {group.items.length} unit aktif dalam satu nama
                          </span>
                        )}
                      </td>

                      <td className="py-3.5">
                        <span className="font-bold text-slate-900 block">
                          {formatRupiah(totalGroupPrice)}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          Sewa sepeda: {groupBikePrice > 0 ? formatRupiah(groupBikePrice) : 'dihitung saat kembali'}
                        </span>
                        <span className="block text-[10px] text-emerald-700">
                          Tambahan: {formatRupiah(groupAddonTotal)}
                        </span>
                        {!isGroupCompleted && (
                          <span className="block text-[9px] text-slate-400">Total sementara</span>
                        )}
                        {group.items.some(item => item.paymentStatus === 'belum_lunas' || item.paymentMethod === 'bayar_nanti') ? (
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md inline-block mt-1 shadow-2xs">
                            💳 Bayar Nanti
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md inline-block mt-1 shadow-2xs">
                            ✓ Lunas
                          </span>
                        )}
                      </td>

                      <td className="py-3.5">
                        {(groupStatus === 'sedang di luar' || groupStatus === 'aktif') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            {getStatusLabel(groupStatus)}
                          </span>
                        )}
                        {groupStatus === 'selesai' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {getStatusLabel(groupStatus)}
                          </span>
                        )}
                        {groupStatus === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                            <Clock className="w-3 h-3" />
                            {getStatusLabel(groupStatus)}
                          </span>
                        )}
                        {groupStatus === 'booking' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <Clock className="w-3 h-3" />
                            Booking
                          </span>
                        )}
                        {groupStatus === 'dibatalkan' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 line-through">
                            {getStatusLabel(groupStatus)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && groupStatus === 'pending' && (
                            <button
                              onClick={() => handleAccBooking(primary)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                              title="ACC semua unit di nama ini"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>ACC</span>
                            </button>
                          )}

                          {isAdmin && groupStatus === 'booking' && (
                            <button
                              onClick={() => handleStartGroupBooking(primary)}
                              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shadow-2xs"
                              title="Mulai sewa dan catat waktu mulai aktual"
                            >
                              Mulai
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedGroupDetail(group.items)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer shadow-2xs"
                            title="Lihat detail booking atas nama ini"
                          >
                            Detail
                          </button>

                          {isAdmin && (groupStatus === 'sedang di luar' || groupStatus === 'aktif') && (
                            <button
                              onClick={() => handleReturnGroupBooking(primary)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shadow-2xs"
                              title="Kembalikan semua unit dalam nama ini"
                            >
                              Kembali Semua
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedReceipt(primary)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Cetak / Lihat Resi"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Hapus booking ${primary.bookingCode}?`)) {
                                  deleteBooking(primary.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Data (Admin)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedGroupDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Detail Booking - {selectedGroupDetail[0]?.customerName}</h3>
                <span className="text-xs text-slate-500 font-mono">
                  {selectedGroupDetail.length} sepeda terdaftar dalam nama yang sama
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedGroupDetail(null);
                  setShowAddBikeForm(false);
                  setSelectedBikeToAdd('');
                }}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-end mb-2">
              {isAdmin && addBikeTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBikeForm(value => !value);
                    setSelectedBikeToAdd(availableBikesToAdd[0]?.id || '');
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Sepeda
                </button>
              )}
              {selectedGroupDetail.length > 1 && isAdmin && selectedGroupDetail.some(item => item.status === 'sedang di luar' || item.status === 'aktif') && (
                <button
                  onClick={() => {
                    setReturningGroupBooking(
                      selectedGroupDetail.filter(item => item.status === 'sedang di luar' || item.status === 'aktif')
                    );
                    setSelectedGroupDetail(null);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                >
                  Kembalikan Semua Unit
                </button>
              )}
            </div>

            {showAddBikeForm && isAdmin && addBikeTemplate && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wide text-emerald-900">
                  Tambahkan Sepeda ke Booking Ini
                </h4>
                <p className="mt-1 text-[11px] text-slate-600">
                  {isAddingToActiveRental
                    ? 'Sepeda tambahan akan mulai disewa sekarang dan dihitung saat dikembalikan.'
                    : 'Sepeda tambahan mengikuti tanggal, jam, dan metode pembayaran booking ini.'}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select
                    value={selectedBikeToAdd}
                    onChange={event => setSelectedBikeToAdd(event.target.value)}
                    disabled={isAddingBike || availableBikesToAdd.length === 0}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                  >
                    {availableBikesToAdd.length === 0 ? (
                      <option value="">Tidak ada sepeda yang tersedia untuk jadwal ini</option>
                    ) : (
                      availableBikesToAdd.map(bike => (
                        <option key={bike.id} value={bike.id}>
                          {bike.name} ({bike.licenseNumber})
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddBikeToBooking}
                    disabled={isAddingBike || !selectedBikeToAdd}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAddingBike ? 'Menyimpan...' : 'Simpan Sepeda'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddBikeForm(false)}
                    disabled={isAddingBike}
                    className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 border border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {selectedGroupDetail.map(item => (
                <div key={item.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={item.bikeImage} alt={item.bikeName} className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900">{item.bikeName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">{item.bookingCode}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Mulai {item.actualStartTime || item.startTime} WIB
                          {item.status === 'selesai' && item.actualReturnTime
                            ? ` • Kembali ${item.actualReturnTime} WIB (${item.durationValue?.toFixed(2)} jam)`
                            : item.status === 'booking'
                              ? ' • Menunggu tombol Mulai'
                              : ' • Biaya dihitung saat pengembalian'}
                        </div>
                        {item.status !== 'selesai' && item.status !== 'dibatalkan' && getNextBooking(item) && (
                          <div className="mt-1 text-[10px] font-semibold text-amber-800">
                            Harus kembali sebelum {getNextBooking(item)?.startTime} WIB (booking berikutnya)
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      item.status === 'aktif' || item.status === 'sedang di luar'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : item.status === 'pending'
                          ? 'bg-sky-100 text-sky-800 border border-sky-200'
                          : item.status === 'booking'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : item.status === 'selesai'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 line-through'
                    }`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.status === 'pending' && isAdmin && (
                      <>
                        <button
                          onClick={() => handleAccBooking(item)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          ACC Unit Ini
                        </button>
                        <button
                          onClick={() => handleSwapBike(item)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          Tukar Unit
                        </button>
                        <button
                          onClick={() => handleCancelSingleUnit(item)}
                          className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          Batal Unit
                        </button>
                      </>
                    )}

                    {item.status === 'booking' && isAdmin && (
                      <>
                        <button
                          onClick={() => handleStartSingleBooking(item)}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          Mulai
                        </button>
                        <button
                          onClick={() => handleSwapBike(item)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          Tukar Unit
                        </button>
                        <button
                          onClick={() => handleCancelSingleUnit(item)}
                          className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          Batal Unit
                        </button>
                      </>
                    )}

                    {(item.status === 'sedang di luar' || item.status === 'aktif') && isAdmin && (
                      <>
                        <button
                          onClick={() => setReturningBooking(item)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          Kembalikan Satu Unit
                        </button>
                        <button
                          onClick={() => handleSwapBike(item)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          Tukar
                        </button>
                        <button
                          onClick={() => handleCancelSingleUnit(item)}
                          className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setSelectedReceipt(item)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                    >
                      Lihat Resi
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {(() => {
              const addonTotal = selectedGroupDetail.reduce(
                (sum, item) => sum + getBookingAddonTotal(item),
                0
              );
              const itemsWithAddons = selectedGroupDetail.filter(item =>
                (item.addons?.length || 0) > 0 || getBookingAddonTotal(item) > 0
              );

              return (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-emerald-900">
                    Tambahan per Unit
                  </h4>
                  {itemsWithAddons.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {itemsWithAddons.map(item => (
                        <div key={item.id} className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                          <div className="text-xs font-bold text-slate-800">{item.bikeName}</div>
                          {item.addons?.length ? item.addons.map(addon => (
                            <div key={addon.id} className="mt-1 flex justify-between gap-3 text-xs">
                              <span className="font-semibold text-slate-700">
                                {addon.name} x{addon.quantity} ({formatRupiah(addon.price)} / item)
                              </span>
                              <span className="font-bold text-slate-800">
                                {formatRupiah(addon.price * addon.quantity)}
                              </span>
                            </div>
                          )) : (
                            <div className="mt-1 flex justify-between gap-3 text-xs">
                              <span className="font-semibold text-slate-700">Tambahan booking lama</span>
                              <span className="font-bold text-slate-800">
                                {formatRupiah(getBookingAddonTotal(item))}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-emerald-200 pt-2 text-xs font-extrabold text-emerald-900">
                        <span>Total tambahan</span>
                        <span>{formatRupiah(addonTotal)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Tidak ada tambahan pada booking ini.</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* RECEIPT / STRUK MODAL */}
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
                <span className="text-slate-500">Waktu Sewa:</span>
                <span className="font-semibold text-slate-800">
                  {selectedReceipt.startTime} WIB
                  {selectedReceipt.actualReturnTime
                    ? ` - ${selectedReceipt.actualReturnTime} WIB (${selectedReceipt.durationValue?.toFixed(2)} jam)`
                    : ' • durasi hingga pengembalian'}
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
              {getBookingAddonTotal(selectedReceipt) > 0 && (
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Perlengkapan Tambahan:</span>
                  <div className="text-right font-semibold text-slate-800">
                    {selectedReceipt.addons?.length ? selectedReceipt.addons.map(addon => (
                      <div key={addon.id}>
                        {addon.name} ({addon.quantity} x {formatRupiah(addon.price)}) = {formatRupiah(addon.price * addon.quantity)}
                      </div>
                    )) : <div>Tambahan</div>}
                    <div className="text-emerald-700">
                      Total tambahan: {formatRupiah(getBookingAddonTotal(selectedReceipt))}
                    </div>
                  </div>
                </div>
              )}
              {selectedReceipt.lateFee && selectedReceipt.lateFee > 0 ? (
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200 text-rose-600 font-semibold">
                  <span>Denda Keterlambatan:</span>
                  <span>+{formatRupiah(selectedReceipt.lateFee)}</span>
                </div>
              ) : null}
              <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                <span className="text-slate-500">Status Pembayaran:</span>
                <span className={`font-bold ${
                  selectedReceipt.paymentStatus === 'belum_lunas' || selectedReceipt.paymentMethod === 'bayar_nanti'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}>
                  {selectedReceipt.paymentStatus === 'belum_lunas' || selectedReceipt.paymentMethod === 'bayar_nanti'
                    ? '💳 Bayar Nanti (Ditagih Saat Pengembalian)'
                    : `✓ Lunas via ${selectedReceipt.paymentMethod.toUpperCase()}`}
                </span>
              </div>
              <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-xl font-bold">
                <span className="text-slate-700">Total Tarif:</span>
                <span className="text-emerald-700 text-sm">{formatRupiah(getBookingTotalPrice(selectedReceipt))}</span>
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

      {/* MODAL EDIT BOOKING & SERAH TERIMA */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
        />
      )}

      {/* MODAL SERAH TERIMA PENGEMBALIAN & PERHITUNGAN DENDA */}
      {(returningBooking || returningGroupBooking) && (
        <ReturnBookingModal
          booking={returningBooking ?? returningGroupBooking?.[0]}
          bookings={returningGroupBooking ?? undefined}
          onClose={() => {
            setReturningBooking(null);
            setReturningGroupBooking(null);
          }}
          onSuccess={() => {
            setReturningBooking(null);
            setReturningGroupBooking(null);
          }}
        />
      )}

      {/* MANUAL INPUT BOOKING MODAL (MULTI-BIKE WIZARD) */}
      {showAddModal && (
        <BookingModal
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* MODAL EKSTRAK LAPORAN PDF & EXCEL */}
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
