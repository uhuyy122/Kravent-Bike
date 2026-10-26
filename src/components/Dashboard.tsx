import React, { useState } from 'react';
import {
  Bike,
  TrendingUp,
  Calendar,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  Users,
  Coins,
  ChevronRight,
  Filter,
  Activity,
  Layers,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { PrintReportModal } from './PrintReportModal';
import { getTodayDateStr, getMondaySundayWeekRange } from '../utils/scheduleUtils';

interface DashboardProps {
  onNavigateTab: (tab: string) => void;
  onOpenBooking: (bikeId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab }) => {
  const {
    currentRole,
    bikesOutToday,
    bikesOutThisWeek,
    bikesOutThisMonth,
    todayRevenue,
    thisWeekRevenue,
    thisMonthRevenue,
    activeBookingsCount,
    availableBikesCount,
    maintenanceBikesCount,
    financialBreakdown,
    financialSettings,
    bookings,
    bikes,
    updateBookingStatus
  } = useApp();

  const [chartMetric, setChartMetric] = useState<'revenue' | 'units'>('revenue');
  const [chartPeriod, setChartPeriod] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
  const [showReportModal, setShowReportModal] = useState(false);

  // Kalkulasi Alokasi & Bagi Hasil Omzet Harian (Khusus Harian Hari Ini)
  const dailyFinancial = React.useMemo(() => {
    const gross = todayRevenue;
    const maint = Math.round((gross * financialSettings.maintenanceBudgetPercentage) / 100);
    const content = Math.round((gross * financialSettings.contentBudgetPercentage) / 100);
    const ops = Math.round((gross * financialSettings.operationalBudgetPercentage) / 100);
    const totalAlloc = maint + content + ops;
    const net = Math.max(0, gross - totalAlloc);
    const p1 = Math.round((net * financialSettings.partner1Percentage) / 100);
    const p2 = Math.max(0, net - p1);
    return {
      gross,
      maintenanceAllocation: maint,
      contentAllocation: content,
      operationalAllocation: ops,
      totalAllocations: totalAlloc,
      netProfit: net,
      partner1Share: p1,
      partner2Share: p2,
    };
  }, [todayRevenue, financialSettings]);

  // Chart data calculations dinamis dari data booking asli
  // 1. Data 7 Hari Terakhir
  const dailyData = React.useMemo(() => {
    const list = [];
    const baseDate = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const label = i === 0 ? `${dayName} (Hari Ini)` : dayName;

      const dayBookings = bookings.filter(b => {
        if (b.status === 'dibatalkan') return false;
        const bDate = b.actualReturnDate || b.startDate;
        return bDate === iso;
      });
      const completedOrPaid = dayBookings.filter(
        b => b.status === 'selesai' || b.paymentStatus === 'lunas'
      );
      const rev = completedOrPaid.reduce(
        (sum, b) => sum + (b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0))),
        0
      );
      const units = dayBookings.length;
      list.push({ label, date: iso, revenue: rev, units });
    }
    return list;
  }, [bookings]);

  // 2. Data 4 Minggu Terakhir (Mingguan: Rekap Senin s/d Minggu)
  const weeklyData = React.useMemo(() => {
    const list = [];
    for (let w = 3; w >= 0; w--) {
      const refDate = new Date();
      refDate.setDate(refDate.getDate() - w * 7);
      const yr = refDate.getFullYear();
      const mo = String(refDate.getMonth() + 1).padStart(2, '0');
      const da = String(refDate.getDate()).padStart(2, '0');
      const range = getMondaySundayWeekRange(`${yr}-${mo}-${da}`);

      const wBookings = bookings.filter(b => {
        if (b.status === 'dibatalkan') return false;
        const bDate = b.actualReturnDate || b.startDate;
        return bDate >= range.mondayStr && bDate <= range.sundayStr;
      });
      const rev = wBookings
        .filter(b => b.status === 'selesai' || b.paymentStatus === 'lunas')
        .reduce((sum, b) => sum + (b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0))), 0);
      const label = w === 0 ? 'Mg Ini (Senin-Minggu)' : `Mg -${w}`;
      list.push({ label, revenue: rev, units: wBookings.length, date: range.mondayStr });
    }
    return list;
  }, [bookings]);

  // 3. Data 6 Bulan Terakhir (Bulanan)
  const monthlyData = React.useMemo(() => [
    { label: 'Mei', revenue: 0, units: 0 },
    { label: 'Jun', revenue: 0, units: 0 },
    { label: 'Jul', revenue: 0, units: 0 },
    { label: 'Agu', revenue: 0, units: 0 },
    { label: 'Sep', revenue: 0, units: 0 },
    { label: 'Okt (Berjalan)', revenue: thisMonthRevenue, units: bikesOutThisMonth },
  ], [thisMonthRevenue, bikesOutThisMonth]);

  const currentChartData =
    chartPeriod === 'harian'
      ? dailyData
      : chartPeriod === 'mingguan'
      ? weeklyData
      : monthlyData;

  const maxChartVal = Math.max(
    ...currentChartData.map(d => (chartMetric === 'revenue' ? d.revenue : d.units)),
    chartMetric === 'revenue' ? 300000 : 5
  );

  // Today active rentals
  const todayStr = getTodayDateStr();
  const todaysActiveBookings = bookings.filter(
    b => b.startDate === todayStr || b.status === 'aktif'
  );

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Dashboard Analisis Rental Sepeda
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Update Real-Time
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Pantau arus sepeda keluar hari ini, mingguan, bulanan, dan performa omzet bisnis Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 block">Tanggal Hari Ini</span>
            <span className="text-sm font-semibold text-slate-800">{formatDateIndo(todayStr)}</span>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Ekstrak Laporan (PDF & Excel)</span>
          </button>
          <button
            onClick={() => onNavigateTab('bookings')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <span>+ Input Booking (Dari WA)</span>
          </button>
          <button
            onClick={() => onNavigateTab('catalog')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/30 cursor-pointer"
          >
            <Bike className="w-4 h-4" />
            <span>Katalog Sepeda</span>
          </button>
        </div>
      </div>

      {/* 4 PRIMARY METRIC CARDS (User requirement: Sepeda Keluar Hari Ini, Minggu Ini, Bulan Ini & Omzet) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sepeda Keluar Hari Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sepeda Keluar Hari Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{bikesOutToday}</span>
              <span className="text-sm font-medium text-slate-500">Unit Sepeda</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="inline-flex items-center text-emerald-600 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                {activeBookingsCount} Sedang di Luar
              </span>
              <span className="text-slate-400">• Omzet {formatRupiah(todayRevenue)}</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>

        {/* Card 2: Sepeda Keluar Minggu Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sepeda Keluar Minggu Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{bikesOutThisWeek}</span>
              <span className="text-sm font-medium text-slate-500">Unit Sepeda</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="text-sky-700 font-semibold">Senin - Minggu</span>
              <span className="text-slate-400">• Omzet Selesai {formatRupiah(thisWeekRevenue)}</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500"></div>
        </div>

        {/* Card 3: Sepeda Keluar Bulan Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sepeda Keluar Bulan Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{bikesOutThisMonth}</span>
              <span className="text-sm font-medium text-slate-500">Unit Sepeda</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <span className="text-indigo-600 font-semibold">Oktober 2026</span>
              <span className="text-slate-400">• Total Booking Berjalan</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500"></div>
        </div>

        {/* Card 4: Omzet Harian (Hari Ini) - Khusus Harian */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Omzet Harian (Hari Ini)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                {formatRupiah(todayRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-emerald-700 font-semibold">Laba Bersih Est. Hari Ini:</span>
              <span className="font-bold text-slate-800">
                {formatRupiah(
                  Math.max(
                    0,
                    Math.round(
                      todayRevenue *
                        (1 -
                          (financialSettings.maintenanceBudgetPercentage +
                            financialSettings.contentBudgetPercentage +
                            financialSettings.operationalBudgetPercentage) /
                            100)
                    )
                  )
                )}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Khusus transaksi selesai & kembali hari ini
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>
      </div>

      {/* SECONDARY ROW: Fleet Health Status & Profit Sharing Teaser */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Health Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Status Kesiapan Armada ({bikes.length} Total Sepeda)
              </h3>
              <button
                onClick={() => onNavigateTab('fleet')}
                className="text-xs text-emerald-600 font-semibold hover:underline"
              >
                Detail
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-xl text-center">
                <span className="text-xl font-bold text-emerald-700 block">{availableBikesCount}</span>
                <span className="text-[11px] font-medium text-emerald-600">Tersedia</span>
              </div>
              <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-xl text-center">
                <span className="text-xl font-bold text-amber-700 block">{activeBookingsCount}</span>
                <span className="text-[11px] font-medium text-amber-600">Disewa</span>
              </div>
              <div className="bg-rose-50/70 border border-rose-100 p-3 rounded-xl text-center">
                <span className="text-xl font-bold text-rose-700 block">{maintenanceBikesCount}</span>
                <span className="text-[11px] font-medium text-rose-600">Mentenest</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tingkat Utilisasi Armada:</span>
            <span className="font-bold text-slate-800">
              {Math.round((activeBookingsCount / (bikes.length || 1)) * 100)}% Sedang Aktif
            </span>
          </div>
        </div>

        {/* Bagi Hasil & Alokasi Ringkasan Omzet Harian (Hari Ini) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Bagi Hasil {financialSettings.partner1Percentage}/{financialSettings.partner2Percentage}
                </span>
                <span className="text-xs text-slate-300">Alokasi & Bagi Hasil Omzet Harian (Hari Ini)</span>
              </div>
              {currentRole === 'admin' ? (
                <button
                  onClick={() => onNavigateTab('finance')}
                  className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 hover:underline"
                >
                  Setting Bagi Hasil & Periode <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Khusus Akses Pemilik</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <span className="text-xs text-slate-300 block mb-1">🔧 Mentenest ({financialSettings.maintenanceBudgetPercentage}%)</span>
                <span className="text-sm font-bold text-white">
                  {formatRupiah(dailyFinancial.maintenanceAllocation)}
                </span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <span className="text-xs text-slate-300 block mb-1">🎬 Konten ({financialSettings.contentBudgetPercentage}%)</span>
                <span className="text-sm font-bold text-white">
                  {formatRupiah(dailyFinancial.contentAllocation)}
                </span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <span className="text-xs text-slate-300 block mb-1">📦 Pengeluaran ({financialSettings.operationalBudgetPercentage}%)</span>
                <span className="text-sm font-bold text-white">
                  {formatRupiah(dailyFinancial.operationalAllocation)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400 block text-[11px]">{financialSettings.partner1Name} ({financialSettings.partner1Percentage}%):</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {formatRupiah(dailyFinancial.partner1Share)}
                </span>
              </div>
              <div className="h-6 w-px bg-white/20"></div>
              <div>
                <span className="text-slate-400 block text-[11px]">{financialSettings.partner2Name} ({financialSettings.partner2Percentage}%):</span>
                <span className="font-extrabold text-amber-300 text-sm">
                  {formatRupiah(dailyFinancial.partner2Share)}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Laba Bersih Harian Siap Bagi:</span>
              <span className="font-bold text-emerald-300 text-xs">{formatRupiah(dailyFinancial.netProfit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRAFIK PENJUALAN & TREN (SVG INTERAKTIF) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Grafik Penjualan & Arus Sepeda Keluar
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualisasi performa rental sepeda berdasarkan {chartPeriod}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setChartMetric('revenue')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  chartMetric === 'revenue'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Omzet (Rp)
              </button>
              <button
                onClick={() => setChartMetric('units')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  chartMetric === 'units'
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Unit Sepeda
              </button>
            </div>

            {/* Period Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setChartPeriod('harian')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  chartPeriod === 'harian'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Harian
              </button>
              <button
                onClick={() => setChartPeriod('mingguan')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  chartPeriod === 'mingguan'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Mingguan
              </button>
              <button
                onClick={() => setChartPeriod('bulanan')}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  chartPeriod === 'bulanan'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Bulanan
              </button>
            </div>
          </div>
        </div>

        {/* Chart Canvas (Responsive SVG Bar Chart with values) */}
        <div className="h-64 sm:h-72 w-full pt-4 pb-2">
          <div className="h-full flex items-end justify-between gap-2 sm:gap-4 px-2">
            {currentChartData.map((item, idx) => {
              const val = chartMetric === 'revenue' ? item.revenue : item.units;
              const heightPercent = maxChartVal > 0 ? Math.max(12, Math.round((val / maxChartVal) * 100)) : 10;
              const isToday = item.label.includes('Hari Ini') || item.label.includes('Berjalan');

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded-lg pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    <span className="font-semibold">{item.label}</span>: {chartMetric === 'revenue' ? formatRupiah(val) : `${val} Unit`}
                  </div>

                  {/* Value label above bar */}
                  <span className="text-[10px] font-bold text-slate-500 mb-1.5 group-hover:text-emerald-700 transition-colors">
                    {chartMetric === 'revenue' ? (val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : `${Math.round(val / 1000)}k`) : `${val} unit`}
                  </span>

                  {/* The bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[54px] rounded-t-xl transition-all duration-300 relative ${
                      isToday
                        ? 'bg-gradient-to-t from-emerald-600 to-teal-400 shadow-md shadow-emerald-500/20'
                        : 'bg-gradient-to-t from-slate-200 to-slate-300 hover:from-emerald-400 hover:to-teal-300'
                    }`}
                  >
                    {isToday && (
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                    )}
                  </div>

                  {/* X Axis Label */}
                  <span className={`text-[11px] mt-2 font-medium truncate max-w-[80px] text-center ${
                    isToday ? 'font-bold text-emerald-700' : 'text-slate-500'
                  }`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-emerald-600 to-teal-400"></span>
              Periode Aktif (Hari Ini / Berjalan)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-300"></span>
              Histori Periode Sebelumnya
            </span>
          </div>
          <span>Total Unit Keluar Bulan Ini: <strong>{bikesOutThisMonth} sepeda</strong></span>
        </div>
      </div>

      {/* TODAY'S DISPATCHED BIKES TABLE / OPERATIONAL FEED */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Bike className="w-5 h-5 text-emerald-600" />
              Sepeda Keluar & Jadwal Rental Hari Ini
            </h3>
            <p className="text-xs text-slate-500">
              Daftar unit yang disewa hari ini ({formatDateIndo(todayStr)}) dan status pengembalian
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('bookings')}
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            Lihat Semua Booking <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todaysActiveBookings.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Bike className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada sepeda yang keluar hari ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-2">Kode / Sepeda</th>
                  <th className="pb-3">Penyewa</th>
                  <th className="pb-3">Jam Sewa</th>
                  <th className="pb-3">Total Biaya</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {todaysActiveBookings.map(book => (
                  <tr key={book.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={book.bikeImage}
                          alt={book.bikeName}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{book.bikeName}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{book.bookingCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-slate-800">{book.customerName}</div>
                      <div className="text-slate-400 text-[11px]">{book.customerPhone}</div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-slate-800">
                        {book.startTime} - {book.endTime}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Durasi: {book.durationValue} {book.durationType}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="font-bold text-slate-900">{formatRupiah(book.totalPrice)}</span>
                      <span className="block text-[10px] text-emerald-600 font-semibold">
                        Deposit {formatRupiah(book.depositAmount)}
                      </span>
                    </td>
                    <td className="py-3">
                      {book.status === 'aktif' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Sedang Dipakai
                        </span>
                      ) : book.status === 'selesai' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Sudah Kembali
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          {book.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right pr-2">
                      {book.status === 'aktif' && currentRole === 'admin' && (
                        <button
                          onClick={() => updateBookingStatus(book.id, 'selesai')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                        >
                          Terima Kembali
                        </button>
                      )}
                      {book.status === 'aktif' && currentRole !== 'admin' && (
                        <span className="text-[11px] text-amber-600 font-semibold">Sedang Jalan</span>
                      )}
                      {book.status === 'selesai' && (
                        <span className="text-[11px] text-slate-400">Selesai ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
