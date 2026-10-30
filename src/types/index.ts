export type UserRole = 'admin' | 'karyawan' | 'customer';

export type BikeCategory = 'road' | 'mtb' | 'folding' | 'ebike' | 'city';

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
  licenseNumber: string; // Kode unit / nomor sepeda, e.g. "GWS-001"
  totalRentedCount: number;
  depositRequired: number;
}

export type BookingStatus = 'pending' | 'aktif' | 'selesai' | 'dibatalkan';
export type PaymentMethod = 'bayar_nanti' | 'cash' | 'qris' | 'transfer';

export interface BookingAddonItem {
  id: string; // 'helm' | 'tripod' | 'holder_hp' | 'gembok' | 'mineral_water' | 'boncengan_bayi'
  name: string;
  price: number; // Sekali sewa (flat per transaksi peminjaman)
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
  startTime: string; // HH:mm
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:mm
  durationType: 'jam' | 'hari';
  durationValue: number;
  totalPrice: number;
  depositAmount: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'lunas' | 'belum_lunas';
  notes?: string;
  createdAt: string; // ISO date string
  returnedAt?: string;
  handoverBy?: string; // nama staf/admin yang menyerahkan
  // Fitur Jam Kepulangan & Biaya Tambahan Keterlambatan
  actualReturnDate?: string; // YYYY-MM-DD
  actualReturnTime?: string; // HH:mm
  lateMinutes?: number; // total menit keterlambatan
  lateExtraHours?: number; // jam tambahan yang dihitung (0, 0.5, 1, 1.5, dll)
  lateFee?: number; // nominal denda keterlambatan (Rp)
  finalTotalPrice?: number; // totalPrice + lateFee
  returnNotes?: string; // catatan kondisi sepeda saat dikembalikan
  groupBookingCode?: string; // e.g. "GRP-2610-123" for group rentals
  groupItemIndex?: number; // 1, 2, 3...
  groupItemTotal?: number; // total units in this group booking
  // Revisi Owner: Addons opsional (harga sekali sewa) & Alur ACC
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
  partner1Name: string;
  partner1Percentage: number; // e.g. 60
  partner2Name: string;
  partner2Percentage: number; // e.g. 40
  maintenanceBudgetPercentage: number; // e.g. 15% dari omset dialokasikan ke pos maintenance
  contentBudgetAmount: number; // Nominal uang (Rp) untuk Gaji Konten Kreator & Budget Ads
  contentBudgetPercentage?: number; // Opsional kompatibilitas jika dibutuhkan
  operationalBudgetPercentage: number; // e.g. 15% dari omset dialokasikan ke operasional
  calculationMode: 'percentage_from_gross' | 'actual_expense_deduction'; // apakah bagi hasil dihitung dari omset bersih setelah pengeluaran riil atau potongan pos persentase
}
