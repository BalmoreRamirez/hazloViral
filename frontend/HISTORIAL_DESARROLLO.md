# Historial de desarrollo de Frontend

[Guía de seguimiento](../docs/README.md) · [Requerimientos](REQUERIMIENTOS.md)

Registrar cambios en orden cronológico inverso. Esta bitácora comienza el 2026-10-27; no reconstruye fechas ni autoría de desarrollos previos.

## 2026-10-28 — Guía limitada a campos pendientes

- Requerimiento: FE-019.
- Cambio: pasos generados desde los datos guardados de cada perfil. Cada campo pendiente tiene su propio objetivo; se omiten campos completos y pasos generales de introducción y guardado. Foto, presencia online y verificación social se incluyen únicamente cuando faltan.
- Influencer: abre la edición bancaria si hay campos bancarios pendientes para que cada paso apunte al control correspondiente. Conserva la exclusión de perfiles verificados completos.
- Validación: compilación, tipos y pruebas de ambos roles con exactamente dos campos pendientes, solo foto pendiente y ausencia de pasos para perfiles completos.

## 2026-10-28 — No mostrar guía con perfil verificado completo

- Requerimiento: FE-019.
- Causa: el criterio de orientación incluía datos adicionales aunque el servidor confirmara el perfil verificado y el indicador mostrara todos los requisitos cumplidos.
- Cambio: is_verified=true impide la guía y la tarjeta de orientación en ambos roles. El recorrido valida elegibilidad antes y después de cargar Intro.js y se cierra si el perfil se completa mientras está abierto; no vuelve a abrir edición por una acción pendiente.
- Validación: compilación y tipos, pruebas de perfil verificado con datos adicionales ausentes, bloqueo de apertura y cierre reactivo del recorrido.

## 2026-10-28 — Permitir cambiar foto durante edición del perfil

- Requerimientos: FE-002, FE-019.
- Causa: la edición abierta por la guía deshabilitaba la foto. También se bloqueaba al editar banco o redes del influencer.
- Cambio: foto disponible durante la edición, solo bloqueada mientras carga el perfil o si falla su carga. El influencer refresca los datos guardados y la verificación sin sobrescribir formularios pendientes. Mismo acceso durante edición para el logo de empresa.
- Accesibilidad y errores: botones con tipo explícito y etiqueta, selección por teclado, prevención de cargas simultáneas, iniciales si falla la imagen y error legible. Se mantienen JPG/PNG hasta 5 MB.
- Validación: compilación y tipos; pruebas existentes del frontend y pruebas de carga válida, rechazo de formato y prevención de doble subida. Sin sustituir la foto real del usuario durante las pruebas.

## 2026-10-28 — Separar pagos a influencers y recargas de empresa

- Requerimientos: FE-010, FE-016, BE-009.
- Cambio: Historial de pagos de empresa muestra solo pagos al influencer y calcula el total sobre esos pagos; no ofrece el filtro de operaciones ajenas a esa vista. Recargar saldo consulta el endpoint exclusivo de recargas, conservando historial, PDF y reenvío de factura.
- Validación: compilaciones de backend y frontend y seis pruebas del servicio de comprobantes aprobadas, incluidas consultas por operación y propietario y rechazo sin perfil.

## 2026-10-28 — Privacidad del contacto del influencer frente a empresa

- Requerimientos: FE-002, FE-003, BE-002, BE-004.
- Cambio: Buscador y perfil público muestran plataformas, seguidores y engagement sin usuarios de redes cuando el servidor restringe esos datos; no quedan separadores ni arrobas vacías. La protección principal se aplica en backend, no solo en presentación.
- Validación: compilación de backend y frontend y 55 pruebas de backend aprobadas, incluidas 14 de privacidad (anidación, campos futuros, roles, mensajes, snapshots y patrones de contacto).
- Alcance: no inspecciona contenido de imágenes/PDF, ni garantiza detectar contactos disimulados o impedir búsquedas externas por nombre artístico. Ver docs/PRIVACIDAD_INFLUENCER.md.

