# Especificación Técnica de Requerimientos: Plataforma de Influencer Marketing (Latam)
**Archivo de Configuración y Contexto para IA / Desarrollo (V1) - Stack: NestJS, Vue.js, PostgreSQL**

---

## 1. Visión General del Sistema
Plataforma web responsive que conecta marcas con influencers en Latinoamérica. El sistema gestiona el descubrimiento, la negociación y el cierre formal de acuerdos creativos. La monetización de la plataforma se basa en un modelo transaccional de consumo/recarga de créditos para empresas. Adicionalmente, el sistema ofrece una **pasarela de pagos en custodia (Escrow)** para garantizar que los fondos del contrato estén asegurados antes de que el influencer inicie a trabajar, liberándose únicamente tras la aprobación de los entregables.

---

## 2. Arquitectura del Stack Tecnológico

*   **Backend (NestJS):** Framework modular de Node.js en TypeScript. Administrará APIs REST (usuarios, contratos, finanzas), webhooks de Wompi y **NestJS Gateways** (WebSockets con Socket.io) para la mensajería en tiempo real y notificaciones instantáneas de cambios de estado en los pagos de custodia.
*   **Frontend (Vue.js):** Framework progresivo de JavaScript (Composition API + TypeScript). Proveerá una interfaz reactiva para el chat, el flujo de creación y aceptación de contratos, y estados de pago dinámicos.
*   **Base de Datos (PostgreSQL):** Motor relacional robusto. Asegura integridad transaccional estricta (ACID) tanto para el monedero de créditos de la empresa como para los estados financieros de los contratos en custodia (`Escrow`). Utiliza campos `JSONB` para los entregables del contrato.

---

## 3. Lineamientos de Identidad Visual (Corporate-Pop)

### 3.1 Paleta de Colores (Hexadecimal)
*   **Color Primario (Deep Navy - `#0F172A`):** Fondos principales, barras de navegación y textos ejecutivos. Transmite madurez, confianza y seguridad financiera.
*   **Acento Creativo (Vibrant Violet - `#7C3AED`):** Botones de acción principales (CTA), "Iniciar Chat", "Recargar" y enlaces clave. Representa dinamismo y multimedia.
*   **Acento Secundario (Neon Pink/Coral - `#F43F5E`):** Alertas de saldo bajo el umbral, notificaciones urgentes e indicadores de propuestas pendientes.
*   **Fondo de Superficies (Light Slate - `#F8FAFC`):** Fondo para tarjetas de perfiles, contenedores de chat y secciones internas para un contraste limpio.

### 3.2 Tipografía
*   **Cuerpo y Datos (Inter o Plus Jakarta Sans):** Alta legibilidad en pantallas móviles para mensajería, métricas y contratos.
*   **Títulos y Encabezados (Lexend o Clash Display):** Estilo geométrico para nombres de influencers y títulos de dashboards.

---

## 4. Arquitectura de Usuarios y Roles

### 4.1 Empresa (Marca / Contratante)
*   **Acceso:** Registro y buscador avanzado gratuito.
*   **Créditos por Uso:** Requiere balance de créditos por encima de su umbral mínimo para chatear.
*   **Liquidador de Contratos:** Deposita el valor total del contrato en la pasarela de custodia antes de iniciar la campaña y libera el pago al finalizar correctamente.

### 4.2 Influencer (Creador de Contenido)
*   **Acceso:** Registro y perfil público 100% gratuito.
*   **Onboarding Financiero:** Para recibir pagos de contratos completados, el influencer debe registrar su cuenta bancaria (banco, número de cuenta, tipo CORRIENTE/AHORROS) en su perfil. Los pagos se realizan vía **Wompi Dispersiones**.
*   **Restricción por Edad (Validación Legal):** 
    *   **Mayores de edad ($\ge$ 18 años):** Flujo estándar.
    *   **Menores de edad (< 18 años):** Exige obligatoriamente datos del **Tutor o Representante Legal** (Nombre, Documento de identidad, Correo) y confirmación bajo declaración jurada. Las firmas de contratos y la co-titularidad de cuentas financieras de retiro quedan vinculadas al tutor legal.

### 4.3 Administrador (Admin Panel)
*   **Control Global:** Modifica parámetros económicos. Interviene en casos de incumplimiento reportados por empresas.

---

## 5. Dinámica Económica y Reglas de Negocio

