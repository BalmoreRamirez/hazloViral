const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

export function getAllowedCorsOrigins(): string[] {
  const configuredOrigins = process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL;
  const origins = configuredOrigins
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins?.length ? origins : DEFAULT_CORS_ORIGINS;
}