## 2026-10-28 — Tipografía y densidad unificadas

- Requerimiento: FE-008.
- Cambio: Helvetica Neue para cuerpo, títulos, controles y guía; respaldos Helvetica y Arial sin descargas de fuentes externas. Configuración Tailwind y especificación sincronizadas.
- Vistas: títulos compartidos en inicio, perfiles propios y públicos, buscador, chats, briefs, contratos, pagos, recargas, administración y registro. Autenticación conserva su marca y hereda la misma familia.
- Densidad: cuerpo 16 px / 1.5, datos 14 px / 1.5, metadatos desde 12 px, títulos adaptables 24–30 px. Tablas con estilo común y contratos con separación vertical reducida a 16 px. Botones compartidos de al menos 40 px y campos de 44 px; texto de campos móviles a 16 px.
- Validación: compilación y tipos de frontend, pruebas existentes y revisión estática de referencias tipográficas. Pendiente revisión visual en navegador en distintos sistemas: Helvetica Neue depende de su disponibilidad local.

## 2026-10-28 — Rol visible junto a Mi cuenta

- Requerimiento: FE-017.
- Corrección de alcance: mostrar Empresa, Influencer o Administrador debajo de Mi cuenta según el rol autenticado. Se retira el acceso adicional al perfil del menú principal incorporado al interpretar la solicitud anterior.
- Validación: comprobación de tipos de frontend y diferencias sin errores de formato.

## 2026-10-28 — Mi perfil visible en el menú

- Requerimiento: FE-017.
- Cambio: acceso directo Mi perfil con icono de usuario en el menú principal de empresa e influencer, tanto en escritorio como en móvil. Respeta rutas por rol, hover compartido y estado activo.
- Validación: compilación y comprobación de tipos de frontend.

## 2026-10-28 — Indicador de mensajes pendientes

- Requerimientos: FE-003, BE-004.
- Cambio: Icono de sobre junto a Mi cuenta para empresa e influencer, contador de mensajes sin leer (99+), enlace a Chats, etiqueta accesible y hover del sistema. Consulta inicial, actualización por WebSocket y reconciliación cada 15 segundos en pestañas visibles; limpieza de listeners al desmontar. Una conversación abierta y visible marca los mensajes recibidos como leídos.
- Validación: compilación de backend y frontend, comprobación de tipos y tres pruebas unitarias de conteo, exclusión de mensajes propios y aislamiento por rol.

## 2026-10-28 — Estándar global de hover

- Requerimiento: FE-008.
- Cambio: estilos compartidos para botones, enlaces, menús, tarjetas interactivas y filas de tablas. Fondo violeta claro, texto oscuro y borde visible; variante de contraste sobre navegación oscura y variante roja para acciones destructivas.
- Accesibilidad: estados equivalentes con teclado, foco visible, transiciones reducidas según preferencias y controles deshabilitados sin resaltado interactivo. Las tarjetas informativas no simulan una acción.
- Validación: compilación y comprobación de tipos del frontend; revisión de estilos compartidos y diferencias.

## 2026-10-28 — Hover visible en navegación del perfil

- Requerimiento: FE-008.
- Cambio: enlaces de En esta página en empresa e influencer con fondo violeta claro, texto violeta oscuro y borde lateral violeta al pasar el cursor o enfocar con teclado. Se reserva el ancho del borde para evitar desplazamientos.
- Validación: revisión del cambio y git diff --check; sin cambios de lógica.

## 2026-10-28 — Ocultar orientación cuando el perfil está completo

- Requerimiento: FE-019.
- Cambio: tarjeta de orientación visible únicamente después de cargar y mientras falten datos importantes, en ambos perfiles. Usa el mismo estado calculado que decide la apertura automática.
- Influencer: la evaluación usa las redes actuales del store para reflejar cambios y verificaciones sin recargar la página. La tarjeta desaparece al guardar el último dato pendiente.
- Validación: compilación, tipos y pruebas existentes de detección de perfiles completos/incompletos.

