# Historial de desarrollo de Frontend

[Guía de seguimiento](../docs/README.md) · [Requerimientos](REQUERIMIENTOS.md)

Registrar cambios en orden cronológico inverso. Esta bitácora comienza el 2026-10-27; no reconstruye fechas ni autoría de desarrollos previos.

## 2026-10-27 — Ancho adaptable como diseño general

- Requerimiento: FE-008.
- Cambio: el contenedor de AppLayout aplica el ancho de hasta 1600 px, 90% desde xl y padding adaptable a todas las vistas de la aplicación: dashboard, búsqueda, perfiles, chats, contratos, pagos, briefs y administración. Se elimina la opción wide y sus usos por vista.
- Los formularios de autenticación, diálogos y bloques con límites propios conservan su ancho de lectura dentro de sus contenedores; el cambio general no estira esos controles.
- Validación: compilación y tipos de frontend; revisión de usos de AppLayout para confirmar que todas las vistas comparten el mismo contenedor.

## 2026-10-27 — Ancho adaptable para listados y lectura

- Requerimientos: FE-005, FE-008, FE-012.
- Hallazgo: el contenedor max-w-6xl limitaba la tabla de contratos a unos 1100 px de contenido incluso en monitores amplios, comprimiendo encabezados y dejando márgenes excesivos.
- Cambio: AppLayout incorpora opción wide; contratos, pagos y briefs usan hasta 1600 px y un ancho del 90% desde xl, con márgenes laterales y padding progresivo. Formularios y detalles conservan el ancho normal; el formulario de briefs queda limitado a max-w-4xl dentro del listado amplio.
- Contratos: separación horizontal adicional en escritorio, nombres con el ancho disponible y referencias de pago con salto de línea solo cuando es necesario. Se mantienen anchos proporcionales por rol, alineación monetaria y desplazamiento horizontal en pantallas pequeñas.
- Validación: compilación y tipos de frontend correctos; no se dispone de navegador automatizado para verificar visualmente los tamaños.

## 2026-10-27 — URLs opacas para las vistas de aplicación

- Requerimientos: FE-014, FE-015.
- Cambio: rutas visibles con identificadores opacos estables bajo `/v/`, y conversión centralizada de enlaces internos mediante `viewPath`. Detalles conservan el parámetro de registro para validar propiedad en API.
- Compatibilidad: enlaces anteriores redirigen a la ruta opaca conservando parámetros, query y hash; los controles de sesión, rol y propiedad siguen aplicándose. Autenticación, recuperación y verificación de correo mantienen rutas compatibles con enlaces enviados desde backend.
- Alcance: esto oculta nombres legibles, no cifra la información ni sustituye los permisos del servidor.
- Validación: compilación y tipos correctos; pruebas de rutas opacas únicas, detalles, redirecciones y preservación de permisos junto con las pruebas de acceso existentes.

## 2026-10-27 — Protección de acceso directo a vistas

- Requerimientos: FE-001, FE-014.
- Hallazgos: guard ignoraba meta.roles y la identidad persistida en localStorage se aceptaba antes de verificarla con el servidor.
- Cambio: validación de sesión mediante /auth/me en navegación privada, identidad restaurada únicamente desde la API, cierre de sesión ante credenciales rechazadas, política de rutas privadas por defecto y aplicación de rol único o listas de roles.
- Rutas: briefs solo empresa; admin solo administrador; chats, contratos y pagos solo empresa/influencer. Verificación de correo y página de acceso restringido son expresamente públicas.
- Detalles: IDs enteros positivos dentro de rango de base de datos y consulta previa de permisos de contratos y chats; los componentes se remontan al cambiar la ruta para evitar conservar datos del ID anterior.
- Seguridad del servidor: se revisaron los guards y comprobaciones de participantes existentes en chats/contratos; siguen siendo la autoridad para proteger los datos, independientemente del frontend.
- Validación: compilación y tipos satisfactorios; `node --test tests/access.test.mjs` verifica sesiones ausentes/expiradas, usuario local manipulado, roles permitidos/prohibidos, IDs inválidos y rechazo de recursos privados.
- Limitación: validaciones de navegación requieren conexión al backend; ante fallos no se abre la vista solicitada. Pendiente revisión interactiva en navegador.

## 2026-10-27 — Distribución de columnas de contratos

