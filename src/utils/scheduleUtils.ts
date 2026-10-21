import { Booking, Bike } from '../types';

export interface TimeSlot {
  id: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  label: string;
  durationHours: number;
  session: 'pagi' | 'siang' | 'sore_malam';
}

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
 */
export const getTodayDateStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Mendapatkan jam sekarang dalam format HH:mm
 */
export const getCurrentTimeStr = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Cek apakah jam tertentu sudah lewat untuk hari ini
 */
export const isPastHourToday = (date: string, hourOrTime: number | string): boolean => {
  const today = getTodayDateStr();
  if (date < today) return true; // Tanggal kemarin sudah lewat
  if (date > today) return false; // Tanggal masa depan belum lewat

  // Tanggal hari ini: cek jam sekarang
  const now = new Date();
  const currentHour = now.getHours();
  if (typeof hourOrTime === 'number') {
    return hourOrTime < currentHour;
  }
  const [h] = hourOrTime.split(':').map(Number);
  return h < currentHour;
};

// Paket Sesi Sewa Sepeda 2 Jam Kravent Bike (Operasional 06:00 s/d 23:00)
export const CINEMA_2HR_SLOTS: TimeSlot[] = [
  { id: 'slot-2h-1', startTime: '06:00', endTime: '08:00', label: '06:00 - 08:00', durationHours: 2, session: 'pagi' },
  { id: 'slot-2h-2', startTime: '08:00', endTime: '10:00', label: '08:00 - 10:00', durationHours: 2, session: 'pagi' },
  { id: 'slot-2h-3', startTime: '10:00', endTime: '12:00', label: '10:00 - 12:00', durationHours: 2, session: 'pagi' },
  { id: 'slot-2h-4', startTime: '13:00', endTime: '15:00', label: '13:00 - 15:00', durationHours: 2, session: 'siang' },
  { id: 'slot-2h-5', startTime: '15:00', endTime: '17:00', label: '15:00 - 17:00', durationHours: 2, session: 'siang' },
  { id: 'slot-2h-6', startTime: '17:00', endTime: '19:00', label: '17:00 - 19:00', durationHours: 2, session: 'sore_malam' },
  { id: 'slot-2h-7', startTime: '19:00', endTime: '21:00', label: '19:00 - 21:00', durationHours: 2, session: 'sore_malam' },
  { id: 'slot-2h-8', startTime: '21:00', endTime: '23:00', label: '21:00 - 23:00', durationHours: 2, session: 'sore_malam' },
];

// Slot Per 1 Jam Fleksibel (06:00 s/d 23:00)
export const CINEMA_1HR_SLOTS: TimeSlot[] = [
  { id: 'slot-1h-06', startTime: '06:00', endTime: '07:00', label: '06:00 - 07:00', durationHours: 1, session: 'pagi' },
  { id: 'slot-1h-07', startTime: '07:00', endTime: '08:00', label: '07:00 - 08:00', durationHours: 1, session: 'pagi' },
  { id: 'slot-1h-08', startTime: '08:00', endTime: '09:00', label: '08:00 - 09:00', durationHours: 1, session: 'pagi' },
  { id: 'slot-1h-09', startTime: '09:00', endTime: '10:00', label: '09:00 - 10:00', durationHours: 1, session: 'pagi' },
  { id: 'slot-1h-10', startTime: '10:00', endTime: '11:00', label: '10:00 - 11:00', durationHours: 1, session: 'pagi' },
  { id: 'slot-1h-11', startTime: '11:00', endTime: '12:00', label: '11:00 - 12:00', durationHours: 1, session: 'pagi' },
  { id: 'slot-1h-13', startTime: '13:00', endTime: '14:00', label: '13:00 - 14:00', durationHours: 1, session: 'siang' },
  { id: 'slot-1h-14', startTime: '14:00', endTime: '15:00', label: '14:00 - 15:00', durationHours: 1, session: 'siang' },
  { id: 'slot-1h-15', startTime: '15:00', endTime: '16:00', label: '15:00 - 16:00', durationHours: 1, session: 'siang' },
  { id: 'slot-1h-16', startTime: '16:00', endTime: '17:00', label: '16:00 - 17:00', durationHours: 1, session: 'sore_malam' },
  { id: 'slot-1h-17', startTime: '17:00', endTime: '18:00', label: '17:00 - 18:00', durationHours: 1, session: 'sore_malam' },
  { id: 'slot-1h-18', startTime: '18:00', endTime: '19:00', label: '18:00 - 19:00', durationHours: 1, session: 'sore_malam' },
  { id: 'slot-1h-19', startTime: '19:00', endTime: '20:00', label: '19:00 - 20:00', durationHours: 1, session: 'sore_malam' },
  { id: 'slot-1h-20', startTime: '20:00', endTime: '21:00', label: '20:00 - 21:00', durationHours: 1, session: 'sore_malam' },
  { id: 'slot-1h-21', startTime: '21:00', endTime: '22:00', label: '21:00 - 22:00', durationHours: 1, session: 'sore_malam' },
  { id: 'slot-1h-22', startTime: '22:00', endTime: '23:00', label: '22:00 - 23:00', durationHours: 1, session: 'sore_malam' },
];

