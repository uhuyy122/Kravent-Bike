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
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';

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
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BIKES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_BIKES;
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_BOOKINGS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_EXPENSES;
  });

  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FINANCE);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_FINANCIAL_SETTINGS;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');

  // Sinkronisasi LocalStorage untuk fallback offline
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

  // =========================================================================
  // REAL-TIME FIRESTORE SYNCHRONIZATION (Antar HP, Laptop & Tablet)
  // =========================================================================
  useEffect(() => {
    // 1. Sync Bikes
    const unsubBikes = onSnapshot(
      collection(db, 'bikes'),
      snapshot => {
        if (snapshot.empty) {
          // Inisialisasi awal armada ke cloud Firestore
          INITIAL_BIKES.forEach(b => {
            setDoc(doc(db, 'bikes', b.id), b).catch(err =>
              handleFirestoreError(err, OperationType.WRITE, `bikes/${b.id}`)
            );
          });
          setBikes(INITIAL_BIKES);
        } else {
          const list: Bike[] = [];
          snapshot.forEach(docSnap => {
            list.push(docSnap.data() as Bike);
          });
          list.sort((a, b) => a.licenseNumber.localeCompare(b.licenseNumber));
          setBikes(list);
        }
      },
      error => {
        handleFirestoreError(error, OperationType.GET, 'bikes');
      }
    );

    // 2. Sync Bookings
    const unsubBookings = onSnapshot(
      collection(db, 'bookings'),
      snapshot => {
        const list: Booking[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Booking);
        });
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setBookings(list);
      },
      error => {
        handleFirestoreError(error, OperationType.GET, 'bookings');
      }
    );

    // 3. Sync Expenses
    const unsubExpenses = onSnapshot(
      collection(db, 'expenses'),
      snapshot => {
        const list: Expense[] = [];
        snapshot.forEach(docSnap => {
          list.push(docSnap.data() as Expense);
        });
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setExpenses(list);
      },
      error => {
        handleFirestoreError(error, OperationType.GET, 'expenses');
      }
    );

    // 4. Sync Financial Settings
    const unsubSettings = onSnapshot(
      doc(db, 'financial_settings', 'default'),
      docSnap => {
        if (docSnap.exists()) {
          setFinancialSettings(docSnap.data() as FinancialSettings);
        } else {
          setDoc(doc(db, 'financial_settings', 'default'), INITIAL_FINANCIAL_SETTINGS).catch(err =>
            handleFirestoreError(err, OperationType.WRITE, 'financial_settings/default')
          );
          setFinancialSettings(INITIAL_FINANCIAL_SETTINGS);
        }
      },
      error => {
        handleFirestoreError(error, OperationType.GET, 'financial_settings/default');
      }
    );

    return () => {
      unsubBikes();
      unsubBookings();
      unsubExpenses();
      unsubSettings();
    };
  }, []);

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
    setDoc(doc(db, 'bikes', newBike.id), newBike).catch(err =>
      handleFirestoreError(err, OperationType.CREATE, `bikes/${newBike.id}`)
    );
  };

  const updateBike = (id: string, updated: Partial<Bike>) => {
    setBikes(prev => prev.map(b => (b.id === id ? { ...b, ...updated } : b)));
    updateDoc(doc(db, 'bikes', id), updated).catch(err =>
      handleFirestoreError(err, OperationType.UPDATE, `bikes/${id}`)
    );
  };

  const deleteBike = (id: string) => {
    setBikes(prev => prev.filter(b => b.id !== id));
    deleteDoc(doc(db, 'bikes', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `bikes/${id}`)
    );
  };

  const updateBikeStatus = (id: string, status: BikeStatus) => {
    setBikes(prev => prev.map(b => (b.id === id ? { ...b, status } : b)));
    updateDoc(doc(db, 'bikes', id), { status }).catch(err =>
      handleFirestoreError(err, OperationType.UPDATE, `bikes/${id}`)
    );
  };

  const addBooking = (bookingData: Omit<Booking, 'id' | 'bookingCode' | 'createdAt'>): Booking => {
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
    const datePart = bookingData.startDate.replace(/-/g, '').slice(4);
    const code = `BOK-${datePart}-${randomSuffix}`;
    const newBooking: Booking = {
      ...bookingData,
      id: `book-${Date.now()}`,
      bookingCode: code,
      createdAt: new Date().toISOString(),
    };

    setBookings(prev => [newBooking, ...prev]);
    setDoc(doc(db, 'bookings', newBooking.id), newBooking).catch(err =>
      handleFirestoreError(err, OperationType.CREATE, `bookings/${newBooking.id}`)
    );

    if (newBooking.status === 'aktif') {
      const curBike = bikes.find(b => b.id === newBooking.bikeId);
      setBikes(prev =>
        prev.map(b =>
          b.id === newBooking.bikeId
            ? { ...b, status: 'disewa', totalRentedCount: b.totalRentedCount + 1 }
            : b
        )
      );
      updateDoc(doc(db, 'bikes', newBooking.bikeId), {
        status: 'disewa',
        totalRentedCount: (curBike?.totalRentedCount || 0) + 1,
      }).catch(err =>
        handleFirestoreError(err, OperationType.UPDATE, `bikes/${newBooking.bikeId}`)
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

    const newStatus = updatedFields.status || currentBooking.status;
    const finalBikeId = updatedFields.bikeId || currentBooking.bikeId;

    if (updatedFields.bikeId && updatedFields.bikeId !== currentBooking.bikeId) {
      setBikes(bikeList =>
        bikeList.map(bike => {
          if (bike.id === currentBooking.bikeId) {
            return currentBooking.status === 'aktif' ? { ...bike, status: 'tersedia' } : bike;
          }
          if (bike.id === updatedFields.bikeId) {
            return newStatus === 'aktif'
              ? { ...bike, status: 'disewa', totalRentedCount: bike.totalRentedCount + 1 }
              : { ...bike, status: 'tersedia' };
          }
          return bike;
        })
      );
      // Sinkronkan sepeda lama & baru ke Firestore
      if (currentBooking.status === 'aktif') {
        updateDoc(doc(db, 'bikes', currentBooking.bikeId), { status: 'tersedia' }).catch(err =>
          handleFirestoreError(err, OperationType.UPDATE, `bikes/${currentBooking.bikeId}`)
        );
      }
      const newBikeObj = bikes.find(b => b.id === updatedFields.bikeId);
      updateDoc(doc(db, 'bikes', updatedFields.bikeId), {
        status: newStatus === 'aktif' ? 'disewa' : 'tersedia',
        totalRentedCount: newStatus === 'aktif' ? (newBikeObj?.totalRentedCount || 0) + 1 : (newBikeObj?.totalRentedCount || 0)
      }).catch(err =>
        handleFirestoreError(err, OperationType.UPDATE, `bikes/${updatedFields.bikeId}`)
      );
    } else if (updatedFields.status && updatedFields.status !== currentBooking.status) {
      setBikes(bikeList =>
        bikeList.map(bike => {
          if (bike.id === finalBikeId) {
            if (newStatus === 'selesai' || newStatus === 'dibatalkan') {
              return { ...bike, status: 'tersedia' };
            }
            if (newStatus === 'aktif') {
              return {
                ...bike,
                status: 'disewa',
                totalRentedCount: currentBooking.status !== 'aktif' ? bike.totalRentedCount + 1 : bike.totalRentedCount
              };
            }
          }
          return bike;
        })
      );
      if (newStatus === 'selesai' || newStatus === 'dibatalkan') {
        updateDoc(doc(db, 'bikes', finalBikeId), { status: 'tersedia' }).catch(err =>
          handleFirestoreError(err, OperationType.UPDATE, `bikes/${finalBikeId}`)
        );
      } else if (newStatus === 'aktif') {
        const curBike = bikes.find(b => b.id === finalBikeId);
        updateDoc(doc(db, 'bikes', finalBikeId), {
          status: 'disewa',
          totalRentedCount: currentBooking.status !== 'aktif' ? (curBike?.totalRentedCount || 0) + 1 : (curBike?.totalRentedCount || 0)
        }).catch(err =>
          handleFirestoreError(err, OperationType.UPDATE, `bikes/${finalBikeId}`)
        );
      }
    }

    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, ...updatedFields } : b))
    );
    updateDoc(doc(db, 'bookings', id), updatedFields).catch(err =>
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${id}`)
    );
  };

  const updateBookingStatus = (
    id: string,
    status: BookingStatus,
    returnDetails?: string | Partial<Booking>
  ) => {
    const b = bookings.find(item => item.id === id);
    if (!b) return;

    const detailsObj: Partial<Booking> =
      typeof returnDetails === 'string'
        ? { returnedAt: returnDetails }
        : returnDetails || {};

    const updated: Booking = { ...b, ...detailsObj, status };

    if (status === 'selesai') {
      if (!updated.returnedAt) updated.returnedAt = new Date().toISOString();
      setBikes(bikeList =>
        bikeList.map(bike =>
          bike.id === b.bikeId ? { ...bike, status: 'tersedia' } : bike
        )
      );
      updateDoc(doc(db, 'bikes', b.bikeId), { status: 'tersedia' }).catch(err =>
        handleFirestoreError(err, OperationType.UPDATE, `bikes/${b.bikeId}`)
      );
    } else if (status === 'aktif') {
      const curBike = bikes.find(x => x.id === b.bikeId);
      setBikes(bikeList =>
        bikeList.map(bike =>
          bike.id === b.bikeId
            ? { ...bike, status: 'disewa', totalRentedCount: b.status !== 'aktif' ? bike.totalRentedCount + 1 : bike.totalRentedCount }
            : bike
        )
      );
      updateDoc(doc(db, 'bikes', b.bikeId), {
        status: 'disewa',
        totalRentedCount: b.status !== 'aktif' ? (curBike?.totalRentedCount || 0) + 1 : (curBike?.totalRentedCount || 0)
      }).catch(err =>
        handleFirestoreError(err, OperationType.UPDATE, `bikes/${b.bikeId}`)
      );
    } else if (status === 'dibatalkan') {
      setBikes(bikeList =>
        bikeList.map(bike =>
          bike.id === b.bikeId && bike.status === 'disewa'
            ? { ...bike, status: 'tersedia' }
            : bike
        )
      );
      updateDoc(doc(db, 'bikes', b.bikeId), { status: 'tersedia' }).catch(err =>
        handleFirestoreError(err, OperationType.UPDATE, `bikes/${b.bikeId}`)
      );
    }

    setBookings(prev =>
      prev.map(item => (item.id === id ? updated : item))
    );
    updateDoc(doc(db, 'bookings', id), { ...detailsObj, status }).catch(err =>
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${id}`)
    );
  };

  const deleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    deleteDoc(doc(db, 'bookings', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `bookings/${id}`)
    );
  };

  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses(prev => [newExpense, ...prev]);
    setDoc(doc(db, 'expenses', newExpense.id), newExpense).catch(err =>
      handleFirestoreError(err, OperationType.CREATE, `expenses/${newExpense.id}`)
    );
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    deleteDoc(doc(db, 'expenses', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`)
    );
  };

  const updateFinancialSettings = (settings: Partial<FinancialSettings>) => {
    setFinancialSettings(prev => ({ ...prev, ...settings }));
    setDoc(doc(db, 'financial_settings', 'default'), settings, { merge: true }).catch(err =>
      handleFirestoreError(err, OperationType.UPDATE, 'financial_settings/default')
    );
  };

  const resetToDefaults = () => {
    setBikes(INITIAL_BIKES);
    setBookings(INITIAL_BOOKINGS);
    setExpenses(INITIAL_EXPENSES);
    setFinancialSettings(INITIAL_FINANCIAL_SETTINGS);
    setCurrentRoleState('admin');
    setSelectedMonth('2026-10');

    // Reset Firestore collections
    INITIAL_BIKES.forEach(b => {
      setDoc(doc(db, 'bikes', b.id), b).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, `bikes/${b.id}`)
      );
    });
    setDoc(doc(db, 'financial_settings', 'default'), INITIAL_FINANCIAL_SETTINGS).catch(err =>
      handleFirestoreError(err, OperationType.WRITE, 'financial_settings/default')
    );
  };

  // Referensi tanggal sistem sekarang (hari ini dan selanjutnya)
  const todayStr = getTodayDateStr();

  // Hitungan unit sepeda keluar
  const bikesOutToday = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'dibatalkan') return false;
      const bDate = b.actualReturnDate || b.startDate;
      return bDate === todayStr;
    }).length;
  }, [bookings, todayStr]);

  // Minggu ini
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

  // Bulan ini
  const bikesOutThisMonth = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'dibatalkan') return false;
      const bDate = b.actualReturnDate || b.startDate;
      return bDate.startsWith(selectedMonth);
    }).length;
  }, [bookings, selectedMonth]);

  // Omzet pendapatan riil
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

  // Potensi omzet berjalan
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