- Requerimiento: FE-005.
- Cambio: anchos proporcionales por rol mediante colgroup, plataformas en columna independiente, montos alineados a la derecha con cifras tabulares y moneda en encabezados, acción de detalle centrada y mayor espacio vertical por fila.
- Se conserva desplazamiento horizontal para evitar comprimir los datos en pantallas pequeñas.
- Validación: compilación y tipos correctos; pendiente revisión visual en navegador.

## 2026-10-27 — Contratos en tabla con acción de detalle

- Requerimientos: FE-005, FE-013.
- Cambio: listado de tarjetas convertido en tabla con contrato, participante según rol, estado, monto total, comisión o neto, fecha límite y seguimiento de pago para empresa. Se conservan resúmenes financieros e indicaciones de acciones pendientes.
- Detalle: enlace a `/contratos/:id` con solo icono de ojo, tooltip y etiqueta accesible; navegación por teclado disponible.
- Estados: se mantiene carga y listado vacío y se incorpora mensaje de error con reintento. Tabla con desplazamiento horizontal en móvil.
- Validación: compilación y verificación de tipos de frontend; pendiente revisión visual con sesión de empresa e influencer.

## 2026-10-27 — Revisión global de acciones en tablas

- Requerimiento: FE-013.
- Cambio: acciones de detalle y PDF de la tabla de pagos convertidas a botones solo con iconos, tooltip y etiqueta accesible por comprobante. La tabla de briefs ya cumplía.
- Validación: recorrido del AST de todas las plantillas Vue en src; detectadas 2 tablas con 5 acciones, todas sin texto visible ni label, con icono, tooltip y aria-label. Compilación y tipos satisfactorios.

## 2026-10-27 — Acción de detalle solo con icono

- Requerimiento: FE-012.
- Cambio: se retira el texto visible de la acción de detalle de briefs; queda el icono de ojo, con tooltip y etiqueta accesible por campaña, usando el mismo estilo de las otras acciones.
- Validación: revisión del cambio y `git diff --check`; sin cambios de lógica.

## 2026-10-27 — Tabla de briefs y detalle completo

- Tipo: Funcionalidad.
- Requerimientos relacionados: FE-012.
- Cambio: listado de briefs en tabla con campaña, fecha de creación, plataformas, presupuesto, calendario y acciones; desplazamiento horizontal en pantallas pequeñas.
- Detalle: acción «Ver detalle» abre un diálogo modal con la información completa del brief, recursos y adjuntos, e indicación explícita de la identificación publicitaria. Reutiliza BriefDetails y conserva textos multilínea.
- Se mantienen edición y eliminación con confirmación. El detalle se vincula por ID a los datos del store para evitar mostrar copias desactualizadas.
- Archivo: `src/views/campaigns/CampaignBriefsView.vue`.
- Validación: compilación y comprobación de tipos de frontend; revisión pendiente en navegador con sesión de empresa.

## 2026-10-27 — Vista independiente de Briefs de campaña

- Tipo: Funcionalidad / Refactorización.
- Requerimientos relacionados: FE-012.
- Cambio: gestión de briefs extraída del perfil a `src/views/campaigns/CampaignBriefsView.vue`, accesible en `/briefs` exclusivamente para empresa. Incluye formulario completo, archivos, validaciones, edición y eliminación con confirmación.
- Navegación: enlace «Briefs de campaña» para empresas en escritorio y móvil; el perfil conserva un acceso directo y deja de cargar los briefs.
- Estados: carga, error con reintento, listado vacío y error de eliminación.
- Backend: reutiliza `/campaigns` y sus restricciones por rol y propiedad; sin cambios en contratos ni en la selección de briefs desde el chat.
- Validación: compilación frontend y verificación de tipos satisfactorias; revisión de ruta protegida y extracción de responsabilidades del perfil.
- Pendiente: revisión visual y prueba interactiva con sesión de empresa.

## 2026-10-27 — Reinicio y validación de Docker

- Operación: `docker compose restart backend frontend`; ambos servicios quedaron activos. El código fuente se monta mediante volúmenes, por lo que no fue necesaria una reconstrucción de imágenes.
- Validación: API autenticada `GET /api/receipts` respondió HTTP 200 con subtotal, monto_iva y total_pagar numéricos; Vite sirvió la vista de pagos y la utilidad monetaria actualizadas con HTTP 200. Las 11 pruebas de IVA pasaron dentro del contenedor backend.
- Datos existentes: el comprobante REC-1793116067141-LHTP3Q conserva subtotal 315.00, IVA 0.00 y total 315.00. No se recalcularon importes históricos.
- Pendiente: recargar la página del navegador para renovar los datos de la sesión abierta.

