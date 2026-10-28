# Privacidad del influencer frente a empresa

La política se aplica a respuestas HTTP autenticadas como empresa mediante
`InfluencerPrivacyInterceptor`, incluso a relaciones anidadas. Los perfiles se
proyectan a una lista explícita de campos permitidos. Se conserva la verificación
calculada antes de quitar los campos que la sustentan.

Se permiten ID interno, nombre artístico, biografía y ubicación con contacto
reconocible oculto, rubros, tarifa, disponibilidad, verificación y avatar. Las
métricas conservan plataforma, seguidores, engagement y verificación; excluyen
usuarios de redes. Los usuarios anidados conservan ID, rol y avatar. El correo de
la propia empresa sigue disponible para su cuenta.

Los eventos compartidos de chat y negociación usan la misma proyección segura.
Los mensajes nuevos con correo, teléfono, @usuario o enlaces de contacto
reconocibles son rechazados antes de persistir. Los textos históricos se ocultan
al responder, sin reescribir la base de datos. El influencer y el administrador
conservan los flujos de edición y administración de datos privados.

El snapshot del pago al influencer se restringe al nombre para empresa y se quita
su enlace DTE. La ruta de descarga también rechaza a empresa para ese tipo de
comprobante. Los documentos originales y su acceso por el influencer se conservan.
Las facturas de recarga de la propia empresa siguen disponibles.

## Límites

No se analiza contenido de imágenes, fotos, PDF ni archivos de entregables.
La detección textual no garantiza identificar ofuscaciones deliberadas. Conservar
nombre artístico, avatar y métricas permite evaluar al creador, pero también puede
permitir identificarlo mediante búsquedas externas. Esta política reduce las vías
directas de contacto expuestas por la aplicación; no garantiza impedir acuerdos
externos. Esos casos requieren moderación de contenido y reglas de uso.

## Validación

`npm test --prefix backend -- --runInBand` incluye pruebas de proyección recursiva,
campos privados nuevos, conservación de métricas y verificación, aislamiento por
rol, correo propio, mensajes, snapshots y detección de contacto. Las compilaciones
de frontend y backend verifican tipos y compatibilidad del cambio.
