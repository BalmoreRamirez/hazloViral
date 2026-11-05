# Plan de remediación de autenticación — Kronos

- Origen: `security/reports/authentication/REPORTE-SEGURIDAD-AUTH-2026-11-05-02.md`.
- Inicio: 2026-11-05.
- Regla de cierre: marcar completado solo con cambio revisado y verificación local registrada. La aplicación de migraciones o validación de infraestructura se registra aparte y no se presume.

## Orden de ejecución y estado

| Orden | Hallazgo | Prioridad | Estado | Evidencia / pendiente |
| --- | --- | --- | --- | --- |
| 1 | AUTH-004 — límite de intentos | Alta | **Completado en código** | Guard por IP y, para login/recuperación, cuenta normalizada; 429 y pruebas de límites. Límite en memoria por proceso; conservar límites equivalentes en proxy si se despliega con varias instancias. |
| 2 | AUTH-003 — exposición de enlaces de recuperación | Alta | **Completado** | Respuesta uniforme sin token ni errores SMTP; UI ya no expone enlace; log SMTP no imprime URL. Prueba de contrato de respuesta y búsqueda de referencias. |
| 3 | AUTH-007 — consumo no atómico del token | Alta | **Completado en código** | `FOR UPDATE` dentro de transacción; contraseña, uso del token e invalidación de sesiones se escriben en la misma transacción. Prueba unitaria confirma bloqueo y atomicidad estructural. Pendiente prueba de concurrencia contra PostgreSQL. |
| 4 | AUTH-001 — revocación y expiración de sesión | Alta | **Implementado en código; despliegue pendiente** | JWT viaja en cookie `HttpOnly`, `Secure` configurable y `SameSite`; el cliente no persiste el token y WebSocket usa la cookie. El origen de métodos inseguros se valida contra CORS allowlist. Logout, cambio/reset revocan con `session_version`; inactividad por defecto a 30 minutos en HTTP/WebSocket. La migración no se aplicó a una base autorizada. |
| 5 | AUTH-002 — validación TLS de SMTP | Media | **Completado en código** | Eliminada la opción que aceptaba certificados no confiables. Requiere certificado CA válido en el SMTP configurado; no se probó conexión a un SMTP real. |
| 6 | AUTH-006 — contraseñas comunes | Media | **Completado** | Política backend compartida para registro, cambio y recuperación; bloquea lista local de contraseñas comunes y variantes con separadores. Pruebas de aceptación/rechazo. No consulta servicios externos ni afirma cobertura de contraseñas filtradas completas. |
| 7 | AUTH-005 — enumeración en registro | Media | **Completado para respuestas API** | Email existente, registro nuevo y colisión única responden con el mismo mensaje HTTP; el registro ya no entrega sesión automáticamente. Prueba para correo existente. Los tiempos no se midieron y el envío de verificación solo ocurre al crear cuenta. |

## Cambios incluidos

- `backend/src/modules/auth/`: rate limiting, control de contraseñas, recuperación transaccional, respuestas uniformes, cookies HttpOnly y endpoint de logout.
- `backend/src/modules/users/entities/user.entity.ts` y migración `1793836800000-AddUserSessionVersion.ts`: versión de sesión y actividad reciente.
- `backend/src/modules/chats/chats.gateway.ts`: rechazo de sockets revocados o inactivos.
- `backend/src/modules/notifications/notifications.service.ts`: validación TLS predeterminada y eliminación de enlaces de recuperación en logs.
- `frontend/src/stores/auth.ts`, `frontend/src/api/auth.ts`, `frontend/src/api/index.ts`, `frontend/src/socket/index.ts` y vistas de registro/recuperación: nuevo contrato de registro, sesión cookie con credenciales, logout remoto y sin enlaces de recuperación en pantalla.

## Verificación local

- `cd backend && npm run build` — satisfactorio.
- `cd backend && npm test -- --runInBand` — 14 suites, 96 pruebas satisfactorias.
- `cd frontend && npm run type-check` — satisfactorio.
- `cd frontend && npm test` — 9 pruebas satisfactorias.
- `cd frontend && npm run build` — satisfactorio.
- Migración PostgreSQL, correo SMTP real, navegación manual, prueba de concurrencia y despliegue: **no ejecutados**.

## Pendiente para cerrar el despliegue AUTH-001

1. Aplicar la migración en una base autorizada; esto invalidará tokens anteriores a `session_version`, por lo que los usuarios deberán iniciar sesión de nuevo. Comprobar cierre, inactividad y revocación sobre HTTP y WebSocket.
2. Ejecutar prueba concurrente de consumo del mismo token de recuperación en PostgreSQL.