### 5.1 Lógica del Umbral de Seguridad y Créditos
*   **Bono de Bienvenida:** `$10.00` en créditos virtuales a la empresa al terminar el onboarding.
*   **Costo de Apertura:** Iniciar un chat consume **X** créditos (configurable por el Admin).
*   **Bloqueo Preventivo:** Si los créditos de la empresa caen por debajo de su umbral (Mínimo $5.00), los chats se congelan en **Solo Lectura**. NestJS rechaza los mensajes vía WebSocket y Vue.js bloquea la UI de escritura.

### 5.2 Flujo Completo de Negociación y Custodia (Escrow)

El sistema implementa un flujo de **7 fases** que cubre desde la propuesta inicial hasta la auditoría post-cierre:

#### Fase 1 — Propuesta y Negociación (en el Chat)
1.  La empresa crea una propuesta de colaboración (tarifa, entregables, plazo, PDF de contrato opcional) y la envía al influencer vía el chat.
2.  El influencer recibe la propuesta y puede:
    *   **Aceptar:** Se crea el contrato en estado `pending_payment`.
    *   **Rechazar:** La propuesta queda en estado `rejected`. El chat sigue activo para continuar negociando.
    *   **Contraoferta:** El influencer propone una tarifa diferente con justificación. La propuesta pasa a `countered` y la empresa recibe una notificación.
3.  Si hay contraoferta, la empresa puede:
    *   **Aceptar la contraoferta:** Se crea el contrato con la nueva tarifa.
    *   **Rechazar la contraoferta:** El flujo de propuesta termina (`counter_rejected`). Ambas partes pueden iniciar una nueva propuesta en el mismo chat.
4.  **Regla:** El PDF adjunto por la empresa en su propuesta original (o en la contraoferta aceptada) es el **documento legal oficial** del acuerdo. Si no se adjunta PDF, los términos del `proposal_data` JSON son el acuerdo vinculante.

#### Fase 2 — Fondeo en Custodia
5.  Una vez ambas partes acuerdan, el contrato existe en `pending_payment`. La empresa deposita el monto acordado mediante **Wompi Checkout**. Los fondos quedan retenidos en la plataforma (`funded_in_escrow`). El influencer es notificado vía WebSocket y puede comenzar a trabajar.

#### Fase 3 — Producción y Entrega de Archivos
6.  El influencer puede consultar en cualquier momento el contrato y sus requerimientos desde la vista de detalle del contrato.
7.  El influencer sube los archivos de los entregables. Se aceptan: **videos, banners, imágenes y archivos complementarios** (PDF, ZIP, etc.). El estado pasa a `under_review`.

#### Fase 4 — Revisión de Entregables (máx. 3 rondas)
8.  La empresa revisa los entregables. Puede:
    *   **Solicitar cambios:** Escribe feedback detallado. Se registra la ronda en `contrato_revision_rounds`. El contrato vuelve a `changes_requested`. El influencer re-sube los archivos corregidos.
    *   **Aprobar los entregables:** El contrato avanza a `pending_publication`.
9.  **Regla:** El sistema permite un **máximo de 3 rondas de cambios**. Si la empresa solicita una cuarta ronda, el sistema bloquea la acción y sugiere iniciar una disputa. El contador de rondas (`revision_round`) se persiste en `contratos_escrow`.

#### Fase 5 — Publicación en Redes Sociales
10. Con los entregables aprobados, el influencer procede a publicar el contenido en sus redes sociales.
11. El influencer registra en la plataforma las **URLs de las publicaciones** realizadas. El contrato pasa a `publication_review`.

#### Fase 6 — Revisión de Publicaciones y Cierre
12. La empresa verifica las publicaciones en redes. Puede:
    *   **Aprobar el cumplimiento:** Los fondos en custodia son liberados al influencer vía **Wompi Dispersiones**. El contrato pasa a `completed`.
    *   **Reportar incumplimiento:** La empresa describe el incumplimiento. El contrato pasa a `incumplimiento` y un Administrador interviene.

#### Fase 7 — Auditoría y Cierre
13. Al completarse el contrato, el sistema almacena en `contrato_audit_log` el historial completo: propuestas, contraofertas, archivos entregados, rondas de revisión, publicaciones y movimientos de pago.

---

### 5.3 Estados del Contrato (`contratos_escrow.status`)

