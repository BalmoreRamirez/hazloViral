# InfluSmart — Backend

API NestJS con TypeORM y PostgreSQL, autenticación JWT y chat mediante Socket.IO.
La estructura sigue módulos por funcionalidad, con sus DTO, entidades, controladores,
servicios y pruebas próximos entre sí: [módulos de NestJS](https://docs.nestjs.com/modules).
La carpeta `modules` es una convención de este proyecto, no un requisito del framework.

```text
backend/
├── src/
│   ├── main.ts                 # Arranque y configuración HTTP global
│   ├── app.module.ts           # Composición de módulos e infraestructura
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── data-source.ts          # DataSource para ejecutar migraciones
│   ├── migrations/             # Cambios versionados del esquema PostgreSQL
│   ├── config/
│   │   ├── database.config.ts  # Configuración y descubrimiento de entidades
│   │   └── timezone.ts         # Zona horaria del proceso
│   ├── common/
│   │   ├── decorators/
│   │   ├── enums/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── utils/              # Fechas, privacidad y sus pruebas
│   │   └── types.ts
│   └── modules/
│       ├── admin/
│       ├── auth/               # Incluye guards y strategies propios de JWT
│       ├── campaigns/
│       ├── chats/
│       ├── contracts/
│       ├── credits/
│       ├── electronic-invoicing/
│       ├── companies/
│       ├── influencers/
│       ├── notifications/
│       ├── ratings/
│       ├── receipts/
│       ├── uploads/
│       ├── users/
│       └── wompi/
├── scripts/                    # Mantenimiento fuera de src
│   ├── credits/
│   ├── electronic-invoicing/
│   └── timezone/
└── test/                       # Pruebas de integración e2e
```

Cada módulo agrupa `*.module.ts`, `*.controller.ts` y `*.service.ts`, además de
`dto/` y `entities/` cuando corresponda. Gateways y proveedores especializados
permanecen en su funcionalidad. Las pruebas unitarias `*.spec.ts` se mantienen
junto al código probado. Se crean carpetas solo cuando hay archivos que agrupar.

`common` contiene componentes usados por varias funcionalidades; `config` contiene
configuración de infraestructura. Un módulo expone proveedores mediante `exports`
y el consumidor declara su dependencia en `imports`. No se cambian las rutas HTTP,
nombres de tablas, relaciones ni reglas de negocio al reorganizar carpetas.

## Nombres

Carpetas y archivos usan inglés en `kebab-case`; clases en `PascalCase` y sufijos
NestJS como `Module`, `Controller` y `Service`. No se mezclan idiomas en nombres
de módulos: `companies`, `contracts` y `electronic-invoicing`. Los nombres de
proveedores como `wompi` se conservan. `auth` y `admin` son abreviaturas comunes.

Los campos heredados de API, rutas HTTP, valores de roles, nombres de tablas y
columnas mantienen su contrato público y persistencia. Renombrar una clase interna
no requiere cambiar estos identificadores externos.

## Desarrollo

Desde `backend`, configura `.env` con las variables de base de datos, JWT y las
integraciones utilizadas. Instala dependencias con `npm ci` y ejecuta:

```bash
npm run start:dev
npm run build
npm test -- --runInBand
```

Desde la raíz del repositorio puede iniciarse el entorno con:

```bash
docker compose up -d --build
```

La imagen backend incluye `procps` para que Nest pueda cerrar su proceso anterior
al recompilar en modo watch. Los archivos subidos permanecen fuera de `src`, en
`uploads/`, y Docker los conserva en un volumen.

## Mantenimiento

Las migraciones de PostgreSQL se aplican explícitamente desde `backend`:

```bash
npm run migration:show
npm run migration:run
```

`migration:run` compila el backend y aplica las migraciones pendientes usando las
variables de `.env`. La migración de integridad verifica primero que no existan
referencias huérfanas ni datos que incumplan las nuevas restricciones; si encuentra
filas inválidas, se detiene sin corregirlas automáticamente para evitar alterar
historial financiero o fiscal.

Ejecutar desde `backend` para resolver `.env`, dependencias y rutas de archivos:

```bash
npm run maintenance:timezone
npm run maintenance:vat
npm run maintenance:recharge -- COMPANY_ID AMOUNT APPROXIMATE_ISO_TIME
```

Estos scripts mantienen su comportamiento de simulación por defecto. `--apply`
activa sus escrituras explícitas. No se ejecutan al arrancar ni durante las pruebas.

Requerimientos y cambios: [REQUERIMIENTOS.md](REQUERIMIENTOS.md) y
[HISTORIAL_DESARROLLO.md](HISTORIAL_DESARROLLO.md).
