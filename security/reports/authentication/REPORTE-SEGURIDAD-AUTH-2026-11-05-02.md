# Auditoría de seguridad: autenticación

## Alcance y entorno

- **Fecha:** 2026-11-05 (America/El_Salvador, UTC−6).
- **Tipo de revisión:** segunda pasada independiente del mismo checkout; comparación contra `REPORTE-SEGURIDAD-AUTH-2026-11-05.md`.
- **Commit base:** `c48f2156cd6b06b004ab432c5b1ddc75d2822bda`.
- **Entorno:** inspección estática del checkout local y pruebas unitarias existentes con mocks; no se enviaron solicitudes HTTP ni correos, ni se consultaron bases de datos.
- **Flujos revisados:** login, registro de empresa e influencer, recuperación y cambio de contraseña, verificación de correo, JWT/sesión y rutas relacionadas.
- **Archivos locales modificados al auditar:** `backend/src/modules/auth/auth.service.ts` contiene cambios no confirmados en el flujo de registro (envío de verificación después de cerrar la transacción). Los hallazgos citados abajo corresponden a bloques de login/recuperación que no cambian en ese diff. También había cambios previos en `.gitignore`, `backend/HISTORIAL_DESARROLLO.md` y `backend/src/modules/auth/legal/registration-consent.spec.ts`; no se modificó ninguno durante la auditoría.
- **Límites:** no se verificaron el proxy/TLS de producción, la configuración real de SMTP/JWT, los límites impuestos por infraestructura externa ni el comportamiento contra una instancia desplegada. No se hicieron intentos de fuerza bruta, llamadas reales ni pruebas de penetración dinámicas.

## Diferencias respecto al informe anterior

No se encontraron cambios nuevos en los archivos de login, recuperación, DTOs, JWT, guards, vistas de auth, almacenamiento del token o transporte SMTP. El único diff de auth sigue en `backend/src/modules/auth/auth.service.ts` y corresponde al registro: el envío del correo de verificación se mueve fuera de la transacción para que el usuario ya exista antes de crear su token; la validación del flujo de correo queda sin cambios. Por ello, esta segunda pasada confirma los mismos siete hallazgos y sus severidades; no es una prueba dinámica ni una remediación.

## Resumen ejecutivo

Se identificaron **7 hallazgos confirmados por inspección estática**: 5 medios y 2 bajos. Los controles positivos incluyen hash bcrypt, errores genéricos para login, validación de DTO, consultas del repositorio TypeORM, tokens de recuperación aleatorios almacenados con SHA-256 y expiración de una hora, y guards JWT en rutas protegidas. No se certifica la seguridad del sistema: faltan verificaciones dinámicas y de infraestructura de producción.

| Severidad | Cantidad |
|---|---:|
| Alta | 0 |
| Media | 5 |
| Baja | 2 |
| Informativa | 0 |

## Cobertura

