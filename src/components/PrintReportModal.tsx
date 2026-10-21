import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Calendar,
  CheckCircle,
  Download,
  Bike,
  Building,
  UserCheck
} from 'lucide-react';
import { Booking, FinancialSettings } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import {
  getTodayDateStr,
  getMondaySundayWeekRange,
  getYesterdayDateStr,
  getLastWeekRange,
  getLastMonthStr
} from '../utils/scheduleUtils';
import { exportBookingsToExcel } from '../utils/exportUtils';
import ukswLogo from '../assets/logo-uksw.svg';

interface PrintReportModalProps {
  bookings: Booking[];
  financialBreakdown: {
    grossRevenue: number;
    maintenanceAllocation: number;
    contentAllocation: number;
    operationalAllocation: number;
    netProfit: number;
    partner1Share: number;
    partner2Share: number;
  };
  financialSettings: FinancialSettings;
  periodName?: string;
  initialPeriodType?: 'daily' | 'weekly' | 'monthly';
  initialDailyDate?: string;
  initialWeeklyDate?: string;
  initialMonthlyMonth?: string;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  bookings,
  financialBreakdown: defaultBreakdown,
  financialSettings,
  periodName: defaultPeriodName = 'Oktober 2026',
  initialPeriodType = 'monthly',
  initialDailyDate,
  initialWeeklyDate,
  initialMonthlyMonth,
  onClose,
}) => {
  const todayStr = getTodayDateStr();
  const [selectedPeriodType, setSelectedPeriodType] = useState<'daily' | 'weekly' | 'monthly'>(initialPeriodType);
  const [dailyDate, setDailyDate] = useState<string>(initialDailyDate || todayStr);
  const [weeklyDate, setWeeklyDate] = useState<string>(initialWeeklyDate || todayStr);
  const [monthlyMonth, setMonthlyMonth] = useState<string>(initialMonthlyMonth || todayStr.slice(0, 7));

  // Range mingguan: Senin s/d Minggu
  const weekRange = useMemo(() => {
    return getMondaySundayWeekRange(weeklyDate);
  }, [weeklyDate]);

  // Filter bookings berdasarkan pilihan periode (Harian, Mingguan, Bulanan)
  const currentPeriodBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'dibatalkan') return false;
      const bDate = b.actualReturnDate || b.startDate;
      if (selectedPeriodType === 'daily') {
        return bDate === dailyDate;
      }
      if (selectedPeriodType === 'weekly') {
        return bDate >= weekRange.mondayStr && bDate <= weekRange.sundayStr;
      }
      // monthly default
      return bDate.startsWith(monthlyMonth);
    });
  }, [bookings, selectedPeriodType, dailyDate, weekRange, monthlyMonth]);

  // Transaksi yang benar-benar beres (selesai) atau lunas
  const completedBookings = useMemo(() => {
    return currentPeriodBookings.filter(b => b.status === 'selesai' || b.paymentStatus === 'lunas');
  }, [currentPeriodBookings]);

  // Total omzet riil dari transaksi yang selesai
  const activeGrossRevenue = useMemo(() => {
    return completedBookings.reduce(
      (sum, b) => sum + (b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0))),
      0
    );
  }, [completedBookings]);

  // Kalkulasi Bagi Hasil dinamis untuk periode yang dipilih
  const dynamicBreakdown = useMemo(() => {
    const gross = activeGrossRevenue;
    const maint = Math.round((gross * financialSettings.maintenanceBudgetPercentage) / 100);
    const content = Math.round((gross * financialSettings.contentBudgetPercentage) / 100);
    const ops = Math.round((gross * financialSettings.operationalBudgetPercentage) / 100);
    const totalAlloc = maint + content + ops;
    const net = Math.max(0, gross - totalAlloc);
    const p1 = Math.round((net * financialSettings.partner1Percentage) / 100);
    const p2 = Math.max(0, net - p1);

    return {
      grossRevenue: gross,
      maintenanceAllocation: maint,
      contentAllocation: content,
      operationalAllocation: ops,
      netProfit: net,
      partner1Share: p1,
      partner2Share: p2,
    };
  }, [activeGrossRevenue, financialSettings]);

  const activePeriodTitle = useMemo(() => {
    if (selectedPeriodType === 'daily') {
      const isToday = dailyDate === todayStr;
      const isYesterday = dailyDate === getYesterdayDateStr(todayStr);
      return `Laporan Harian (${isToday ? 'Hari Ini, ' : isYesterday ? 'Kemarin, ' : ''}${formatDateIndo(dailyDate)})`;
    }
    if (selectedPeriodType === 'weekly') {
      const thisW = getMondaySundayWeekRange(todayStr);
      const isThisW = weekRange.mondayStr === thisW.mondayStr;
      return `Laporan Mingguan (${isThisW ? 'Minggu Ini, ' : ''}Senin-Minggu: ${weekRange.label})`;
    }
    const [y, m] = monthlyMonth.split('-').map(Number);
    const mName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
    return `Laporan Bulanan (${mName})`;
  }, [selectedPeriodType, dailyDate, weekRange, monthlyMonth, todayStr]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportBookingsToExcel(currentPeriodBookings, dynamicBreakdown, financialSettings, activePeriodTitle);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto border border-slate-200 flex flex-col max-h-[96vh]">
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Pratinjau Dokumen & Ekspor Laporan</h3>
              <p className="text-xs text-slate-400">Pilih periode laporan: Harian, Mingguan, atau Bulanan</p>
            </div>
          </div>

          {/* Period Selector Tabs: Harian, Mingguan, Bulanan */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedPeriodType('daily')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedPeriodType === 'daily'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriodType('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedPeriodType === 'weekly'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Mingguan
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriodType('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedPeriodType === 'monthly'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Bulanan
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xls)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Bar Filter Tanggal & Periode Riwayat (Print: Hidden) */}
        <div className="bg-slate-800 px-5 sm:px-6 py-2.5 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs text-white print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold">Filter Tanggal:</span>
            {selectedPeriodType === 'daily' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDailyDate(todayStr)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    dailyDate === todayStr
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setDailyDate(getYesterdayDateStr(todayStr))}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    dailyDate === getYesterdayDateStr(todayStr)
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  Kemarin
                </button>
                <input
                  type="date"
                  value={dailyDate}
                  onChange={e => setDailyDate(e.target.value)}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-[11px] font-bold"
                />
              </div>
            )}

            {selectedPeriodType === 'weekly' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setWeeklyDate(todayStr)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    weekRange.mondayStr === getMondaySundayWeekRange(todayStr).mondayStr
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  Minggu Ini (Senin - Minggu)
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyDate(getLastWeekRange(todayStr).mondayStr)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    weekRange.mondayStr === getLastWeekRange(todayStr).mondayStr
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  Minggu Kemarin
                </button>
                <input
                  type="date"
                  value={weeklyDate}
                  onChange={e => setWeeklyDate(e.target.value)}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-[11px] font-bold"
                />
              </div>
            )}

            {selectedPeriodType === 'monthly' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMonthlyMonth(todayStr.slice(0, 7))}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    monthlyMonth === todayStr.slice(0, 7)
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  Bulan Ini
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyMonth(getLastMonthStr(todayStr))}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    monthlyMonth === getLastMonthStr(todayStr)
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                  }`}
                >
                  Bulan Kemarin
                </button>
                <input
                  type="month"
                  value={monthlyMonth}
                  onChange={e => setMonthlyMonth(e.target.value)}
                  className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-600 text-white text-[11px] font-bold"
                />
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="text-slate-300 font-bold">{activePeriodTitle}</span>
            <span className="text-emerald-400 font-black ml-2">({completedBookings.length} Selesai)</span>
          </div>
        </div>

        {/* PRINTABLE REPORT SHEET */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-900 bg-white print:p-0 print:m-0 print:overflow-visible">
          {/* KOP SURAT */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-300 p-1 flex items-center justify-center shadow-xs shrink-0">
                <img src={ukswLogo} alt="Logo UKSW" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  KRAVENT BIKE • UKSW SALATIGA
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  Sistem Informasi Rental Sepeda & Laporan Finansial Bisnis Bagi Hasil
                </p>
                <p className="text-[11px] text-slate-500">
                  Kampus UKSW Salatiga • Hubungi CS: 0896-4712-3671
                </p>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="font-extrabold text-slate-900 block text-sm">LAPORAN RESMI</span>
              <span className="text-slate-500 block">Periode: <strong>{activePeriodTitle}</strong></span>
              <span className="text-slate-400 text-[10px]">Dicetak: {formatDateIndo(todayStr)}</span>
            </div>
          </div>

          {/* KEBIJAKAN TARIF BANNER */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              📌 Standar Kebijakan Tarif Sewa:
            </span>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                Hari Biasa (Senin-Jumat): Rp 8.000 /jam
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                Sabtu, Minggu & Hari Libur: Rp 10.000 /jam
              </span>
            </div>
          </div>

          {/* 1. RINGKASAN FINANSIAL & BAGI HASIL */}
          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs">1</span>
              Ringkasan Finansial & Pembagian Hasil ({financialSettings.partner1Percentage}/{financialSettings.partner2Percentage})
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Total Omzet Selesai:</span>
                <span className="text-base font-extrabold text-emerald-700">
                  {formatRupiah(activeGrossRevenue)}
                </span>
                <span className="text-[10px] text-slate-400 block">{completedBookings.length} transaksi selesai</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Alokasi 3 Pos Biaya:</span>
                <span className="text-sm font-bold text-rose-700">
                  {formatRupiah(
                    dynamicBreakdown.maintenanceAllocation +
                    dynamicBreakdown.contentAllocation +
                    dynamicBreakdown.operationalAllocation
                  )}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Mentenest + Konten + Toko
                </span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-slate-600 block text-[10px] font-bold">
                  {financialSettings.partner1Name} ({financialSettings.partner1Percentage}%):
                </span>
                <span className="text-sm font-extrabold text-emerald-800">
                  {formatRupiah(dynamicBreakdown.partner1Share)}
                </span>
                <span className="text-[10px] text-emerald-600 block">Bagian Mitra 1</span>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-slate-600 block text-[10px] font-bold">
                  {financialSettings.partner2Name} ({financialSettings.partner2Percentage}%):
                </span>
                <span className="text-sm font-extrabold text-amber-800">
                  {formatRupiah(dynamicBreakdown.partner2Share)}
                </span>
                <span className="text-[10px] text-amber-600 block">Bagian Mitra 2</span>
              </div>
            </div>
          </div>

          {/* 2. TABEL RINCIAN TRANSAKSI */}
          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs">2</span>
              Rincian Transaksi Sewa Unit Sepeda ({activePeriodTitle})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-[10px] uppercase font-bold">
                    <th className="p-2 border-r border-slate-300 text-center w-8">No</th>
                    <th className="p-2 border-r border-slate-300">Kode</th>
                    <th className="p-2 border-r border-slate-300">Tanggal & Jam</th>
                    <th className="p-2 border-r border-slate-300">Penyewa & Kontak</th>
                    <th className="p-2 border-r border-slate-300">Unit Sepeda</th>
                    <th className="p-2 border-r border-slate-300 text-right">Tarif (Rp)</th>
                    <th className="p-2 border-r border-slate-300 text-center">Metode</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentPeriodBookings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-slate-400">
                        Belum ada transaksi pada periode {activePeriodTitle}.
                      </td>
                    </tr>
                  ) : (
                    currentPeriodBookings.map((b, idx) => (
                      <tr key={b.id} className="text-[11px]">
                        <td className="p-2 text-center border-r border-slate-200 font-mono text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold">
                          {b.bookingCode}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div>{formatDateIndo(b.startDate)} • {b.startTime}-{b.endTime}</div>
                          {b.actualReturnTime && (
                            <div className="text-[10px] text-slate-500 font-semibold">
                              Kembali: {b.actualReturnTime} {b.lateMinutes ? `(Telat ${b.lateMinutes}m)` : ''}
                            </div>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <strong className="block text-slate-900">{b.customerName}</strong>
                          <span className="text-slate-500 text-[10px]">{b.customerPhone}</span>
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {b.bikeName}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right font-bold text-slate-900">
                          <div>{formatRupiah(b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0)))}</div>
                          {b.lateFee && b.lateFee > 0 ? (
                            <span className="text-[9px] text-rose-600 block">+Denda {formatRupiah(b.lateFee)}</span>
                          ) : null}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded font-semibold ${
                            b.paymentStatus === 'belum_lunas' || b.paymentMethod === 'bayar_nanti'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {b.paymentMethod === 'bayar_nanti' ? 'Bayar Nanti' : b.paymentMethod.toUpperCase()} ({b.paymentStatus === 'lunas' ? 'Lunas' : 'Belum'})
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            b.status === 'selesai'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'aktif'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          } uppercase`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                    <td colSpan={5} className="p-2 text-right">
                      TOTAL OMZET TRANSAKSI:
                    </td>
                    <td className="p-2 text-right text-emerald-800 font-extrabold">
                      {formatRupiah(activeGrossRevenue)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* LEMBAR PENGESAHAN / TANDA TANGAN */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="text-slate-500 mb-14">Dibuat & Diverifikasi Oleh:</p>
              <div className="w-40 border-b border-slate-400 mx-auto"></div>
              <p className="font-bold text-slate-900 mt-1">Staf Operasional Kasir</p>
              <p className="text-[10px] text-slate-400">Kravent Bike Pro</p>
            </div>

            <div>
              <p className="text-slate-500 mb-14">Disetujui & Ditetapkan Oleh:</p>
              <div className="w-40 border-b border-slate-400 mx-auto"></div>
              <p className="font-bold text-slate-900 mt-1">{financialSettings.partner1Name}</p>
              <p className="text-[10px] text-slate-400">Owner & Founder Kravent Bike</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
