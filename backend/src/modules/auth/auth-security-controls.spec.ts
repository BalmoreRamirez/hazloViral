import 'reflect-metadata';
import { validateSync } from 'class-validator';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard';
import { IsNotCommonPassword } from './password-policy';
import { AuthService } from './auth.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { User } from '../users/entities/user.entity';
import { createHash } from 'crypto';
import { JwtStrategy } from './strategies/jwt.strategy';
import { getAuthIdleTimeoutMs } from './session-policy';
import { extractSessionCookie } from './strategies/jwt.strategy';

class PasswordDto {
  @IsNotCommonPassword()
  password: string;
}

function requestContext(request: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as any;
}

describe('Authentication security controls', () => {
  it.each(['Password123!', 'Admin123!', 'Qwerty123!'])('rejects a common password variant: %s', password => {
    expect(validateSync(Object.assign(new PasswordDto(), { password }))).toHaveLength(1);
  });

  it('accepts a non-common strong passphrase', () => {
    expect(validateSync(Object.assign(new PasswordDto(), { password: 'VioletStudio2026!' }))).toHaveLength(0);
  });

  it('uses a safe idle timeout default when configuration is invalid', () => {
    expect(getAuthIdleTimeoutMs({ get: () => 'not-a-number' } as any)).toBe(30 * 60_000);
    expect(getAuthIdleTimeoutMs({ get: () => 1000 } as any)).toBe(30 * 60_000);
    expect(getAuthIdleTimeoutMs({ get: () => '3600000' } as any)).toBe(60 * 60_000);
  });

  it('extracts the JWT only from the HttpOnly session cookie', () => {
    expect(extractSessionCookie({ headers: { cookie: 'theme=dark; hv_session=abc%2Edef' } })).toBe('abc.def');
    expect(extractSessionCookie({ headers: { cookie: 'hv_session=%E0%A4%A' } })).toBeNull();
    expect(extractSessionCookie({ headers: { cookie: 'theme=dark' } })).toBeNull();
  });

  it('limits login by both source IP and normalized account and permits other IPs', () => {
    const guard = new AuthRateLimitGuard();
    const request = { method: 'POST', originalUrl: '/api/auth/login', ip: '192.0.2.10', body: { email: 'User@Example.com' } };
    for (let i = 0; i < 10; i++) expect(guard.canActivate(requestContext(request))).toBe(true);
    expect(() => guard.canActivate(requestContext({ ...request, body: { email: 'user@example.com' } }))).toThrow();
    expect(guard.canActivate(requestContext({ ...request, ip: '192.0.2.11', body: { email: 'other@example.com' } }))).toBe(true);
  });

  it('limits public registration attempts by source IP', () => {
    const guard = new AuthRateLimitGuard();
    const request = { method: 'POST', originalUrl: '/api/auth/register/empresa', ip: '192.0.2.20' };
    for (let i = 0; i < 5; i++) expect(guard.canActivate(requestContext(request))).toBe(true);
    expect(() => guard.canActivate(requestContext(request))).toThrow();
  });

  it('consumes a reset token and updates the password and session version in one locked transaction', async () => {
    const record = Object.assign(new PasswordResetToken(), { user_id: 7, expires_at: new Date(Date.now() + 60_000), used: false });
    const queryBuilder = { setLock: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(record) };
    const user = Object.assign(new User(), { id: 7, is_active: true });
    const manager = {
      getRepository: jest.fn(() => ({ createQueryBuilder: () => queryBuilder, findOne: jest.fn().mockResolvedValue(user) })),
      update: jest.fn(), save: jest.fn(async value => value),
    };
    const dataSource = { transaction: jest.fn(callback => callback(manager)) };
    const service = new AuthService({} as any, {} as any, {} as any, {} as any, {} as any, dataSource as any, {} as any, {} as any);
    const token = 'single-use-secret';
    await service.resetPassword(token, 'VioletStudio2026!');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(queryBuilder.where).toHaveBeenCalledWith('token.token_hash = :tokenHash AND token.used = false', {
      tokenHash: createHash('sha256').update(token).digest('hex'),
    });
    expect(manager.update).toHaveBeenCalledWith(User, { id: 7 }, expect.objectContaining({ session_version: expect.any(Function) }));
    expect(record.used).toBe(true);
    expect(manager.save).toHaveBeenCalledWith(record);
  });

  it('never returns a reset token to the caller', async () => {
    const usersRepo = { findOne: jest.fn().mockResolvedValue({ id: 3, email: 'user@example.com' }) };
    const resetTokensRepo = { update: jest.fn(), save: jest.fn() };
    const notifications = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };
    const service = new AuthService(usersRepo as any, resetTokensRepo as any, {} as any, {} as any, {} as any,
      {} as any, notifications as any, { get: (_key, fallback) => fallback } as any);

    const response = await service.forgotPassword('user@example.com');
    expect(response).toEqual({ message: 'Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.' });
    expect(response).not.toHaveProperty('dev_reset_url');
    expect(response).not.toHaveProperty('smtp_error');
  });

  it('rejects idle or revoked JWT sessions and refreshes activity for a valid one', async () => {
    const user = Object.assign(new User(), { id: 5, session_version: 2, last_activity_at: new Date(Date.now() - 31 * 60_000) });
    const update = jest.fn();
    const query = { addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue(user) };
    const repo = { createQueryBuilder: () => query, update };
    const config = { get: (key: string, fallback?: unknown) => key === 'JWT_SECRET' ? 'test-secret' : fallback };
    const strategy = new JwtStrategy(config as any, repo as any);

    await expect(strategy.validate({ sub: 5, email: 'user@example.com', role: 'empresa', session_version: 2 })).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
    user.last_activity_at = new Date();
    await expect(strategy.validate({ sub: 5, email: 'user@example.com', role: 'empresa', session_version: 1 })).rejects.toThrow();
    await expect(strategy.validate({ sub: 5, email: 'user@example.com', role: 'empresa', session_version: 2 })).resolves.toBe(user);
    expect(update).toHaveBeenCalledWith({ id: 5 }, { last_activity_at: expect.any(Date) });
  });
});
