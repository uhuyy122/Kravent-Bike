import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Bike,
  Booking,
  Expense,
  FinancialSettings,
  UserRole,
  BookingStatus,
  BikeStatus
} from '../types';
import {
  INITIAL_BIKES,
  INITIAL_BOOKINGS,
  INITIAL_EXPENSES,
  INITIAL_FINANCIAL_SETTINGS
} from '../data/initialData';
import {
  getTodayDateStr,
  checkBikeBookingConflict,
  getMondaySundayWeekRange
} from '../utils/scheduleUtils';

interface FinancialBreakdown {
  grossRevenue: number;
  maintenanceAllocation: number;
  contentAllocation: number;
  operationalAllocation: number;
  totalAllocations: number;
  netProfit: number;
  partner1Share: number;
  partner2Share: number;
  actualMaintenanceSpent: number;
  actualContentSpent: number;
  actualOperationalSpent: number;
  totalActualExpenses: number;
  actualNetProfit: number;
  actualPartner1Share: number;
  actualPartner2Share: number;
}

interface AppContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  bikes: Bike[];
  bookings: Booking[];
  expenses: Expense[];
  financialSettings: FinancialSettings;
  addBike: (bike: Omit<Bike, 'id' | 'totalRentedCount'>) => void;
  updateBike: (id: string, updated: Partial<Bike>) => void;
  deleteBike: (id: string) => void;
  updateBikeStatus: (id: string, status: BikeStatus) => void;
  addBooking: (booking: Omit<Booking, 'id' | 'bookingCode' | 'createdAt'>) => Booking;
  updateBooking: (id: string, updated: Partial<Booking>) => void;
  updateBookingStatus: (id: string, status: BookingStatus, returnDetails?: string | Partial<Booking>) => void;
  deleteBooking: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  updateFinancialSettings: (settings: Partial<FinancialSettings>) => void;
  resetToDefaults: () => void;
  // Stats
  bikesOutToday: number;
  bikesOutThisWeek: number;
  bikesOutThisMonth: number;
  todayRevenue: number;
  thisWeekRevenue: number;
  thisMonthRevenue: number;
  pendingPotentialRevenue: number;
  activeBookingsCount: number;
  availableBikesCount: number;
  maintenanceBikesCount: number;
  financialBreakdown: FinancialBreakdown;
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROLE: 'kravent_role_v3',
  BIKES: 'kravent_bikes_v25_rate8k',
  BOOKINGS: 'kravent_bookings_zero_v2',
  EXPENSES: 'kravent_expenses_zero_v2',
  FINANCE: 'kravent_finance_v3',
};

