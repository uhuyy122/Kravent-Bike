import { Booking } from '../types';

export const getBookingTotalPrice = (
  booking: Pick<Booking, 'finalTotalPrice' | 'totalPrice' | 'lateFee' | 'addonTotalCost' | 'addons'>
): number => {
  if (booking.finalTotalPrice !== undefined) return booking.finalTotalPrice;

  const addonTotal =
    booking.addonTotalCost ??
    booking.addons?.reduce((sum, addon) => sum + addon.price * addon.quantity, 0) ??
    0;

  return booking.totalPrice + addonTotal + (booking.lateFee || 0);
};
