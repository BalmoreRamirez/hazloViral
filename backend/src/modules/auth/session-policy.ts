import { ConfigService } from '@nestjs/config';

export const DEFAULT_AUTH_IDLE_TIMEOUT_MS = 30 * 60_000;

export function getAuthIdleTimeoutMs(config: ConfigService): number {
  const value = Number(config.get('AUTH_IDLE_TIMEOUT_MS', DEFAULT_AUTH_IDLE_TIMEOUT_MS));
  return Number.isSafeInteger(value) && value >= 60_000 && value <= 30 * 24 * 60 * 60_000
    ? value
    : DEFAULT_AUTH_IDLE_TIMEOUT_MS;
}