## 2026-10-28 — Asteriscos en campos obligatorios

- Requerimientos: FE-001, FE-002, FE-008.
- Cambio: marca reutilizable RequiredMark con asterisco visible y texto accesible «obligatorio» en registro, edición de perfil de empresa e influencer, datos bancarios y redes. Se acompaña de una leyenda explicativa.
- Se mantienen sin asterisco los datos opcionales para guardar, aunque puedan formar parte de requisitos adicionales de verificación. Se conservan las validaciones por rol y tutor.
- Accesibilidad: semántica required en controles y corrección de IDs distintos para username personal y de la red social.
- Validación: compilación, tipos y pruebas existentes del registro.

## 2026-10-28 — Fotos de perfil limitadas a JPG y PNG

- Requerimientos: FE-002, BE-008.
- Cambio: selector y validación cliente limitados a JPG/JPEG y PNG, hasta 5 MB. Backend comprueba extensión, MIME y formato real mediante Sharp antes de procesar y actualizar el avatar. Rechaza WebP, GIF, SVG y contenido que no coincide con lo declarado.
- UX: guía de foto/logo y ayuda visible actualizadas a los formatos admitidos; los errores no reemplazan la foto actual.
- Procesamiento: se conserva la normalización interna a WebP 400x400 y el servicio de avatares existentes; esta restricción se aplica al archivo de entrada y no cambia los formatos de entregables.
- Validación: compilaciones backend/frontend y seis pruebas de formatos válidos, MIME/extensión no permitidos, contenido corrupto y WebP renombrado como JPG.

## 2026-10-28 — Paso de foto y logo en la guía del perfil

- Requerimiento: FE-019.
- Corrección: se añade un paso específico que destaca el avatar en ambos perfiles, explica cambiar foto o logo, formatos aceptados y actualización tras la subida.
- Se aclara que debe terminarse la guía y guardar/cancelar la edición antes de subir la imagen, conservando la protección del borrador y el bloqueo de interacciones durante el tour.
- Validación: compilación y tipos de frontend.

## 2026-10-28 — Guía automática para perfiles incompletos

- Requerimiento: FE-019.
- Cambio: inicio automático de Intro.js tras cargar exitosamente el perfil si faltan datos importantes de marca/identidad/contacto o presentación/redes/cuenta bancaria del creador. No se abre con perfil nulo ni por verificación de correo como único pendiente.
- Frecuencia: máximo una apertura automática por visita; actualizar imagen o datos en la misma vista no vuelve a lanzar el recorrido. El botón manual se conserva y las siguientes visitas vuelven a comprobar los datos reales.
- Validación: compilación y tipos correctos; tres pruebas de detección de pendientes y dos de ciclo de vida del recorrido satisfactorias.

## 2026-10-28 — Onboarding del perfil con Intro.js

- Requerimiento: FE-019.
- Cambio: Intro.js 8.6.0 y botón Completar perfil con guía en empresa e influencer. Recorridos en español específicos por rol, preparación de edición, progreso, salida por Escape y repetición; no modifican ni envían datos.
- UX: se evita iniciar durante carga/guardado o edición bancaria; se respeta el borrador de perfil abierto, se omiten objetivos ausentes y se restituye el foco al cerrar. El recorrido se destruye al salir de la vista.
- Presentación: estilos alineados a la marca, ancho adaptable y reducción de movimiento. Carga diferida del JavaScript para no iniciar ni ejecutar el recorrido al entrar.
- Validación: compilación, tipos y pruebas del ciclo de vida satisfactorios. Frontend Docker reconstruido; dependencia instalada y módulos de perfil responden HTTP 200. Pendiente prueba visual en navegador.
- Licencia: AGPL-3.0 con opción comercial; ver [notas de integración y fuentes oficiales](../docs/INTROJS.md) antes de publicación comercial.

