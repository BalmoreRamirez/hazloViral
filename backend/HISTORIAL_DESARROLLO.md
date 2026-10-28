# Historial de desarrollo de Backend

[Guía de seguimiento](../docs/README.md) · [Requerimientos](REQUERIMIENTOS.md)

Registrar cambios en orden cronológico inverso. Esta bitácora comienza el 2026-10-27; no reconstruye fechas ni autoría de desarrollos previos.

## 2026-10-28 — Corregir backend antiguo tras recompilación en Docker

- Problema: proceso anterior mantenía ocupado el puerto 3009; la nueva instancia fallaba con EADDRINUSE y se servían rutas antiguas (404 en unread-count y 400 al interpretar top-ups como ID numérico).
- Causa: Nest CLI requiere ps para cerrar los procesos hijos en Linux; node:22-slim no incluye esa herramienta.
- Cambio: instalar procps en Dockerfile y reconstruir/recrear el servicio backend.
- Validación: consultas autenticadas como empresa a unread-count, top-ups y receipts devuelven HTTP 200; recargas y pagos siguen separados por tipo y propietario. Recompilación automática verificada con cambio temporal y restauración: reemplaza el proceso anterior sin dejar el puerto ocupado.

## 2026-10-28 — Separar pagos a influencers y recargas de empresa

- Requerimientos: FE-010, FE-016, BE-009.
- Cambio: GET /receipts para empresa devuelve únicamente influencer_payout de su propia cuenta. GET /receipts/top-ups, exclusivo de empresa, devuelve solo credits_top_up de esa empresa. El detalle individual y el reenvío de factura conservan la validación de propiedad.
- Validación: compilaciones de backend y frontend y seis pruebas del servicio de comprobantes aprobadas, incluidas consultas por operación y propietario y rechazo sin perfil.

## 2026-10-28 — Privacidad del contacto del influencer frente a empresa

- Requerimientos: FE-002, FE-003, BE-002, BE-004.
- Cambio: Interceptor HTTP para respuestas a empresa con listas explícitas de campos públicos en perfiles y métricas; elimina correo, identificadores de redes, domicilio, identificación, banco y tutor, incluidas relaciones anidadas de chats y contratos. WebSocket entrega remitentes sin correo ni identificadores de pagos. Bloquea contacto reconocible en nuevos mensajes de texto y oculta patrones en textos históricos. Oculta snapshot y enlace DTE del pago al influencer y deniega su descarga a empresa; no altera documentos originales ni datos guardados.
- Validación: compilación de backend y frontend y 55 pruebas de backend aprobadas, incluidas 14 de privacidad (anidación, campos futuros, roles, mensajes, snapshots y patrones de contacto).
- Alcance: no inspecciona contenido de imágenes/PDF, ni garantiza detectar contactos disimulados o impedir búsquedas externas por nombre artístico. Ver docs/PRIVACIDAD_INFLUENCER.md.

## 2026-10-28 — Contador seguro de mensajes sin leer

- Requerimientos: FE-003, BE-004.
- Cambio: GET /chats/unread-count cuenta solo mensajes recibidos sin read_at de conversaciones del usuario autenticado. POST /chats/:id/read valida participación antes de marcar lectura. Salas WebSocket privadas por usuario emiten unread_changed después de enviar un mensaje, sin publicar contenidos a otros usuarios.
- Validación: compilación de backend y frontend, comprobación de tipos y tres pruebas unitarias de conteo, exclusión de mensajes propios y aislamiento por rol.

## 2026-10-28 — Fotos de perfil limitadas a JPG y PNG

- Requerimiento: BE-008.
- Cambio: validación de extensión, MIME y formato real con Sharp para admitir solo JPG/JPEG y PNG antes de procesar el avatar. Se conserva límite de 5 MB y normalización interna a WebP, sin modificar imágenes existentes ni formatos de entregables.
- Validación: compilación backend y seis pruebas de archivos válidos, extensiones/MIME no permitidos, contenido corrupto y WebP renombrado como JPG.

## 2026-10-27 — Paginación real de reseñas

