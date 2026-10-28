# Política de fechas — El Salvador (UTC−6)

Zona de aplicación: `America/El_Salvador`.

## Configuración

- Backend: `common/timezone.ts` carga TZ antes de iniciar Nest; Docker define la misma zona para ambos servicios.
- PostgreSQL: se verificó `SHOW timezone = America/El_Salvador`. El pool TypeORM establece esta zona en cada conexión mediante `extra.options`.
- Columnas existentes `timestamp without time zone`: representan reloj local. Los Date de Node se escriben y leen usando TZ de El Salvador. No se cambió masivamente el esquema ni el horario de los registros.
- Columnas `timestamptz`: conservan instantes; PostgreSQL los presenta según zona de sesión.
- Transporte JSON: se conserva ISO 8601 con zona explícita. `2026-10-27T18:00:00Z` equivale exactamente a `2026-10-27T12:00:00-06:00`; no se resta seis horas manualmente ni se elimina la Z.
- Frontend: utilidades de fecha aplican explícitamente la zona de El Salvador, incluso si el navegador usa otra zona. Fechas sin hora se interpretan como días de calendario en UTC−6; timestamps sin zona se consideran locales, no del dispositivo.
- Nacimientos y mayoría de edad: se comparan días de calendario de El Salvador, sin depender de la hora o zona del dispositivo.

## Auditoría del 2026-10-27

Se encontró backend Node en UTC, PostgreSQL en El Salvador y columnas con y sin zona. Esto interpretaba timestamps locales de BD como UTC y podía mostrar horas seis horas antes. Se alineó la configuración y se verificó una escritura/lectura de Date en tabla temporal, con rollback, sin desfase.

La recuperación manual del comprobante 3 había almacenado 18:00 en timestamp sin zona para representar las 12:00 reportadas. Se corrigió exclusivamente ese registro a 12:00, dejando en metadata la hora reportada ISO explícita. Se respaldó en `/app/uploads/maintenance/timezone-fdc204a7-c3c4-4111-97c9-a002251f129e/receipt-3-before.json`. No se modificaron saldo, importes ni estado de correo.

Los históricos originados por escrituras explícitas de Date mientras Node corría en UTC pueden mezclar convenciones con fechas generadas por PostgreSQL. No se aplicó corrección global porque desplazaría registros correctamente guardados. Si se requiere normalización histórica completa, se debe contrastar cada origen con eventos externos o evidencia de la hora real antes de migrar a timestamptz.

## Validación

- Pruebas backend: conversión de instantes, medianoche y cumpleaños de mayoría de edad en UTC−6.
- Pruebas frontend con TZ de Tokio y Los Ángeles: calendario estable, timestamps con y sin offset equivalentes, cambios de día locales y edad.
- Docker recreado y validado: Node `America/El_Salvador`, offset 360 minutos y PostgreSQL `America/El_Salvador`.
- API autenticada: comprobante 3 devuelve 18:00Z, que se muestra como 12:00 local.

## Normalización histórica aplicada — 2026-10-27

A solicitud del usuario se auditó el origen de las columnas temporales y se aplicó la migración `2026-10-27-legacy-utc-to-el-salvador-v1`:

| Histórico | Campo | Registros corregidos |
| --- | --- | ---: |
| Mensajes | read_at | 15 |
| Verificación social | verified_at | 1 |
| Verificación de correo | expires_at | 5 |
| Recuperación de contraseña | expires_at | 0 |
| DTE de desarrollo | fecha/hora de json_original | 1 |

Las lecturas anteriores al cambio de configuración provenían de Date escritos por Node en UTC. La verificación social tenía seis horas de diferencia respecto al updated_at local de la misma operación. Los tokens de correo presentaban 30 horas entre creación y vencimiento, en lugar de 24; se convirtieron únicamente aquellos con ese desfase comprobado. El número de control del DTE incorpora epoch de generación y permitió corroborar su fecha local antes de corregir el JSON.

Se conservaron las fechas generadas por `now()` de PostgreSQL, instantes `timestamptz`, campos de calendario y fechas ISO con offset: ya eran correctos y restarles seis horas cambiaría su significado.

Herramienta: `backend/scripts/timezone/normalize-historical-timezone.cjs`. Por defecto evalúa; `--apply` aplica mediante transacción. El corte corresponde al despliegue de TZ local: `2026-10-27T19:16:20.834Z`. La tabla `app_maintenance_runs` registra la migración e impide aplicarla dos veces.

Respaldo previo con permisos restringidos: `/app/uploads/maintenance/historical-timezone-24fa043c-4a0f-498e-9b39-c5542f480d6c/before.json`.

Verificación posterior: los 22 registros coinciden con los valores esperados del respaldo, ninguna lectura quedó antes de la creación del mensaje y un segundo intento devuelve `alreadyApplied=true` sin modificar datos. No se cambiaron saldos, importes, propietarios ni estados de correo.
