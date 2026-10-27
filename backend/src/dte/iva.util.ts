/** Split a development-only, IVA-inclusive USD amount without changing settlement. */
export function splitIncludedIva(amount: number) {
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(cents) || cents < 1) {
    throw new Error('El monto debe ser positivo y expresarse en centavos válidos.');
  }
  const baseCents = Math.round(cents * 100 / 113);
  return { subtotal: baseCents / 100, iva: (cents - baseCents) / 100, total: cents / 100 };
}
