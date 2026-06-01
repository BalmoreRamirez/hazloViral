# Especificación Técnica de Requerimientos: Plataforma de Influencer Marketing (Latam)
**Archivo de Configuración y Contexto para IA / Desarrollo (V1) - Stack: NestJS, Vue.js, PostgreSQL**

---

## 1. Visión General del Sistema
Plataforma web responsive que conecta marcas con influencers en Latinoamérica. El sistema gestiona el descubrimiento, la negociación y el cierre formal de acuerdos creativos. La monetización de la plataforma se basa en un modelo transaccional de consumo/recarga de créditos para empresas. Adicionalmente, el sistema ofrece una **pasarela de pagos en custodia (Escrow)** para garantizar que los fondos del contrato estén asegurados antes de que el influencer inicie a trabajar, liberándose únicamente tras la aprobación de los entregables.

---

## 2. Arquitectura del Stack Tecnológico

*   **Backend (NestJS):** Framework modular de Node.js en TypeScript. Administrará APIs REST (usuarios, contratos, finanzas), webhooks de Stripe y **NestJS Gateways** (WebSockets con Socket.io) para la mensajería en tiempo real y notificaciones instantáneas de cambios de estado en los pagos de custodia.
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
*   **Onboarding Financiero:** Para retirar fondos de los contratos completados, debe vincular su cuenta bancaria o método de pago (mediante Stripe Connect o transferencia local parametrizada por el backend).
*   **Restricción por Edad (Validación Legal):** 
    *   **Mayores de edad ($\ge$ 18 años):** Flujo estándar.
    *   **Menores de edad (< 18 años):** Exige obligatoriamente datos del **Tutor o Representante Legal** (Nombre, Documento de identidad, Correo) y confirmación bajo declaración jurada. Las firmas de contratos y la co-titularidad de cuentas financieras de retiro quedan vinculadas al tutor legal.

### 4.3 Administrador (Admin Panel)
*   **Control Global:** Modifica parámetros económicos. Actúa como árbitro o mediador en caso de disputas en contratos de custodia bloqueados.

---

## 5. Dinámica Económica y Reglas de Negocio

### 5.1 Lógica del Umbral de Seguridad y Créditos
*   **Bono de Bienvenida:** `$10.00` en créditos virtuales a la empresa al terminar el onboarding.
*   **Costo de Apertura:** Iniciar un chat consume **X** créditos (configurable por el Admin).
*   **Bloqueo Preventivo:** Si los créditos de la empresa caen por debajo de su umbral (Mínimo $5.00), los chats se congelan en **Solo Lectura**. NestJS rechaza los mensajes vía WebSocket y Vue.js bloquea la UI de escritura.

### 5.2 Flujo del Sistema de Custodia (Escrow / Liquidación de Contratos)
El sistema implementa un flujo seguro de fondos de 4 fases para eliminar el riesgo de impago u荣耀de trabajo inconcluso:
1.  **Propuesta a Contrato:** Cuando una propuesta formal en el chat es aceptada por el influencer, el backend de NestJS genera un registro de `contrato` en estado `pending_payment`.
2.  **Depósito en Custodia (Fund Escrow):** La empresa paga el valor del contrato mediante Stripe. El dinero **no va al influencer inmediatamente**; es retenido de manera segura por la plataforma (Stripe Escrow Wallet / Transfer Group). El estado del contrato pasa a `funded_in_escrow`. El backend notifica vía WebSocket al influencer que ya puede empezar a trabajar de forma segura.
3.  **Entrega y Revisión:** El influencer sube las evidencias de sus entregables a través de la plataforma. El contrato cambia a `under_review`.
4.  **Liberación de Fondos (Payout):** La empresa valida los entregables y presiona "Aprobar y Liberar". NestJS procesa la transferencia desde los fondos en custodia hacia la cuenta del influencer (aplicando comisiones de plataforma si están configuradas). El estado finaliza en `completed`.
    *   *Nota de Disputas:* Si la empresa no está conforme o el influencer no cumple, cualquiera puede iniciar una disputa, congelando el contrato en estado `in_dispute` hasta que un Administrador intervenga y distribuya los fondos de manera justa.