export const timeStringToMinutes = (t: string): number => {
  if (!t) return 0;
  if (t === '24:00') return 1440;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const isTimeRangeOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  const startAMin = timeStringToMinutes(startA);
  let endAMin = timeStringToMinutes(endA);
  if (endAMin <= startAMin || endA === '00:00') {
    endAMin += 1440;
  }

  const startBMin = timeStringToMinutes(startB);
  let endBMin = timeStringToMinutes(endB);
  if (endBMin <= startBMin || endB === '00:00') {
    endBMin += 1440;
  }

  return Math.max(startAMin, startBMin) < Math.min(endAMin, endBMin);
};

/**
 * Cek bentrok unit sepeda & jam secara menyeluruh:
 * 1. Tidak bisa double transaksi jika jam tersebut sudah dibooking.
 * 2. Tidak bisa transaksi jika sepeda masih di jalan (sedang disewa keluar).
 * 3. Tidak bisa booking pada jam yang sudah lewat di hari ini.
 */
export const checkBikeBookingConflict = (
  bikeId: string,
  date: string,
  startTime: string,
  endTime: string,
  bookings: Booking[],
  bike?: Bike,
  excludeBookingId?: string
): {
  hasConflict: boolean;
  reason?: 'already_booked' | 'on_road' | 'past_time' | 'maintenance';
  message?: string;
  conflictingBooking?: Booking;
} => {
  const today = getTodayDateStr();

  // 1. Cek jika tanggal kemarin (tidak boleh transaksi masa lalu)
  if (date < today) {
    return {
      hasConflict: true,
      reason: 'past_time',
      message: 'Tanggal sudah lewat. Transaksi hanya berlaku untuk hari ini dan selanjutnya.',
    };
  }

  // 2. Cek jika jam hari ini sudah lewat
  if (date === today && isPastHourToday(date, startTime)) {
    return {
      hasConflict: true,
      reason: 'past_time',
      message: `Pukul ${startTime} WIB sudah lewat hari ini. Pilih jam sekarang atau jam selanjutnya.`,
    };
  }

  // 3. Cek jika unit sepeda sedang diservis (maintenance)
  if (bike && bike.status === 'maintenance') {
    return {
      hasConflict: true,
      reason: 'maintenance',
      message: 'Unit sepeda ini sedang dalam perawatan/servis (Mentenest) dan belum bisa disewa.',
    };
  }

  // 4. Cek apakah unit sepeda MASIH DI JALAN (sedang disewa keluar saat ini)
  const activeRoadBooking = bookings.find(
    b => b.id !== excludeBookingId && b.bikeId === bikeId && b.status === 'aktif'
  );
  if (activeRoadBooking) {
    // Jika sepeda masih aktif di jalan:
    // Cek apakah tanggal sewa sama dengan hari ini / tanggal aktif
    if (date === activeRoadBooking.startDate || date === today) {
      // Jika jam mulai booking baru bertabrakan atau mendahului jam selesai sepeda di jalan
      if (startTime < activeRoadBooking.endTime) {
        return {
          hasConflict: true,
          reason: 'on_road',
          message: `Unit sepeda masih di jalan! Sedang disewa oleh ${activeRoadBooking.customerName} s/d pukul ${activeRoadBooking.endTime} WIB. Tidak bisa double transaksi!`,
          conflictingBooking: activeRoadBooking,
        };
      }
    }
  }

  // 5. Cek bentrok jam dengan booking yang sudah ada pada tanggal tersebut (double transaksi)
  const dayBookings = bookings.filter(
    b => b.id !== excludeBookingId && b.bikeId === bikeId && b.startDate === date && b.status !== 'dibatalkan'
  );

  const conflictingBooking = dayBookings.find(b => {
    return isTimeRangeOverlap(b.startTime, b.endTime, startTime, endTime);
  });

  if (conflictingBooking) {
    return {
      hasConflict: true,
      reason: 'already_booked',
      message: `Unit sepeda sudah dibooking pada jam ${conflictingBooking.startTime} - ${conflictingBooking.endTime} WIB oleh ${conflictingBooking.customerName} (${conflictingBooking.bookingCode}). Double booking dilarang!`,
      conflictingBooking,
    };
  }

  return {
    hasConflict: false,
  };
};

/**
 * Cek apakah slot jam tertentu sudah dibooking untuk sepeda dan tanggal tersebut
 */
