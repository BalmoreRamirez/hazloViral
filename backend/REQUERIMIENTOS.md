# Requerimientos de Backend

Fecha de línea base: 2026-10-27.

[Guía de seguimiento](../docs/README.md) · [Historial](HISTORIAL_DESARROLLO.md) · [Especificación](../claude.md)

## Estado de la línea base

Inventario inicial basado en la especificación y la estructura del código. Todos los elementos quedan **Por validar**: esta revisión documental no ejecutó pruebas funcionales. Los criterios siguientes deben verificarse antes de declarar cumplimiento. Los puntos cuyo detalle no figura en la especificación se indican expresamente.

## Registro de requerimientos

| ID | Requerimiento | Criterios de aceptación | Estado | Código de referencia | Dependencias |
| --- | --- | --- | --- | --- | --- |
| BE-001 | Autenticación y autorización | Registrar empresas e influencers, autenticar con JWT, verificar correo y recuperar contraseña; rechazar acciones sin permisos y exigir tutor a menores según especificación. | Por validar | `src/auth/; src/users/; src/common/guards/` | FE-001 |
| BE-002 | Perfiles y verificación social | Persistir perfiles y datos bancarios, permitir búsqueda y verificar redes sociales; restringir contratación según reglas de verificación. | Por validar | `src/empresas/; src/influencers/` | FE-002, FE-009 |
| BE-003 | Créditos | Otorgar bono de bienvenida de $10 al finalizar onboarding, cobrar apertura configurable y aplicar umbral mínimo de $5; evitar cargos duplicados o saldos inconsistentes. | Por validar | `src/credits/; src/chats/` | FE-003 |
| BE-004 | Mensajería y notificaciones | Autorizar acceso a conversaciones y eventos WebSocket; rechazar escritura con saldo insuficiente y notificar cambios de estado a participantes. | Por validar | `src/chats/; src/notifications/` | FE-003 |
| BE-005 | Propuestas y briefs | Persistir propuestas, rechazos y contraofertas; crear contrato una sola vez al aceptar y conservar términos y PDF acordados. | Por validar | `src/campaigns/; src/chats/; src/contratos/` | FE-004 |
| BE-006 | Ciclo de contratos | Validar actores y transiciones desde pending_payment hasta completed o incumplimiento; limitar cambios a tres rondas y auditar entregables, publicaciones y pagos. | Por validar | `src/contratos/` | FE-005 |
| BE-007 | Integración Wompi | Procesar recargas, fondeo y dispersiones; verificar firma SHA256 de webhooks, manejar reintentos sin duplicar movimientos y separar configuración sandbox/producción. | Por validar | `src/wompi/; src/credits/; src/contratos/` | FE-006 |
| BE-008 | Archivos | Autorizar carga y acceso a contratos PDF y entregables; validar formatos y límites de tamaño, y rechazar archivos o accesos no permitidos. | Por validar | `src/uploads/` | FE-004, FE-005 |
| BE-009 | Comprobantes y DTE | Definir y validar emisión, consulta y descarga de comprobantes y documentos DTE, permisos de acceso y manejo de fallos externos. Alcance detallado pendiente de confirmar con producto. | Por validar | `src/receipts/; src/dte/` | FE-006 |
| BE-010 | Administración | Restringir gestión de parámetros, usuarios y resolución de incumplimientos al administrador; registrar decisiones y efectos económicos. | Por validar | `src/admin/` | FE-007 |
| BE-011 | Valoraciones | Definir y validar quién puede calificar a empresas e influencers y bajo qué condiciones; persistir y consultar valoraciones sin duplicados indebidos. Listar con paginación obligatoria de seis elementos y orden reciente estable, validar página y devolver total; el resumen considera todas las valoraciones. | Por validar | `src/ratings/` | FE-009 |
| BE-012 | Persistencia y configuración | Mantener integridad en PostgreSQL con TypeORM, validar DTOs y gestionar configuración sin exponer secretos; documentar cambios de esquema para despliegue. | Por validar | `src/app.module.ts; src/main.ts; src/**/dto/; src/**/entities/` | Transversal |

| BE-013 | Registrar IVA en nuevos borradores DTE de desarrollo | Mostrar y conservar base, IVA y total coherentes; simulación al 13% incluido sin cambiar el pago ni documentos anteriores. Ver [alcance fiscal](../docs/IVA.md). | Por validar | `src/dte/; src/receipts/` | FE-011 |

## Historial de cambios de requerimientos

| Fecha | ID | Descripción anterior | Nueva descripción / motivo | Responsable / referencia |
| --- | --- | --- | --- | --- |
| 2026-10-27 | BE-001 a BE-012 | Sin registro separado por área | Creación de línea base documental; sin certificar implementación | Revisión de claude.md y código local |

## Plantilla para nuevos requerimientos

- ID: BE-###
- Título y descripción:
- Origen / solicitud:
- Criterios de aceptación verificables:
- Estado: Pendiente
- Dependencias e impacto en la otra área:
- Responsable:
- Evidencia de validación / commit / PR:
