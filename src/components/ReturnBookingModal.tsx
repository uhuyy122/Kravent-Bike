import React, { useMemo, useState } from 'react';
import {
  Bike as BikeIcon,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react';
import { Booking } from '../types';
import { useApp } from '../context/AppContext';
import { formatDateIndo, formatRupiah } from '../utils/formatters';
import { calculateRentalCharge, getDateRateInfo } from '../utils/pricingUtils';
import { getCurrentTimeStr, getTodayDateStr } from '../utils/scheduleUtils';
import { getBookingAddonTotal } from '../utils/bookingUtils';

interface ReturnBookingModalProps {
  booking?: Booking;
  bookings?: Booking[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReturnBookingModal: React.FC<ReturnBookingModalProps> = ({
  booking,
  bookings,
  onClose,
  onSuccess,
}) => {
  const { updateBookingStatus, currentRole } = useApp();

  const items = useMemo(() => {
    if (bookings && bookings.length > 0) return bookings;
    if (booking) return [booking];
    return [];
  }, [booking, bookings]);

  if (!items.length) return null;

  const primaryBooking = items[0];
  const todayStr = getTodayDateStr();
  const currentTimeStr = getCurrentTimeStr();

  const [returnDate, setReturnDate] = useState(primaryBooking.actualReturnDate || todayStr);
  const [returnTime, setReturnTime] = useState(primaryBooking.actualReturnTime || currentTimeStr);
  const [returnNotes, setReturnNotes] = useState(
    primaryBooking.returnNotes || 'Unit sepeda kembali dalam kondisi baik dan lengkap (helm & kunci gembok).'
  );
  const [paymentNotes, setPaymentNotes] = useState(primaryBooking.paymentNotes || '');
  const [feePaymentMethod, setFeePaymentMethod] = useState<'cash' | 'qris' | 'transfer'>(
    primaryBooking.paymentMethod === 'qris'
      ? 'qris'
      : primaryBooking.paymentMethod === 'transfer'
        ? 'transfer'
        : 'cash'
  );
  const [discountMode, setDiscountMode] = useState<'percent' | 'nominal'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${remainingMinutes} menit`;
    if (remainingMinutes === 0) return `${hours} jam`;
    return `${hours} jam ${remainingMinutes} menit`;
  };

  const formatBilledDuration = (hours: number) => {
    const fullHours = Math.floor(hours);
    return hours % 1 === 0.5 ? `${fullHours} jam 30 menit` : `${fullHours} jam`;
  };

  const itemRentalDetails = useMemo(
    () =>
      items.map(item => {
        const rentalStartDate = item.actualStartDate || item.startDate;
        const rentalStartTime = item.actualStartTime || item.startTime;
        const ratePerHour = getDateRateInfo(rentalStartDate).ratePerHour;
        const charge = calculateRentalCharge(
          rentalStartDate,
          rentalStartTime,
          returnDate,
          returnTime,
          ratePerHour
        );
        const { durationMinutes, durationHours, billedDurationHours } = charge;
        const rentalCost = charge.totalPrice;
        const addonTotal = getBookingAddonTotal(item);
        const baseTotal = rentalCost + addonTotal;

        return {
          item,
          durationMinutes,
          hasInvalidTime: !charge.isValid,
          durationHours,
          billedDurationHours,
          ratePerHour,
          rentalCost,
          addonTotal,
          baseTotal,
          grossTotal: baseTotal,
        };
      }),
    [items, returnDate, returnTime]
  );

  const hasInvalidReturnTime = itemRentalDetails.some(entry => entry.hasInvalidTime);
  const grossTotal = itemRentalDetails.reduce((sum, entry) => sum + entry.grossTotal, 0);

  const discountAmount = useMemo(() => {
    if (!discountValue) return 0;
    if (discountMode === 'percent') {
      return Math.round(grossTotal * (discountValue / 100));
    }
    return Math.round(Math.min(discountValue, grossTotal));
  }, [discountMode, discountValue, grossTotal]);

  const distributedTotals = useMemo(() => {
    if (grossTotal === 0) {
      return itemRentalDetails.map(() => 0);
    }

    return itemRentalDetails.map(entry => {
      const share = entry.grossTotal / grossTotal;
      return Math.round(Math.max(0, entry.grossTotal - discountAmount * share));
    });
  }, [discountAmount, grossTotal, itemRentalDetails]);

  const finalTotal = distributedTotals.reduce((sum, value) => sum + value, 0);
  const rentalTotal = itemRentalDetails.reduce((sum, entry) => sum + entry.rentalCost, 0);
  const addonTotal = itemRentalDetails.reduce((sum, entry) => sum + entry.addonTotal, 0);

  const handleConfirmReturn = () => {
    if (hasInvalidReturnTime) {
      alert('Waktu pengembalian tidak boleh lebih awal dari waktu mulai sewa.');
      return;
    }

    const returnIso = `${returnDate}T${returnTime}:00`;

    items.forEach((item, index) => {
      const rental = itemRentalDetails[index];
      const finalItemTotal = distributedTotals[index] || 0;

      updateBookingStatus(item.id, 'selesai', {
        returnedAt: returnIso,
        actualReturnDate: returnDate,
        actualReturnTime: returnTime,
        endDate: returnDate,
        endTime: returnTime,
        durationType: 'jam',
        durationValue: rental.durationHours,
        totalPrice: rental.rentalCost,
        lateMinutes: 0,
        lateExtraHours: 0,
        lateFee: 0,
        finalTotalPrice: finalItemTotal,
        returnNotes,
        paymentNotes,
        discountPercent: discountMode === 'percent' ? discountValue : 0,
        discountNominal: discountMode === 'nominal' ? discountValue : 0,
        handoverBy: currentRole === 'admin' ? 'Admin Kravent Bike' : 'Karyawan Shift',
        paymentMethod: feePaymentMethod,
        paymentStatus: 'lunas',
      });
    });

    onSuccess?.();
    onClose();
  };

  const generateWaMessage = () => {
    const cleanPhone = primaryBooking.customerPhone.replace(/^0/, '62').replace(/\D/g, '');
    const itemChargeLines = itemRentalDetails.flatMap(({ item, rentalCost }) => [
      `• Sepeda ${item.bikeName}: ${formatRupiah(rentalCost)}`,
      ...(item.addons || []).map(
        addon => `  - ${addon.name} (${addon.quantity} x ${formatRupiah(addon.price)}) = ${formatRupiah(addon.price * addon.quantity)}`
      ),
      ...(!item.addons?.length && getBookingAddonTotal(item) > 0
        ? [`  - Perlengkapan tambahan: ${formatRupiah(getBookingAddonTotal(item))}`]
        : []),
    ]);

    const message = [
      '*STRUK PENGEMBALIAN SEPEDA - KRAVENT BIKE*',
      '-----------------------------------',
      `Penyewa: *${primaryBooking.customerName}*`,
      `No. Booking: *${items.map(item => item.bookingCode).join(', ')}*`,
      `Jam Kepulangan: *${returnTime} WIB* (${formatDateIndo(returnDate)})`,
      '-----------------------------------',
      '*Rincian Transaksi:*',
      ...itemChargeLines,
      `Subtotal sewa sepeda: ${formatRupiah(rentalTotal)}`,
      `Total perlengkapan tambahan: ${formatRupiah(addonTotal)}`,
      `Subtotal transaksi: ${formatRupiah(grossTotal)}`,
      ...(discountAmount > 0
        ? [`Diskon: ${discountMode === 'percent' ? `${discountValue}%` : formatRupiah(discountAmount)} (-${formatRupiah(discountAmount)})`]
        : []),
      `*Total akhir: ${formatRupiah(finalTotal)}*`,
      `Metode Pembayaran: *${feePaymentMethod.toUpperCase()}*`,
      ...(paymentNotes ? [`Catatan Bayar: ${paymentNotes}`] : []),
      `Catatan Kondisi: ${returnNotes}`,
      '-----------------------------------',
      'Terima kasih telah menyewa di Kravent Bike! CS: 0896-4712-3671',
    ].join('\n');

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[95vh]">
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white">
                  {items.length > 1 ? 'Kembalikan Semua Unit' : 'Serah Terima Pengembalian Sepeda'}
                </h2>
                {items.length > 1 && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {items.length} Unit
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {items.length > 1
                  ? 'Akumulasi semua unit atas nama yang sama dalam satu proses pengembalian.'
                  : 'Catat jam kepulangan sepeda dan hitung otomatis biaya keterlambatan.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center border border-emerald-200">
                <BikeIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base text-slate-900 truncate">{primaryBooking.customerName}</h3>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{primaryBooking.customerPhone}</span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Akumulasi</div>
              <div className="text-xl font-extrabold text-slate-900">{formatRupiah(finalTotal)}</div>
            </div>
          </div>

          {items.length > 1 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Daftar Unit</div>
              <div className="space-y-2">
                {itemRentalDetails.map(({ item, rentalCost, addonTotal: itemAddonTotal }, index) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white border border-slate-200 px-2.5 py-2 text-[10px] text-slate-700"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800">{item.bikeName}</span>
                      <span className="font-extrabold text-emerald-700">{formatRupiah(distributedTotals[index] || 0)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                      <span>Sewa</span>
                      <span>{formatRupiah(rentalCost)}</span>
                    </div>
                    {item.addons?.length ? (
                      item.addons.map(addon => (
                        <div key={`${item.id}-${addon.id}`} className="flex justify-between text-[10px] text-slate-500">
                          <span>{addon.name}</span>
                          <span>{formatRupiah(addon.price * addon.quantity)}</span>
                        </div>
                      ))
                    ) : itemAddonTotal > 0 ? (
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Tambahan</span>
                        <span>{formatRupiah(itemAddonTotal)}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-[11px] font-semibold text-slate-700 mb-1">Tanggal Kepulangan</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 sm:py-2 text-base sm:text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-[11px] font-semibold text-slate-700 mb-1">Jam Kepulangan</label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="time"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 sm:py-2 text-base sm:text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500 shadow-2xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-semibold text-slate-500 mr-1">Pintasan:</span>
            <button
              type="button"
              onClick={() => {
                setReturnDate(todayStr);
                setReturnTime(currentTimeStr);
              }}
              className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 transition-colors"
            >
              Jam Sekarang ({currentTimeStr})
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 bg-white space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-500" />
                Rincian Biaya Sewa
              </h4>
              <span className="text-[10px] text-slate-500 font-semibold">
                {items.length > 1 ? `${items.length} unit` : '1 unit'}
              </span>
            </div>

            <div className="space-y-2">
              {itemRentalDetails.map(({ item, durationMinutes, billedDurationHours, hasInvalidTime, ratePerHour, rentalCost, addonTotal: itemAddonTotal, baseTotal }, index) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-slate-800 text-[11px]">{item.bikeName}</div>
                    <div className="font-extrabold text-slate-900 text-[11px]">{formatRupiah(distributedTotals[index] || 0)}</div>
                  </div>

                  <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                    <span>Durasi Aktual</span>
                    <span>{hasInvalidTime ? 'Waktu tidak valid' : formatDuration(durationMinutes)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Durasi Ditagihkan</span>
                    <span>{hasInvalidTime ? 'Waktu tidak valid' : formatBilledDuration(billedDurationHours)}</span>
                  </div>

                  <div className="mt-1 border-t border-dashed border-slate-200 pt-2 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Sewa ({formatRupiah(ratePerHour)}/jam)</span>
                      <span>{formatRupiah(rentalCost)}</span>
                    </div>

                    {item.addons?.length ? (
                      item.addons.map(addon => (
                        <div key={`${item.id}-${addon.id}`} className="flex justify-between text-[10px] text-slate-500">
                          <span>{addon.name} ({addon.quantity} x {formatRupiah(addon.price)})</span>
                          <span>{formatRupiah(addon.price * addon.quantity)}</span>
                        </div>
                      ))
                    ) : itemAddonTotal > 0 ? (
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Perlengkapan tambahan</span>
                        <span>{formatRupiah(itemAddonTotal)}</span>
                      </div>
                    ) : null}

                    <div className="flex justify-between text-[10px] font-bold text-slate-700 pt-1 border-t border-slate-200 mt-1">
                      <span>Subtotal {item.bikeName}</span>
                      <span>{formatRupiah(baseTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hasInvalidReturnTime && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              Waktu pengembalian tidak boleh lebih awal dari waktu mulai sewa.
            </p>
          )}

          <div className="space-y-4 rounded-2xl border border-slate-200 p-4 bg-slate-50">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wide">Catatan Pembayaran & Diskon</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                <select
                  value={feePaymentMethod}
                  onChange={e => setFeePaymentMethod(e.target.value as 'cash' | 'qris' | 'transfer')}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-emerald-500"
                >
                  <option value="cash">Tunai</option>
                  <option value="qris">QRIS</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mode Diskon</label>
                <select
                  value={discountMode}
                  onChange={e => setDiscountMode(e.target.value as 'percent' | 'nominal')}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold bg-white focus:outline-emerald-500"
                >
                  <option value="percent">Persen (%)</option>
                  <option value="nominal">Nominal (Rp)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {discountMode === 'percent' ? 'Diskon Persen' : 'Diskon Nominal'}
              </label>
              <input
                type="number"
                min="0"
                step={discountMode === 'percent' ? '1' : '1000'}
                value={discountValue}
                onChange={e => setDiscountValue(Number(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold bg-white focus:outline-emerald-500"
                placeholder={discountMode === 'percent' ? 'Contoh: 10 untuk 10%' : 'Contoh: 20000'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Pembayaran</label>
              <textarea
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                rows={3}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-emerald-500 resize-none"
                placeholder="Contoh: customer membayar kombinasi QRIS dan tunai dalam satu nama"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Kondisi Unit</label>
              <textarea
                value={returnNotes}
                onChange={e => setReturnNotes(e.target.value)}
                rows={3}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-emerald-500 resize-none"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Total Final</span>
                <div className="text-2xl font-black text-emerald-800">{formatRupiah(finalTotal)}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Diskon</span>
                <div className="text-lg font-extrabold text-emerald-700">-{formatRupiah(discountAmount)}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.open(generateWaMessage(), '_blank')}
              className="flex-1 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-colors"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Kirim WA
              </span>
            </button>
            <button
              type="button"
              onClick={handleConfirmReturn}
              disabled={hasInvalidReturnTime}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm transition-colors shadow-lg shadow-emerald-600/20"
            >
              Konfirmasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
