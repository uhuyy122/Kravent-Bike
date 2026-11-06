export type UserRole = 'admin' | 'karyawan' | 'customer';

export type BikeCategory = 'commuter' | 'mtb';

export type BikeStatus = 'tersedia' | 'disewa' | 'maintenance';

export interface Bike {
  id: string;
  name: string;
  brand: string;
  category: BikeCategory;
  frameSize: string; // e.g. "Size M (165-178cm)"
  color: string;
  pricePerHour: number;
  pricePerDay: number;
  imageUrl: string;
  description: string;
  gearSystem: string; // e.g. "Shimano Sora 2x9 Speed"
  status: BikeStatus;
  licenseNumber: string; // Kode unit / nomor sepeda, e.g. "KB-01"
  totalRentedCount: number;
  depositRequired: number;
}

// Flow: pending (menunggu persetujuan) -> booking (ACC) -> sedang di luar (waktu mulai aktual) -> selesai (waktu kembali & biaya dihitung).
// 'aktif' tetap didukung untuk data lama.
export type BookingStatus = 'pending' | 'booking' | 'sedang di luar' | 'aktif' | 'selesai' | 'dibatalkan';
export type PaymentMethod = 'bayar_nanti' | 'cash' | 'qris' | 'transfer' | 'debit';

export interface BookingAddonItem {
  id: string; // 'helm' | 'tripod' | 'holder_hp' | 'gembok' | 'mineral_water' | 'boncengan_bayi'
  name: string;
  price: number; // Sekali sewa per unit sepeda
  quantity: number;
}

export interface Booking {
  id: string;
  bookingCode: string; // e.g. "BOK-2610-001"
  bikeId: string;
  bikeName: string;
  bikeImage: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  idCardNumber?: string; // NIK / KTP
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm (06:00 untuk Pagi, 13:00 untuk Siang)
  endDate: string; // YYYY-MM-DD; initially startDate, updated on return
  endTime: string; // HH:mm; empty until the bike is returned
  durationType?: 'sesi' | 'jam' | 'hari';
  durationValue?: number; // Actual elapsed rental hours, calculated at return
  bookingSession?: 'pagi' | 'siang'; // Sesi Pagi (06:00 - 12:00) atau Sesi Siang (13:00 - 21:00)
  totalPrice: number;
  depositAmount: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'lunas' | 'belum_lunas';
  notes?: string;
  createdAt: string; // ISO date string
  returnedAt?: string;
  actualStartDate?: string; // YYYY-MM-DD, captured when staff starts the rental
  actualStartTime?: string; // HH:mm, captured when staff starts the rental
  handoverBy?: string; // nama staf/admin yang menyerahkan
  // Catatan Pembayaran saat Terima Kembali (Revisi Poin 10)
  paymentNotes?: string;
  feePaymentMethod?: string;
  // Riwayat Tukar Unit Persepeda (Revisi Poin 4)
  swappedFromBikeId?: string;
  swappedFromBikeName?: string;
  swappedAt?: string;
  // Fitur Jam Kepulangan & Biaya Tambahan Keterlambatan
  actualReturnDate?: string; // YYYY-MM-DD
  actualReturnTime?: string; // HH:mm
  lateMinutes?: number; // total menit keterlambatan
  lateExtraHours?: number; // jam tambahan yang dihitung (0, 0.5, 1, 1.5, dll)
  lateFee?: number; // nominal denda keterlambatan (Rp)
  finalTotalPrice?: number; // Total tagihan setelah addon, denda, dan diskon
  returnNotes?: string; // catatan kondisi sepeda saat dikembalikan
  paymentNotes?: string; // catatan pembayaran khusus (cash / qris / transfer dalam satu nama)
  discountPercent?: number; // diskon persentase yang dipakai saat pengembalian
  discountNominal?: number; // potongan nominal yang dipakai saat pengembalian
  groupBookingCode?: string; // e.g. "GRP-2610-123" for group rentals
  groupItemIndex?: number; // 1, 2, 3...
  groupItemTotal?: number; // total units in this group booking
  // Addons opsional yang ditagihkan pada unit sepeda ini
  addons?: BookingAddonItem[];
  addonTotalCost?: number;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export type ExpenseCategory = 'mentenest' | 'konten' | 'pengeluaran';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description?: string;
  bikeId?: string; // opsional, jika terkait sepeda tertentu
  receiptProof?: string;
}

export interface FinancialSettings {
  monthlyCapitalByMonth?: Record<string, number>;
  partner1Name: string;
  partner1Percentage: number; // e.g. 60
  partner2Name: string;
  partner2Percentage: number; // e.g. 40
  maintenanceBudgetPercentage: number; // e.g. 15% dari omset dialokasikan ke pos maintenance
  maintenanceBudgetNominal?: number; // override nominal untuk maintenance, jika diisi akan dipakai sebagai nilai tetap
  maintenanceMode?: 'percentage' | 'nominal'; // mode aktif perhitungan maintenance
  contentBudgetAmount: number; // Nominal uang (Rp) untuk Gaji Konten Kreator & Budget Ads
  contentBudgetPercentage?: number; // Opsional kompatibilitas jika dibutuhkan
  operationalBudgetPercentage: number; // e.g. 15% dari omset dialokasikan ke operasional
  calculationMode: 'percentage_from_gross' | 'actual_expense_deduction'; // apakah bagi hasil dihitung dari omset bersih setelah pengeluaran riil atau potongan pos persentase
}
