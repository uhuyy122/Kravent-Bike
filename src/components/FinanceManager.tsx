import React, { useState, useMemo, useEffect } from 'react';
import {
  PieChart,
  Percent,
  Sliders,
  DollarSign,
  Plus,
  Trash2,
  Wrench,
  Video,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Check,
  Lock,
  ArrowRight,
  FileSpreadsheet,
  Printer,
  Calendar,
  Sparkles,
  CalendarDays,
  Clock,
  Bike,
  ChevronRight,
  Coins,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatRupiah,
  formatDateIndo
} from '../utils/formatters';
import {
  getTodayDateStr,
  getMondaySundayWeekRange,
  getYesterdayDateStr,
  getLastWeekRange,
  getLastMonthStr
} from '../utils/scheduleUtils';
import { ExpenseCategory, Booking } from '../types';
import { PrintReportModal } from './PrintReportModal';
import { getBookingTotalPrice } from '../utils/bookingUtils';
import { calculateFinancialBreakdown } from '../utils/financeUtils';

export const FinanceManager: React.FC = () => {
  const {
    currentRole,
    financialSettings,
    updateFinancialSettings,
    setSelectedMonth,
    financialBreakdown,
    todayRevenue,
    thisWeekRevenue,
    thisMonthRevenue,
    expenses,
    addExpense,
    deleteExpense,
    bikes,
    bookings
  } = useApp();

  const todayStr = getTodayDateStr();
  const isAdmin = currentRole === 'admin';
  const totalRecordedExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'harian' | 'mingguan' | 'bulanan'>('bulanan');

  // State tanggal/periode spesifik untuk melihat riwayat (Hari Ini, Kemarin, Minggu Ini, Minggu Kemarin, Bulan Ini, Bulan Kemarin)
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(todayStr);
  const [selectedWeeklyDate, setSelectedWeeklyDate] = useState<string>(todayStr);
  const [selectedMonthlyMonth, setSelectedMonthlyMonth] = useState<string>(() => todayStr.slice(0, 7));
  const [monthlyCapitalDraft, setMonthlyCapitalDraft] = useState('0');
  const savedMonthlyCapital = financialSettings.monthlyCapitalByMonth?.[selectedMonthlyMonth] ?? 0;
  const [partner1Pct, setPartner1Pct] = useState(financialSettings.partner1Percentage);
  const [partner1Name, setPartner1Name] = useState(financialSettings.partner1Name);
  const [partner2Name, setPartner2Name] = useState(financialSettings.partner2Name);

  useEffect(() => {
    setSelectedMonth(selectedMonthlyMonth);
  }, [selectedMonthlyMonth, setSelectedMonth]);

  useEffect(() => {
    setMonthlyCapitalDraft(String(savedMonthlyCapital));
  }, [selectedMonthlyMonth, savedMonthlyCapital]);

  const [maintPct, setMaintPct] = useState(financialSettings.maintenanceBudgetPercentage);
  const [maintenanceMode, setMaintenanceMode] = useState<'percentage' | 'nominal'>(
    financialSettings.maintenanceMode ?? 'percentage'
  );
  const [maintenanceBudgetNominal, setMaintenanceBudgetNominal] = useState<number>(
    financialSettings.maintenanceBudgetNominal ?? 0
  );
  const [contentBudgetNominal, setContentBudgetNominal] = useState<number>(
    financialSettings.contentBudgetAmount ?? 500000
  );
  const [opsPct, setOpsPct] = useState(financialSettings.operationalBudgetPercentage);

  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // New Expense form state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('mentenest');
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState('2026-10-10');
  const [newDesc, setNewDesc] = useState('');
  const [newBikeId, setNewBikeId] = useState('');

  // Helper format nama bulan
  const formatMonthName = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
  };

  // Ambil transaksi pendapatan yang valid (selesai atau lunas, tidak dibatalkan)
  const isRevenueBooking = (b: Booking) => {
    return (b.status === 'selesai' || b.paymentStatus === 'lunas') && b.status !== 'dibatalkan';
  };
  const getBookingEffectiveDate = (b: Booking) => b.actualReturnDate || b.startDate;

  // Rentang mingguan aktif (Senin s/d Minggu)
  const currentWeekRange = useMemo(() => {
    return getMondaySundayWeekRange(selectedWeeklyDate);
  }, [selectedWeeklyDate]);

  // Bookings yang disaring sesuai periode dan filter tanggal aktif
  const activePeriodBookings = useMemo(() => {
    return bookings.filter(b => {
      if (!isRevenueBooking(b)) return false;
      const bDate = getBookingEffectiveDate(b);
      if (selectedPeriod === 'harian') {
        return bDate === selectedDailyDate;
      }
      if (selectedPeriod === 'mingguan') {
        return bDate >= currentWeekRange.mondayStr && bDate <= currentWeekRange.sundayStr;
      }
      return bDate.startsWith(selectedMonthlyMonth);
    });
  }, [bookings, selectedPeriod, selectedDailyDate, currentWeekRange, selectedMonthlyMonth]);

  // Kalkulasi omzet sesuai filter tanggal/periode yang aktif
  const gross = useMemo(() => {
    return activePeriodBookings.reduce(
      (sum, b) => sum + getBookingTotalPrice(b),
      0
    );
  }, [activePeriodBookings]);

  // Label periode yang detail & jelas
  const periodLabel = useMemo(() => {
    if (selectedPeriod === 'harian') {
      const isToday = selectedDailyDate === todayStr;
      const isYesterday = selectedDailyDate === getYesterdayDateStr(todayStr);
      return `Harian: ${isToday ? 'Hari Ini, ' : isYesterday ? 'Kemarin, ' : ''}${formatDateIndo(selectedDailyDate)}`;
    }
    if (selectedPeriod === 'mingguan') {
      const thisW = getMondaySundayWeekRange(todayStr);
      const isThisW = currentWeekRange.mondayStr === thisW.mondayStr;
      const lastW = getLastWeekRange(todayStr);
      const isLastW = currentWeekRange.mondayStr === lastW.mondayStr;
      return `Mingguan (Senin - Minggu): ${currentWeekRange.label} ${isThisW ? '(Minggu Ini)' : isLastW ? '(Minggu Kemarin)' : ''}`;
    }
    const isThisM = selectedMonthlyMonth === todayStr.slice(0, 7);
    const isLastM = selectedMonthlyMonth === getLastMonthStr(todayStr.slice(0, 7));
    return `Bulanan: ${formatMonthName(selectedMonthlyMonth)} ${isThisM ? '(Bulan Ini)' : isLastM ? '(Bulan Kemarin)' : ''}`;
  }, [selectedPeriod, selectedDailyDate, currentWeekRange, selectedMonthlyMonth, todayStr]);

  // Breakdown 7 hari untuk periode mingguan (Senin s/d Minggu)
  const weeklyDayBreakdown = useMemo(() => {
    if (selectedPeriod !== 'mingguan') return [];
    const days = [];
    const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const startMon = new Date(currentWeekRange.mondayDate);

    for (let i = 0; i < 7; i++) {
      const cur = new Date(startMon);
      cur.setDate(startMon.getDate() + i);
      const yr = cur.getFullYear();
      const mo = String(cur.getMonth() + 1).padStart(2, '0');
      const da = String(cur.getDate()).padStart(2, '0');
      const iso = `${yr}-${mo}-${da}`;

      const dayBookings = activePeriodBookings.filter(b => getBookingEffectiveDate(b) === iso);
      const dayRev = dayBookings.reduce(
        (sum, b) => sum + getBookingTotalPrice(b),
        0
      );
      days.push({
        dayName: dayNames[i],
        dateStr: iso,
        dateLabel: `${cur.getDate()} ${new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(cur)}`,
        revenue: dayRev,
        count: dayBookings.length,
        isToday: iso === todayStr,
      });
    }
    return days;
  }, [selectedPeriod, currentWeekRange, activePeriodBookings, todayStr]);

  // Save changes (Berlaku untuk semua laporan bagi hasil)
  const handleSaveSettings = async () => {
    if (!isAdmin) return;
    try {
      await updateFinancialSettings({
        partner1Name,
        partner1Percentage: partner1Pct,
        partner2Name,
        partner2Percentage: 100 - partner1Pct,
        maintenanceBudgetPercentage: maintPct,
        maintenanceBudgetNominal: maintenanceBudgetNominal > 0 ? maintenanceBudgetNominal : 0,
        maintenanceMode,
        contentBudgetAmount: contentBudgetNominal,
        contentBudgetPercentage: gross > 0 ? Math.round((contentBudgetNominal / gross) * 100) : 0,
        operationalBudgetPercentage: opsPct,
      });
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);
    } catch (error) {
      alert(`Gagal menyimpan pengaturan keuangan: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSaveMonthlyCapital = async () => {
    if (!isAdmin) return;
    const amount = Number(monthlyCapitalDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      alert('Mohon isi nominal modal yang valid (minimal Rp 0).');
      return;
    }

    try {
      await updateFinancialSettings({
        monthlyCapitalByMonth: {
          ...(financialSettings.monthlyCapitalByMonth ?? {}),
          [selectedMonthlyMonth]: amount,
        },
      });
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);
    } catch (error) {
      alert(`Gagal menyimpan modal bulan ini: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handlePartner1Slider = (value: number) => {
    if (isAdmin) setPartner1Pct(value);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const amountNum = parseFloat(newAmount);
    if (!newTitle.trim() || isNaN(amountNum) || amountNum <= 0) {
      alert('Mohon isi judul dan nominal pengeluaran yang valid');
      return;
    }

    addExpense({
      title: newTitle.trim(),
      category: newCategory,
      amount: amountNum,
      date: newDate,
      description: newDesc.trim() || undefined,
      bikeId: newBikeId || undefined,
    });

    setNewTitle('');
    setNewAmount('');
    setNewDesc('');
    setNewBikeId('');
    setShowAddExpense(false);
  };

  const maintAmount =
    maintenanceMode === 'nominal'
      ? Number(maintenanceBudgetNominal || 0)
      : Math.round((gross * maintPct) / 100);
  // Konten & Ads: Nominal uang langsung (Gaji Konten Kreator & Ads)
  const contentAmount = Number(contentBudgetNominal || 0);
  const monthlyCapitalAmount = selectedPeriod === 'bulanan' ? Number(monthlyCapitalDraft) || 0 : 0;
  const calculatedBreakdown = calculateFinancialBreakdown(gross, {
    ...financialSettings,
    maintenanceBudgetPercentage: maintPct,
    maintenanceBudgetNominal,
    maintenanceMode,
    contentBudgetAmount: contentAmount,
    operationalBudgetPercentage: opsPct,
    partner1Percentage: partner1Pct,
  }, monthlyCapitalAmount);
  const opsAmount = calculatedBreakdown.operationalAllocation;
  const totalAlloc = maintAmount + contentAmount + opsAmount;
  const resultAfterStoreExpenses = calculatedBreakdown.afterStoreExpenses;
  const netProfitPreview = calculatedBreakdown.netProfit;
  const p1SharePreview = calculatedBreakdown.partner1Share;
  const p2SharePreview = calculatedBreakdown.partner2Share;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Manajemen Pendapatan & Bagi Hasil Bisnis
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
              Skema {partner1Pct}/{100 - partner1Pct}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Atur rasio Owner/Investor dan biaya di bawah. Perhitungan berjalan berurutan: pendapatan + modal, kurangi pengeluaran toko, maintenance, dan gaji.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Ekstrak Laporan Finansial (PDF & Excel)</span>
          </button>

          {!isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium border border-slate-200">
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Mode Baca Saja (Hanya Admin yang dapat mengubah persentase)</span>
            </div>
          )}
        </div>
      </div>

      {isSavedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Pengaturan alokasi dan bagi hasil bulanan berhasil disimpan!</span>
        </div>
      )}

      {/* FILTER PERIODE & FITUR TANGGAL (Harian, Mingguan Senin-Minggu, Bulanan) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Tab Buttons Header */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Pilih Periode Analisis Pendapatan
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                  {selectedPeriod}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau omzet dan bagi hasil secara Harian, Mingguan (Senin - Minggu), atau Bulanan.
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setSelectedPeriod('harian')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === 'harian'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Harian
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('mingguan')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPeriod === 'mingguan'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Mingguan (Senin - Minggu)
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('bulanan')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedPeriod === 'bulanan'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>Bulanan</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                selectedPeriod === 'bulanan'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-amber-100 text-amber-900'
              }`}>
                Setting
              </span>
            </button>
          </div>
        </div>

        {/* SUB-BAR FITUR TANGGAL: Hari Ini, Kemarin, Minggu Kemarin, Bulan Kemarin */}
        <div className="bg-slate-50 p-4 sm:px-5 border-t border-slate-100">
          {/* 1. Mode Harian */}
          {selectedPeriod === 'harian' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  Pilihan Tanggal Harian:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDailyDate(todayStr)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDailyDate === todayStr
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  ⚡ Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDailyDate(getYesterdayDateStr(todayStr))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDailyDate === getYesterdayDateStr(todayStr)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  📅 Kemarin
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Pilih Tanggal:</span>
                <input
                  type="date"
                  value={selectedDailyDate}
                  onChange={e => setSelectedDailyDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold focus:outline-emerald-500 shadow-2xs"
                />
              </div>
            </div>
          )}

          {/* 2. Mode Mingguan (Rekap Senin s/d Minggu) */}
          {selectedPeriod === 'mingguan' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-emerald-600" />
                    Pilihan Periode Mingguan:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedWeeklyDate(todayStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentWeekRange.mondayStr === getMondaySundayWeekRange(todayStr).mondayStr
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ⚡ Minggu Ini (Senin - Minggu)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWeeklyDate(getLastWeekRange(todayStr).mondayStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentWeekRange.mondayStr === getLastWeekRange(todayStr).mondayStr
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    📅 Minggu Kemarin
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Pilih Tanggal Acuan:</span>
                  <input
                    type="date"
                    value={selectedWeeklyDate}
                    onChange={e => setSelectedWeeklyDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold focus:outline-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Banner Info Rentang Senin - Minggu */}
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold px-2 py-0.5 rounded bg-sky-600 text-white text-[10px]">
                    REKAP SENIN - MINGGU
                  </span>
                  <span className="font-semibold">
                    Rentang Terpilih: <strong>{currentWeekRange.label}</strong> (Senin 00:00 s/d Minggu 23:59)
                  </span>
                </div>
                <span className="text-[11px] text-sky-700">
                  {activePeriodBookings.length} Transaksi Terdata
                </span>
              </div>
            </div>
          )}

          {/* 3. Mode Bulanan */}
          {selectedPeriod === 'bulanan' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-emerald-600" />
                    Pilihan Bulan:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedMonthlyMonth(todayStr.slice(0, 7))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedMonthlyMonth === todayStr.slice(0, 7)
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    ⚡ Bulan Ini ({formatMonthName(todayStr.slice(0, 7))})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMonthlyMonth(getLastMonthStr(todayStr.slice(0, 7)))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedMonthlyMonth === getLastMonthStr(todayStr.slice(0, 7))
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    📅 Bulan Kemarin ({formatMonthName(getLastMonthStr(todayStr.slice(0, 7)))})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Pilih Bulan:</span>
                  <input
                    type="month"
                    value={selectedMonthlyMonth}
                    onChange={e => setSelectedMonthlyMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold focus:outline-emerald-500 shadow-2xs"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <div>
                  <label htmlFor="monthly-capital" className="block text-xs font-bold text-slate-800">
                    Modal Tambahan {formatMonthName(selectedMonthlyMonth)}
                  </label>
                  <input
                    id="monthly-capital"
                    type="number"
                    min="0"
                    step="1000"
                    value={monthlyCapitalDraft}
                    onChange={e => setMonthlyCapitalDraft(e.target.value)}
                    disabled={!isAdmin}
                    className="mt-1 w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 focus:outline-emerald-500 disabled:bg-slate-100"
                    placeholder="Masukkan nominal modal"
                  />
                  <p className="mt-1 text-[11px] text-slate-600">
                    Urutan: pendapatan + modal − pengeluaran toko = hasil 1; hasil 1 − maintenance − gaji = laba bersih.
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleSaveMonthlyCapital}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
                  >
                    Simpan Modal {formatMonthName(selectedMonthlyMonth)}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* JIKA MODE MINGGUAN: TAMPILKAN KARTU BREAKDOWN 7 HARI (SENIN S/D MINGGU) */}
      {selectedPeriod === 'mingguan' && weeklyDayBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Rincian Omzet Harian (Senin s/d Minggu)
              </h4>
              <p className="text-[11px] text-slate-500">
                Omzet harian selama 7 hari kalender minggu ini: {currentWeekRange.label}
              </p>
            </div>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              Total: {formatRupiah(gross)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {weeklyDayBreakdown.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  item.isToday
                    ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/30'
                    : item.revenue > 0
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-slate-50/70 border-slate-200/70 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-900">{item.dayName}</span>
                    {item.isToday && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block">{item.dateLabel}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <span className="text-xs font-extrabold text-slate-900 block">
                    {formatRupiah(item.revenue)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {item.count} Transaksi
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP CALCULATION RESULTS CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-700/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                Total Pendapatan Riil ({periodLabel})
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                {activePeriodBookings.length} Transaksi Terdata
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-1">
              {formatRupiah(gross)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Menghitung transaksi sewa yang berstatus selesai atau lunas pada periode ini.
              {selectedPeriod !== 'bulanan' && (
                <span className="text-amber-300 ml-1">(Pembagian mengikuti rasio Owner dan Investor yang diatur.)</span>
              )}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 p-4 sm:grid-cols-3 lg:max-w-3xl">
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-3">
              <span className="text-[11px] font-medium text-slate-400 block">1. Pendapatan + Modal</span>
              <span className="text-lg font-bold text-amber-300 block mt-1">
                {formatRupiah(gross + monthlyCapitalAmount)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {formatRupiah(gross)} + {formatRupiah(monthlyCapitalAmount)}
              </span>
            </div>
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-3">
              <span className="text-[11px] font-medium text-slate-400 block">2. Hasil 1 − Pengeluaran Toko</span>
              <span className="text-lg font-bold text-rose-300 block mt-1">
                {formatRupiah(resultAfterStoreExpenses)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {formatRupiah(gross + monthlyCapitalAmount)} − {formatRupiah(opsAmount)}
              </span>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3">
              <span className="text-[11px] font-medium text-slate-400 block">3. Laba Bersih Siap Dibagi</span>
              <span className="text-lg font-extrabold text-emerald-300 block mt-1">
                {formatRupiah(netProfitPreview)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Hasil 1 − Maintenance − Gaji
              </span>
            </div>
          </div>
        </div>

        {/* Pos biaya ditampilkan sesuai urutan pengurangannya */}
        <div className="py-6 border-b border-slate-700/80">
          <span className="text-xs uppercase tracking-wider text-slate-300 font-bold block mb-3">
            Rincian Biaya (Urutan Pengurangan)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Maintenance */}
            <div className="order-2 bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold flex items-center gap-1.5 text-amber-300">
                    <Wrench className="w-4 h-4" /> Maintenance (Servis)
                  </span>
                  <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold text-[11px]">
                    {maintenanceMode === 'nominal' ? 'Nominal' : `${maintPct}%`}
                  </span>
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {formatRupiah(maintAmount)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-400 pt-2 border-t border-slate-700/50">
                Untuk suku cadang, ganti oli, rantai, ban & servis montir
              </div>
            </div>

            {/* Konten */}
            <div className="order-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold flex items-center gap-1.5 text-sky-300">
                    <Video className="w-4 h-4" /> Gaji Konten Kreator & Ads
                  </span>
                  <span className="bg-sky-400/20 text-sky-300 px-2 py-0.5 rounded-full font-bold text-[11px]">
                    Nominal Uang
                  </span>
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {formatRupiah(contentAmount)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-400 pt-2 border-t border-slate-700/50">
                Gaji kreator TikTok/Reels, produksi konten & iklan IG Ads
              </div>
            </div>

            {/* Pengeluaran Operasional */}
            <div className="order-1 bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span className="font-semibold flex items-center gap-1.5 text-purple-300">
                    <Receipt className="w-4 h-4" /> Pengeluaran Toko
                  </span>
                  <span className="bg-purple-400/20 text-purple-300 px-2 py-0.5 rounded-full font-bold text-[11px]">
                    {opsPct}%
                  </span>
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {formatRupiah(opsAmount)}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-400 pt-2 border-t border-slate-700/50">
                Listrik basecamp, air minum gratis penyewa, wifi kasir
              </div>
            </div>
          </div>
        </div>

        {/* Pembagian laba bersih mengikuti rasio yang dapat diatur */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-wider text-slate-300 font-bold block">
              Pembagian Laba Bersih ({partner1Pct}% : {100 - partner1Pct}%)
            </span>
            <span className="text-xs text-slate-400">
              Skema: <strong className="text-amber-400">{partner1Name} {partner1Pct}% : {partner2Name} {100 - partner1Pct}%</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Owner */}
            <div className="bg-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    {partner1Name} ({partner1Pct}%)
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5">Owner</h4>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-extrabold text-sm border border-emerald-500/30">
                  {partner1Pct}%
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs text-slate-400 block">Nominal Diterima:</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300">
                  {formatRupiah(p1SharePreview)}
                </span>
              </div>
              <div className="mt-3 text-[11px] text-slate-400">
                Formula: {partner1Pct}% × {formatRupiah(Math.max(0, netProfitPreview))}
              </div>
            </div>

            {/* Investor */}
            <div className="bg-amber-950/40 border-2 border-amber-500/40 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {partner2Name} ({100 - partner1Pct}%)
                  </span>
                  <h4 className="text-base font-bold text-white mt-0.5">Investor</h4>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-extrabold text-sm border border-amber-500/30">
                  {100 - partner1Pct}%
                </span>
              </div>
              <div className="mt-4">
                <span className="text-xs text-slate-400 block">Nominal Diterima:</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-300">
                  {formatRupiah(p2SharePreview)}
                </span>
              </div>
              <div className="mt-3 text-[11px] text-slate-400">
                Formula: {100 - partner1Pct}% × {formatRupiah(Math.max(0, netProfitPreview))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RINCIAN TRANSAKSI PENDAPATAN PERIODE TERPILIH */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                Rincian Transaksi Pendapatan Periode Ini
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {activePeriodBookings.length} Transaksi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar transaksi sewa yang berkontribusi terhadap omzet {periodLabel}.
            </p>
          </div>
          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
            Subtotal: {formatRupiah(gross)}
          </span>
        </div>

        {activePeriodBookings.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Belum Ada Transaksi Pendapatan pada Periode Ini
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Tidak ada transaksi sewa selesai atau lunas pada rentang {periodLabel}.
              Gunakan tombol tanggal cepat (Hari Ini, Kemarin, Minggu Ini, Minggu Kemarin, Bulan Kemarin) atau pemilih tanggal di atas untuk memeriksa periode lainnya.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 pl-2">Kode</th>
                  <th className="pb-3">Tanggal & Jam</th>
                  <th className="pb-3">Pelanggan</th>
                  <th className="pb-3">Sepeda</th>
                  <th className="pb-3">Durasi</th>
                  <th className="pb-3">Status & Bayar</th>
                  <th className="pb-3 text-right pr-2">Total Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activePeriodBookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 pl-2 font-mono font-bold text-slate-800">
                      {b.bookingCode}
                    </td>
                    <td className="py-3 text-slate-600">
                      <span className="font-semibold text-slate-800 block">
                        {formatDateIndo(b.actualReturnDate || b.startDate)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Mulai {b.startTime} • Kembali {b.actualReturnTime || b.endTime || '-'} WIB
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="font-bold text-slate-900 block">{b.customerName}</span>
                      <span className="text-[11px] text-slate-500">{b.customerPhone}</span>
                    </td>
                    <td className="py-3 text-slate-700 font-medium">
                      {b.bikeName}
                    </td>
                    <td className="py-3 text-slate-600">
                      {b.durationValue !== undefined ? `${b.durationValue.toFixed(2)} Jam` : '-'}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                          b.status === 'selesai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          <CheckCircle2 className="w-3 h-3" />
                          {b.status === 'selesai' ? 'Selesai' : 'Lunas (Aktif)'}
                        </span>
                        <span className="text-[10px] text-slate-400 capitalize">
                          {b.paymentMethod.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right pr-2 font-extrabold text-emerald-700">
                      {formatRupiah(getBookingTotalPrice(b))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SETTINGS CONTROLS (Khusus Admin dan HANYA BISA DI-SETTING PADA PENDAPATAN BULANAN) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Pengaturan Rasio Bagi Hasil & Biaya
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Rasio {partner1Pct}:{100 - partner1Pct}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Atur nama penerima, rasio pembagian, dan biaya. Semua hasil di atas langsung mengikuti pengaturan ini.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isSavedNotice && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-pulse">
                ✓ Berhasil Disimpan!
              </span>
            )}
            {isAdmin ? (
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Mode Staf: Khusus Melihat Hasil Keuangan (Read-Only)</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Atur Nama dan Rasio Pembagian Laba
              </span>
              <span className="text-xs text-slate-500">
                Laba bersih dibagi sesuai persentase yang diatur di sini.
              </span>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-slate-400">Preset:</span>
                {[50, 60, 70, 80].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPartner1Pct(value)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition-all ${
                      partner1Pct === value
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {value} / {100 - value}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>{partner1Name}: {partner1Pct}%</span>
              <span>{partner2Name}: {100 - partner1Pct}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={partner1Pct}
              disabled={!isAdmin}
              onChange={event => handlePartner1Slider(Number(event.target.value))}
              className={`h-2 w-full rounded-lg bg-slate-200 accent-amber-500 ${
                isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">
              Nama penerima bagian pertama ({partner1Pct}%)
              <input
                type="text"
                value={partner1Name}
                disabled={!isAdmin}
                onChange={event => setPartner1Name(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold disabled:bg-slate-100"
              />
            </label>
            <label className="text-xs font-bold text-slate-700">
              Nama penerima bagian kedua ({100 - partner1Pct}%)
              <input
                type="text"
                value={partner2Name}
                disabled={!isAdmin}
                onChange={event => setPartner2Name(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold disabled:bg-slate-100"
              />
            </label>
          </div>
        </div>

        {/* Pengaturan biaya yang dipakai dalam urutan perhitungan */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              2. Atur Biaya Pengurang Laba (Toko, Maintenance, Gaji)
            </span>
            <span className="text-xs text-slate-500">
              Total disisihkan: {formatRupiah(totalAlloc)} (Maintenance: {maintenanceMode === 'nominal' ? formatRupiah(maintAmount) : `${maintPct}%`}, Gaji Konten: {formatRupiah(contentAmount)}, Toko: {opsPct}%)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Maintenance */}
            <div className="order-2 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-amber-500" /> Maintenance
                </span>
                <span className="font-extrabold text-amber-600">
                  {maintenanceMode === 'nominal' ? 'Nominal' : `${maintPct}%`}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                {(['percentage', 'nominal'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setMaintenanceMode(mode)}
                    className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      maintenanceMode === mode
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    } ${!isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    {mode === 'percentage' ? 'Persen' : 'Nominal'}
                  </button>
                ))}
              </div>

              {maintenanceMode === 'percentage' ? (
                <>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {[5, 10, 15, 20, 25].map(p => (
                      <button
                        key={p}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => setMaintPct(p)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                          maintPct === p
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        } ${!isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={maintPct}
                    disabled={!isAdmin}
                    onChange={e => setMaintPct(parseInt(e.target.value, 10))}
                    className={`w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg ${
                      isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                    }`}
                  />
                </>
              ) : (
                <div className="mt-1">
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Nominal manual</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={maintenanceBudgetNominal}
                      disabled={!isAdmin}
                      onChange={e => setMaintenanceBudgetNominal(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className={`w-full pl-7 pr-2 py-1.5 text-[11px] font-bold border border-slate-300 rounded-lg bg-white focus:outline-amber-500 font-mono ${
                        isAdmin ? 'cursor-text' : 'cursor-not-allowed opacity-75'
                      }`}
                    />
                  </div>
                </div>
              )}

              <span className="text-[11px] text-slate-400 block mt-2">
                Nominal ({periodLabel}): {formatRupiah(maintAmount)}
              </span>
            </div>

            {/* Konten & Ads - INPUTAN DALAM BENTUK UANG / NOMINAL */}
            <div className="order-3 bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Video className="w-3.5 h-3.5 text-sky-500" /> Gaji Konten &amp; Ads
                  </span>
                  <span className="font-extrabold text-[10px] px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 uppercase tracking-wide">
                    Input Uang (Rp)
                  </span>
                </div>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={contentBudgetNominal}
                    disabled={!isAdmin}
                    onChange={e => setContentBudgetNominal(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="Contoh: 500000"
                    className={`w-full pl-8 pr-2.5 py-1.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-xl bg-white focus:outline-sky-500 font-mono ${
                      isAdmin ? 'cursor-text' : 'cursor-not-allowed opacity-75'
                    }`}
                  />
                </div>
              </div>
              <span className="text-[10px] text-sky-700 block mt-1.5 leading-tight">
                💡 Bukan persen, input nominal uang ini khusus untuk gaji bulanan konten kreator &amp; ads.
              </span>
            </div>

            {/* Pengeluaran */}
            <div className="order-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-purple-500" /> Operasional Toko
                </span>
                <span className="font-extrabold text-purple-600">{opsPct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={opsPct}
                disabled={!isAdmin}
                onChange={e => setOpsPct(parseInt(e.target.value, 10))}
                className={`w-full accent-purple-500 h-1.5 bg-slate-200 rounded-lg ${
                  isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                }`}
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Nominal ({periodLabel}): {formatRupiah(opsAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EXPENSE LOG SECTION (Catat Bukti Pengeluaran Riil) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Catatan Riwayat Pengeluaran Riil
            </h3>
            <p className="text-xs text-slate-500">
              Log pengeluaran riil aktual toko (Maintenance sepeda, produksi Konten, dan Biaya Operasional)
            </p>
            <p className="mt-1 text-sm font-extrabold text-rose-700">
              Total Pengeluaran: {formatRupiah(totalRecordedExpenses)}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Pengeluaran Baru</span>
            </button>
          )}
        </div>

        {/* Modal / Inline Add Expense Form */}
        {showAddExpense && (
          <form
            onSubmit={handleCreateExpense}
            className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">
                Tambah Catatan Pengeluaran Baru
              </h4>
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Kategori Biaya
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as ExpenseCategory)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 font-semibold"
                >
                  <option value="mentenest">🔧 Maintenance (Servis / Sparepart)</option>
                  <option value="konten">🎬 Konten (Foto, Video, Ads)</option>
                  <option value="pengeluaran">📦 Pengeluaran (Toko, Listrik, Operasional)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Judul / Keperluan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ganti Ban Dalam & Oli Rantai"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nominal Biaya (Rp)
                </label>
                <input
                  type="number"
                  placeholder="250000"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tanggal Pengeluaran
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Terkait Sepeda (Opsional)
                </label>
                <select
                  value={newBikeId}
                  onChange={e => setNewBikeId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                >
                  <option value="">- Umum / Tidak Spesifik -</option>
                  {bikes.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.licenseNumber} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  placeholder="Keterangan toko / bengkel"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-xl font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Simpan Catatan
              </button>
            </div>
          </form>
        )}

        {/* Expenses List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="pb-3 pl-2">Tanggal</th>
                <th className="pb-3">Kategori</th>
                <th className="pb-3">Keperluan / Keterangan</th>
                <th className="pb-3">Sepeda</th>
                <th className="pb-3 text-right">Nominal</th>
                {isAdmin && <th className="pb-3 text-right pr-2">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 pl-2 text-slate-500 font-mono text-[11px]">
                    {formatDateIndo(exp.date)}
                  </td>
                  <td className="py-3">
                    {exp.category === 'mentenest' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        🔧 Maintenance
                      </span>
                    )}
                    {exp.category === 'konten' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                        🎬 Konten
                      </span>
                    )}
                    {exp.category === 'pengeluaran' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        📦 Pengeluaran
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className="font-semibold text-slate-900 block">{exp.title}</span>
                    {exp.description && (
                      <span className="text-[11px] text-slate-500 block">{exp.description}</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-600">
                    {exp.bikeId ? (
                      bikes.find(b => b.id === exp.bikeId)?.name || exp.bikeId
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 text-right font-bold text-slate-900">
                    {formatRupiah(exp.amount)}
                  </td>
                  {isAdmin && (
                    <td className="py-3 text-right pr-2">
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                        title="Hapus Catatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EKSTRAK LAPORAN PDF & EXCEL */}
      {showReportModal && (
        <PrintReportModal
          bookings={bookings}
          financialBreakdown={financialBreakdown}
          financialSettings={financialSettings}
          initialPeriodType={selectedPeriod === 'harian' ? 'daily' : selectedPeriod === 'mingguan' ? 'weekly' : 'monthly'}
          initialDailyDate={selectedDailyDate}
          initialWeeklyDate={selectedWeeklyDate}
          initialMonthlyMonth={selectedMonthlyMonth}
          periodName={periodLabel}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};
