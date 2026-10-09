# Somos VEPAGOS Corporate Intranet (`intra-net-ve`) 🏢💼

[![Node.js](https://img.shields.io/badge/Node.js-20.x%20LTS-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-black.svg?style=flat-square&logo=express)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg?style=flat-square&logo=mysql)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Multi--stage%20Compose-2496ED.svg?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](LICENSE)

> **Enterprise Resource Planning & Internal Management Platform for Somos VEPAGOS.**  
> Centralizing personnel directories, role-based access control (RBAC), dynamic navigation matrices, corporate assets, HR onboarding workflows, and operational KPIs.

---

## 📖 Table of Contents

- [Overview & Business Context](#-overview--business-context)
- [Key Features & Functional Modules](#-key-features--functional-modules)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Quick Start Guide](#-quick-start-guide)
  - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
  - [Option B: Local Development (Bare Metal)](#option-b-local-development-bare-metal)
- [Pre-configured Demo Accounts](#-pre-configured-demo-accounts)
- [Project Directory Structure](#-project-directory-structure)
- [Environment Configuration](#-environment-configuration)
- [Comprehensive API Reference](#-comprehensive-api-reference)
- [Production Deployment & Operations](#-production-deployment--operations)
- [Documentation & Deep Dives](#-documentation--deep-dives)

---

## 🏢 Overview & Business Context

**Somos VEPAGOS** is a financial technology and payment solutions provider in Venezuela. As the organizational footprint scaled across executive, commercial, technical, and human resource departments, internal management required a unified, secure digital intranet.

**`intra-net-ve`** is the internal portal serving the entire enterprise ecosystem. It replaces fragmented spreadsheets and disparate forms with a centralized, auditable platform designed specifically for Venezuelan corporate operational structures (including national ID / Cédula identity verification, INCES internship programs, and corporate asset lifecycle governance).

---

## ⚡ Key Features & Functional Modules

### 1. Identity & Role-Based Access Control (RBAC)
- **JWT & bcrypt Authentication**: Secure session issuance with salted hashing.
- **Venezuelan Cédula Validation**: Tri-factor login credentials (Email + Password + Venezuelan Identity Number `V-xxxxxxxx`).
- **Granular Permission Catalog**: Fine-grained capability checks (`users.read`, `activos.assign`, `pantallas.manage`).
- **Dynamic Screen Access Matrix (`perfil_pantallas`)**: Navigation menus adapt dynamically per user profile. The UI only renders authorized modules.

### 2. Corporate Asset Management (`/api/activos`)
- Inventory control for company hardware (laptops, monitors, POS payment terminals, mobile devices, security tokens).
- Custody assignment history, serial number tracking, asset condition tagging, and return sign-offs.

### 3. Human Capital & Talent Acquisition (`/api/candidatos`, `/api/vacantes`)
- Tracking open internal and external job positions.
- Candidate pipeline from initial screening to interview scheduling and hiring confirmation.

### 4. Employee Onboarding & Inductions (`/api/inducciones`)
- Guided onboarding workflows for new hires and INCES technical apprentices.
- Module completion checklists, safety briefings, and compliance tracking.

### 5. Corporate Document & Policy Repository (`/api/documentos`)
- Centralized access to company manuals, operational policies, contract templates, and official corporate identity assets.

### 6. Health & Emergency Protocols (`/api/emergencias`)
- Emergency contacts directory, blood type records, workplace health insurance guidelines, and occupational safety procedures.

### 7. Strategic Goals & Departmental KPIs (`/api/metas`)
- Corporate roadmap tracking, quarterly objective progress, and team milestone dashboards.

### 8. Organizational Culture & News (`/api/cultura`)
- Corporate announcements, employee anniversaries, birthdays, and culture-building initiatives.

---

## 🛠️ Technology Stack

| Layer | Technologies & Libraries | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Vanilla ES6+ JavaScript, Semantic HTML5, CSS3, Barlow Web Fonts | Ultra-fast rendering, zero framework overhead, lightweight client footprint. |
| **Backend** | Node.js 20 LTS, TypeScript 5.x, Express.js 4.x | Type-safe RESTful API architecture, structured routing and services. |
| **Database** | MySQL 8.0, Connection Pooling (`mysql2/promise`) | Relational persistence, foreign key integrity, schema migrations. |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, CORS, Helmet | Stateless authentication, encrypted credential storage, request shielding. |
| **Reverse Proxy** | Nginx Alpine | Static asset offloading, SSL termination, rate limiting, and HTTP reverse proxy. |
| **Containerization** | Docker, Docker Compose, Multi-stage Dockerfile | Reproducible cross-platform environments from dev to production. |

---

## 🏗️ System Architecture

```
                       +-------------------------------+
                       |      Browser / Client PWA     |
                       | (Barlow CSS + Vanilla JS SPA) |
                       +---------------+---------------+
                                       |
                                HTTP / HTTPS (Port 8098 / 80)
                                       v
                       +---------------+---------------+
                       |         Nginx Proxy           |
                       |    (Static cache & proxy)     |
                       +---------------+---------------+
                                       | Reverse Proxy to :3000
                                       v
         +-----------------------------------------------------------+
         |                 Express.js Backend (Node 20)              |
         |                                                           |
         |  [JWT Auth Guard]  --->  [adminOnly Guard]                |
         |         |                       |                         |
         |  +------+------+         +------+------+                  |
         |  | auth.routes |         | users.routes| ... (14 Routers) |
         |  +------+------+         +------+------+                  |
         |         \                       /                         |
         |          +----------+----------+                          |
         |                     v                                     |
         |          [Services / Business Logic]                      |
         |           (auth, menu, permission)                        |
         |                     |                                     |
         |                     v                                     |
         |             [MySQL Connection Pool]                       |
         +---------------------+-------------------------------------+
                               |
                               v
         +-----------------------------------------------------------+
         |                     MySQL 8.0 Database                    |
         |  - usuarios (employees)      - perfiles (roles)           |
         |  - pantallas (menu screens)  - perfil_pantallas (matrix)  |
         |  - permisos (capabilities)   - activos (hardware)         |
         |  - inducciones (onboarding)  - documentos (contracts)     |
         +-----------------------------------------------------------+
```

---

## 🚀 Quick Start Guide

### Option A: Docker Compose (Recommended)

Docker Compose sets up the entire application stack:

```bash
# 1. Clone the repository
git clone https://github.com/alciditox/intra-net-ve.git
cd intra-net-ve

# 2. Configure environment variables (or use default template)
cp .env.example .env

# 3. Spin up all containers
docker compose up -d --build

# 4. Open in browser:
#    Corporate Portal: http://localhost:8098 (via Nginx) or http://localhost:3000 (direct)
```

> **First Run Note**: The entrypoint script (`docker-entrypoint.sh`) automatically waits for MySQL to initialize healthy state, applies `schema.sql`, executes `seed.ts` (loading mock profiles, screens, and departments), and boots the Express server.

---

### Option B: Local Development (Bare Metal)

**Prerequisites**:
- Node.js 20+ LTS
- MySQL 8.0 running locally on `localhost:3306`

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Populate environment configuration
cp ../.env.example ../.env

# 3. Seed the MySQL database
npm run seed

# 4. Start backend in development mode (hot-reload via tsx)
npm run dev

# The portal is immediately available at: http://localhost:3000
```

---

## 👥 Pre-configured Demo Accounts

All demo accounts are pre-seeded with the uniform password: `vepagos2026`

| Role / Profile | Email | Cédula (Identity ID) | Access Level |
| :--- | :--- | :--- | :--- |
| **Administradora** | `admin@somosvepagos.com` | `V-10000001` | Full SuperAdmin privileges & security matrix |
| **Director** | `antonio.palermo@somosvepagos.com` | `V-10000010` | Executive executive reporting & corporate KPIs |
| **Gerente Ejecutivo** | `mayra.gruber@somosvepagos.com` | `V-10000070` | Senior management, approvals & asset workflows |
| **Gerente Operativo** | `aymara.gonzalez@somosvepagos.com` | `V-10000011` | Operational management & departmental logistics |
| **Coordinador/Supervisor** | `victor.torrealba@somosvepagos.com` | `V-10000071` | Team supervision, shift tracking & task reviews |
| **Capital Humano (HR)** | `rrhh@somosvepagos.com` | `V-10000077` | Talent acquisition, onboarding, personnel files |
| **Equipo Interno** | `gina.sanchez@somosvepagos.com` | `V-10000014` | Standard employee portal & self-service requests |
| **Pasante INCES** | `maria.linares@somosvepagos.com` | `V-10000091` | Technical intern onboarding & task orientation |

---

## 📁 Project Directory Structure

```
intra-net-ve/
├── portal/                         # Frontend Static Web Application
│   ├── index.html                  # Core single-page portal shell
│   ├── style.css                   # Enterprise stylesheet (Barlow font, VEPAGOS branding)
│   ├── app.js                      # Core frontend orchestration (~7,200 lines)
│   ├── api.js                      # REST bridge client with JWT persistence
│   ├── data.js                     # Static lookup dictionaries
│   └── assets/                     # Corporate logos, SVG icons, and PDF references
│
├── backend/                        # Node.js TypeScript Backend
│   ├── src/
│   │   ├── index.ts                # Express application bootstrap & middleware registration
│   │   ├── config/
│   │   │   └── database.ts         # MySQL 8 connection pool
│   │   ├── middleware/
│   │   │   └── auth.ts             # JWT authentication guard & adminOnly authorization
│   │   ├── routes/                 # 14 REST API routers
│   │   │   ├── activos.routes.ts   # Hardware & corporate assets
│   │   │   ├── auth.routes.ts      # Authentication & session verification
│   │   │   ├── candidatos.routes.ts# Recruitment candidate pipeline
│   │   │   ├── cultura.routes.ts   # Internal news, values & announcements
│   │   │   ├── documentos.routes.ts# Corporate policy & template repository
│   │   │   ├── emergencias.routes.ts# Occupational health & emergency directory
│   │   │   ├── inducciones.routes.ts# Onboarding & induction checkpoints
│   │   │   ├── menu.routes.ts      # Profile-aware dynamic navigation menu
│   │   │   ├── metas.routes.ts     # Corporate roadmaps & departmental goals
│   │   │   ├── pantallas.routes.ts # Screen catalog & per-profile access matrix
│   │   │   ├── perfiles.routes.ts  # Organizational roles & profile management
│   │   │   ├── permisos.routes.ts  # Capability catalog & permission grants
│   │   │   ├── users.routes.ts     # Personnel directory & user profiles
│   │   │   └── vacantes.routes.ts  # Job openings & vacancies
│   │   ├── services/               # Reusable business logic (auth, menu, permissions)
│   │   └── types/                  # Shared TypeScript interfaces & DTOs
│   ├── seed/
│   │   └── seed.ts                 # Idempotent database seeder (imports datos/*.json)
│   ├── sql/
│   │   └── schema.sql              # MySQL DDL relational schema
│   ├── tsconfig.json               # TypeScript compiler options
│   └── package.json                # Backend dependencies and build scripts
│
├── datos/                          # Pre-configured seed fixtures (JSON)
├── nginx/                          # Nginx reverse proxy configuration (`default.conf`)
├── compose.yml                     # Multi-container orchestration definition
├── Dockerfile                      # Multi-stage production container build
├── docker-entrypoint.sh            # Container init: wait-for-db -> seed -> start
├── .env.example                    # Environment variable configuration template
├── docs/
│   ├── ARCHITECTURE.md             # In-depth architectural & RBAC documentation
│   └── API_REFERENCE.md            # Complete API endpoint specifications
├── LEEME.md                        # Guía original en español
└── README.md                       # Main English documentation (this file)
```

---

## ⚙️ Environment Configuration

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DB_HOST` | `127.0.0.1` | MySQL server hostname or Docker service name |
| `DB_PORT` | `3306` | MySQL server port |
| `DB_USER` | `root` | Database username |
| `DB_PASSWORD` | *(empty)* | Database password |
| `DB_NAME` | `intranet_vepagos` | Target relational database name |
| `PORT` | `3000` | HTTP port for the Express application |
| `APP_PORT` | `8098` | Host port exposed by Nginx reverse proxy |
| `JWT_SECRET` | `vepagos_intranet_secret_2026`| Cryptographic secret used to sign and verify JWT tokens |
| `PORTAL_PATH` | `/app/portal` | Absolute path where static frontend assets are served |

---

## 📡 Comprehensive API Reference

All protected endpoints require an `Authorization: Bearer <token>` HTTP header.

### Authentication & Sessions
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticates user using email, password, and national cédula. |
| `GET` | `/api/auth/me` | Authenticated | Retrieves profile, permissions, and active session details. |
| `GET` | `/api/health` | Public | Readiness and liveness check for container orchestration. |

### Dynamic Navigation & Permissions
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/menu` | Authenticated | Generates dynamic menu structure based on active user profile. |
| `GET` | `/api/pantallas` | Authenticated | Lists all registered application screens. |
| `PUT` | `/api/pantallas/perfil/:key` | Admin | Updates screen access matrix (`perfil_pantallas`) for a profile. |
| `GET` | `/api/perfiles` | Authenticated | Lists all corporate roles and access tiers. |
| `GET` | `/api/permisos/catalogo` | Authenticated | Returns full catalog of granular permissions. |
| `POST` | `/api/permisos/grant` | Admin | Explicitly grants or revokes a capability to a user. |

### Personnel & Operational Management
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Admin | Lists active corporate employees and directory records. |
| `GET` | `/api/activos` | Authenticated | Lists corporate hardware assets, equipment serials, and custody. |
| `POST` | `/api/activos` | Admin / HR | Registers or reassigns corporate equipment to personnel. |
| `GET` | `/api/documentos` | Authenticated | Fetches company policies, handbook forms, and contracts. |
| `GET` | `/api/inducciones` | Authenticated | Lists onboarding progress checklists for new team members. |
| `GET` | `/api/metas` | Authenticated | Retrieves strategic departmental KPIs and milestone roadmaps. |
| `GET` | `/api/emergencias` | Authenticated | Fetches emergency protocols, medical contacts, and clinic network. |
| `GET` | `/api/candidatos` | HR / Admin | Lists recruitment pipeline candidates. |
| `GET` | `/api/vacantes` | Authenticated | Lists current job vacancies and internal mobility openings. |

*For complete payload contracts, status codes, and error schemas, see [docs/API_REFERENCE.md](docs/API_REFERENCE.md).*

---

## 🐳 Production Deployment & Operations

### Useful Docker Operations
```bash
# View real-time container application logs
docker compose logs -f intranet

# Restart application container without touching MySQL data
docker compose restart intranet

# Tear down containers while preserving persistent volumes
docker compose down

# Execute database seeding manually inside running container
docker compose exec intranet npx tsx /app/backend/seed/seed.ts
```

---

## 📚 Documentation & Deep Dives

- [Architecture & RBAC Matrix Deep Dive](docs/ARCHITECTURE.md)
- [Comprehensive REST API Specification](docs/API_REFERENCE.md)
- [Guía y documentación original en español](LEEME.md)

---

**Developed & Maintained by [Alciditox](https://github.com/alciditox)**  
*Copyright © Somos VEPAGOS. All rights reserved.*
