# Requerimientos de Frontend

Fecha de línea base: 2026-10-27.

[Guía de seguimiento](../docs/README.md) · [Historial](HISTORIAL_DESARROLLO.md) · [Especificación](../claude.md)

## Estado de la línea base

Inventario inicial basado en la especificación y la estructura del código. Todos los elementos quedan **Por validar**: esta revisión documental no ejecutó pruebas funcionales. Los criterios siguientes deben verificarse antes de declarar cumplimiento. Los puntos cuyo detalle no figura en la especificación se indican expresamente.

## Registro de requerimientos

| ID | Requerimiento | Criterios de aceptación | Estado | Código de referencia | Dependencias |
| --- | --- | --- | --- | --- | --- |
| FE-001 | Acceso y sesión | Registro por rol, inicio de sesión, verificación de correo y recuperación de contraseña; navegación restringida según sesión y rol. | Por validar | `src/views/auth/; src/router/index.ts; src/stores/auth.ts` | BE-001 |
| FE-002 | Perfiles y descubrimiento | Editar perfiles de empresa e influencer, consultar perfiles y filtrar influencers; mostrar validación y errores de API. | Por validar | `src/views/perfil/; src/views/influencers/; src/views/empresas/` | BE-002 |
| FE-003 | Chat y créditos | Enviar y recibir mensajes en tiempo real; mostrar saldo y bloquear escritura cuando el servidor indique saldo insuficiente. | Por validar | `src/views/chats/; src/stores/chat.ts; src/stores/credits.ts; src/socket/` | BE-003, BE-004 |
| FE-004 | Negociación y brief | Crear propuestas y briefs, aceptar, rechazar y contraofertar; reflejar los estados devueltos por la API. | Por validar | `src/views/chats/ChatView.vue; src/components/BriefDetails.vue; src/api/campaigns.ts` | BE-005 |
| FE-005 | Seguimiento de contratos | Listar contratos en tabla con participante, estado, montos, fecha límite y seguimiento de pago según rol; abrir el detalle con una acción de icono de ojo, tooltip y etiqueta accesible. Mostrar fondeo, entregables, hasta tres rondas de cambios, publicaciones, aprobación e incumplimiento, con acciones según rol y estado. | Por validar | `src/views/contratos/; src/stores/contracts.ts` | BE-006 |
| FE-006 | Pagos y comprobantes | Presentar recarga y fondeo mediante Wompi, resultado del pago y acceso autorizado a comprobantes; manejar carga y errores. | Por validar | `src/api/credits.ts; src/api/receipts.ts; src/views/pagos/ReceiptsView.vue` | BE-007, BE-009 |
| FE-007 | Administración | Permitir al administrador gestionar parámetros, usuarios e incumplimientos; restringir las rutas correspondientes. | Por validar | `src/views/admin/AdminView.vue; src/stores/admin.ts` | BE-010 |
| FE-008 | Diseño y accesibilidad | Aplicar identidad visual de claude.md, contraste AA, PrimeIcons, etiquetas y navegación por teclado; mantener vistas utilizables en móvil. Todas las vistas de la aplicación comparten contenedor adaptable de hasta 1600 px y 90% desde xl, con padding progresivo; formularios de autenticación, diálogos y bloques de lectura conservan sus límites propios. | Por validar | `src/assets/main.css; src/assets/base.css; src/components/` | Transversal |
| FE-009 | Verificación social y valoraciones | Mostrar estado de verificación social y valoraciones; explicar las restricciones para contratar cuando falte verificación. | Por validar | `src/views/perfil/InfluencerProfileView.vue; src/components/VerifiedBadge.vue; src/components/StarRating.vue` | BE-002, BE-011 |

| FE-010 | Historial de pagos con filtros | Filtrar comprobantes por fechas inclusivas de El Salvador y tipo de operación; ordenar del más reciente al más antiguo, sumar montos filtrados en USD, mostrar cantidad, permitir limpiar y manejar rangos inválidos y resultados vacíos. | Por validar | `src/views/pagos/ReceiptsView.vue` | BE-009 (API existente) |

| FE-011 | Mostrar desglose de IVA del DTE en detalle de pagos | Mostrar «No disponible» para importes ausentes o inválidos, conservar ceros válidos y evitar NaN. Mostrar y conservar base, IVA y total coherentes; simulación al 13% incluido sin cambiar el pago ni documentos anteriores. Ver [alcance fiscal](../docs/IVA.md). | Por validar | `src/api/receipts.ts; src/views/pagos/ReceiptsView.vue` | BE-013 |

| FE-012 | Vista exclusiva de briefs de campaña para empresa | Ruta /briefs restringida a empresa; acceso desde menú de escritorio, móvil y perfil; listar briefs en tabla con campaña, plataformas, presupuesto y calendario; acción Ver detalle con información completa y adjuntos; crear, editar y eliminar briefs con confirmación, archivos y validaciones existentes; mostrar carga, error con reintento y estado vacío. | Por validar | `src/views/campaigns/CampaignBriefsView.vue; src/router/index.ts; src/components/AppLayout.vue` | BE-005 (API existente) |

| FE-013 | Acciones de tablas solo con iconos | Las acciones de todas las tablas usan solo iconos visibles, con tooltip y etiqueta accesible que identifique la operación y el registro. | Por validar | `src/views/campaigns/CampaignBriefsView.vue; src/views/pagos/ReceiptsView.vue` | Transversal |

| FE-014 | Seguridad de acceso por URL | Validar sesión y rol con /auth/me antes de abrir rutas privadas; no confiar en hv_user; aplicar role y roles; restringir chats, contratos y pagos a empresa/influencer, briefs a empresa y admin al administrador; validar IDs y comprobar permisos de detalles privados vía API; cerrar sesión ante 401/403; impedir mostrar vistas privadas ante errores de verificación. | Por validar | `src/router/access.ts; src/router/index.ts; src/stores/auth.ts` | BE-001, BE-004, BE-006 |

| FE-015 | URLs de vistas con identificadores opacos | Mostrar rutas /v/identificador en vistas de aplicación; mantener navegación interna y enlaces anteriores mediante redirección con permisos; conservar parámetros de detalle, query y hash. La ofuscación no reemplaza autorización. | Por validar | `src/router/paths.ts; src/router/index.ts; src/views/; src/components/AppLayout.vue` | FE-014 |

## Historial de cambios de requerimientos

| Fecha | ID | Descripción anterior | Nueva descripción / motivo | Responsable / referencia |
| --- | --- | --- | --- | --- |
| 2026-10-27 | FE-010 | Sin requerimiento específico | Historial con filtros por fecha y operación, y total del período; solicitado por el usuario | Vista de pagos |
| 2026-10-27 | FE-001 a FE-009 | Sin registro separado por área | Creación de línea base documental; sin certificar implementación | Revisión de claude.md y código local |

## Plantilla para nuevos requerimientos

- ID: FE-###
- Título y descripción:
- Origen / solicitud:
- Criterios de aceptación verificables:
- Estado: Pendiente
- Dependencias e impacto en la otra área:
- Responsable:
- Evidencia de validación / commit / PR:
