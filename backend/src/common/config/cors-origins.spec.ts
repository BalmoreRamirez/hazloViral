import { afterEach, describe, expect, it } from '@jest/globals';
import { getAllowedCorsOrigins } from './cors-origins';

const originalCorsOrigins = process.env.CORS_ORIGINS;
const originalFrontendUrl = process.env.FRONTEND_URL;

afterEach(() => {
  if (originalCorsOrigins === undefined) delete process.env.CORS_ORIGINS;
  else process.env.CORS_ORIGINS = originalCorsOrigins;

  if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = originalFrontendUrl;
});

describe('getAllowedCorsOrigins', () => {
  it('lee y normaliza la lista configurada para HTTP y Socket.IO', () => {
    process.env.CORS_ORIGINS = ' https://app.example.com, http://localhost:5173 ';
    process.env.FRONTEND_URL = 'https://fallback.example.com';

    expect(getAllowedCorsOrigins()).toEqual([
      'https://app.example.com',
      'http://localhost:5173',
    ]);
  });

  it('usa FRONTEND_URL cuando no se configuró CORS_ORIGINS', () => {
    delete process.env.CORS_ORIGINS;
    process.env.FRONTEND_URL = 'https://app.example.com';

    expect(getAllowedCorsOrigins()).toEqual(['https://app.example.com']);
  });

  it('conserva los orígenes locales si no hay configuración', () => {
    delete process.env.CORS_ORIGINS;
    delete process.env.FRONTEND_URL;

    expect(getAllowedCorsOrigins()).toEqual([
      'http://localhost:5173',
      'http://localhost:5174',
    ]);
  });
});
