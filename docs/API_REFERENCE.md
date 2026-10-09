# Somos VEPAGOS Intranet - REST API Reference

All protected endpoints require the HTTP Authorization header:
```http
Authorization: Bearer <jwt_token>
```

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login`
Authenticates an employee and issues a JWT token.

**Request Body**:
```json
{
  "email": "admin@somosvepagos.com",
  "password": "vepagos2026",
  "cedula": "V-10000001"
}
```

**Response (200 OK)**:
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nombre": "Administradora",
    "email": "admin@somosvepagos.com",
    "cedula": "V-10000001",
    "perfil": "admin",
    "isAdmin": true
  }
}
```

---

### `GET /api/auth/me`
Fetches the active user profile from the bearer token.

**Response (200 OK)**:
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "email": "admin@somosvepagos.com",
    "perfil": "admin",
    "permisos": ["users.read", "activos.write", "pantallas.manage"]
  }
}
```

---

## 2. Dynamic Navigation (`/api/menu`)

### `GET /api/menu`
Returns the authorized menu screen list for the authenticated user's profile.

**Response (200 OK)**:
```json
{
  "ok": true,
  "menu": [
    { "key": "inicio", "nombre": "Inicio", "icono": "home", "orden": 1 },
    { "key": "activos", "nombre": "Activos y Equipos", "icono": "laptop", "orden": 2 },
    { "key": "documentos", "nombre": "Documentos", "icono": "file-text", "orden": 3 },
    { "key": "metas", "nombre": "Metas y KPIs", "icono": "target", "orden": 4 }
  ]
}
```

---

## 3. Screen Registry & Role Matrix (`/api/pantallas`)

### `GET /api/pantallas`
Lists all registered UI screens in the system.

### `PUT /api/pantallas/perfil/:key` *(Admin Only)*
Overwrites the screen authorization set for a given profile key.

**Request Body**:
```json
{
  "pantallas": ["inicio", "activos", "metas", "inducciones"]
}
```

**Response (200 OK)**:
```json
{
  "ok": true,
  "message": "Permisos de pantallas actualizados correctamente"
}
```

---

## 4. Hardware & Corporate Assets (`/api/activos`)

### `GET /api/activos`
Retrieves company asset catalog with assignment status and serial identifiers.

---

## 5. System Health Check (`/api/health`)

### `GET /api/health`
Liveness/readiness probe.

**Response (200 OK)**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-10-09T16:50:00Z"
}
```