| Área / control | Estado | Evidencia o límite |
|---|---|---|
| 1. Intentos de login, bloqueo o CAPTCHA | **Hallazgo** | No se encontró rate limiting ni bloqueo en el controlador de auth, servicio o bootstrap. No se descarta control externo en el proxy, que no está en el alcance del checkout. |
| 1. Política de contraseñas | **Hallazgo** | DTOs requieren 8–128 caracteres y clases de caracteres; no se comprueba contra contraseñas comunes o filtradas. |
| 1. Token, almacenamiento y cookies | **Hallazgo** | JWT bearer de 7 días guardado en `localStorage`; no hay cookie de sesión. Cierre de sesión es solo local. |
| 1. Expiración, invalidación e inactividad | **Hallazgo** | La estrategia rechaza tokens expirados; no se ve revocación en logout, reset o cambio de contraseña, ni expiración por inactividad. |
| 1. Enumeración | **Hallazgo** | Login usa mensaje genérico; registro revela correo duplicado. Recuperación difiere por entorno (ver AUTH-003). No se midieron tiempos. |
| 2. SQLi y manipulación | **Verificado estáticamente** | Acceso de login/recuperación usa criterios de repositorio TypeORM y los controladores reciben DTO con validación global. No se inyectaron payloads contra un servicio. |
| 2. XSS reflejado/almacenado en auth | **Verificado estáticamente** | Los textos de error y correo se interpolan en plantillas Vue (escape por defecto); no se encontraron `v-html` en esas vistas. No se ejecutaron scripts. |
| 3. Recuperación: aleatoriedad/hash/TTL/uso único | **Verificado parcialmente** | Token generado con `randomBytes(32)`, SHA-256 en reposo, expiración en 1 hora e invalidación lógica; el consumo no es atómico (AUTH-007). |
| 3. Bypass de rutas y roles | **Verificado estáticamente** | Router deniega por defecto y API usa `JwtAuthGuard`; registro asigna rol en servidor. No se probaron peticiones HTTP sin credenciales. |
| 3. Enumeración y respuestas de registro | **Hallazgo** | La API responde conflicto explícito si el email ya existe. |
| 4. HTTPS/TLS hacia navegador y proxy | **No verificado** | No hay topología de despliegue/TLS incluida; el cliente usa localhost como fallback. No se puede confirmar TLS en producción. |
| 4. JWT: firma, algoritmo, claims y contenido | **Verificado parcialmente** | Firma con `JWT_SECRET`, expiración configurada por defecto en 7 días, estrategia valida expiración; payload incluye email y rol. No hay allow-list explícita de algoritmo ni prueba criptográfica dinámica. |
| 4. SMTP para enlaces de autenticación | **Hallazgo** | La configuración de Nodemailer deshabilita validación de certificado TLS (AUTH-002). |

## Hallazgos

### AUTH-001 — El JWT persistente en el navegador no se puede revocar al cerrar sesión

- **Severidad:** Media
- **Confianza:** Alta
- **Área:** Autenticación y gestión de sesiones
- **Evidencia:** `frontend/src/stores/auth.ts:14-26,73-79`; `backend/src/modules/auth/auth.module.ts:21-27`; `backend/src/modules/auth/strategies/jwt.strategy.ts:21-33`; `backend/src/modules/auth/auth.service.ts:316-334`.
- **Observación:** el token se guarda en `localStorage` y dura 7 días por defecto. Logout elimina solo el token del navegador y desconecta el socket; la API no tiene endpoint/registro de revocación. Cambiar o restablecer la contraseña tampoco invalida JWT ya emitidos. La estrategia valida la firma, expiración y que el usuario siga activo, pero no compara una versión de sesión/fecha de revocación.
- **Reproducción no destructiva:** inspeccionar `localStorage` después de iniciar sesión; observar la función `logout()`; revisar que el backend no mantiene una lista/versión de sesiones. No se copió ni reutilizó ningún token.
- **Impacto:** un token copiado antes del logout o antes de cambiar la contraseña conserva acceso hasta su vencimiento (hasta siete días por defecto), salvo que se desactive la cuenta o cambie el secreto JWT global.
- **Recomendación:** usar sesiones revocables (por ejemplo, refresh tokens rotatorios en cookies `HttpOnly; Secure; SameSite` con revocación en servidor) o una versión/fecha de sesión por usuario. Revocar sesiones en logout, cambio y reset de contraseña. Reducir la exposición de XSS evitando guardar credenciales bearer de larga duración en `localStorage`.
- **Retest:** emitir un token sintético, cerrar sesión o cambiar contraseña y comprobar que una petición con el token previo devuelve 401 inmediatamente; verificar atributos de cookie y expiración por inactividad si se implementan.

### AUTH-002 — Nodemailer acepta certificados TLS no confiables

