# Seguimiento del desarrollo

Documentación de requerimientos e historial de HazloViral / InfluSmart.

| Área | Requerimientos | Historial |
| --- | --- | --- |
| Frontend | [Requerimientos](../frontend/REQUERIMIENTOS.md) | [Historial](../frontend/HISTORIAL_DESARROLLO.md) |
| Backend | [Requerimientos](../backend/REQUERIMIENTOS.md) | [Historial](../backend/HISTORIAL_DESARROLLO.md) |

## Fuentes y alcance

La especificación de producto existente está en [claude.md](../claude.md). Los documentos por área organizan su seguimiento y referencian el código disponible al 2026-10-27. La existencia de código no acredita que una funcionalidad esté validada.

## Cómo mantener estos documentos

1. Registrar cada requerimiento con un ID estable (`FE-###` o `BE-###`), criterio de aceptación y estado.
2. Antes de desarrollar, actualizar su estado y enlazar dependencias entre áreas.
3. Al terminar un cambio, añadir una entrada al historial del área con los IDs afectados, archivos, validación y pendientes. Si afecta ambas áreas, registrar una entrada en cada historial y enlazarlas.
4. Marcar un requerimiento como validado únicamente con evidencia de sus criterios de aceptación.
5. Registrar cambios de alcance en la tabla de cambios de requerimientos, conservando la descripción anterior y el motivo. No reutilizar IDs retirados ni borrar entradas históricas.

Estados: **Pendiente**, **En desarrollo**, **Por validar** (hay código relacionado, falta verificar criterios), **Validado**, **Bloqueado**, **Descartado**.

Las entradas nuevas van primero, con fecha `AAAA-MM-DD` en la zona horaria America/El_Salvador. Enlazar commits o PR cuando existan. No registrar credenciales, tokens ni datos personales.
