import { of, firstValueFrom } from 'rxjs';
import { InfluencerPrivacyInterceptor } from './influencer-privacy.interceptor';
import { containsContact, hideContactText, protectInfluencerContact } from './influencer-privacy';

const profile = {
  id: 2, user_id: 9, nombre_artistico: 'Creador', username: 'social_handle', bio: 'Escribe a private@example.com',
  direccion: 'Calle privada', fecha_nacimiento: '2000-01-01', numero_identificacion: '12345678',
  banco_cuenta_numero: '123456', tutor_email: 'tutor@example.com', future_private_field: 'secret', is_verified: true,
  user: { id: 9, email: 'private@example.com', role: 'influencer', avatar_url: '/api/uploads/avatar/a.jpg', stripe_connect_id: 'secret' },
  metrics: [{ id: 1, red_social: 'Instagram', username: 'social_handle', seguidores: 1200, engagement_rate: 2, is_verified: true }],
};
describe('Influencer contact privacy', () => {
  it('uses allowlists for profiles and nested social metrics without mutating persisted entities', () => {
    const result = protectInfluencerContact({ data: [profile] }, 4).data[0];
    expect(result).toMatchObject({ id: 2, is_verified: true, user: { id: 9, avatar_url: profile.user.avatar_url }, metrics: [{ seguidores: 1200 }] });
    for (const field of ['username', 'direccion', 'banco_cuenta_numero', 'tutor_email', 'future_private_field', 'fecha_nacimiento']) expect(result).not.toHaveProperty(field);
    expect(result.user).not.toHaveProperty('email');
    expect(result.metrics[0]).not.toHaveProperty('username');
    expect(result.bio).not.toContain('private@example.com');
    expect(profile.user.email).toBe('private@example.com');
  });
  it('protects historical messages and websocket sender relations', () => {
    const result = protectInfluencerContact({ sender: profile.user, message_text: 'Llámame al +503 7777-8888' });
    expect(result.sender).toEqual({ id: 9, role: 'influencer', avatar_url: profile.user.avatar_url });
    expect(result.message_text).not.toContain('7777');
  });
  it.each(['hola@example.com', '+503 7777-8888', '7777-8888', 'https://wa.me/50377778888', 'https://instagram.com/creator', 'Mi usuario es @creator'])('detects contact: %s', text => {
    expect(containsContact(text)).toBe(true);
  });
  it.each(['El presupuesto es $100.00', 'Contrato #2, fecha 2026-10-28', 'Entregar 3 videos', 'https://drive.google.com/file/d/abc'])('retains ordinary negotiation content: %s', text => {
    expect(hideContactText(text)).toBe(text);
  });
  it('preserves the company account email and strips influencer payout snapshot contact and DTE link', () => {
    expect(protectInfluencerContact({ id: 4, role: 'empresa', email: 'own@example.com' }, 4).email).toBe('own@example.com');
    expect(protectInfluencerContact({ operation_type: 'influencer_payout', customer_snapshot: { name: 'Creador', email: 'private@example.com', document: '123' }, dte: { pdf_url: '/private.pdf' } }, 4)).toMatchObject({ customer_snapshot: { name: 'Creador' }, dte: null });
  });
  it('applies the HTTP policy only to companies, preserving own-profile and admin workflows', async () => {
    const interceptor = new InfluencerPrivacyInterceptor();
    for (const role of ['empresa', 'influencer', 'admin']) {
      const context = { getType: () => 'http', switchToHttp: () => ({ getRequest: () => ({ user: { id: 4, role } }) }) };
      const result = await firstValueFrom(interceptor.intercept(context as any, { handle: () => of(profile) }));
      expect(!!result.user.email).toBe(role !== 'empresa');
    }
  });
});