| Estado | Descripción | Actor que lo origina |
|---|---|---|
| `pending_payment` | Contrato creado, esperando fondeo | Sistema (al aceptar propuesta) |
| `funded_in_escrow` | Fondos retenidos, influencer trabajando | Empresa (vía Wompi) |
| `under_review` | Influencer subió entregables, empresa revisando | Influencer |
| `changes_requested` | Empresa solicitó cambios (ronda N de 3) | Empresa |
| `pending_publication` | Entregables aprobados, esperando links de publicación | Empresa (al aprobar) |
| `publication_review` | Influencer registró publicaciones, empresa revisando | Influencer |
| `completed` | Contrato finalizado, fondos liberados vía Wompi Dispersiones | Empresa (aprobación final) |
| `incumplimiento` | Empresa reportó incumplimiento post-publicación | Empresa |

### 5.4 Estados de la Propuesta en Chat (`messages.proposal_status`)

| Estado | Descripción |
|---|---|
| `pending` | Propuesta enviada, esperando respuesta del influencer |
| `rejected` | Influencer rechazó la propuesta |
| `countered` | Influencer realizó una contraoferta |
| `counter_rejected` | Empresa rechazó la contraoferta |
| `accepted` | Propuesta aceptada (crea el contrato) |
| `funded` | El contrato asociado fue fondeado en escrow |

### 5.5 Integración Financiera (Wompi — único procesador de pagos)
*   **Wompi Checkout:** Para recarga de créditos corporativos y para el fondeo de contratos de custodia.
*   **Wompi Dispersiones:** Para el pago al influencer al completarse el contrato. Requiere que el influencer tenga registrada su cuenta bancaria (`banco_nombre`, `banco_cuenta_numero`, `banco_cuenta_tipo`) en su perfil.
*   **Webhooks:** Firmados con SHA256 (`WOMPI_*_EVENTS_KEY`). El servidor verifica la firma antes de procesar cualquier evento `transaction.updated`.
*   **Modos:** `FORMA_PAGO=desarrollo` (usa llaves sandbox) y `FORMA_PAGO=produccion` (usa llaves de producción).

---

## 6. Estructura de Datos e Interacciones en Chat

### 6.1 Brief de Campaña
Módulo estandarizado reutilizable adjuntable en chats con objetivos, tono de voz, Do's & Don'ts y recursos estéticos.

### 6.2 Propuesta, Contraoferta y Contrato Formal
Mensajes estructurados en JSON inyectados en el chat. El ciclo de negociación ocurre dentro del chat hasta que ambas partes acuerdan. El contrato se crea automáticamente al aceptar una propuesta o contraoferta.

**Estructura de `proposal_data` (JSONB en `messages`):**
```json
{
  "tarifa": 500,
  "entregables": [{ "tipo": "TikTok", "descripcion": "Video de 60s mencionando la marca" }],
  "plazo": "2026-07-30",
  "contrato_pdf_url": "https://cdn.hazloviral.com/contratos/abc123.pdf"
}
```

**Estructura de `contraoferta_data` (JSONB en `messages`):**
```json
{
  "tarifa_propuesta": 650,
  "justificacion": "Mi tarifa base para TikTok es de $650 por incluir edición profesional."
}
```

### 6.3 Entregables con Archivos (JSONB en `contratos_escrow.entregables`)
```json
[
  {
    "tipo": "TikTok",
    "descripcion": "Video de 60s con mención de producto",
    "archivos": [
      { "url": "https://cdn.hazloviral.com/entregables/video.mp4", "tipo_archivo": "video", "nombre": "tiktok_draft.mp4", "size_bytes": 52428800 }
    ]
  }
]
```
Tipos de archivo aceptados: `video`, `imagen`, `banner`, `documento`.

### 6.4 Publicaciones en Redes (`contratos_escrow.publication_links`)
```json
[
  { "red_social": "TikTok", "url": "https://tiktok.com/@usuario/video/123", "publicado_at": "2026-07-25T14:30:00Z" }
]
```

---

## 7. Diseño Físico de la Base de Datos (PostgreSQL)
## DB_HOST=localhost
## DB_PORT=5432
## DB_DATABASE=hazloViral
## DB_USERNAME=developer
## DB_PASSWORD=DevPass123
## NODE_ENV=development