- **Severidad:** Media
- **Confianza:** Alta
- **Área:** Cifrado y transporte/API
- **Evidencia:** `backend/src/modules/notifications/notifications.service.ts:24-31`.
- **Observación:** el transporte SMTP configura `tls.rejectUnauthorized: false`. La conexión cifra el tráfico cuando SMTP negocia TLS, pero el cliente deja de validar la cadena/certificado del servidor.
- **Reproducción no destructiva:** inspección de la configuración estática; no se inició conexión SMTP.
- **Impacto:** un atacante con capacidad de interceptar o suplantar el endpoint de correo puede establecer un canal TLS no confiable e interceptar mensajes que contienen enlaces de verificación o recuperación.
- **Recomendación:** mantener la validación de certificado habilitada; configurar CA/certificado válido y fallar de forma segura si no se valida.
- **Retest:** usar un servidor SMTP de prueba con certificado válido y otro autofirmado; la conexión válida debe funcionar y la no confiable debe ser rechazada.

### AUTH-003 — El enlace de recuperación se entrega en la respuesta fuera de `production`

- **Severidad:** Media
- **Confianza:** Alta
- **Área:** Lógica de negocio / recuperación
- **Evidencia:** `backend/src/modules/auth/auth.service.ts:279-313`; `frontend/src/views/auth/ForgotPasswordView.vue:13-20,58-66`.
- **Observación:** cuando `NODE_ENV` tiene cualquier valor distinto de `production`, la API responde con `dev_reset_url` (token bearer completo) y puede incluir el mensaje SMTP crudo. La misma lógica se activa en entornos `test`, `staging` o con una variable omitida; no está limitada a loopback ni a un flag explícito de desarrollo. En producción sin SMTP configurado, el servicio de correo también registra el URL/token en consola (`notifications.service.ts:109-112`).
- **Reproducción no destructiva:** inspección de las ramas y respuesta; no se solicitó recuperación ni se generó token.
- **Impacto:** quien pueda consultar la respuesta API de un entorno no productivo accesible, o los logs del backend cuando SMTP no está configurado, puede obtener un token vigente y cambiar la contraseña de la cuenta objetivo.
- **Recomendación:** nunca devolver tokens ni errores SMTP al cliente; habilitar herramientas locales de desarrollo solo mediante un flag explícito y loopback, excluido de cualquier entorno compartido. Redactar tokens en logs y tratar la ausencia de SMTP en producción como fallo de configuración.
- **Retest:** en `development`, `staging`, `test` y `production`, comprobar que la API nunca incluye token ni detalle SMTP; comprobar que logs no contienen URL/token incluso con SMTP fallido.

### AUTH-004 — No hay límite de intentos en endpoints públicos de autenticación

- **Severidad:** Media
- **Confianza:** Media-alta
- **Área:** Autenticación y gestión de sesiones
- **Evidencia:** `backend/src/modules/auth/auth.controller.ts:22-35,52-64`; `backend/src/modules/auth/auth.service.ts:195-205,279-313`; `backend/src/main.ts:7-20`.
- **Observación:** no se encontró guard, interceptor, decorador de throttling ni middleware de límite de tasa en login, registro o recuperación. El bootstrap configura validación, CORS y prefijo, pero no limitación de intentos. La configuración de proxy/edge no está incluida y podría añadir controles externos.
- **Reproducción no destructiva:** revisión estática de endpoints y bootstrap. No se enviaron intentos fallidos ni se generaron correos.
- **Impacto:** si no hay controles en infraestructura, se pueden automatizar intentos de contraseña y solicitudes de recuperación/registro, habilitando diccionario, enumeración y abuso de correo.
- **Recomendación:** aplicar límites por IP y por cuenta con backoff, respuestas uniformes y métricas/alertas; agregar CAPTCHA adaptativo solo tras señales de abuso. Mantener mitigaciones también en el proxy.
- **Retest:** con cuenta y entorno desechables, probar el límite definido y la recuperación gradual, sin bloquear cuentas reales; verificar que respuestas no permitan enumeración.

### AUTH-005 — El registro permite enumerar correos existentes