### 5.3 Integración Financiera (Stripe Stack)
*   **Stripe Checkout / Payment Intents:** Para recarga de créditos corporativos y para el fondeo de contratos de custodia.
*   **Stripe Connect Express/Custom:** Para el onboarding financiero de los influencers (y tutores en caso de menores), permitiendo transferencias directas integradas (*payouts*).
*   **Sincronización:** Mapeo en la BD de `stripe_customer_id` para empresas y `stripe_connect_id` para influencers.

---

## 6. Estructura de Datos e Interacciones en Chat

### 6.1 Brief de Campaña
Módulo estandarizado reutilizable adjuntable en chats con objetivos, tono de voz, Do's & Don'ts y recursos estéticos.

### 6.2 Propuesta y Contrato Formal
Mensajes estructurados en JSON inyectados en el chat. Al ser aceptados, se convierten en contratos legales vinculantes en la base de datos que exigen el flujo de custodia obligatorio.

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
    stripe_customer_id VARCHAR(255) NULL, -- Para que las empresas compren saldo/puedan fondear
    stripe_connect_id VARCHAR(255) NULL,  -- Para que los influencers reciban transferencias/payouts
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Perfil de Empresas y Billetera de Créditos
CREATE TABLE empresas_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nombre_comercial VARCHAR(255) NOT NULL,
    sitio_web VARCHAR(255) NULL,
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
    tutor_nombre VARCHAR(255) NULL,
    tutor_documento_id VARCHAR(100) NULL,
    tutor_email VARCHAR(255) NULL,
    tutor_autorizacion BOOLEAN DEFAULT FALSE
);

-- 4. Métricas de Redes Sociales (Carga Manual en V1)
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

-- 7. Sistema de Contratos en Custodia (Escrow)
CREATE TABLE contratos_escrow (
    id SERIAL PRIMARY KEY,
    chat_id INT NOT NULL REFERENCES chats(id) ON DELETE RESTRICT,
    empresa_id INT NOT NULL REFERENCES empresas_profiles(id) ON DELETE RESTRICT,
    influencer_id INT NOT NULL REFERENCES influencers_profiles(id) ON DELETE RESTRICT,
    monto_total NUMERIC(10, 2) NOT NULL,
    comision_plataforma NUMERIC(10, 2) DEFAULT 0.00, -- Porcentaje o fee fijo si aplica
    entregables JSONB NOT NULL, -- Estructura: [{"tipo": "TikTok", "descripcion": "..."}]
    fecha_limite_entrega DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_payment', -- 'pending_payment', 'funded_in_escrow', 'under_review', 'completed', 'in_dispute'
    stripe_charge_id VARCHAR(255) NULL, -- ID del cargo cobrado a la empresa
    stripe_transfer_id VARCHAR(255) NULL, -- ID de la transferencia final al influencer
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Historial de Mensajería, Propuestas y Contratos Adjuntos
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id),
    campaign_brief_id INT NULL REFERENCES campaign_briefs(id) ON DELETE SET NULL,
    contrato_id INT NULL REFERENCES contratos_escrow(id) ON DELETE SET NULL, -- Enlace al contrato generado
    message_text TEXT NULL,
    is_proposal BOOLEAN DEFAULT FALSE,
    proposal_data JSONB NULL, -- Resumen de la oferta {tarifa, entregables, plazo}
    proposal_status VARCHAR(50) NULL, -- 'pending', 'accepted', 'countered', 'funded'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Variables Económicas de Control (Admin)
CREATE TABLE global_settings (
    key VARCHAR(100) PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    description TEXT NULL
);

-- Índices Críticos de Rendimiento y Operaciones Financieras
CREATE INDEX idx_metrics_search ON influencer_metrics(red_social, seguidores, engagement_rate);
CREATE INDEX idx_messages_chat_id ON messages(chat_id, created_at DESC);
CREATE INDEX idx_contratos_status ON contratos_escrow(status);