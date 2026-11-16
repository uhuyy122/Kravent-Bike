import { Booking, BookingAddonItem } from '../types';
import { toFiniteNumber } from './formatters';

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
        existing.quantity += toFiniteNumber(addon.quantity);
        existing.totalPrice += toFiniteNumber(addon.price) * toFiniteNumber(addon.quantity);
      } else {
        addons.set(key, {
          ...addon,
          quantity: toFiniteNumber(addon.quantity),
          price: toFiniteNumber(addon.price),
          totalPrice: toFiniteNumber(addon.price) * toFiniteNumber(addon.quantity),
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
    return booking.addons.reduce(
      (sum, addon) => sum + toFiniteNumber(addon.price) * toFiniteNumber(addon.quantity),
      0
    );
  }
  return toFiniteNumber(booking.addonTotalCost);
};

export const getBookingTotalPrice = (
  booking: Pick<Booking, 'finalTotalPrice' | 'totalPrice' | 'lateFee' | 'addonTotalCost' | 'addons'>
): number => {
  if (booking.finalTotalPrice !== undefined) return toFiniteNumber(booking.finalTotalPrice);

  return toFiniteNumber(booking.totalPrice) +
    getBookingAddonTotal(booking) +
    toFiniteNumber(booking.lateFee);
};