// Pastikan data lama terhapus agar transaksi benar-benar mulai dari 0 untuk kemudahan testing
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('kravent_bookings');
    localStorage.removeItem('kravent_expenses');
    localStorage.removeItem('kravent_bookings_clean_v1');
    localStorage.removeItem('kravent_expenses_clean_v1');
    localStorage.removeItem('kravent_bikes_v25');
  } catch (e) {
    // ignore
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash.toLowerCase();
        if (hash === '#katalog' || hash === '#customer') return 'customer';
        const params = new URLSearchParams(window.location.search);
        const roleParam = params.get('role');
        if (roleParam === 'customer') return 'customer';
      }
      const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
      if (saved === 'admin' || saved === 'karyawan' || saved === 'customer') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'customer';
  });

  const [bikes, setBikes] = useState<Bike[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BIKES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored bikes', e);
      }
    }
    return INITIAL_BIKES;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored bookings', e);
      }
    }
    return INITIAL_BOOKINGS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored expenses', e);
      }
    }
    return INITIAL_EXPENSES;
  });

  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FINANCE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing stored finance', e);
      }
    }
    return INITIAL_FINANCIAL_SETTINGS;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BIKES, JSON.stringify(bikes));
  }, [bikes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(financialSettings));
  }, [financialSettings]);

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
  };

  const addBike = (bikeData: Omit<Bike, 'id' | 'totalRentedCount'>) => {
    const newBike: Bike = {
      ...bikeData,
      id: `bike-${Date.now()}`,
      totalRentedCount: 0,
    };
    setBikes(prev => [newBike, ...prev]);
  };

  const updateBike = (id: string, updated: Partial<Bike>) => {
    setBikes(prev => prev.map(b => (b.id === id ? { ...b, ...updated } : b)));
  };

  const deleteBike = (id: string) => {
    setBikes(prev => prev.filter(b => b.id !== id));
  };

  const updateBikeStatus = (id: string, status: BikeStatus) => {
    setBikes(prev => prev.map(b => (b.id === id ? { ...b, status } : b)));
  };

  const addBooking = (bookingData: Omit<Booking, 'id' | 'bookingCode' | 'createdAt'>): Booking => {
    // Validasi double booking & sepeda masih di jalan sebelum simpan
    const targetBike = bikes.find(b => b.id === bookingData.bikeId);
    const conflict = checkBikeBookingConflict(
      bookingData.bikeId,
      bookingData.startDate,
      bookingData.startTime,
      bookingData.endTime,
      bookings,
      targetBike
    );

    if (conflict.hasConflict) {
      alert(`TRANSAKSI GAGAL: ${conflict.message}`);
      throw new Error(`Double transaction blocked: ${conflict.message}`);
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const datePart = bookingData.startDate.replace(/-/g, '').slice(4); // e.g. 1010
    const code = `BOK-${datePart}-${randomSuffix}`;
    const newBooking: Booking = {
      ...bookingData,
      id: `book-${Date.now()}`,
      bookingCode: code,
      createdAt: new Date().toISOString(),
    };

    setBookings(prev => [newBooking, ...prev]);

    // Jika booking langsung aktif, update sepeda menjadi 'disewa' dan tambahkan total rented
    if (newBooking.status === 'aktif') {
      setBikes(prev =>
        prev.map(b =>
          b.id === newBooking.bikeId
            ? { ...b, status: 'disewa', totalRentedCount: b.totalRentedCount + 1 }
            : b
        )
      );
    }
    return newBooking;
  };

  const updateBooking = (id: string, updatedFields: Partial<Booking>) => {
    const currentBooking = bookings.find(b => b.id === id);
    if (!currentBooking) return;

    const targetBikeId = updatedFields.bikeId || currentBooking.bikeId;
    const targetDate = updatedFields.startDate || currentBooking.startDate;
    const targetStart = updatedFields.startTime || currentBooking.startTime;
    const targetEnd = updatedFields.endTime || currentBooking.endTime;
    const targetBike = bikes.find(b => b.id === targetBikeId);

    // Jika mengganti sepeda atau jam sewa, validasi bentrok (dengan mengecualikan booking ini sendiri)
    if (
      (updatedFields.bikeId && updatedFields.bikeId !== currentBooking.bikeId) ||
      (updatedFields.startDate && updatedFields.startDate !== currentBooking.startDate) ||
      (updatedFields.startTime && updatedFields.startTime !== currentBooking.startTime) ||
      (updatedFields.endTime && updatedFields.endTime !== currentBooking.endTime)
    ) {
      const conflict = checkBikeBookingConflict(
        targetBikeId,
        targetDate,
        targetStart,
        targetEnd,
        bookings,
        targetBike,
        id
      );

      if (conflict.hasConflict) {
        alert(`GAGAL UPDATE BOOKING: ${conflict.message}`);
        throw new Error(`Booking conflict on update: ${conflict.message}`);
      }
    }

    // Sinkronisasi status unit sepeda jika ada pergantian sepeda atau perubahan status
    const newStatus = updatedFields.status || currentBooking.status;
    const finalBikeId = updatedFields.bikeId || currentBooking.bikeId;

    if (updatedFields.bikeId && updatedFields.bikeId !== currentBooking.bikeId) {
      setBikes(bikeList =>
        bikeList.map(bike => {
          if (bike.id === currentBooking.bikeId) {
            // Sepeda lama dikembalikan ke 'tersedia' jika sebelumnya dipakai booking aktif
            return currentBooking.status === 'aktif' ? { ...bike, status: 'tersedia' } : bike;
          }
          if (bike.id === updatedFields.bikeId) {
            // Sepeda baru disesuaikan
            return newStatus === 'aktif'
              ? { ...bike, status: 'disewa', totalRentedCount: bike.totalRentedCount + 1 }
              : { ...bike, status: 'tersedia' };
          }
          return bike;
        })
      );
    } else if (updatedFields.status && updatedFields.status !== currentBooking.status) {
      // Jika sepeda tetap sama tapi status booking berubah
      setBikes(bikeList =>
        bikeList.map(bike => {
          if (bike.id === finalBikeId) {
            if (newStatus === 'selesai' || newStatus === 'dibatalkan') {
              return { ...bike, status: 'tersedia' };
            }
            if (newStatus === 'aktif') {
              return { ...bike, status: 'disewa', totalRentedCount: currentBooking.status !== 'aktif' ? bike.totalRentedCount + 1 : bike.totalRentedCount };
            }
          }
          return bike;
        })
      );
    }

    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, ...updatedFields } : b))
    );
  };

  const updateBookingStatus = (
    id: string,
    status: BookingStatus,
    returnDetails?: string | Partial<Booking>
  ) => {
    setBookings(prev =>
      prev.map(b => {
        if (b.id === id) {
          const detailsObj: Partial<Booking> =
            typeof returnDetails === 'string'
              ? { returnedAt: returnDetails }
              : returnDetails || {};

          const updated: Booking = { ...b, ...detailsObj, status };

          if (status === 'selesai') {
            if (!updated.returnedAt) updated.returnedAt = new Date().toISOString();
            // Kembalikan status sepeda ke 'tersedia'
            setBikes(bikeList =>
              bikeList.map(bike =>
                bike.id === b.bikeId ? { ...bike, status: 'tersedia' } : bike
              )
            );
          } else if (status === 'aktif') {
            // Sepeda keluar
            setBikes(bikeList =>
              bikeList.map(bike =>
                bike.id === b.bikeId
                  ? { ...bike, status: 'disewa', totalRentedCount: b.status !== 'aktif' ? bike.totalRentedCount + 1 : bike.totalRentedCount }
                  : bike
              )
            );
          } else if (status === 'dibatalkan') {
            // Kembalikan ketersediaan sepeda
            setBikes(bikeList =>
              bikeList.map(bike =>
                bike.id === b.bikeId && bike.status === 'disewa'
                  ? { ...bike, status: 'tersedia' }
                  : bike
              )
            );
          }
          return updated;
        }
        return b;
      })
    );
  };

  const deleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const updateFinancialSettings = (settings: Partial<FinancialSettings>) => {
    setFinancialSettings(prev => ({ ...prev, ...settings }));
  };

  const resetToDefaults = () => {
    setBikes(INITIAL_BIKES);
    setBookings(INITIAL_BOOKINGS);
    setExpenses(INITIAL_EXPENSES);
    setFinancialSettings(INITIAL_FINANCIAL_SETTINGS);
    setCurrentRoleState('admin');
    setSelectedMonth('2026-10');
    localStorage.clear();
  };

  // Referensi tanggal sistem sekarang (hari ini dan selanjutnya)
  const todayStr = getTodayDateStr();

  // Hitungan unit sepeda keluar:
  // Hari ini: booking yang dimulai atau dikembalikan pada hari ini (tidak dibatalkan)
  const bikesOutToday = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'dibatalkan') return false;
      const bDate = b.actualReturnDate || b.startDate;
      return bDate === todayStr;
    }).length;
  }, [bookings, todayStr]);

  // Minggu ini: Rekap mulai dari Senin sampai Minggu
  const currentWeekRange = useMemo(() => {
    return getMondaySundayWeekRange(todayStr);
  }, [todayStr]);

  const bikesOutThisWeek = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'dibatalkan') return false;
      const bDate = b.actualReturnDate || b.startDate;
      return bDate >= currentWeekRange.mondayStr && bDate <= currentWeekRange.sundayStr;
    }).length;
  }, [bookings, currentWeekRange]);

  // Bulan ini (2026-10)
  const bikesOutThisMonth = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'dibatalkan') return false;
      const bDate = b.actualReturnDate || b.startDate;
      return bDate.startsWith(selectedMonth);
    }).length;
  }, [bookings, selectedMonth]);

  // Omzet pendapatan riil: Dihitung dari transaksi yang beres ('selesai') atau telah 'lunas' (tidak dibatalkan)
  const todayRevenue = useMemo(() => {
    return bookings
      .filter(b => {
        if (b.status === 'dibatalkan') return false;
        const bDate = b.actualReturnDate || b.startDate;
        return bDate === todayStr && (b.status === 'selesai' || b.paymentStatus === 'lunas');
      })
      .reduce((sum, b) => sum + (b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0))), 0);
  }, [bookings, todayStr]);

  const thisWeekRevenue = useMemo(() => {
    return bookings
      .filter(b => {
        if (b.status === 'dibatalkan') return false;
        const bDate = b.actualReturnDate || b.startDate;
        return (
          bDate >= currentWeekRange.mondayStr &&
          bDate <= currentWeekRange.sundayStr &&
          (b.status === 'selesai' || b.paymentStatus === 'lunas')
        );
      })
      .reduce((sum, b) => sum + (b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0))), 0);
  }, [bookings, currentWeekRange]);

  const thisMonthRevenue = useMemo(() => {
    return bookings
      .filter(b => {
        if (b.status === 'dibatalkan') return false;
        const bDate = b.actualReturnDate || b.startDate;
        return (
          bDate.startsWith(selectedMonth) &&
          (b.status === 'selesai' || b.paymentStatus === 'lunas')
        );
      })
      .reduce((sum, b) => sum + (b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0))), 0);
  }, [bookings, selectedMonth]);

  // Potensi omzet berjalan (transaksi masih aktif/di jalan dan belum beres)
  const pendingPotentialRevenue = useMemo(() => {
    return bookings
      .filter(b => b.status === 'aktif')
      .reduce((sum, b) => sum + b.totalPrice, 0);
  }, [bookings]);

  const activeBookingsCount = useMemo(() => {
    return bookings.filter(b => b.status === 'aktif').length;
  }, [bookings]);

  const availableBikesCount = useMemo(() => {
    return bikes.filter(b => b.status === 'tersedia').length;
  }, [bikes]);

  const maintenanceBikesCount = useMemo(() => {
    return bikes.filter(b => b.status === 'maintenance').length;
  }, [bikes]);

  // Financial Breakdown calculations
  const financialBreakdown = useMemo<FinancialBreakdown>(() => {
    const grossRevenue = thisMonthRevenue;

    // Model 1: Persentase alokasi pos
    const maintenanceAllocation = Math.round(
      (grossRevenue * financialSettings.maintenanceBudgetPercentage) / 100
    );
    const contentAllocation = Math.round(
      (grossRevenue * financialSettings.contentBudgetPercentage) / 100
    );
    const operationalAllocation = Math.round(
      (grossRevenue * financialSettings.operationalBudgetPercentage) / 100
    );
    const totalAllocations =
      maintenanceAllocation + contentAllocation + operationalAllocation;
    const netProfit = Math.max(0, grossRevenue - totalAllocations);

    const partner1Share = Math.round(
      (netProfit * financialSettings.partner1Percentage) / 100
    );
    const partner2Share = Math.max(0, netProfit - partner1Share);

    // Model 2: Pengeluaran riil tercatat bulan ini
    const monthExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
    const actualMaintenanceSpent = monthExpenses
      .filter(e => e.category === 'mentenest')
      .reduce((sum, e) => sum + e.amount, 0);
    const actualContentSpent = monthExpenses
      .filter(e => e.category === 'konten')
      .reduce((sum, e) => sum + e.amount, 0);
    const actualOperationalSpent = monthExpenses
      .filter(e => e.category === 'pengeluaran')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalActualExpenses =
      actualMaintenanceSpent + actualContentSpent + actualOperationalSpent;
    const actualNetProfit = Math.max(0, grossRevenue - totalActualExpenses);

    const actualPartner1Share = Math.round(
      (actualNetProfit * financialSettings.partner1Percentage) / 100
    );
    const actualPartner2Share = Math.max(0, actualNetProfit - actualPartner1Share);

    return {
      grossRevenue,
      maintenanceAllocation,
      contentAllocation,
      operationalAllocation,
      totalAllocations,
      netProfit,
      partner1Share,
      partner2Share,
      actualMaintenanceSpent,
      actualContentSpent,
      actualOperationalSpent,
      totalActualExpenses,
      actualNetProfit,
      actualPartner1Share,
      actualPartner2Share,
    };
  }, [thisMonthRevenue, expenses, selectedMonth, financialSettings]);

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        bikes,
        bookings,
        expenses,
        financialSettings,
        addBike,
        updateBike,
        deleteBike,
        updateBikeStatus,
        addBooking,
        updateBooking,
        updateBookingStatus,
        deleteBooking,
        addExpense,
        deleteExpense,
        updateFinancialSettings,
        resetToDefaults,
        bikesOutToday,
        bikesOutThisWeek,
        bikesOutThisMonth,
        todayRevenue,
        thisWeekRevenue,
        thisMonthRevenue,
        pendingPotentialRevenue,
        activeBookingsCount,
        availableBikesCount,
        maintenanceBikesCount,
        financialBreakdown,
        selectedMonth,
        setSelectedMonth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