## 2026-10-27 — Corrección de importes NaN en pagos

- Tipo: Corrección.
- Requerimientos relacionados: FE-010, FE-011.
- Causa: se formateaban campos del DTE sin comprobar si la respuesta los incluía o contenía números válidos.
- Cambio: normalización de importes DTE y formato monetario seguro para tabla, detalle y total; los datos ausentes o inválidos muestran «No disponible» y los ceros reales se conservan. Se informa cuando el desglose fiscal está incompleto, sin calcular impuestos históricos por inferencia.
- Archivos: `src/utils/money.ts`, `src/api/receipts.ts`, `src/views/pagos/ReceiptsView.vue`.
- Validación: compilación de frontend y comprobaciones con Node para campos ausentes, null, cadenas vacías, NaN, infinito, valores no numéricos, cero y decimales recibidos como texto.
- Pendientes: confirmar respuesta del servidor activo y revisar en navegador. Si la API anterior omite el desglose, debe ejecutarse la versión actual del backend para recibir los importes almacenados.

## 2026-10-27 — Desglose de IVA en documentos simulados

- Tipo: Corrección.
- Requerimientos relacionados: FE-011.
- Cambio: detalle de factura con subtotal sin IVA, IVA y total recibidos de la API.
- Validación: compilaciones de frontend y backend correctas; 11 pruebas de backend satisfactorias para cálculo, redondeo, montos inválidos y consistencia entre registro, JSON, detalle y PDF.
- Limitaciones: solo nuevos borradores simulados; documentos anteriores conservan sus valores. Pendiente validación visual y definición del tratamiento fiscal real antes de emisión oficial. Ver [IVA](../docs/IVA.md).
- Commit / PR: pendiente.

## 2026-10-27 — Historial de pagos con filtros y total

- Tipo: Funcionalidad.
- Requerimientos relacionados: FE-010.
- Cambio: la vista de pagos muestra filtros Desde/Hasta y tipo de operación, total en USD y cantidad de comprobantes. Incluye limpieza de filtros, fechas inclusivas en America/El_Salvador, orden descendente y mensajes para rango inválido o resultados vacíos.
- Cálculo: suma de montos de comprobantes filtrados en centavos; la interfaz aclara que no es saldo neto, porque un contrato puede aparecer como fondeo, comisión y pago.
- Archivos afectados: `src/views/pagos/ReceiptsView.vue`, `REQUERIMIENTOS.md` y esta bitácora.
- Backend: se reutiliza `GET /receipts`, que devuelve los comprobantes autorizados del usuario; no requiere cambios de API.
- Validación: `npm run build` completado; comprobaciones ejecutadas con Node y Vue sobre la lógica de la vista para orden, límites de fecha, filtros combinados, centavos, rango inválido, limpieza y resultados vacíos, todas satisfactorias.
- Pendientes: validación visual con sesión y datos reales en navegador; FE-010 permanece Por validar.
- Commit / PR: pendiente.

## 2026-10-27 — Creación del seguimiento documental

- Tipo: Documentación.
- Requerimientos relacionados: FE-001 a FE-009 (inventario inicial).
- Cambio: creación de `REQUERIMIENTOS.md` y `HISTORIAL_DESARROLLO.md`, con guía compartida en `../docs/README.md`.
- Contexto: se tomó como referencia `../claude.md` y la estructura actual de frontend. La presencia de módulos o vistas se registra como evidencia de código disponible, sin afirmar cumplimiento funcional.
- Validación: revisión documental y comprobación de enlaces locales. No se ejecutaron pruebas de aplicación por tratarse de archivos Markdown.
- Pendientes: verificar los criterios de cada requerimiento y registrar evidencia antes de pasar a Validado.
- Commit / PR: pendiente.

## Plantilla de entrada

```markdown
## AAAA-MM-DD — Título del cambio

- Tipo: Funcionalidad / Corrección / Refactorización / Documentación / Configuración.
- Requerimientos relacionados: FE-###.
- Cambio y motivo:
- Archivos o módulos afectados:
- Impacto y dependencias en la otra área:
- Validación: comando o escenario, resultado y evidencia; indicar si no se ejecutó.
- Pendientes / bloqueos:
- Responsable:
- Commit / PR:
```
