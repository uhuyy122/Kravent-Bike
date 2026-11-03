import { Booking, BookingAddonItem } from '../types';

export interface BookingAddonSummary extends BookingAddonItem {
  totalPrice: number;
}

export const getBookingAddonSummary = (
  bookings: Pick<Booking, 'addons'>[]
): BookingAddonSummary[] => {
  const addons = new Map<string, BookingAddonSummary>();

  bookings.forEach(booking => {
    booking.addons?.forEach(addon => {
      const key = `${addon.id}:${addon.price}`;
      const existing = addons.get(key);
      if (existing) {
        existing.quantity += addon.quantity;
        existing.totalPrice += addon.price * addon.quantity;
      } else {
        addons.set(key, {
          ...addon,
          totalPrice: addon.price * addon.quantity,
        });
      }
    });
  });

  return Array.from(addons.values());
};

export const getBookingAddonTotal = (
  booking: Pick<Booking, 'addonTotalCost' | 'addons'>
): number => {
  if (booking.addons?.length) {
    return booking.addons.reduce((sum, addon) => sum + addon.price * addon.quantity, 0);
  }
  return booking.addonTotalCost ?? 0;
};

export const getBookingTotalPrice = (
  booking: Pick<Booking, 'finalTotalPrice' | 'totalPrice' | 'lateFee' | 'addonTotalCost' | 'addons'>
): number => {
  if (booking.finalTotalPrice !== undefined) return booking.finalTotalPrice;

  return booking.totalPrice + getBookingAddonTotal(booking) + (booking.lateFee || 0);
};
