import { calculateAge, getLocalDateTime } from './date.util';

describe('Fechas de El Salvador UTC-6', () => {
  it.each([
    ['2026-10-27T18:00:00Z', '2026-10-27', '12:00:00'],
    ['2026-10-28T05:59:59Z', '2026-10-27', '23:59:59'],
    ['2026-10-28T06:00:00Z', '2026-10-28', '00:00:00'],
  ])('convierte %s sin depender de TZ del proceso', (iso, date, time) => {
    expect(getLocalDateTime(new Date(iso))).toEqual({ date, time });
  });
  it('cambia la edad al iniciar el cumpleaños en El Salvador', () => {
    expect(calculateAge('2008-10-27', new Date('2026-10-27T05:59:59Z'))).toBe(17);
    expect(calculateAge('2008-10-27', new Date('2026-10-27T06:00:00Z'))).toBe(18);
  });
});
