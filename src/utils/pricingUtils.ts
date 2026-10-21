export interface DateRateInfo {
  date: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  category: 'weekday' | 'weekend' | 'holiday';
  ratePerHour: number; // 8000 atau 10000
  label: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const DEFAULT_WEEKDAY_RATE = 8000;
export const DEFAULT_WEEKEND_RATE = 10000;
export const DEFAULT_HOLIDAY_RATE = 10000;

// Daftar Hari Libur Nasional & Cuti Bersama Umum Indonesia (Format MM-DD)
export const INDONESIAN_HOLIDAYS: Record<string, string> = {
  '01-01': 'Tahun Baru Masehi',
  '02-10': 'Tahun Baru Imlek',
  '03-11': 'Hari Suci Nyepi',
  '03-29': 'Wafat Isa Almasih (Jumat Agung)',
  '03-31': 'Hari Paskah',
  '04-08': 'Cuti Idul Fitri',
  '04-09': 'Cuti Idul Fitri',
  '04-10': 'Hari Raya Idul Fitri',
  '04-11': 'Hari Raya Idul Fitri',
  '04-12': 'Cuti Idul Fitri',
  '05-01': 'Hari Buruh Internasional',
  '05-09': 'Kenaikan Isa Almasih',
  '05-23': 'Hari Raya Waisak',
  '06-01': 'Hari Lahir Pancasila',
  '06-17': 'Hari Raya Idul Adha',
  '07-07': 'Tahun Baru Islam (1 Muharram)',
  '08-17': 'Hari Kemerdekaan RI (HUT RI)',
  '09-16': 'Maulid Nabi Muhammad SAW',
  '12-25': 'Hari Raya Natal',
  '12-26': 'Cuti Bersama Natal',
};

/**
 * Mendapatkan informasi tarif berdasarkan tanggal:
 * - Hari biasa (Senin - Jumat): Rp 8.000 / jam
 * - Sabtu & Minggu: Rp 10.000 / jam
 * - Tanggal Merah / Libur Nasional: Rp 10.000 / jam
 */
export const getDateRateInfo = (dateStr: string): DateRateInfo => {
  if (!dateStr) {
    return {
      date: dateStr,
      isWeekend: false,
      isHoliday: false,
      category: 'weekday',
      ratePerHour: 8000,
      label: 'Hari Biasa (Weekday)',
      description: 'Tarif hemat hari kerja',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-200',
    };
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu

  // Cek apakah tanggal merah / libur nasional
  const mmDd = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const holidayName = INDONESIAN_HOLIDAYS[mmDd];
  const isHoliday = !!holidayName;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isHoliday) {
    return {
      date: dateStr,
      isWeekend,
      isHoliday: true,
      holidayName,
      category: 'holiday',
      ratePerHour: 10000,
      label: `Tanggal Merah (${holidayName})`,
      description: 'Tarif hari libur nasional: Rp 10.000 /jam',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-800',
      badgeBorder: 'border-rose-200',
    };
  }

  if (isWeekend) {
    const weekendDayName = dayOfWeek === 0 ? 'Minggu' : 'Sabtu';
    return {
      date: dateStr,
      isWeekend: true,
      isHoliday: false,
      category: 'weekend',
      ratePerHour: 10000,
      label: `Akhir Pekan (${weekendDayName})`,
      description: 'Tarif weekend: Rp 10.000 /jam',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200',
    };
  }

  // Hari biasa (Senin - Jumat)
  const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(dateObj);
  return {
    date: dateStr,
    isWeekend: false,
    isHoliday: false,
    category: 'weekday',
    ratePerHour: 8000,
    label: `Hari Biasa (${dayName})`,
    description: 'Tarif weekday promo: Rp 8.000 /jam',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
  };
};

/**
 * Hitung tarif total rental berdasarkan tanggal & durasi jam
 */
export const calculateRentalPrice = (
  dateStr: string,
  durationHours: number
): {
  ratePerHour: number;
  totalPrice: number;
  rateInfo: DateRateInfo;
} => {
  const rateInfo = getDateRateInfo(dateStr);
  const totalPrice = rateInfo.ratePerHour * durationHours;
  return {
    ratePerHour: rateInfo.ratePerHour,
    totalPrice,
    rateInfo,
  };
};

export interface LateFeeCalculation {
  scheduledDate: string;
  scheduledEndTime: string;
  actualReturnDate: string;
  actualReturnTime: string;
  diffMinutes: number;
  lateMinutes: number;
  isLate: boolean;
  fullHours: number;
  remMinutes: number;
  extraHours: number; // 0, 0.5, 1, 1.5, 2, ...
  ratePerHour: number;
  lateFee: number;
  ruleApplied: string;
  breakdownText: string;
}

/**
 * Perhitungan denda keterlambatan pengembalian sepeda:
 * Aturan sesuai kebutuhan:
 * - di bawah 15 mnt itungan ke sejam sebelumnya (fullHours + 0 jam)
 * - di atas 15 menit itungan setengah jam (fullHours + 0.5 jam)
 * - di atas 30 mnt itungannya ke jam berikutnya (fullHours + 1.0 jam)
 */
export const calculateLateFee = (
  scheduledDate: string,
  scheduledEndTime: string,
  actualReturnDate: string,
  actualReturnTime: string,
  ratePerHour: number
): LateFeeCalculation => {
  if (!scheduledDate || !scheduledEndTime || !actualReturnDate || !actualReturnTime) {
    return {
      scheduledDate,
      scheduledEndTime,
      actualReturnDate,
      actualReturnTime,
      diffMinutes: 0,
      lateMinutes: 0,
      isLate: false,
      fullHours: 0,
      remMinutes: 0,
      extraHours: 0,
      ratePerHour,
      lateFee: 0,
      ruleApplied: 'Data waktu belum lengkap',
      breakdownText: 'Silakan isi jam kepulangan.',
    };
  }

  const scheduledDateTime = new Date(`${scheduledDate}T${scheduledEndTime}:00`);
  const actualDateTime = new Date(`${actualReturnDate}T${actualReturnTime}:00`);

  const diffMs = actualDateTime.getTime() - scheduledDateTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes <= 0) {
    return {
      scheduledDate,
      scheduledEndTime,
      actualReturnDate,
      actualReturnTime,
      diffMinutes,
      lateMinutes: 0,
      isLate: false,
      fullHours: 0,
      remMinutes: 0,
      extraHours: 0,
      ratePerHour,
      lateFee: 0,
      ruleApplied: 'Tepat Waktu / Lebih Awal',
      breakdownText: 'Sepeda dikembalikan tepat waktu atau sebelum jadwal berakhir. Tidak ada biaya tambahan.',
    };
  }

  const fullHours = Math.floor(diffMinutes / 60);
  const remMinutes = diffMinutes % 60;
  let extraHours = fullHours;
  let ruleApplied = '';

  if (remMinutes === 0) {
    ruleApplied = `Tepat ${fullHours} jam keterlambatan`;
  } else if (remMinutes < 15) {
    // di bawah 15 mnt itungan ke sejam sebelumnya
    extraHours = fullHours + 0;
    ruleApplied = `Sisa ${remMinutes} menit (< 15 menit): dibulatkan ke sejam sebelumnya (+0 jam)`;
  } else if (remMinutes <= 30) {
    // di atas 15 menit itungan setengah jam
    extraHours = fullHours + 0.5;
    ruleApplied = `Sisa ${remMinutes} menit (15 - 30 menit): dihitung setengah jam (+0.5 jam)`;
  } else {
    // di atas 30 mnt itungannya ke jam berikutnya
    extraHours = fullHours + 1.0;
    ruleApplied = `Sisa ${remMinutes} menit (> 30 menit): dihitung ke jam berikutnya (+1 jam)`;
  }

  const lateFee = Math.round(extraHours * ratePerHour);

  let breakdownText = '';
  if (extraHours === 0) {
    breakdownText = `Terlambat ${diffMinutes} menit (< 15 menit batas toleransi). Bebas denda tambahan (Rp 0).`;
  } else {
    breakdownText = `Terlambat ${diffMinutes} menit. Dihitung biaya tambahan ${extraHours} jam × Rp ${ratePerHour.toLocaleString('id-ID')} = Rp ${lateFee.toLocaleString('id-ID')}.`;
  }

  return {
    scheduledDate,
    scheduledEndTime,
    actualReturnDate,
    actualReturnTime,
    diffMinutes,
    lateMinutes: diffMinutes,
    isLate: true,
    fullHours,
    remMinutes,
    extraHours,
    ratePerHour,
    lateFee,
    ruleApplied,
    breakdownText,
  };
};