- Requerimientos: FE-009, BE-011.
- Backend: endpoints de reseñas de influencers y empresas devuelven { items, total, page, pageSize }, limitados a 6 por consulta con skip/take y orden updated_at DESC, id DESC para desempate estable. Query page validada como entero entre 1 y 100000; primera página por defecto.
- Frontend: ambos perfiles públicos consumen una sola página, muestran total general, controles Anterior/Siguiente, número de página, carga, error/reintento y estado vacío. Se elimina la descarga completa y el recorte local progresivo. Tras guardar una reseña se vuelve a la primera página.
- Resumen: promedio y total de todas las reseñas se conservan en el endpoint de resumen, independientemente de la página visible.
- Compatibilidad: respuesta de listado cambió de array a objeto paginado; todos los consumidores del repositorio fueron adaptados. Sin cambios de BD ni permisos para calificar.
- Validación: compilaciones backend/frontend, 8 pruebas de paginación/validación y pruebas de perfil público satisfactorias. Contenedores reiniciados y ambos endpoints verificados por API autenticada: tamaño 6 y página inválida devuelve 400.

## 2026-10-27 — Históricos normalizados a UTC−6

- Solicitud: actualizar también los datos históricos.
- Auditoría: se distinguieron timestamps locales generados por BD, instantes con zona y campos escritos explícitamente por Node cuando corría en UTC.
- Aplicado en BD: 15 lecturas de mensajes, 1 verificación social, 5 vencimientos de correo y fecha/hora del JSON de 1 DTE de desarrollo. Total: 22 registros.
- Conservado: fechas de creación ya locales, timestamptz e ISO con offset y campos de calendario. Sin cambios de saldo, importes ni estados de correo.
- Respaldo: `/app/uploads/maintenance/historical-timezone-24fa043c-4a0f-498e-9b39-c5542f480d6c/before.json`.
- Migración: `backend/src/common/scripts/normalize-historical-timezone.cjs`, transaccional, con registro en `app_maintenance_runs` para evitar doble desplazamiento.
- Validación: comparación de los 22 registros contra el respaldo y valores calculados; ninguna lectura anterior a creación. Reejecución protegida devuelve alreadyApplied sin modificar datos. Ver [política de fechas](../docs/FECHAS.md).

## 2026-10-27 — Unificación de fechas en UTC−6

- Auditoría: PostgreSQL en El Salvador, Node en UTC y columnas timestamp sin zona; combinación capaz de producir desfase de seis horas.
- Cambio: TZ de aplicación y Docker en America/El_Salvador; pool PostgreSQL con zona explícita. Frontend interpreta fechas sin hora y timestamps locales en UTC−6, independientemente del navegador; briefs y edades reutilizan utilidades compartidas.
- Histórico conocido: corregida hora del comprobante recuperado 3 de 18:00 a 12:00 local, con respaldo previo, sin cambios económicos.
- Validación: compilaciones correctas, 23 pruebas backend y pruebas frontend bajo Tokio y Los Ángeles; servicios recreados, roundtrip en tabla temporal y API autenticada satisfactorios.
- Alcance: ISO Z se conserva para transportar instantes inequívocos. No se desplazaron masivamente registros históricos mixtos. Detalle y limitaciones en [política de fechas](../docs/FECHAS.md).

## 2026-10-27 — Corrección de historial y envío de factura de recarga

- Solicitud: una recarga no aparecía en historial ni llegaba al correo. Auditoría encontró saldo 109.00 y ningún comprobante de recarga; SMTP estaba configurado. No existía conexión de envío de facturas de recarga.
- Corrección: nuevas recargas simuladas envían el PDF después de confirmar la transacción; errores de correo conservan factura_enviada=false sin repetir ni revertir el abono. Pagos vía comprobante de Wompi también invocan el envío de desarrollo. No se simula autorización fiscal oficial.
- Reintento: POST /receipts/:id/send-invoice, restringido a empresa y comprobantes propios. Historial muestra correo Enviado/Pendiente y acción de icono para enviar pendientes. No reenvía automáticamente comprobantes ya marcados como enviados.
- Recuperación: usuario confirmó $100 alrededor de las 12 p. m.; se creó comprobante id 3 con marca recovered y timestamp_approximate, a las 12:00 de El Salvador (18:00 UTC), sin nuevo abono. Base 88.50, IVA 11.50, total 100.00. Saldo verificado antes/después: 109.00.
- Correo: SMTP aceptó el mensaje con PDF adjunto al correo registrado de empresa; esto no confirma lectura ni llegada a bandeja principal.
- Herramienta: src/credits/scripts/recover-recharge.cjs; evalúa por defecto, requiere --apply para recuperar y enviar. Usa referencia estable para evitar duplicar la recuperación.
- Operación: reiniciados frontend/backend. API autenticada confirmó comprobante, DTE y estado de envío; descarga PDF correcta. Vite sirve el historial y controles de correo actualizados.
- Validación: compilaciones frontend/backend y 19 pruebas satisfactorias, incluidas aceptación de correo, fallo SMTP y no reenvío automático de documentos ya enviados.