- **Severidad:** Baja
- **Confianza:** Alta
- **Área:** Lógica de negocio / enumeración
- **Evidencia:** `backend/src/modules/auth/auth.service.ts:337-340`; endpoints públicos de registro en `backend/src/modules/auth/auth.controller.ts:22-29`.
- **Observación:** para un email existente, `assertEmailFree()` produce un `ConflictException` con el texto “El email ya está registrado”; para uno libre, continúa el registro. El mensaje y estado HTTP revelan si una cuenta está registrada, aunque el endpoint de recuperación intenta responder de forma genérica.
- **Reproducción no destructiva:** comparar estáticamente la respuesta de conflicto con el flujo exitoso; no se consultaron cuentas ni se enviaron registros.
- **Impacto:** facilita descubrir cuentas y dirigir ataques de phishing o credential stuffing a usuarios existentes.
- **Recomendación:** usar un flujo de confirmación uniforme que no revele existencia (por ejemplo, respuesta genérica y verificación por correo) y limitar solicitudes. Evitar respuestas de error diferenciadas cuando el diseño lo permita.
- **Retest:** con dos emails sintéticos controlados (uno registrado y otro no), comparar cuerpo, estado y tiempos en un entorno local aislado; verificar que sean indistinguibles para un cliente anónimo.

### AUTH-006 — La política de contraseña no bloquea claves comunes o filtradas

- **Severidad:** Baja
- **Confianza:** Alta
- **Área:** Autenticación / política de contraseñas
- **Evidencia:** reglas de composición en `backend/src/modules/auth/dto/register-company.dto.ts:5-17`, `register-influencer.dto.ts:22-32`, `reset-password.dto.ts:3-13` y `change-password.dto.ts:3-13`.
- **Observación:** la política exige 8–128 caracteres con mayúscula, minúscula, número y símbolo, pero solo usa una expresión regular de composición. No hay comprobación de contraseña común, contextual o presente en filtraciones; por tanto patrones predecibles que satisfacen la expresión pueden aceptarse. Las reglas tampoco exigen longitud superior para mitigar claves de baja entropía.
- **Reproducción no destructiva:** leer la expresión regular y confirmar que solo evalúa longitud/clases; no se intentó iniciar sesión ni se probó contra una lista real de contraseñas.
- **Impacto:** un atacante puede acertar contraseñas previsibles con diccionarios orientados a reglas pese a que la interfaz indique que cumplen complejidad.
- **Recomendación:** añadir comprobación contra listas de contraseñas comunes/comprometidas sin enviar claves a terceros; priorizar longitud y permitir frases largas, manteniendo el límite de entrada seguro. Usar el mismo validador en alta, cambio y recuperación.
- **Retest:** validar con pruebas unitarias locales que se rechacen claves frecuentes y se acepten frases largas; no ejecutar pruebas de credenciales contra cuentas reales.

### AUTH-007 — El consumo del token de recuperación no es atómico

- **Severidad:** Media
- **Confianza:** Media-alta
- **Área:** Lógica de negocio / reutilización de token
- **Evidencia:** `backend/src/modules/auth/auth.service.ts:316-334`.
- **Observación:** el servicio busca un token no usado, verifica su expiración, actualiza la contraseña y después marca/guarda el token como usado en operaciones separadas. No hay transacción ni actualización condicional que reclame el token atómicamente; dos solicitudes concurrentes con el mismo token pueden leerlo como no usado antes de que cualquiera lo marque.
- **Reproducción no destructiva:** inferencia a partir del orden de lecturas/escrituras; no se invocó el endpoint ni se intentó una carrera.
- **Impacto:** si un enlace de recuperación está expuesto, dos usos concurrentes podrían ambos superar la comprobación inicial y competir por la contraseña final, debilitando la garantía de uso único.
- **Recomendación:** consumir el token mediante una operación atómica (por ejemplo, `UPDATE ... WHERE used = false AND expires_at > now() RETURNING ...`) dentro de una transacción con el cambio de contraseña; invalidar las demás sesiones en la misma operación.
- **Retest:** prueba concurrente unitaria/mock o de integración con token sintético; exactamente una solicitud debe completar y las demás deben fallar sin cambiar la contraseña.

## Controles revisados sin hallazgo confirmado

