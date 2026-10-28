import 'reflect-metadata';
import { validateSync } from 'class-validator';
import { RegistrationConsentDto } from '../dto/registration-consent.dto';
import { RegisterCompanyDto } from '../dto/register-company.dto';
import { RegisterInfluencerDto } from '../dto/register-influencer.dto';
import { AuthService } from '../auth.service';
import { User } from '../../users/entities/user.entity';

function setup() {
  const manager = { save: jest.fn(async entity => { entity.id = entity.id || 9; return entity; }) };
  const dataSource = { transaction: jest.fn(callback => callback(manager)) };
  const settingsRepo = { findOne: jest.fn(async ({ where }) => ({ value: where.key === 'welcome_bonus' ? '25.00' : '8.00' })) };
  const service = new AuthService(
    { existsBy: jest.fn().mockResolvedValue(false) } as any, {} as any, {} as any, settingsRepo as any,
    { sign: () => 'test-token' } as any, dataSource as any, {} as any,
    { get: () => undefined } as any,
  );
  jest.spyOn(service as any, 'sendVerificationEmail').mockResolvedValue(undefined);
  const docs = service.getRegistrationDocuments();
  return { service, manager, dataSource, docs, settingsRepo, consent: { accepted_terms: true, accepted_privacy: true, terms_version: docs.terms.version, privacy_version: docs.privacy.version } };
}
describe('Registration legal consent', () => {
  it.each([undefined, false, 'true', 1])('requires explicit boolean true, rejecting %s', value => {
    for (const Dto of [RegistrationConsentDto, RegisterCompanyDto, RegisterInfluencerDto]) {
      const dto = Object.assign(new Dto(), { accepted_terms: value, accepted_privacy: value, terms_version: 'v1', privacy_version: 'v1' });
      const fields = validateSync(dto).map(error => error.property);
      expect(fields).toContain('accepted_terms');
      expect(fields).toContain('accepted_privacy');
    }
  });
  it.each(['registerEmpresa', 'registerInfluencer'] as const)('rejects bypassed acceptance before writing: %s', async method => {
    const { service, dataSource } = setup();
    await expect(service[method]({ email: 'new@example.com' } as any)).rejects.toThrow('Debes aceptar');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
  it('rejects outdated or fabricated document versions', async () => {
    const { service, consent, dataSource } = setup();
    await expect(service.registerEmpresa({ ...consent, terms_version: 'old' } as any)).rejects.toThrow('han cambiado');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
  it.each(['registerEmpresa', 'registerInfluencer'] as const)('stores the actual documents and server timestamp atomically: %s', async method => {
    const { service, consent, manager, docs } = setup();
    const result = await service[method]({ ...consent, email: 'new@example.com', password: 'Password123!', fecha_nacimiento: '2000-01-01', nombre_comercial: 'Marca', nombre_artistico: 'Creador' } as any);
    const user = manager.save.mock.calls.map(([entity]) => entity).find(entity => entity instanceof User);
    expect(user.registration_consent).toMatchObject({ accepted_terms: true, accepted_privacy: true, source: 'registration', documents: docs });
    expect(Number.isNaN(Date.parse(user.registration_consent.accepted_at))).toBe(false);
    expect(result.user).not.toHaveProperty('registration_consent');
    expect(result.user).not.toHaveProperty('password');
  });
  it('applies the current welcome bonus and credit threshold to new companies', async () => {
    const { service, consent, manager } = setup();
    await service.registerEmpresa({ ...consent, email: 'brand@example.com', password: 'Password123!', nombre_comercial: 'Marca' } as any);
    const profile = manager.save.mock.calls.map(([entity]) => entity).find(entity => entity?.nombre_comercial === 'Marca');
    expect(profile.balance_creditos).toBe(25);
    expect(profile.umbral_creditos).toBe(8);
  });
  it('document versions cover all displayed text including controller identity', () => {
    const { service, docs } = setup();
    expect(service.getRegistrationDocuments()).toEqual(docs);
    expect(docs.privacy.sections[0].text).toContain('admin@yopmail.com');
    expect(docs.terms.sha256).toHaveLength(64);
  });
});