## 2026-10-27 — Menú de cuenta sin cierre por pérdida de foco

- Incidencia: al pulsar el correo en Mi cuenta, el usuario reportó una pestaña Chromium con SIGILL; la URL seguía siendo el dashboard. El correo era un párrafo sin destino de navegación.
- Corrección preventiva: reemplazado details/summary y la mutación de open durante focusout por un desplegable controlado con estado Vue. Pulsar o seleccionar el correo no cierra el panel ni navega; cierre por botón, Escape, enlace o clic exterior. Escape devuelve foco al botón.
- Accesibilidad: botón nativo con aria-expanded y aria-controls, panel etiquetado y correo seleccionable.
- Validación: compilación y tipos correctos. No se reprodujo el fallo nativo SIGILL en un navegador; no se atribuye su causa al código sin esa evidencia.

## 2026-10-27 — Cabecera de registro alineada al contenido

- Requerimientos: FE-001, FE-008.
- Cambio: cabecera con contenedor max-w-6xl alineado al formulario, logo y acceso en una fila, botón Iniciar sesión con mayor área de interacción y foco visible. El texto auxiliar se oculta en móvil para evitar saturación.
- Validación: compilación y tipos de frontend.

## 2026-10-27 — Registro guiado para empresa e influencer

- Requerimiento: FE-001, FE-008.
- UI: diseño de dos columnas en escritorio con contexto por rol y formulario principal; una columna adaptable en móvil. Selector de perfil con radios nativos, progreso de tres pasos e identidad visual coherente con la aplicación.
- UX: Tu cuenta → Tu empresa/Tu perfil → Verificación. Solo se validan los campos de la etapa al avanzar; validación completa antes de crear la cuenta. Se conservan los datos al retroceder y los errores de servidor no borran el formulario.
- Seguridad/usabilidad: mostrar/ocultar contraseña, requisitos visibles, autofill de correo/contraseña y etiquetas asociadas. Datos fiscales opcionales se expanden si tienen errores. Se bloquean avances duplicados, cambios de rol y envíos mientras procesa.
- Reglas: máscaras de DUI/pasaporte, representante legal y tutor para menores conservados; no se cambia el payload ni los requisitos del backend.
- Validación: compilación y tipos, pruebas de avance condicionado por validación, doble clic, verificación obligatoria y tutor requerido. No se crearon cuentas reales para probar.
- Pendiente: revisión visual y recorrido interactivo en navegador.

## 2026-10-27 — Paginación real de reseñas

- Requerimientos: FE-009, BE-011.
- Backend: endpoints de reseñas de influencers y empresas devuelven { items, total, page, pageSize }, limitados a 6 por consulta con skip/take y orden updated_at DESC, id DESC para desempate estable. Query page validada como entero entre 1 y 100000; primera página por defecto.
- Frontend: ambos perfiles públicos consumen una sola página, muestran total general, controles Anterior/Siguiente, número de página, carga, error/reintento y estado vacío. Se elimina la descarga completa y el recorte local progresivo. Tras guardar una reseña se vuelve a la primera página.
- Resumen: promedio y total de todas las reseñas se conservan en el endpoint de resumen, independientemente de la página visible.
- Compatibilidad: respuesta de listado cambió de array a objeto paginado; todos los consumidores del repositorio fueron adaptados. Sin cambios de BD ni permisos para calificar.
- Validación: compilaciones backend/frontend, 8 pruebas de paginación/validación y pruebas de perfil público satisfactorias. Contenedores reiniciados y ambos endpoints verificados por API autenticada: tamaño 6 y página inválida devuelve 400.

## 2026-10-27 — Distribución compacta de reseñas de influencers

