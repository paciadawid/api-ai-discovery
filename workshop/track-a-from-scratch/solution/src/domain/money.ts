/** Money is compared in whole cents so that 3 x 14.15 does not turn into 42.449999. */
export const cents = (price: number) => Math.round(price * 100);
