# Registro: términos, privacidad y evidencia

Responsable indicado por el usuario: **InfluSmart**. Contacto de privacidad:
**admin@yopmail.com**. La finalidad comunicada es conectar creadores con comunidades
en redes sociales con empresas para monetizar servicios publicitarios.
Estos datos se pueden ajustar con `LEGAL_CONTROLLER_NAME` y `LEGAL_PRIVACY_EMAIL`.

## Base revisada y alcance

Se consultaron las fuentes oficiales el 2026-10-28:

- [Ley para la Protección de Datos Personales, Decreto 144](https://www.asamblea.gob.sv/leyes-y-decretos/view/6054).
- [Texto oficial de ACE, artículos 26 y 27 sobre consentimiento](https://agenciadeciberseguridad.gob.sv/documentos/decretos/decreto_144_proteccion_datos.pdf).
- [Referencia de la Asamblea a reformas de septiembre de 2026](https://asamblea.gob.sv/node/14116).

Los artículos 26 y 27 contemplan constancia electrónica y consentimiento libre,
específico, informado, expreso e individualizado. Aceptar términos contractuales
y autorizar finalidades de tratamiento se presentan como acciones separadas.
Esta implementación no certifica el cumplimiento integral de la ley ni sustituye
la revisión del texto consolidado y las políticas operativas por asesoría legal.

## Comportamiento

El último paso del registro de ambos roles muestra dos casillas sin preseleccionar,
con documentos legibles en modal con scroll y navegación por teclado. No autoriza
publicidad por correo. Si no cargan los documentos no se puede crear la cuenta.
Cambiar de rol reinicia las casillas. Una actualización de documentos invalida la
versión anterior y exige leer y aceptar nuevamente antes del alta.

`GET /api/auth/legal-documents` publica el texto realmente utilizado. Las versiones
incluyen fecha y una huella del contenido. El servidor exige booleanos `true` y las
versiones vigentes, incluso al llamar la API directamente.

`users.registration_consent` guarda un JSON con las dos aceptaciones, hora del
servidor, origen, textos, versiones y SHA-256, en la misma transacción de creación de
cuenta y perfil. No se devuelve en la sesión ni se selecciona en consultas normales.
Los registros anteriores permanecen sin evidencia; no se presume su aceptación.
No se agrega reaceptación de cuentas existentes en esta entrega.

Para entornos con `synchronize=false`, aplicar antes del despliegue:
`backend/scripts/database/add-registration-consent.sql`. El cambio agrega una
columna nullable y no rellena aceptaciones retroactivas. En desarrollo TypeORM
sincroniza esa columna conforme a la configuración existente.

## Aspectos que requieren definición operativa y revisión jurídica

Confirmar que InfluSmart identifica al responsable legal real y completar su
identificación/domicilio según corresponda; revisar el aviso con la lista real de
proveedores, países de tratamiento, condiciones de transferencias y plazos de
conservación por categoría. El correo debe ser un canal atendido y protegido para
gestionar derechos, retiro del consentimiento e identificación proporcional.

La casilla no sustituye la comprobación de representación de menores, firma del
tutor ni autorización escrita o equivalente que pueda requerirse para datos
sensibles. Se conservan las validaciones previas de tutor. No se añadió tratamiento
biométrico ni se considera que la casilla autorice datos sensibles indiscriminados.

## Validación

Pruebas de DTO heredados, rechazo de `false`, ausencia, cadenas y valores numéricos;
rechazo antes de escribir sin aceptación o con versiones antiguas; evidencia y
saneamiento de respuesta para ambos roles; validación del formulario y reseteo por
rol. Consulta real de documentos devuelve 200; altas vacías de ambos roles devuelven
400 por validación, sin crear cuentas ni enviar correos.
