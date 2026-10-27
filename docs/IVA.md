# IVA en los documentos de desarrollo

Revisión: 2026-10-27.

## Hallazgo

El generador simulaba un documento tipo 03, pero omitía `monto_iva` al guardar y mostraba impuestos de $0.00 en el PDF. No se estaba registrando el IVA de la operación simulada.

## Corrección y supuesto

Los nuevos borradores simulados consideran el importe recibido como un total con IVA del 13% incluido. Se obtiene la base dividiendo el total entre 1.13 y se registra el IVA como diferencia, conservando el total en centavos. Por ejemplo: $113.00 = $100.00 de base + $13.00 de IVA. Para $100.00, base $88.50 e IVA $11.50; el redondeo de una base ya redondeada puede diferir en un centavo.

El desglose se guarda en `dte_documents`, en el JSON de desarrollo y en el detalle con código de tributo `20`. El PDF y la vista de detalle muestran los valores almacenados. No se altera el monto transferido. Los documentos anteriores conservan sus importes registrados, incluidos aquellos cuyo IVA sea cero; no hay regularización histórica automática.

## Alcance fiscal pendiente

Este flujo solo genera borradores de desarrollo sin validez fiscal; no implementa un JSON oficial completo ni firma o transmisión a Hacienda. El tipo 03 corresponde a crédito fiscal; no equivale a una factura tipo 01, cuyos precios incluyen IVA conforme al manual.

El pago o dispersión al influencer por sí solo no determina la base imponible ni quién debe emitir el documento. Antes de emitir en producción se debe definir el prestador y receptor reales, condición tributaria, documento aplicable (incluido sujeto excluido cuando corresponda), operaciones gravadas/exentas/no sujetas, tratamiento de la comisión y retenciones, y si los precios pactados incluyen IVA. El desglose simulado no certifica cumplimiento de esas obligaciones.

## Fuentes oficiales consultadas

- [Ley de IVA, artículos 54 y 57 (Asamblea Legislativa)](https://www.asamblea.gob.sv/sites/default/files/documents/decretos/D4353A4C-CB73-4B82-9B9E-C0C94B40DE34.pdf).
- [Manual funcional DTE de Hacienda: tributo 20 y diferencias entre factura y crédito fiscal](https://www.transparenciafiscal.gob.sv/downloads/pdf/700-DGII-MN-2023-002.pdf).

## Regularización manual de históricos — 2026-10-27

A solicitud del usuario se evaluaron los dos documentos existentes. Se regularizó el DTE id 2 por un total de $315.00 (base $278.76 e IVA $36.24), con copia previa y comprobación de API y PDF. El DTE id 1 permanece pendiente porque su total de $720,000.00 no coincide con los $180.00 del comprobante asociado.

Para volver a evaluar dentro de Docker:

```sh
docker compose exec -T backend node src/dte/scripts/backfill-development-iva.cjs
```

El modo de aplicación usa `--apply`; solo corrige borradores simulados sin IVA cuyo detalle y comprobante coinciden. Las copias de respaldo se guardan en `uploads/maintenance` del contenedor, fuera de las rutas de descarga de DTE. No hay actualización automática al iniciar la aplicación.

## Conciliación posterior de las dos facturas — 2026-10-27

El usuario autorizó actualizar ambas facturas. Se comprobó que los contratos netos de comisión y sus comprobantes coinciden en $180.00 y $315.00. Se corrigió el DTE 1 a base $159.29, IVA $20.71 y total $180.00. El DTE 2 conserva base $278.76, IVA $36.24 y total $315.00. Ambos JSON, detalles, montos en letras y PDF fueron actualizados y verificados por API.

El modo explícito `--reconcile-receipts` de la herramienta permite tomar como total el comprobante únicamente si coincide con el neto del contrato. Sin `--apply` solo evalúa. La incidencia del total histórico de $720,000.00 queda resuelta.