- Login compara contraseñas mediante bcrypt y usa el mismo error para usuario inexistente o contraseña incorrecta (`auth.service.ts:195-205`). La consulta se restringe a usuarios activos.
- Las contraseñas se guardan con bcrypt y factor configurado en 10 (`auth.service.ts:30,83-88,141-146,329`). No se recuperan hashes en la respuesta sanitizada.
- Registro asigna `empresa` o `influencer` en backend; no toma el rol desde el DTO. Consentimiento legal se exige explícitamente y se valida contra versión vigente; las pruebas existentes cubren esos controles.
- JWT se extrae del encabezado Bearer; `ignoreExpiration` es `false`, la firma requiere `JWT_SECRET` y el TTL por defecto es 7 días. No se observó almacenamiento de contraseñas o secretos dentro del payload; este sí incluye email y rol, que son legibles por quien tenga el token.
- Recuperación genera 32 bytes aleatorios, guarda solo SHA-256, vence en una hora e invalida tokens anteriores de forma lógica (`auth.service.ts:284-297`). La implementación evita adivinación práctica, sujeta a los hallazgos AUTH-003 y AUTH-007.
- Verificación de correo genera token aleatorio, guarda hash y vence en 24 horas (`auth.service.ts:222-235`). Login no exige `is_email_verified`; el producto permite sesión antes de verificar, por lo que no se considera fallo confirmado sin un criterio explícito de bloqueo.
- Consultas auth observadas usan repositorios TypeORM con criterios parametrizados, no concatenación SQL (`auth.service.ts:196-199,280`). No se encontró `v-html` en las vistas de autenticación; la interpolación Vue normal escapa texto.
- Las rutas del frontend usan guard de acceso y los endpoints protegidos usan `JwtAuthGuard`; esto es defensa adicional, no reemplaza autorización de API (`frontend/src/router/access.ts:8-34`, `backend/src/modules/auth/auth.controller.ts:38-49`).

## Pruebas ejecutadas

1. `cd backend && npm test -- --runInBand --runTestsByPath src/modules/auth/legal/registration-consent.spec.ts` — **1 suite aprobada, 14 pruebas aprobadas**, 0 fallidas. Incluye mocks y valida aceptación explícita, versiones legales y registro sin transacciones reales.
2. `cd frontend && node --test --test-reporter=spec tests/register.test.mjs` — **exit code 0**; Node reportó el archivo de prueba aprobado. Contiene escenarios sintéticos de validación de registro; no envía solicitudes.
3. Inspección estática de rutas, DTO, servicios, guards, JWT, vistas, correo y configuración de CORS. No se ejecutaron pruebas dinámicas, tráfico HTTP, escáneres ni comandos contra infraestructura. Ambos procesos mostraron avisos `Failed to create stream fd: Operation not permitted` del entorno, pero terminaron con código 0 y los resultados anteriores.

## Pendiente para completar cobertura

1. Revisar TLS/HSTS, proxy de producción, reglas de rate limiting, secretos y almacenamiento de logs en la infraestructura real, sin revelar valores.
2. Añadir pruebas unitarias/mock ya autorizadas para login uniforme, límite de intentos, políticas comunes, recuperación anti-enumeración, carrera de uso único, expiración y rechazo de JWT con firma/algoritmo inválidos. No usar credenciales reales.
3. Verificar el despliegue de staging para que `NODE_ENV` sea `production` y comprobar que ninguna ruta de recuperación, log o diagnóstico exponga token o datos SMTP.

## Seguimiento de remediación — 2026-11-05

Los hallazgos AUTH-001 a AUTH-007 recibieron remediación en código y pruebas locales. AUTH-001 está implementado; queda aplicar su migración en una base autorizada y validar sesiones contra PostgreSQL. El JWT ya no se conserva en `localStorage` y viaja mediante cookie HttpOnly. El detalle por tarea, estado y evidencia está en [`security/PLAN-REMEDIACION-AUTH.md`](../../PLAN-REMEDIACION-AUTH.md). La auditoría original es una fotografía estática anterior a estos cambios; no representa el estado actual del código para los hallazgos remediados.