- Requerimiento: FE-009.
- Cambio: reseñas en tarjetas de una, dos o tres columnas según pantalla; cada tarjeta agrupa inicial de la empresa, nombre, fecha y puntuación. Las estrellas quedan junto al contenido y no en el extremo opuesto de una fila de ancho completo.
- Lectura: comentarios con saltos de línea, ajuste de palabras largas y separación visual; fecha semántica y puntuación numérica junto a estrellas.
- Validación: compilación y tipos correctos; sin cambios de datos ni permisos.

## 2026-10-27 — Acceso al perfil del influencer desde el chat

- Requerimientos: FE-002, FE-003.
- Causa: el interlocutor de tipo influencer no incluía profile_url, por lo que su nombre no se renderizaba como enlace para la empresa.
- Corrección: enlace al perfil público del influencer usando influencer_id del chat y viewPath para la ruta opaca. Nombre clicable y acción explícita con icono de ojo en cabecera para ambos roles, con tooltip y etiqueta accesible correspondientes.
- Validación: compilación y tipos correctos; no se modifican permisos ni endpoints de backend.

## 2026-10-27 — Rediseño de perfil público de empresa

- Requerimientos: FE-002, FE-008.
- UI: portada compacta por rubro, logo con fallback, identidad de marca y reputación; indicadores de colaboraciones, creadores distintos y reportes con explicación de su alcance. Descripción y reseñas en columna principal; datos generales, verificación y canales públicos en lateral.
- Propietario: se comprueba el ID de su empresa para mostrar aviso de vista previa y enlace de edición solamente en su propio perfil. Otros visitantes ven únicamente el DTO público ya existente.
- UX: carga visual, distinción entre 404 y error de conexión, reintento independiente de reseñas y comprobación de elegibilidad. Un fallo de valoraciones ya no oculta una empresa existente. Reseñas ordenadas con carga progresiva de cinco en cinco.
- Calificaciones: formulario accesible con contador, prevención de doble envío y comentario conservado ante fallo. Mensaje de éxito solo tras guardar; error al refrescar opiniones no se presenta como fallo de guardado.
- Enlaces: solo HTTP/HTTPS, pestaña nueva con noopener/noreferrer. No se agregan datos bancarios, fiscales ni personales privados a la vista pública.
- Validación: compilación y tipos correctos; pruebas para reseñas caídas, perfil 404, preservación del comentario ante fallo y protocolos de enlaces. Pendiente revisión visual en navegador.

## 2026-10-27 — Rediseño de Mi perfil de empresa e influencer

- Requerimientos: FE-002, FE-008.
- UI común: resumen de identidad con avatar editable y estado, panel de requisitos con progreso, navegación por secciones y contenido principal adaptable. Se eliminan portadas altas y duplicaciones de identidad para priorizar los datos útiles.
- Empresa: identidad, presencia online, contacto/facturación y representante en secciones delimitadas. Vista pública y acceso a briefs conservados; requisitos se obtienen del checklist del servidor.
- Influencer: presentación y ubicación, oferta/disponibilidad e identificación privada separadas; redes y cuenta bancaria con accesos directos. Verificación usa los requisitos existentes, sin cambiar las reglas de negocio.
- UX: guardar/cancelar visibles al editar, prevención de envíos duplicados, restauración de datos al reabrir edición tras cancelar, etiquetas de formulario asociadas a controles, foco visible y mensajes de carga/error/reintento/éxito.
- Privacidad visual: cuenta bancaria oculta por defecto salvo últimos cuatro caracteres, con control accesible para mostrar/ocultar; la identificación y los datos bancarios siguen disponibles para su titular.
- Errores: fallos de carga, guardado bancario y acciones sobre redes ya no quedan sin mensaje. Los datos introducidos se conservan si guardar falla.
- Validación: compilación y tipos correctos; no se modificó la API ni la BD. Pendiente revisión visual e interacción en navegador con ambos roles.

## 2026-10-27 — Rediseño del inicio de empresa e influencer