```sql
-- 1. Usuarios y Autenticación
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'empresa', 'influencer', 'admin'
    stripe_customer_id VARCHAR(255) NULL,
    stripe_connect_id VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Perfil de Empresas y Billetera de Créditos
CREATE TABLE empresas_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nombre_comercial VARCHAR(255) NOT NULL,
    sitio_web VARCHAR(255) NULL,
    representante_nombre VARCHAR(255) NULL,                  -- Nombre del representante legal
    representante_tipo_identificacion VARCHAR(20) NULL,      -- 'DUI' | 'PASAPORTE'
    representante_numero_identificacion VARCHAR(50) NULL,    -- Número de DUI o pasaporte del representante
    balance_creditos NUMERIC(10, 2) DEFAULT 10.00,
    umbral_creditos NUMERIC(10, 2) DEFAULT 5.00
);

-- 3. Perfil de Influencers con Soporte Legal para Menores
CREATE TABLE influencers_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nombre_artistico VARCHAR(255) NOT NULL,
    bio TEXT NULL,
    ubicacion VARCHAR(100) NULL,
    tarifa_base NUMERIC(10, 2) DEFAULT 0.00,
    disponibilidad BOOLEAN DEFAULT TRUE,
    fecha_nacimiento DATE NOT NULL,
    es_menor_edad BOOLEAN GENERATED ALWAYS AS (fecha_nacimiento > CURRENT_DATE - INTERVAL '18 years') STORED,
    tipo_identificacion VARCHAR(20) NULL,       -- 'DUI' | 'PASAPORTE'
    numero_identificacion VARCHAR(50) NULL,     -- Número de DUI o pasaporte
    banco_nombre VARCHAR(100) NULL,             -- Nombre del banco para Wompi Dispersiones
    banco_cuenta_numero VARCHAR(50) NULL,       -- Número de cuenta bancaria
    banco_cuenta_tipo VARCHAR(20) NULL,         -- 'CORRIENTE' | 'AHORROS'
    tutor_nombre VARCHAR(255) NULL,
    tutor_documento_id VARCHAR(100) NULL,
    tutor_email VARCHAR(255) NULL,
    tutor_autorizacion BOOLEAN DEFAULT FALSE
);

-- 4. Métricas de Redes Sociales (verificación automática vía RapidAPI — ver §9)
CREATE TABLE influencer_metrics (
    id SERIAL PRIMARY KEY,
    influencer_id INT NOT NULL REFERENCES influencers_profiles(id) ON DELETE CASCADE,
    red_social VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL,
    seguidores INT DEFAULT 0,
    engagement_rate NUMERIC(5, 2) DEFAULT 0.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Repositorio de Briefs de Campaña
CREATE TABLE campaign_briefs (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES empresas_profiles(id) ON DELETE CASCADE,
    titulo_campana VARCHAR(255) NOT NULL,
    objetivo_principal TEXT NULL,
    tono_de_voz VARCHAR(100) NULL,
    puntos_clave_si TEXT NULL,
    restricciones_no TEXT NULL,
    recursos_esteticos TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Salas de Chat Abiertas
CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES empresas_profiles(id) ON DELETE RESTRICT,
    influencer_id INT NOT NULL REFERENCES influencers_profiles(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'blocked'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_chat_relation UNIQUE (empresa_id, influencer_id)
);

-- 7. Sistema de Contratos en Custodia (Escrow) — V2
CREATE TABLE contratos_escrow (
    id SERIAL PRIMARY KEY,
    chat_id INT NOT NULL REFERENCES chats(id) ON DELETE RESTRICT,
    empresa_id INT NOT NULL REFERENCES empresas_profiles(id) ON DELETE RESTRICT,
    influencer_id INT NOT NULL REFERENCES influencers_profiles(id) ON DELETE RESTRICT,
    monto_total NUMERIC(10, 2) NOT NULL,
    comision_plataforma NUMERIC(10, 2) DEFAULT 0.00,
    contrato_pdf_url VARCHAR(500) NULL,            -- PDF oficial del acuerdo
    entregables JSONB NOT NULL,                    -- Ver §6.3: incluye archivos subidos
    fecha_limite_entrega DATE NOT NULL,
    revision_round INT DEFAULT 0,                  -- Ronda actual de revisión (máx. 3)
    publication_links JSONB NULL,                  -- Ver §6.4: URLs de publicaciones en RRSS
    motivo_incumplimiento TEXT NULL,               -- Motivo si status = 'incumplimiento'
    status VARCHAR(50) DEFAULT 'pending_payment',
    -- Estados: 'pending_payment', 'funded_in_escrow', 'under_review',
    --          'changes_requested', 'pending_publication', 'publication_review',
    --          'completed', 'incumplimiento'
    stripe_charge_id VARCHAR(255) NULL,         -- Reutilizado para almacenar el txId de Wompi
    stripe_transfer_id VARCHAR(255) NULL,       -- Reutilizado para almacenar el payout txId de Wompi
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Historial de Mensajería, Propuestas y Contraofertas
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id),
    campaign_brief_id INT NULL REFERENCES campaign_briefs(id) ON DELETE SET NULL,
    contrato_id INT NULL REFERENCES contratos_escrow(id) ON DELETE SET NULL,
    message_text TEXT NULL,
    is_proposal BOOLEAN DEFAULT FALSE,
    proposal_data JSONB NULL,       -- {tarifa, entregables, plazo, contrato_pdf_url}
    contraoferta_data JSONB NULL,   -- {tarifa_propuesta, justificacion} — solo en contraofertas
    proposal_status VARCHAR(50) NULL,
    -- Estados: 'pending', 'rejected', 'countered', 'counter_rejected', 'accepted', 'funded'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Rondas de Revisión de Entregables (trazabilidad de cambios)
CREATE TABLE contrato_revision_rounds (
    id SERIAL PRIMARY KEY,
    contrato_id INT NOT NULL REFERENCES contratos_escrow(id) ON DELETE CASCADE,
    round_number INT NOT NULL,          -- 1, 2 ó 3
    feedback TEXT NOT NULL,             -- Descripción del cambio solicitado por la empresa
    requested_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Log de Auditoría de Contratos (inmutable, append-only)
CREATE TABLE contrato_audit_log (
    id SERIAL PRIMARY KEY,
    contrato_id INT NOT NULL REFERENCES contratos_escrow(id) ON DELETE CASCADE,
    actor_id INT NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,       -- 'proposal_accepted', 'funded', 'deliverables_submitted',
                                        -- 'changes_requested', 'deliverables_approved',
                                        -- 'publication_registered', 'approved', 'disputed', etc.
    previous_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NULL,
    metadata JSONB NULL,                -- Datos extra: monto, round_number, pdf_url, links, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Variables Económicas de Control (Admin)
CREATE TABLE global_settings (
    key VARCHAR(100) PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    description TEXT NULL
);

-- Índices Críticos
CREATE INDEX idx_metrics_search ON influencer_metrics(red_social, seguidores, engagement_rate);
CREATE INDEX idx_messages_chat_id ON messages(chat_id, created_at DESC);
CREATE INDEX idx_contratos_status ON contratos_escrow(status);
CREATE INDEX idx_audit_log_contrato ON contrato_audit_log(contrato_id, created_at DESC);
CREATE INDEX idx_revision_rounds_contrato ON contrato_revision_rounds(contrato_id);
```