## 2026-10-27 — Mejoras de recarga y factura PDF de desarrollo

- Requerimientos: FE-016, BE-009.
- Interfaz: tarjetas de saldo y recarga con alturas coherentes y todo el ancho disponible; paquetes más visibles, resumen de base/IVA incluido/total y saldo estimado. Historial con estado de factura, IVA y descarga PDF mediante icono, tooltip y etiqueta accesible.
- Documentos: nuevas recargas simuladas generan DTE BORRADOR de desarrollo con IVA incluido y receptor empresa. Acreditación, comprobante y registros de DTE/detalle comparten la transacción; un fallo de generación aborta la operación. La generación física del PDF ocurre antes del commit y puede dejar un archivo sin referencia si la transacción falla; no es descargable mediante la ruta protegida sin registro asociado.
- Pagos Wompi: creación de comprobante conecta con el mismo generador cuando DTE_MODE=development. Se reutiliza el documento existente si ya fue creado para ese comprobante.
- PDF: descripción y referencia propias de recarga, nombre de empresa y NIT cuando existe, sin inventar contrato; regeneración conserva la descripción guardada.
- Límite: no implementa firma, transmisión ni autorización fiscal de Hacienda. En producción no se emite un PDF de desarrollo como documento fiscal oficial; el historial muestra Sin emitir cuando no existe DTE. Las recargas anteriores no se facturan retroactivamente.
- Validación: compilaciones frontend/backend y 16 pruebas satisfactorias de desglose, PDF de recarga/pago y fallos de transacción. No se ejecutaron recargas reales ni se añadieron datos a la BD de usuario para probar.

## 2026-10-27 — Historial de recargas en tabla

- Requerimientos: FE-016, BE-003, BE-009.
- Cambio: tabla en Recargar saldo con fecha/hora de El Salvador, comprobante, transacción, monto y distinción de simulaciones. Solo incluye comprobantes credits_top_up de la empresa, ordenados del más reciente al más antiguo.
- Actualización: carga al entrar, al actualizar saldo y al terminar una simulación; estados de carga, error con reintento y listado vacío.
- Backend: las nuevas recargas simuladas guardan comprobante junto con la acreditación en la misma transacción; no se modifica la generación de comprobantes de pagos reales.
- Limitación: las simulaciones anteriores sin comprobante no se reconstruyen porque no hay registro de fecha y monto individual que permita hacerlo con certeza.
- Validación: compilaciones frontend/backend correctas y tres pruebas de registro transaccional, fallo de comprobante y no duplicación del flujo real. No se realizaron recargas contra la BD durante la validación.

## 2026-10-27 — Vista de recarga de saldo para empresas

- Requerimiento: FE-016.
- Cambio: formulario y checkout simulado extraídos del dashboard a la vista Recargar saldo, con ruta exclusiva para empresa y URL opaca. Incluye paquetes, monto personalizado validado, saldo actual, estado de chats, errores y acceso al historial de pagos.
- Accesos: menú de escritorio y móvil, indicador de saldo, alerta de saldo bajo, dashboard y chat.
- Flujo: se reutilizan los endpoints existentes; el monto de simulación queda fijado al abrir la confirmación y se bloquea la confirmación duplicada mientras procesa.
- Backend: retorno de Wompi actualizado a `/saldo/recargar`; retornos anteriores al dashboard se derivan a la nueva vista conservando la query. El mensaje de retorno indica que el abono depende de confirmación del proveedor.
- Validación: compilación frontend y backend, tipos y pruebas existentes de acceso; pendiente prueba visual y checkout real, sin ejecutar recargas durante la implementación.

## 2026-10-27 — Conciliación de ambas facturas existentes

- Solicitud: actualizar las dos facturas de la base de datos.
- Fuente contrastada: comprobantes de pago y neto de contratos (`monto_total - comision_plataforma`) coinciden en USD 180.00 y USD 315.00.
- DTE 1: corregido total histórico 720000.00 a 180.00; base 159.29 e IVA 20.71.
- DTE 2: base 278.76, IVA 36.24 y total 315.00 confirmados.
- Actualizados: cabeceras, detalle, JSON, total en letras y PDF. Se conservaron identificadores y fechas de emisión, sin modificar contratos ni comprobantes de pago.
- Respaldo previo: `/app/uploads/maintenance/iva-b7688243-9712-44c9-a587-1d6b5cec923a`.
- Herramienta: modo explícito `--reconcile-receipts --apply` del script de mantenimiento, restringido a borradores simulados y comprobantes coincidentes con sus contratos.
- Validación: ambas facturas verificadas mediante API autenticada y descarga de PDF, con base, IVA y total esperados.

