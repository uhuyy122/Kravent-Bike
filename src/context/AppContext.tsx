import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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
import { db, handleFirestoreError, cleanForFirestore, OperationType } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc
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
  addBike: (bike: Omit<Bike, 'id' | 'totalRentedCount'>) => Promise<void>;
  updateBike: (id: string, updated: Partial<Bike>) => Promise<void>;
  deleteBike: (id: string) => Promise<void>;
  updateBikeStatus: (id: string, status: BikeStatus) => Promise<void>;
  addBooking: (booking: Omit<Booking, 'id' | 'bookingCode' | 'createdAt'>) => Promise<Booking>;
  updateBooking: (id: string, updated: Partial<Booking>) => Promise<void>;
  updateBookingStatus: (id: string, status: BookingStatus, returnDetails?: string | Partial<Booking>) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  updateFinancialSettings: (settings: Partial<FinancialSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  forceSyncCloud: () => Promise<{ success: boolean; message: string }>;
  isCloudConnected: boolean;
  isCloudSyncing: boolean;
  lastCloudSyncTime: string;
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
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string>('Baru saja');

  // Simpan ke LocalStorage sebagai cadangan offline
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
  // REAL-TIME FIRESTORE SYNCHRONIZATION
  // =========================================================================
  useEffect(() => {
    // 1. Sync Bikes
    const unsubBikes = onSnapshot(
      collection(db, 'bikes'),
      snapshot => {
        setIsCloudConnected(true);
        if (snapshot.empty) {
          // Inisialisasi awal armada ke cloud Firestore
          INITIAL_BIKES.forEach(b => {
            setDoc(doc(db, 'bikes', b.id), cleanForFirestore(b)).catch(err =>
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
        setLastCloudSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      },
      error => {
        setIsCloudConnected(false);
        handleFirestoreError(error, OperationType.LIST, 'bikes');
      }
    );

    // 2. Sync Bookings
    const unsubBookings = onSnapshot(
      collection(db, 'bookings'),
      snapshot => {
        setIsCloudConnected(true);
        if (snapshot.empty) {
          // Jika di Firestore masih kosong, cek apakah perangkat ini punya data booking lokal untuk dimigrasikan
          let localBookings = INITIAL_BOOKINGS;
          try {
            const saved = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                localBookings = parsed;
              }
            }
          } catch {
            // ignore
          }

          if (localBookings.length > 0) {
            localBookings.forEach(b => {
              setDoc(doc(db, 'bookings', b.id), cleanForFirestore(b)).catch(err =>
                handleFirestoreError(err, OperationType.WRITE, `bookings/${b.id}`)
              );
            });
            setBookings(localBookings);
          }
        } else {
          const list: Booking[] = [];
          snapshot.forEach(docSnap => {
            list.push(docSnap.data() as Booking);
          });
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setBookings(list);
        }
        setLastCloudSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      },
      error => {
        setIsCloudConnected(false);
        handleFirestoreError(error, OperationType.LIST, 'bookings');
      }
    );

    // 3. Sync Expenses
    const unsubExpenses = onSnapshot(
      collection(db, 'expenses'),
      snapshot => {
        setIsCloudConnected(true);
        if (snapshot.empty) {
          INITIAL_EXPENSES.forEach(e => {
            setDoc(doc(db, 'expenses', e.id), cleanForFirestore(e)).catch(err =>
              handleFirestoreError(err, OperationType.WRITE, `expenses/${e.id}`)
            );
          });
          setExpenses(INITIAL_EXPENSES);
        } else {
          const list: Expense[] = [];
          snapshot.forEach(docSnap => {
            list.push(docSnap.data() as Expense);
          });
          list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setExpenses(list);
        }
        setLastCloudSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      },
      error => {
        setIsCloudConnected(false);
        handleFirestoreError(error, OperationType.LIST, 'expenses');
      }
    );

    // 4. Sync Financial Settings
    const unsubSettings = onSnapshot(
      doc(db, 'financial_settings', 'default'),
      docSnap => {
        setIsCloudConnected(true);
        if (docSnap.exists()) {
          setFinancialSettings(docSnap.data() as FinancialSettings);
        } else {
          setDoc(doc(db, 'financial_settings', 'default'), cleanForFirestore(INITIAL_FINANCIAL_SETTINGS)).catch(err =>
            handleFirestoreError(err, OperationType.WRITE, 'financial_settings/default')
          );
          setFinancialSettings(INITIAL_FINANCIAL_SETTINGS);
        }
        setLastCloudSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      },
      error => {
        setIsCloudConnected(false);
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

  // Force Manual Sync Function: Tarik dan sinkronkan data langsung dari Cloud
  const forceSyncCloud = useCallback(async () => {
    setIsCloudSyncing(true);
    try {
      // 1. Ambil Bikes
      const bikesSnap = await getDocs(collection(db, 'bikes'));
      if (!bikesSnap.empty) {
        const list: Bike[] = [];
        bikesSnap.forEach(d => list.push(d.data() as Bike));
        list.sort((a, b) => a.licenseNumber.localeCompare(b.licenseNumber));
        setBikes(list);
      } else {
        INITIAL_BIKES.forEach(b => {
          setDoc(doc(db, 'bikes', b.id), cleanForFirestore(b));
        });
      }

      // 2. Ambil Bookings
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      if (!bookingsSnap.empty) {
        const list: Booking[] = [];
        bookingsSnap.forEach(d => list.push(d.data() as Booking));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setBookings(list);
      } else if (bookings.length > 0) {
        // Upload data lokal jika cloud masih kosong
        for (const b of bookings) {
          await setDoc(doc(db, 'bookings', b.id), cleanForFirestore(b));
        }
      }

      // 3. Ambil Expenses
      const expSnap = await getDocs(collection(db, 'expenses'));
      if (!expSnap.empty) {
        const list: Expense[] = [];
        expSnap.forEach(d => list.push(d.data() as Expense));
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setExpenses(list);
      }

      // 4. Ambil Settings
      const setSnap = await getDoc(doc(db, 'financial_settings', 'default'));
      if (setSnap.exists()) {
        setFinancialSettings(setSnap.data() as FinancialSettings);
      }

      setIsCloudConnected(true);
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setLastCloudSyncTime(timeStr);
      return { success: true, message: `Sinkronisasi berhasil! Data ter-update pada pukul ${timeStr} WIB.` };
    } catch (err) {
      console.error('Force sync error:', err);
      return { success: false, message: `Gagal sinkronisasi: ${err instanceof Error ? err.message : String(err)}` };
    } finally {
      setIsCloudSyncing(false);
    }
  }, [bookings]);

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
  };

  const addBike = async (bikeData: Omit<Bike, 'id' | 'totalRentedCount'>) => {
    const newBike: Bike = {
      ...bikeData,
      id: `bike-${Date.now()}`,
      totalRentedCount: 0,
    };
    setBikes(prev => [newBike, ...prev]);
    try {
      await setDoc(doc(db, 'bikes', newBike.id), cleanForFirestore(newBike));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `bikes/${newBike.id}`);
    }
  };

  const updateBike = async (id: string, updated: Partial<Bike>) => {
    setBikes(prev => prev.map(b => (b.id === id ? { ...b, ...updated } : b)));
    try {
      await updateDoc(doc(db, 'bikes', id), cleanForFirestore(updated));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bikes/${id}`);
    }
  };

  const deleteBike = async (id: string) => {
    setBikes(prev => prev.filter(b => b.id !== id));
    try {
      await deleteDoc(doc(db, 'bikes', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `bikes/${id}`);
    }
  };

  const updateBikeStatus = async (id: string, status: BikeStatus) => {
    setBikes(prev => prev.map(b => (b.id === id ? { ...b, status } : b)));
    try {
      await updateDoc(doc(db, 'bikes', id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bikes/${id}`);
    }
  };

  const addBooking = async (bookingData: Omit<Booking, 'id' | 'bookingCode' | 'createdAt'>): Promise<Booking> => {
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

    // Optimistic update
    setBookings(prev => [newBooking, ...prev]);

    try {
      // Simpan booking ke Firestore dengan membersihkan field undefined
      await setDoc(doc(db, 'bookings', newBooking.id), cleanForFirestore(newBooking));

      if (newBooking.status === 'aktif') {
        const curBike = bikes.find(b => b.id === newBooking.bikeId);
        setBikes(prev =>
          prev.map(b =>
            b.id === newBooking.bikeId
              ? { ...b, status: 'disewa', totalRentedCount: b.totalRentedCount + 1 }
              : b
          )
        );
        await updateDoc(doc(db, 'bikes', newBooking.bikeId), {
          status: 'disewa',
          totalRentedCount: (curBike?.totalRentedCount || 0) + 1,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `bookings/${newBooking.id}`);
    }

    return newBooking;
  };

  const updateBooking = async (id: string, updatedFields: Partial<Booking>) => {
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
      if (currentBooking.status === 'aktif') {
        updateDoc(doc(db, 'bikes', currentBooking.bikeId), { status: 'tersedia' }).catch(err =>
          handleFirestoreError(err, OperationType.UPDATE, `bikes/${currentBooking.bikeId}`)
        );
      }
      const newBikeObj = bikes.find(b => b.id === updatedFields.bikeId);
      updateDoc(doc(db, 'bikes', updatedFields.bikeId), {
        status: newStatus === 'aktif' ? 'disewa' : 'tersedia',
        totalRentedCount: newStatus === 'aktif' ? (newBikeObj?.totalRentedCount || 0) + 1 : (newBikeObj?.totalRentedCount || 0),
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
                totalRentedCount: currentBooking.status !== 'aktif' ? bike.totalRentedCount + 1 : bike.totalRentedCount,
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
          totalRentedCount: currentBooking.status !== 'aktif' ? (curBike?.totalRentedCount || 0) + 1 : (curBike?.totalRentedCount || 0),
        }).catch(err =>
          handleFirestoreError(err, OperationType.UPDATE, `bikes/${finalBikeId}`)
        );
      }
    }

    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, ...updatedFields } : b))
    );

    try {
      await updateDoc(doc(db, 'bookings', id), cleanForFirestore(updatedFields));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${id}`);
    }
  };

  const updateBookingStatus = async (
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
        totalRentedCount: b.status !== 'aktif' ? (curBike?.totalRentedCount || 0) + 1 : (curBike?.totalRentedCount || 0),
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

    try {
      const payloadToUpdate = cleanForFirestore({ ...detailsObj, status });
      await updateDoc(doc(db, 'bookings', id), payloadToUpdate);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${id}`);
    }
  };

  const deleteBooking = async (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    try {
      await deleteDoc(doc(db, 'bookings', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `bookings/${id}`);
    }
  };

  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses(prev => [newExpense, ...prev]);
    try {
      await setDoc(doc(db, 'expenses', newExpense.id), cleanForFirestore(newExpense));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expenses/${newExpense.id}`);
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    }
  };

  const updateFinancialSettings = async (settings: Partial<FinancialSettings>) => {
    setFinancialSettings(prev => ({ ...prev, ...settings }));
    try {
      await setDoc(doc(db, 'financial_settings', 'default'), cleanForFirestore(settings), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'financial_settings/default');
    }
  };

  const resetToDefaults = async () => {
    setBikes(INITIAL_BIKES);
    setBookings(INITIAL_BOOKINGS);
    setExpenses(INITIAL_EXPENSES);
    setFinancialSettings(INITIAL_FINANCIAL_SETTINGS);
    setCurrentRoleState('admin');
    setSelectedMonth('2026-10');

    try {
      // Reset Firestore
      for (const b of INITIAL_BIKES) {
        await setDoc(doc(db, 'bikes', b.id), cleanForFirestore(b));
      }
      for (const b of INITIAL_BOOKINGS) {
        await setDoc(doc(db, 'bookings', b.id), cleanForFirestore(b));
      }
      await setDoc(doc(db, 'financial_settings', 'default'), cleanForFirestore(INITIAL_FINANCIAL_SETTINGS));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'reset');
    }
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
        forceSyncCloud,
        isCloudConnected,
        isCloudSyncing,
        lastCloudSyncTime,
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