---

## 8. Plan de Implementación — Nuevo Flujo de Negociación y Custodia

> Los pasos están ordenados por dependencia técnica. Cada bloque puede ser una rama/PR independiente.

### Bloque A — Base de Datos (Migraciones)
**A1.** Agregar columnas a `contratos_escrow`:
- `contrato_pdf_url VARCHAR(500)`
- `revision_round INT DEFAULT 0`
- `publication_links JSONB`
- `motivo_incumplimiento TEXT`
- Ampliar el `ENUM` (o `VARCHAR`) de `status` con: `changes_requested`, `pending_publication`, `publication_review`, `incumplimiento`

**A2.** Agregar columna a `messages`:
- `contraoferta_data JSONB NULL`
- Ampliar `proposal_status` con: `rejected`, `counter_rejected`

**A3.** Crear tabla `contrato_revision_rounds`.

**A4.** Crear tabla `contrato_audit_log`.

---

### Bloque B — Backend: Enums y Entidades (NestJS)
**B1.** Actualizar `src/common/enums.ts`:
- `ContratoStatus`: agregar `CHANGES_REQUESTED`, `PENDING_PUBLICATION`, `PUBLICATION_REVIEW`, `INCUMPLIMIENTO`
- `ProposalStatus`: agregar `REJECTED`, `COUNTER_REJECTED`

**B2.** Actualizar la entidad `ContratoEscrow` (`contrato-escrow.entity.ts`):
- Agregar campos `contrato_pdf_url`, `revision_round`, `publication_links`, `motivo_incumplimiento`

**B3.** Actualizar la entidad `Message`:
- Agregar campo `contraoferta_data`

**B4.** Crear entidades para las nuevas tablas:
- `ContratoRevisionRound` (`contrato-revision-round.entity.ts`)
- `ContratoAuditLog` (`contrato-audit-log.entity.ts`)

---

### Bloque C — Backend: Lógica de Negocio (ContratosService)
**C1.** Nuevo método `rejectProposal(user, dto)` — influencer rechaza propuesta → `proposal_status = rejected`.

