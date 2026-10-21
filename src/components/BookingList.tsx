import React, { useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Booking, BookingStatus } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { BookingModal } from './BookingModal';
import { PrintReportModal } from './PrintReportModal';
import { ReturnBookingModal } from './ReturnBookingModal';
import { EditBookingModal } from './EditBookingModal';

export const BookingList: React.FC = () => {
  const { bookings, updateBookingStatus, deleteBooking, currentRole, bikes, financialBreakdown, financialSettings } = useApp();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<Booking | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [returningBooking, setReturningBooking] = useState<Booking | null>(null);

  const isAdmin = currentRole === 'admin';
  const isKaryawan = currentRole === 'karyawan';

  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.customerPhone.includes(search) ||
      b.bookingCode.toLowerCase().includes(search.toLowerCase()) ||
      b.bikeName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || b.status === filterStatus;

    const matchesDate =
      !filterDate || b.startDate === filterDate;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleHandover = (booking: Booking) => {
    const staffName = isAdmin ? 'Admin' : 'Karyawan Shift';
    updateBookingStatus(booking.id, 'aktif', { handoverBy: staffName });
  };

  const handleReturn = (booking: Booking) => {
    setReturningBooking(booking);
  };

  const handleCancel = (booking: Booking) => {
    if (window.confirm(`Batalkan booking ${booking.bookingCode}?`)) {
      updateBookingStatus(booking.id, 'dibatalkan');
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

          {bikes.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Input Booking Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
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
            <option value="aktif">Sedang di Luar (Aktif)</option>
            <option value="selesai">Sudah Kembali (Selesai)</option>
            <option value="pending">Menunggu Diambil</option>
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

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">Tidak ada data booking yang sesuai filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3.5 pl-4">Kode & Tanggal</th>
                  <th className="py-3.5">Unit Sepeda</th>
                  <th className="py-3.5">Penyewa & Kontak</th>
                  <th className="py-3.5">Jadwal Jam Sewa</th>
                  <th className="py-3.5">Total & Metode</th>
                  <th className="py-3.5">Status Rental</th>
                  <th className="py-3.5 text-right pr-4">Aksi Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pl-4">
                      <span className="font-mono font-bold text-slate-900 block">
                        {b.bookingCode}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatDateIndo(b.startDate)}
                      </span>
                    </td>

                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={b.bikeImage}
                          alt={b.bikeName}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{b.bikeName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {b.bikeId}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5">
                      <div className="font-semibold text-slate-800">{b.customerName}</div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <a
                          href={`https://wa.me/62${b.customerPhone.replace(/^0/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline hover:text-emerald-600"
                        >
                          {b.customerPhone}
                        </a>
                      </div>
                    </td>

                    <td className="py-3.5">
                      <div className="font-medium text-slate-800">
                        {b.startTime} - {b.endTime} WIB
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        Durasi: {b.durationValue} {b.durationType}
                      </span>
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

                    <td className="py-3.5">
                      <span className="font-bold text-slate-900 block">
                        {formatRupiah(b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0)))}
                      </span>
                      {b.lateFee && b.lateFee > 0 ? (
                        <span className="text-[9px] text-rose-600 font-semibold block">
                          Termasuk denda: {formatRupiah(b.lateFee)}
                        </span>
                      ) : null}
                      {b.paymentStatus === 'belum_lunas' || b.paymentMethod === 'bayar_nanti' ? (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md inline-block mt-1 shadow-2xs">
                          💳 Bayar Nanti (Belum Lunas)
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md inline-block mt-1 shadow-2xs">
                          ✓ Lunas ({b.paymentMethod})
                        </span>
                      )}
                    </td>

                    <td className="py-3.5">
                      {b.status === 'aktif' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Sedang di Luar
                        </span>
                      )}
                      {b.status === 'selesai' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Selesai Kembali
                        </span>
                      )}
                      {b.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                          <Clock className="w-3 h-3" />
                          Menunggu Diambil
                        </span>
                      )}
                      {b.status === 'dibatalkan' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 line-through">
                          Dibatalkan
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Action: Serahkan unit jika pending */}
                        {b.status === 'pending' && (
                          <button
                            onClick={() => handleHandover(b)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            Serahkan Unit
                          </button>
                        )}

                        {/* Action: Terima kembali jika aktif (Buka Modal Kepulangan, Denda, & Pelunasan) */}
                        {b.status === 'aktif' && (
                          <button
                            onClick={() => handleReturn(b)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer shadow-2xs"
                            title="Terima Pengembalian Sepeda & Terima Pelunasan"
                          >
                            Terima Kembali & Pelunasan
                          </button>
                        )}

                        {/* Action: Edit Booking & Serah Terima (Ganti sepeda / jam / status) */}
                        <button
                          onClick={() => setEditingBooking(b)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Booking & Ganti Sepeda/Jam"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* View Receipt */}
                        <button
                          onClick={() => setSelectedReceipt(b)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Cetak Resi"
                        >
                          <Printer className="w-4 h-4" />
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
                            title="Hapus Data"
                          >
                            <Trash2 className="w-4 h-4" />
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
                  {selectedReceipt.startTime} - {selectedReceipt.endTime} ({selectedReceipt.durationValue} {selectedReceipt.durationType})
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
                <span className="text-emerald-700 text-sm">{formatRupiah(selectedReceipt.finalTotalPrice ?? (selectedReceipt.totalPrice + (selectedReceipt.lateFee || 0)))}</span>
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
      {returningBooking && (
        <ReturnBookingModal
          booking={returningBooking}
          onClose={() => setReturningBooking(null)}
        />
      )}

      {/* MANUAL INPUT BOOKING MODAL */}
      {showAddModal && bikes.length > 0 && (
        <BookingModal
          bike={bikes[0]}
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
