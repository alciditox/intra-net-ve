# Somos VEPAGOS Intranet - System Architecture & Security Specification

This document provides a technical deep dive into the architecture, authentication lifecycle, and dynamic Role-Based Access Control (RBAC) model implemented across the Somos VEPAGOS Intranet platform.

---

## 1. System Topology & Request Lifecycle

```
[ User Browser ]
       |
       | 1. HTTP Request (e.g. GET /api/menu)
       v
[ Nginx Alpine (Reverse Proxy :8098) ]
       |
       | 2. Upstream forwarding to :3000
       v
[ Express.js Application Server ]
       |
       |-- 3. cors() & express.json()
       |-- 4. authMiddleware (Validates JWT signature & expiry)
       |-- 5. Extracts req.user { id, email, cedula, perfil_key, is_admin }
       |-- 6. Route Handler (e.g. menu.routes.ts)
       |-- 7. Service Layer (menuService.getMenuForProfile(perfil_key))
       |       |
       |       v Queries database pool
       | [ MySQL 8 Connection Pool ]
       |       |
       |       +---> SELECT p.* FROM pantallas p
       |             JOIN perfil_pantallas pp ON pp.pantalla_id = p.id
       |             WHERE pp.perfil_key = ?
       |
       <-- 8. Returns JSON response
```

---

## 2. Dynamic RBAC & Screen Visibility (`perfil_pantallas`)

Unlike traditional hardcoded frontends where menu items are statically baked into HTML/JS, the VEPAGOS Intranet dynamically synthesizes UI navigation based on runtime database contracts:

### Database Tables:
1. **`pantallas`**:
   - `id`: Unique identifier
   - `key`: Logical screen route identifier (e.g., `dashboard`, `activos`, `empleados`, `metas`, `permisos`)
   - `nombre`: Display label
   - `icono`: SVG or CSS icon identifier
   - `orden`: Integer sort priority
   - `categoria`: Menu section grouping

2. **`perfiles`**:
   - `key`: Role key (e.g., `admin`, `director`, `gerente_ejecutivo`, `gerente_operativo`, `supervisor`, `rrhh`, `equipo`, `inces`)
   - `nombre`: Commercial role designation
   - `nivel`: Hierarchical authorization tier (1 to 8)

3. **`perfil_pantallas`**:
   - Junction table linking `perfil_key` and `pantalla_id`.
   - Directly determines whether a screen appears in the navigation sidebar.

### Security Guarantees:
- **No Client Bypass**: Even if a malicious user alters client JavaScript to forcefully reveal a hidden UI panel, every backend API route independently asserts role authorization (`authMiddleware` and `adminOnlyMiddleware`).
- **Dynamic Adaptability**: Administrators can grant or revoke screen access to entire roles on the fly via the `/api/pantallas/perfil/:key` endpoint without requiring application rebuilds or server restarts.

---

## 3. Database Entity Relationship (ER) Summary

```
+---------------+           +-------------------+           +---------------+
|   usuarios    |           |     perfiles      |           |   pantallas   |
+---------------+           +-------------------+           +---------------+
| id (PK)       |           | key (PK)          |           | id (PK)       |
| email         |<--------->| nombre            |           | key           |
| password_hash |           | nivel             |           | nombre        |
| cedula        |           +---------+---------+           | categoria     |
| perfil_key    |                     |                     | orden         |
+---------------+                     |                     +-------+-------+
                                      |                             |
                                      v                             v
                            +-----------------------------------------------+
                            |              perfil_pantallas                 |
                            +-----------------------------------------------+
                            | perfil_key (FK -> perfiles.key)               |
                            | pantalla_id (FK -> pantallas.id)              |
                            +-----------------------------------------------+
```