**C2.** Nuevo método `counterProposal(user, dto)` — influencer envía contraoferta → crea nuevo mensaje con `contraoferta_data` y `proposal_status = countered`.

**C3.** Nuevo método `resolveCounter(user, dto)` — empresa acepta o rechaza contraoferta:
- Aceptar: crea contrato igual que `acceptProposal` pero con la tarifa de la contraoferta.
- Rechazar: marca el mensaje como `counter_rejected`.

**C4.** Actualizar `submitDeliverables` — recibir array de archivos con metadatos (`tipo_archivo`, `nombre`, `size_bytes`) en lugar de solo URL.

**C5.** Nuevo método `requestChanges(user, dto)` — empresa solicita cambios:
- Validar que `revision_round < 3`. Si es 3, lanzar `BadRequestException` sugiriendo disputa.
- Incrementar `revision_round`, crear registro en `contrato_revision_rounds`, cambiar status a `changes_requested`.

**C6.** Nuevo método `approveDeliverables(user, contratoId)` — empresa aprueba entregables → status `pending_publication`.

**C7.** Nuevo método `registerPublications(user, dto)` — influencer registra links de RRSS → guarda en `publication_links`, status `publication_review`.

**C8.** Nuevo método `reportNonCompliance(user, dto)` — empresa reporta incumplimiento → status `incumplimiento`, notifica Admin.

**C9.** Refactorizar `approveAndRelease` para que solo opere desde `publication_review` (antes operaba desde `under_review`).

**C10.** Crear `AuditService` o helper privado que inserte en `contrato_audit_log` en cada transición de estado. Llamarlo desde todos los métodos anteriores.

---