- Requerimiento: FE-018.
- UI: cabecera con identidad del perfil, fecha local y CTA principal; cuatro indicadores prioritarios, área principal para siguientes pasos/contratos y columna de cuenta/perfil/conversaciones. Distribución adaptable de una a cuatro columnas y navegación por enlaces accesibles.
- Empresa: actividad contractual, fondos en custodia, revisión y fondeo; acceso visible a saldo, recarga y facturas.
- Influencer: tareas de entrega/cambios/publicación, ingresos netos en proceso y confirmados; nombre artístico, verificación y cuenta bancaria según datos reales del perfil.
- UX: pendientes específicos por rol, ordenados por prioridad y plazo; estados vacíos con siguiente paso; carga explícita y fallo independiente por sección, sin presentar una consulta fallida como cero. Actualización manual y hora de última consulta de El Salvador.
- Cálculos: confirmados según payout_status o referencia de transferencia válida, excluyendo estados failed/processing; montos de contratos en curso separados de ingresos recibidos. Operaciones monetarias en centavos para evitar errores de suma.
- Compatibilidad: se mantiene el retorno de checkout anterior al dashboard y el acceso al panel de administración.
- Validación: compilación y tipos correctos; pruebas de tareas por rol, ingresos confirmados frente a pendientes/fallidos, resumen vacío y centavos, además de pruebas existentes de acceso y fechas.
- Pendiente: revisión visual e interacción con sesiones reales en navegador; no se dispone de navegador automatizado en el entorno.

## 2026-10-27 — Históricos normalizados a UTC−6

- Solicitud: actualizar también los datos históricos.
- Auditoría: se distinguieron timestamps locales generados por BD, instantes con zona y campos escritos explícitamente por Node cuando corría en UTC.
- Aplicado en BD: 15 lecturas de mensajes, 1 verificación social, 5 vencimientos de correo y fecha/hora del JSON de 1 DTE de desarrollo. Total: 22 registros.
- Conservado: fechas de creación ya locales, timestamptz e ISO con offset y campos de calendario. Sin cambios de saldo, importes ni estados de correo.
- Respaldo: `/app/uploads/maintenance/historical-timezone-24fa043c-4a0f-498e-9b39-c5542f480d6c/before.json`.
- Migración: `backend/scripts/timezone/normalize-historical-timezone.cjs`, transaccional, con registro en `app_maintenance_runs` para evitar doble desplazamiento.
- Validación: comparación de los 22 registros contra el respaldo y valores calculados; ninguna lectura anterior a creación. Reejecución protegida devuelve alreadyApplied sin modificar datos. Ver [política de fechas](../docs/FECHAS.md).

## 2026-10-27 — Unificación de fechas en UTC−6

- Auditoría: PostgreSQL en El Salvador, Node en UTC y columnas timestamp sin zona; combinación capaz de producir desfase de seis horas.
- Cambio: TZ de aplicación y Docker en America/El_Salvador; pool PostgreSQL con zona explícita. Frontend interpreta fechas sin hora y timestamps locales en UTC−6, independientemente del navegador; briefs y edades reutilizan utilidades compartidas.
- Histórico conocido: corregida hora del comprobante recuperado 3 de 18:00 a 12:00 local, con respaldo previo, sin cambios económicos.
- Validación: compilaciones correctas, 23 pruebas backend y pruebas frontend bajo Tokio y Los Ángeles; servicios recreados, roundtrip en tabla temporal y API autenticada satisfactorios.
- Alcance: ISO Z se conserva para transportar instantes inequívocos. No se desplazaron masivamente registros históricos mixtos. Detalle y limitaciones en [política de fechas](../docs/FECHAS.md).

## 2026-10-27 — Modal de creación y edición de briefs

