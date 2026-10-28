import { AdminService } from './admin.service';
import { GlobalSetting } from './entities/global-setting.entity';
import { CompanyProfile } from '../companies/entities/company-profile.entity';

function setup() {
  const setting = { key: 'min_credit_threshold', value: '5.00', description: 'Umbral mínimo' };
  const settingsRepo: any = {
    findOne: jest.fn().mockResolvedValue(setting),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const updateQuery = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 3 }),
  };
  const manager = {
    getRepository: jest.fn(() => settingsRepo),
    createQueryBuilder: jest.fn(() => updateQuery),
  };
  settingsRepo.manager = {
    transaction: jest.fn((callback: (value: typeof manager) => unknown) => callback(manager)),
  };
  const service = new AdminService(
    settingsRepo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, settingsRepo, manager, updateQuery, setting };
}

describe('Admin configuration effects', () => {
  it('updates the global credit threshold and existing company profiles in one transaction', async () => {
    const { service, settingsRepo, updateQuery, setting } = setup();
    await service.set('min_credit_threshold', '12.5');

    expect(settingsRepo.manager.transaction).toHaveBeenCalledTimes(1);
    expect(setting.value).toBe('12.50');
    expect(updateQuery.update).toHaveBeenCalledWith(CompanyProfile);
    expect(updateQuery.set).toHaveBeenCalledWith({ umbral_creditos: 12.5 });
    expect(updateQuery.execute).toHaveBeenCalledTimes(1);
  });

  it.each(['-1', 'abc', '1.234', '101'])('rejects invalid economic values: %s', async (value) => {
    const { service } = setup();
    await expect(service.set('platform_commission_pct', value)).rejects.toThrow();
  });

  it('rejects keys without a connected platform effect', async () => {
    const { service } = setup();
    await expect(service.set('unused_key', '2')).rejects.toThrow('no está habilitado');
  });
});
