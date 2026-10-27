# Historial de desarrollo de Backend

[Guía de seguimiento](../docs/README.md) · [Requerimientos](REQUERIMIENTOS.md)

Registrar cambios en orden cronológico inverso. Esta bitácora comienza el 2026-10-27; no reconstruye fechas ni autoría de desarrollos previos.

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