- Requerimiento: FE-012.
- Cambio: formulario inline trasladado a Dialog de PrimeVue para crear y editar. Ancho adaptable hasta 64rem y altura máxima 90dvh; contenido con scroll interno, encabezado y pie de acciones fuera del área desplazable, y bloqueo del scroll del fondo.
- Organización: cinco secciones delimitadas (campaña, entregables/calendario, contenido, presupuesto/condiciones y recursos), pares de campos relacionados en dos columnas desde sm y una columna en móvil. Etiquetas asociadas a controles por ID.
- Operación: submit de formulario, validaciones y archivos existentes conservados; se previenen guardados duplicados y cierres/cancelación durante guardado o subida. Cerrar restablece el formulario.
- Validación: compilación y tipos correctos; pendiente revisión visual del modal en navegador.

## 2026-10-27 — Columna Fecha contrato

- Requerimiento: FE-005.
- Cambio: fecha de creación (`created_at`) movida desde la celda Contrato a la columna independiente Fecha contrato, para empresa e influencer. Se usa el formato de fecha de El Salvador y se redistribuyen los anchos de columnas al 100% por rol.
- Validación: compilación y tipos de frontend.

## 2026-10-27 — Corrección de historial y envío de factura de recarga

- Solicitud: una recarga no aparecía en historial ni llegaba al correo. Auditoría encontró saldo 109.00 y ningún comprobante de recarga; SMTP estaba configurado. No existía conexión de envío de facturas de recarga.
- Corrección: nuevas recargas simuladas envían el PDF después de confirmar la transacción; errores de correo conservan factura_enviada=false sin repetir ni revertir el abono. Pagos vía comprobante de Wompi también invocan el envío de desarrollo. No se simula autorización fiscal oficial.
- Reintento: POST /receipts/:id/send-invoice, restringido a empresa y comprobantes propios. Historial muestra correo Enviado/Pendiente y acción de icono para enviar pendientes. No reenvía automáticamente comprobantes ya marcados como enviados.
- Recuperación: usuario confirmó $100 alrededor de las 12 p. m.; se creó comprobante id 3 con marca recovered y timestamp_approximate, a las 12:00 de El Salvador (18:00 UTC), sin nuevo abono. Base 88.50, IVA 11.50, total 100.00. Saldo verificado antes/después: 109.00.
- Correo: SMTP aceptó el mensaje con PDF adjunto al correo registrado de empresa; esto no confirma lectura ni llegada a bandeja principal.
- Herramienta: scripts/credits/recover-recharge.cjs; evalúa por defecto, requiere --apply para recuperar y enviar. Usa referencia estable para evitar duplicar la recuperación.
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

## 2026-10-27 — Encabezado de navegación en una sola fila

- Requerimiento: FE-017.
- Cambio: logo, enlaces agrupados con separadores discretos, saldo y Mi cuenta comparten una fila en escritorio amplio. Los títulos de grupo se mantienen como etiquetas accesibles sin ocupar otra fila.
- Adaptación: por debajo de 1536 px, botón de menú con panel desplegable sobre el contenido; evita saltos de línea o compresión de enlaces. El rol permanece dentro de Mi cuenta.
- Validación: compilación y tipos de frontend; pendiente revisión visual en navegador.

## 2026-10-27 — Menú por rol y tareas

- Requerimiento: FE-017.
- Cambio: navegación de empresa agrupada en General/Inicio, Campañas (briefs, búsqueda, chats, contratos) y Finanzas (recarga, historial). Influencer: Inicio, Colaboraciones y Mis pagos; administrador: Inicio y Administración.
- Cuenta: correo y rol dentro de Mi cuenta, con acceso a perfil y cerrar sesión. Saldo de empresa visible y enlazado a recarga.
- Móvil: botón de apertura con aria-expanded y menú completo por rol, reemplazando la navegación parcial anterior. Estado activo también en detalles de chat, contrato e influencer.
- Accesibilidad: controles nativos, etiquetas de navegación, iconos decorativos, foco visible, cierre de cuenta mediante Escape, salida de foco o clic exterior.
- Validación: compilación y tipos correctos; pendiente revisión visual e interacción en navegador.

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