## 2026-10-27 — Evaluación y regularización manual de IVA histórico

- Solicitud: evaluar datos existentes y actualizar documentos sin IVA.
- Evaluación: dos DTE tipo 03, ambiente 00, BORRADOR, sin firma ni sello y marcados como desarrollo.
- Aplicado: DTE id 2, base 278.76, IVA 36.24, total 315.00 sin cambio del monto pagado. Se actualizaron cabecera, detalle, JSON y PDF en una transacción para los registros de base de datos.
- Excluido: DTE id 1 tiene total 720000.00 pero su comprobante registra 180.00; requiere resolver esa discrepancia antes de regularizar el IVA.
- Respaldo previo: `/app/uploads/maintenance/iva-f06cc022-7b3b-46ba-8cc5-052253234c73` en el volumen persistente de uploads; contiene registros y PDF anterior, con permisos restringidos.
- Herramienta: `src/dte/scripts/backfill-development-iva.cjs`; por defecto solo evalúa, `--apply` aplica cambios a borradores simulados consistentes. Nunca modifica DTE firmados, transmitidos, exentos o ajenos al formato legado esperado.
- Validación: API autenticada y PDF devuelven base 278.76, IVA 36.24 y total 315.00; segunda evaluación no propone cambios, lo que comprueba que no aplica el IVA dos veces.

## 2026-10-27 — Reinicio y validación de Docker

- Operación: `docker compose restart backend frontend`; ambos servicios quedaron activos. El código fuente se monta mediante volúmenes, por lo que no fue necesaria una reconstrucción de imágenes.
- Validación: API autenticada `GET /api/receipts` respondió HTTP 200 con subtotal, monto_iva y total_pagar numéricos; Vite sirvió la vista de pagos y la utilidad monetaria actualizadas con HTTP 200. Las 11 pruebas de IVA pasaron dentro del contenedor backend.
- Datos existentes: el comprobante REC-1793116067141-LHTP3Q conserva subtotal 315.00, IVA 0.00 y total 315.00. No se recalcularon importes históricos.
- Pendiente: recargar la página del navegador para renovar los datos de la sesión abierta.

## 2026-10-27 — Desglose de IVA en documentos simulados

- Tipo: Corrección.
- Requerimientos relacionados: BE-013.
- Cambio: cálculo de IVA incluido al 13%, persistencia de monto_iva, base y tributo 20 en JSON y detalle; PDF con importes almacenados y exposición del desglose en GET /receipts.
- Validación: compilaciones de frontend y backend correctas; 11 pruebas de backend satisfactorias para cálculo, redondeo, montos inválidos y consistencia entre registro, JSON, detalle y PDF.
- Limitaciones: solo nuevos borradores simulados; documentos anteriores conservan sus valores. Pendiente validación visual y definición del tratamiento fiscal real antes de emisión oficial. Ver [IVA](../docs/IVA.md).
- Commit / PR: pendiente.

## 2026-10-27 — Creación del seguimiento documental

- Tipo: Documentación.
- Requerimientos relacionados: BE-001 a BE-012 (inventario inicial).
- Cambio: creación de `REQUERIMIENTOS.md` y `HISTORIAL_DESARROLLO.md`, con guía compartida en `../docs/README.md`.
- Contexto: se tomó como referencia `../claude.md` y la estructura actual de backend. La presencia de módulos o vistas se registra como evidencia de código disponible, sin afirmar cumplimiento funcional.
- Validación: revisión documental y comprobación de enlaces locales. No se ejecutaron pruebas de aplicación por tratarse de archivos Markdown.
- Pendientes: verificar los criterios de cada requerimiento y registrar evidencia antes de pasar a Validado.
- Commit / PR: pendiente.

## Plantilla de entrada

```markdown
## AAAA-MM-DD — Título del cambio

- Tipo: Funcionalidad / Corrección / Refactorización / Documentación / Configuración.
- Requerimientos relacionados: BE-###.
- Cambio y motivo:
- Archivos o módulos afectados:
- Impacto y dependencias en la otra área:
- Validación: comando o escenario, resultado y evidencia; indicar si no se ejecutó.
- Pendientes / bloqueos:
- Responsable:
- Commit / PR:
```
