# Guías de perfil con Intro.js

Fecha: 2026-10-28. Versión instalada: 8.6.0.

## Uso

En Mi perfil, tanto empresa como influencer tienen la acción **Completar perfil con guía**, junto al estado del perfil. El recorrido se abre automáticamente al entrar si faltan datos importantes, después de cargar el perfil; aparece como máximo una vez por visita y puede repetirse manualmente. Está en español. Al iniciar abre la edición sin descartar un borrador ya abierto. No cambia valores, verifica redes, guarda datos ni envía formularios por cuenta del usuario.

Empresa: requisitos, identidad, presencia online, facturación, representante y guardado. Influencer: requisitos, presentación, oferta, identidad, redes, datos bancarios y guardado. Los elementos ausentes u ocultos se excluyen del recorrido.

El usuario puede salir con Escape o con el cierre del recorrido. Se muestran progreso y botones Anterior/Siguiente; al terminar, el formulario queda disponible para completarlo. Las interacciones del elemento destacado están bloqueadas durante la explicación para evitar guardados accidentales. Cambiar de ruta elimina el tour y sus capas. El foco vuelve al botón de inicio al cerrar, tras habilitarlo nuevamente.

## Integración

- `frontend/src/composables/useProfileTour.ts`: carga diferida de Intro.js, preparación y ciclo de vida compartidos.
- `frontend/src/assets/profile-tour.css`: colores, tipografía, botones, anchos para móvil y reducción de movimiento.
- Vistas de perfil: pasos específicos por rol y objetivos con IDs estables; no hay cambios de API o base de datos.
- Frontend Docker reconstruido para instalar la nueva dependencia de package.json y package-lock.json.

## Licencia

El paquete instalado se distribuye bajo AGPL-3.0. El proveedor también ofrece licencia comercial y señala su uso para aplicaciones comerciales. Debe revisarse y obtenerse la licencia aplicable antes de publicar una plataforma comercial; esta integración no compra ni acredita una licencia comercial.

Fuentes oficiales consultadas:

- [Intro.js: instalación y licencia](https://introjs.com/).
- [API de recorridos](https://introjs.com/docs/tour/api).
- [Opciones y accesibilidad por teclado](https://introjs.com/docs/tour/options).

## Validación

Compilación y tipos de frontend correctos. Pruebas para inicio voluntario, prevención de recorridos duplicados, filtrado de objetivos ausentes, traducciones, retorno de foco y limpieza al salir. Se verificaron dependencia y módulos HTTP 200 en Docker; pendiente recorrido visual en navegador con ambos roles.

## Inicio automático por datos pendientes

Empresa: nombre, rubro, teléfono, NIT, representante y documento, presencia online o logo pendiente según el checklist del servidor. Influencer: nombre/usuario, presentación, ubicación, identidad, rubros, red verificada, imagen o datos bancarios incompletos.

La comprobación ocurre después de la carga exitosa y la inicialización de formularios, nunca con un perfil nulo. Una actualización interna (por ejemplo, cambiar el logo) no vuelve a abrir automáticamente la guía durante la misma visita. La falta exclusiva de verificación del correo no abre una guía de edición, porque se resuelve con el enlace de verificación, no rellenando campos.