### Bloque D — Backend: Carga de Archivos
**D1.** Crear módulo `FilesModule` en NestJS con `POST /files/upload`:
- Aceptar `multipart/form-data`, validar tipos MIME (video/*, image/*, application/pdf, application/zip).
- Guardar en almacenamiento (S3 en producción, disco local en desarrollo con `multer`).
- Retornar `{ url, tipo_archivo, nombre, size_bytes }`.

**D2.** Exponer endpoint `POST /contratos/:id/upload-deliverable` que llame al `FilesModule` y adjunte el archivo al JSONB del contrato.

---

### Bloque E — Backend: DTOs y Controlador
**E1.** Crear DTOs:
- `RejectProposalDto` (`{ message_id }`)
- `CounterProposalDto` (`{ message_id, tarifa_propuesta, justificacion }`)
- `ResolveCounterDto` (`{ message_id, action: 'accept' | 'reject' }`)
- `RequestChangesDto` (`{ contrato_id, feedback }`)
- `RegisterPublicationsDto` (`{ contrato_id, publications: [{ red_social, url }] }`)
- `ReportNonComplianceDto` (`{ contrato_id, motivo }`)

**E2.** Agregar los nuevos endpoints al `ContratosController`:
- `POST /contratos/reject-proposal`
- `POST /contratos/counter-proposal`
- `POST /contratos/resolve-counter`
- `POST /contratos/:id/request-changes`
- `POST /contratos/:id/approve-deliverables`
- `POST /contratos/:id/register-publications`
- `POST /contratos/:id/report-noncompliance`
- `GET  /contratos/:id/audit-log`
- `GET  /contratos/:id/revision-rounds`

---

### Bloque F — Frontend: API y Store
**F1.** Actualizar `src/api/contracts.ts` con los nuevos endpoints (Bloque E2).

**F2.** Actualizar `src/stores/contracts.ts`:
- Agregar acciones para cada nuevo método del API.
- Actualizar la interfaz `Contract` con los nuevos campos (`revision_round`, `publication_links`, etc.).

---

### Bloque G — Frontend: ChatView — Negociación
**G1.** Agregar botón **"Rechazar"** en la tarjeta de propuesta del influencer → llama `rejectProposal`.

**G2.** Agregar panel de **contraoferta** en la tarjeta de propuesta del influencer:
- Campo de tarifa alternativa + justificación.
- Botón "Enviar contraoferta".

**G3.** Agregar tarjeta especial en el chat para las **contraofertas recibidas** (desde el influencer hacia la empresa):
- Muestra la tarifa propuesta y la justificación.
- Botones "Aceptar contraoferta" y "Rechazar contraoferta" para la empresa.

**G4.** Actualizar los badges de `proposal_status` para mostrar etiquetas en español.

---

### Bloque H — Frontend: ContratoDetailView — Flujo Completo
**H1.** Actualizar el timeline de estados para incluir los nuevos estados (`changes_requested`, `pending_publication`, `publication_review`).

**H2.** Influencer — sección "Subir entregables" (`funded_in_escrow` o `changes_requested`):
- Reemplazar el input de URL simple por un uploader de archivos multi-tipo (video, imagen, banner, documento).
- Mostrar historial de rondas previas y el feedback de la empresa.

**H3.** Empresa — sección "Revisión de entregables" (`under_review`):
- Reemplazar "Aprobar y liberar pago" por dos acciones separadas:
  - "Solicitar cambios" (con textarea de feedback, bloqueado si `revision_round >= 3`).
  - "Aprobar entregables" → avanza a `pending_publication`.

**H4.** Influencer — sección "Registrar publicaciones" (`pending_publication`):
- Formulario para agregar links de RRSS publicados (red social + URL).

**H5.** Empresa — sección "Revisión de publicaciones" (`publication_review`):
- Vista de los links registrados por el influencer.
- Botones "Aprobar y liberar fondos" y "Reportar incumplimiento".

**H6.** Agregar tab/sección **"Historial de auditoría"** visible para ambas partes: lista cronológica de todas las acciones del contrato (datos de `contrato_audit_log`).

---

### Bloque I — WebSocket Events
**I1.** Emitir desde el backend los nuevos eventos de Socket.io:
- `proposal_rejected`
- `proposal_countered`
- `counter_resolved` (con `action: 'accepted' | 'rejected'`)
- `changes_requested`
- `deliverables_approved`
- `publications_registered`
- `noncompliance_reported`

**I2.** Suscribir el frontend a estos eventos en `ChatView` y `ContratoDetailView` para actualizar estado en tiempo real sin recargar la página.

---

### Orden de ejecución recomendado
```
A (migraciones) → B (enums/entidades) → C (servicio) + D (archivos) → E (DTOs/controller) → F (API/store) → G + H (vistas) → I (WebSocket)
```

---

## 9. Estado de Implementación Actual (V2)

### 9.1 Funcionalidades completadas

#### Autenticación y Perfiles
- Registro/login con JWT. Verificación de correo vía token.
- Restablecimiento de contraseña por email.
- Subida de avatar con procesamiento de imagen (Sharp) — `POST /uploads/avatar`.
- Contraseñas: mínimo 8 caracteres, máximo 128, con mayúscula, minúscula, número y carácter especial.

#### Influencer — Username único
- Campo `username` (3–30 chars, solo letras/números/guión bajo) en `influencers_profiles`.
- Único en toda la plataforma. Usado para buscar y abrir chats desde la empresa.
- Endpoint: `GET /influencers/by-username/:username` (debe estar declarado **antes** de `GET /influencers/:id`).

#### Influencer — Perfil verificado
Un influencer está verificado (`is_verified`) cuando cumple **todos** los criterios:
1. Tiene documento de identidad registrado (DUI o Pasaporte).
2. Tiene al menos una red social con `is_verified = true`.
3. Tiene foto de perfil (`user.avatar_url` no nulo).
4. Tiene correo electrónico verificado (`user.is_email_verified = true`).
5. Tiene 16 años o más (calculado desde `fecha_nacimiento`).

**Consecuencias de no estar verificado:**
- No aparece en el buscador público (`GET /influencers/search`).
- La empresa no puede enviarle una propuesta de contrato (validación en `ChatsService.saveMessage`).
- La insignia de verificación (círculo violeta con ✓) aparece en perfil público, lista de búsqueda y header del chat.
- En su propio perfil ve un checklist con los requisitos pendientes.

`is_verified` es un getter calculado en `InfluencerProfile` entity (requiere relaciones `user` y `metrics` cargadas). El buscador usa `INNER JOIN` con condiciones SQL directas para filtrar en BD.

#### Sistema de Calificaciones (Ratings)
- Empresa califica al influencer (1–5 estrellas + comentario opcional) al finalizar un contrato.
- Una calificación por par empresa–influencer (upsert).
- Endpoints bajo `/influencers/:id/ratings`: `POST` (upsert), `GET /summary`, `GET /all`, `GET /mine`.
- El resumen (promedio y total) aparece en: perfil público, tarjetas del buscador y perfil propio (readonly).

#### Chat — Flujo ordenado
- **La empresa debe enviar un brief de campaña antes de poder proponer un contrato.** El botón de propuesta (📝) solo aparece si ya existe al menos un mensaje con `campaignBrief` en el historial.
- Al seleccionar un brief del picker, se deshabilita el botón por 2 s para evitar envío doble.
- Validación backend en `ChatsService.saveMessage`: un mensaje sin `message_text`, `is_proposal` ni `campaign_brief_id` es rechazado.
- Al guardar un mensaje, se recarga con relaciones (`sender`, `campaignBrief`, `contrato`) antes de emitir el evento WebSocket, para que el card sea reactivo sin recargar la página.

#### Chat — Estado completado
- Cuando un contrato pasa a `completed`, el chat se marca con `ChatStatus.COMPLETED` en BD y se emite el evento `contract_completed` por WebSocket.
- Al entrar a un chat, si no está marcado como completado en BD pero hay un mensaje `funded` con `contrato_id`, se consulta el contrato para detectar el estado (compatibilidad con contratos anteriores al cambio).
- En estado completado: no se puede enviar mensajes, briefs ni propuestas. Se muestra un banner "Contrato finalizado".

#### Chat — Doble check de lectura
- Columna `read_at TIMESTAMP NULL` en la tabla `messages`.
- Al hacer `join_chat` por WebSocket, el backend marca como leídos todos los mensajes del otro participante y emite `messages_read` a la sala con los IDs y el `read_at`.
- El frontend escucha `messages_read` y actualiza los mensajes en tiempo real.
- En los mensajes propios se muestra ✓ (enviado) o ✓✓ violeta (leído) según `read_at`.

#### Chat — Foto de perfil en la lista y header
- `listChats` carga la relación anidada `influencer.user` / `empresa.user` para incluir `avatar_url`.
- En la lista de chats y en el header del chat abierto: se muestra la foto si existe, o la inicial como fallback.

#### Contratos — Vista del influencer
- La comisión de la plataforma no se muestra al influencer. Solo ve "Monto total" y "Recibirás $X USD".
- La empresa sí ve el desglose completo (monto total + comisión + neto).

#### Contratos — Tooltips del timeline
- Al hacer hover sobre cada icono del stepper de estado, aparece un tooltip con explicación del paso.

---

## 10. Verificación Automática de Redes Sociales (Implementado)

### 9.1 Plataformas soportadas
Solo se permiten 4 redes sociales en la plataforma:

| Red | Verificación | API Host (RapidAPI) |
|-----|-------------|---------------------|
| TikTok | Automática | `TT_RAPIDAPI_HOST` (env) |
| Instagram | Automática | `IG_RAPIDAPI_HOST` (env) |
| Facebook | Automática | `facebook-scraper3.p.rapidapi.com` |
| YouTube | Manual (sin API) | — |

> Twitter/X, Twitch y LinkedIn han sido eliminados de la plataforma.

### 9.2 Arquitectura de verificación
- **`SocialVerificationService`** (`backend/src/influencers/social-verification.service.ts`): servicio inyectable que consulta RapidAPI con `fetch()` nativo (Node 18+).
- La verificación se ejecuta **antes de guardar** la métrica. Si falla → se lanza `BadRequestException` y no se persiste nada.
- Columnas añadidas a `influencer_metrics`: `is_verified BOOLEAN DEFAULT false`, `verified_at TIMESTAMP NULL`.
- **Cron semanal** (`@Cron('0 3 * * 0')`): re-verifica todas las métricas de plataformas soportadas cada domingo a las 3 AM.
- Endpoint manual de re-verificación: `POST /influencers/metrics/:id/verify` (rol: `influencer`).

### 9.3 Variables de entorno requeridas
```env
RAPIDAPI_KEY=           # Key única compartida por todas las APIs
IG_RAPIDAPI_HOST=       # Host del scraper de Instagram suscrito en RapidAPI
IG_RAPIDAPI_PATH=       # Path con {u} como placeholder del username
TT_RAPIDAPI_HOST=       # Host del scraper de TikTok suscrito en RapidAPI
TT_RAPIDAPI_PATH=       # Path con {u} como placeholder del username
```

### 9.4 Regla de negocio: contratos requieren verificación
**Una empresa no puede enviar una propuesta de contrato a un influencer que no tenga al menos una red social verificada (`is_verified = true`).**
- Validación en `ChatsService.saveMessage()` cuando `is_proposal = true`.
- Error retornado: `400 Bad Request` — "Este influencer aún no tiene redes sociales verificadas."
- La insignia de verificación (✓ violeta) es visible tanto en el perfil propio del influencer como en su perfil público.