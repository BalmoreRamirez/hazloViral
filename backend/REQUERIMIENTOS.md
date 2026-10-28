# Requerimientos de Backend

Fecha de línea base: 2026-10-27.

[Guía de seguimiento](../docs/README.md) · [Historial](HISTORIAL_DESARROLLO.md) · [Especificación](../claude.md)

## Estado de la línea base

Inventario inicial basado en la especificación y la estructura del código. Todos los elementos quedan **Por validar**: esta revisión documental no ejecutó pruebas funcionales. Los criterios siguientes deben verificarse antes de declarar cumplimiento. Los puntos cuyo detalle no figura en la especificación se indican expresamente.

## Registro de requerimientos

| ID | Requerimiento | Criterios de aceptación | Estado | Código de referencia | Dependencias |
| --- | --- | --- | --- | --- | --- |
| BE-001 | Autenticación y autorización | Registrar empresas e influencers, autenticar con JWT, verificar correo y recuperar contraseña; rechazar acciones sin permisos y exigir tutor a menores según especificación. | Por validar | `src/modules/auth/; src/modules/users/; src/common/guards/` | FE-001 |
| BE-002 | Perfiles y verificación social | Restringir respuestas a empresa a campos públicos del influencer mediante listas permitidas, sin correo, usuarios de redes, dirección, identificación, banco ni tutor; preservar datos propios y acceso administrativo. Persistir perfiles y datos bancarios, permitir búsqueda y verificar redes sociales; restringir contratación según reglas de verificación. | Por validar | `src/modules/companies/; src/modules/influencers/` | FE-002, FE-009 |
| BE-003 | Créditos | Aplicar parámetros vigentes administrados: costo por chat nuevo al debitar a empresa; umbral global de empresa en saldo, envío y nuevos chats, también en cuentas existentes; bono al registrar nuevas empresas; comisión vigente al crear contratos desde propuestas/contraofertas. Validar valores numéricos (no negativos, máximo dos decimales; comisión hasta 100%), exponer lo necesario a empresa y mantener los importes ya confirmados como snapshot. Evitar cargos duplicados o saldos inconsistentes. | Por validar | `src/modules/credits/; src/modules/chats/; src/modules/auth/; src/modules/contracts/; src/modules/admin/` | FE-003, FE-016 |
| BE-004 | Mensajería y notificaciones | Evitar exposición de contacto del influencer en HTTP y WebSocket, bloquear contacto reconocible en mensajes nuevos y ocultarlo en históricos; denegar a empresa el DTE del pago al influencer, sin modificar el documento original. Autorizar acceso a conversaciones y eventos WebSocket; contar mensajes recibidos sin leer solo en conversaciones propias, validar participación al marcar lectura y avisar por sala privada al recibir mensajes; rechazar escritura con saldo insuficiente y notificar cambios de estado a participantes. | Por validar | `src/modules/chats/; src/modules/notifications/` | FE-003 |
| BE-005 | Propuestas y briefs | Persistir propuestas, rechazos y contraofertas; crear contrato una sola vez al aceptar y conservar términos y PDF acordados. | Por validar | `src/modules/campaigns/; src/modules/chats/; src/modules/contracts/` | FE-004 |
| BE-006 | Ciclo de contratos | Validar actores y transiciones desde pending_payment hasta completed o incumplimiento; limitar cambios a tres rondas y auditar entregables, publicaciones y pagos. | Por validar | `src/modules/contracts/` | FE-005 |
| BE-007 | Integración Wompi | Procesar recargas, fondeo y dispersiones; verificar firma SHA256 de webhooks, manejar reintentos sin duplicar movimientos y separar configuración sandbox/producción. | Por validar | `src/modules/wompi/; src/modules/credits/; src/modules/contracts/` | FE-006 |
| BE-008 | Archivos | Autorizar carga y acceso a contratos PDF y entregables; validar formatos y límites de tamaño, y rechazar archivos o accesos no permitidos. | Por validar | `src/modules/uploads/` | FE-004, FE-005 |
| BE-009 | Comprobantes y DTE | Definir y validar emisión, consulta y descarga de comprobantes y documentos DTE, permisos de acceso y manejo de fallos externos. Alcance detallado pendiente de confirmar con producto. | Por validar | `src/modules/receipts/; src/modules/electronic-invoicing/` | FE-006 |
| BE-010 | Administración | Restringir gestión de parámetros, usuarios y resolución de incumplimientos al administrador; registrar decisiones y efectos económicos. | Por validar | `src/modules/admin/` | FE-007 |
| BE-011 | Valoraciones | Definir y validar quién puede calificar a empresas e influencers y bajo qué condiciones; persistir y consultar valoraciones sin duplicados indebidos. Listar con paginación obligatoria de seis elementos y orden reciente estable, validar página y devolver total; el resumen considera todas las valoraciones. | Por validar | `src/modules/ratings/` | FE-009 |
| BE-012 | Persistencia y configuración | Nombrar carpetas, archivos y clases de módulos en inglés (kebab-case y PascalCase según corresponda). Organizar funcionalidades en src/modules con DTO, entidades y pruebas junto al módulo; separar src/config, componentes compartidos en src/common y mantenimiento en scripts; conservar importaciones, rutas HTTP y arranque. Mantener integridad en PostgreSQL con TypeORM, validar DTOs y gestionar configuración sin exponer secretos; documentar cambios de esquema para despliegue. | Por validar | `src/app.module.ts; src/main.ts; src/config/; src/common/; src/modules/; scripts/` | Transversal |

| BE-013 | Registrar IVA en nuevos borradores DTE de desarrollo | Mostrar y conservar base, IVA y total coherentes; simulación al 13% incluido sin cambiar el pago ni documentos anteriores. Ver [alcance fiscal](../docs/IVA.md). | Por validar | `src/modules/electronic-invoicing/; src/modules/receipts/` | FE-011 |
| BE-014 | Sugerencias seguras para iniciar chat | Exponer a empresas autenticadas una búsqueda de influencers por nombre artístico o username, limitada a perfiles disponibles, completos y verificables; mínimo de dos caracteres, máximo cinco resultados y solo campos públicos necesarios. | Por validar | `src/modules/influencers/influencers.controller.ts; src/modules/influencers/influencers.service.ts` | FE-020 |
| BE-015 | Conteo de mensajes sin leer por chat | Incluir en la lista de chats el número de mensajes no leídos por conversación, contando solo mensajes ajenos al usuario autenticado y usando el participante validado por la sesión; no aceptar IDs de propietario desde el cliente. | Por validar | `src/modules/chats/chats.service.ts` | FE-021 |

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

## Separación de historiales para empresa (2026-10-28)

GET /receipts restringe el listado de empresa a influencer_payout; GET /receipts/top-ups admite solo empresa y restringe a credits_top_up. Ambas consultas filtran por la empresa del usuario autenticado, sin aceptar un ID de propietario enviado por el cliente. Las recargas conservan su detalle y reenvío de factura con validación de propiedad.

## Aceptación al registrar (2026-10-28, BE-001)

Ambos registros exigen accepted_terms y accepted_privacy booleanos true y versiones
vigentes de los documentos. La evidencia (hora del servidor, textos, versiones y
SHA-256) se guarda atómicamente con la cuenta, no se expone en sesión y no se presume
para cuentas históricas. Consultar documentos es público y no requiere registro.
La política identifica a InfluSmart y admin@yopmail.com conforme a los datos del
usuario. La revisión legal y operativa pendiente se documenta en
[REGISTRO_Y_PRIVACIDAD.md](../docs/REGISTRO_Y_PRIVACIDAD.md).