export const checkSlotAvailability = (
  bikeId: string,
  date: string,
  slotStart: string,
  slotEnd: string,
  bookings: Booking[]
): { isBooked: boolean; bookingCode?: string } => {
  const overlappingBooking = bookings.find(b => {
    if (b.bikeId !== bikeId) return false;
    if (b.status === 'dibatalkan') return false;
    if (b.startDate !== date) return false;

    return isTimeRangeOverlap(b.startTime, b.endTime, slotStart, slotEnd);
  });

  return {
    isBooked: !!overlappingBooking,
    bookingCode: overlappingBooking?.bookingCode,
  };
};

/**
 * Cek bentrok untuk jam kustom yang diinput bebas oleh customer atau admin
 */
export const checkCustomTimeCollision = (
  bikeId: string,
  date: string,
  startTime: string,
  endTime: string,
  bookings: Booking[],
  bike?: Bike
): {
  isAvailable: boolean;
  conflictingBooking?: Booking;
  conflictReason?: string;
  bookedList: Array<{ startTime: string; endTime: string; customerName: string; bookingCode: string }>;
} => {
  const dayBookings = bookings.filter(
    b => b.bikeId === bikeId && b.startDate === date && b.status !== 'dibatalkan'
  );

  const bookedList = dayBookings.map(b => ({
    startTime: b.startTime,
    endTime: b.endTime,
    customerName: b.customerName,
    bookingCode: b.bookingCode,
  }));

  const conflictCheck = checkBikeBookingConflict(
    bikeId,
    date,
    startTime,
    endTime,
    bookings,
    bike
  );

  return {
    isAvailable: !conflictCheck.hasConflict,
    conflictingBooking: conflictCheck.conflictingBooking,
    conflictReason: conflictCheck.message,
    bookedList,
  };
};

/**
 * Menghasilkan daftar tanggal N hari ke depan mulai dari tanggal referensi (default hari ini)
 */
export const getUpcomingDates = (baseDateStr?: string, count: number = 7) => {
  const todayStr = getTodayDateStr();
  const effectiveBase = baseDateStr && baseDateStr >= todayStr ? baseDateStr : todayStr;
  const dates = [];
  const [y, m, d] = effectiveBase.split('-').map(Number);
  const base = new Date(y, m - 1, d);

  for (let i = 0; i < count; i++) {
    const cur = new Date(base);
    cur.setDate(base.getDate() + i);

    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(cur);
    const dayNum = cur.getDate();
    const monthName = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(cur);

    dates.push({
      dateStr,
      dayName,
      dayNum,
      monthName,
      isToday: dateStr === todayStr,
    });
  }

  return dates;
};

/**
 * Mendapatkan rentang tanggal mingguan: Senin s/d Minggu (Senin jam 00:00 s/d Minggu jam 23:59)
 */
export const getMondaySundayWeekRange = (dateStr?: string) => {
  const today = getTodayDateStr();
  const effectiveStr = dateStr || today;
  const [y, m, d] = effectiveStr.split('-').map(Number);
  const ref = new Date(y, m - 1, d);
  const day = ref.getDay(); // 0: Minggu, 1: Senin, ..., 6: Sabtu
  const diffToMonday = (day + 6) % 7;

  const monday = new Date(ref);
  monday.setDate(ref.getDate() - diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (dt: Date) => {
    const yr = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const mondayStr = format(monday);
  const sundayStr = format(sunday);

  const formatLabel = (dt: Date) => {
    const da = dt.getDate();
    const mo = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(dt);
    return `${da} ${mo}`;
  };

  return {
    mondayDate: monday,
    sundayDate: sunday,
    mondayStr,
    sundayStr,
    label: `${formatLabel(monday)} - ${formatLabel(sunday)} ${sunday.getFullYear()}`,
  };
};

/**
 * Mendapatkan tanggal kemarin (H-1)
 */
export const getYesterdayDateStr = (dateStr?: string): string => {
  const effectiveStr = dateStr || getTodayDateStr();
  const [y, m, d] = effectiveStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  const yr = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const da = String(dt.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
};

/**
 * Mendapatkan rentang minggu kemarin (Senin - Minggu minggu lalu)
 */
export const getLastWeekRange = (dateStr?: string) => {
  const currentWeek = getMondaySundayWeekRange(dateStr);
  const prevMonday = new Date(currentWeek.mondayDate);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const yr = prevMonday.getFullYear();
  const mo = String(prevMonday.getMonth() + 1).padStart(2, '0');
  const da = String(prevMonday.getDate()).padStart(2, '0');
  return getMondaySundayWeekRange(`${yr}-${mo}-${da}`);
};

/**
 * Mendapatkan bulan kemarin (YYYY-MM)
 */
export const getLastMonthStr = (monthStr?: string): string => {
  const today = getTodayDateStr();
  const effectiveMonth = monthStr || today.slice(0, 7);
  const [y, m] = effectiveMonth.split('-').map(Number);
  const dt = new Date(y, m - 2, 1);
  const yr = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  return `${yr}-${mo}`;
};

