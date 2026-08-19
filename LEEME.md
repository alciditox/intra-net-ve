# Portal Somos VEPAGOS · paquete de entrega para desarrollo

Todo lo necesario para construir el backend del **portal interno de personal**. No incluye el sitio web público ni el Portal de Fuerza de Ventas: son aplicativos aparte.

Cada carpeta con código sigue la misma convención: **`index.html` · `style.css` · `app.js`**.

---

## Estructura

```
LEEME.md                    este archivo

portal/                     LA APLICACIÓN — prototipo funcional y navegable
  index.html                login + shell + las 35 pantallas
  style.css                 hoja de estilos única · tokens de color en :root
  app.js                    navegación, permisos, pantallas, modales
  data.js                   nómina y catálogos (datos de muestra)
  tickets.js                mesa de ayuda: 5 departamentos → 23 categorías → 198 tipos
  assets/  fichas/  favicon.ico

contrato/                   QUÉ CONSTRUIR
  index.html                26 entidades · 196 campos · 80 endpoints · reglas de negocio
  style.css  app.js

datos/                      CATÁLOGOS LISTOS PARA IMPORTAR
  esquema.sql               DDL PostgreSQL con constraints y vistas de los campos derivados
  perfiles.json             los 8 perfiles con su herencia + los 13 permisos
  menus-por-perfil.json     menú REAL de cada perfil, extraído del prototipo corriendo
  usuarios.json             50 personas (datos de muestra)
  solicitudes-catalogo.json 5 departamentos, 23 categorías, 198 tipos, 8 pasos
  biblioteca.json           10 categorías con sus perfiles autorizados
  inducciones.json          rutas de inducción por perfil con sus módulos
  catalogo-pos.json         11 modelos POS con sus fichas

presentacion/               EL PANORAMA
  index.html                33 láminas de especificación
  style.css  app.js

marca/                      CÓMO DEBE VERSE
  index.html                manual de marca completo
  tokens.css                variables CSS listas para importar
  colores.json              paleta, tipografía, radios, sombras y ratios de contraste
  iconos/iconos.svg         sprite con los 26 iconos del menú
  iconos/svg/               los 26 iconos como archivos individuales
  iconos/iconos.json        índice con el path de cada uno
  assets/marca/             logos en todas sus versiones
  style.css  app.js

capturas/                   CÓMO SE VE HOY
  01–25                     las pantallas principales, numeradas
  menus-por-perfil/         el sidebar de cada uno de los 8 perfiles
```

---

## Por dónde empezar

1. Abre `portal/index.html` (doble clic, sin servidor). En el login hay un bloque *Acceso rápido (demo)* con un botón por perfil: al pulsarlo se rellenan las credenciales, luego *Entrar*. Navega con varios perfiles y fíjate cómo cambia el menú.
2. Lee `contrato/index.html`, secciones **01 (Reglas que no se negocian)** y **02 (Resolución de accesos)**. Son las que evitan rehacer trabajo.
3. Corre `datos/esquema.sql` y carga los JSON de `datos/`.
4. Importa `marca/tokens.css` en todo lo nuevo que escribas.
5. Revisa `presentacion/index.html` para el panorama y las decisiones ya tomadas.

**Credencial de demostración:** `vepagos2026`. La sesión vive en `localStorage` bajo `sv_session_v2`; los datos, bajo `sv_db_v2`.

---

## Lo que hay que saber antes de escribir código

**Los datos de personas son de muestra.** El organigrama, los nombres y los conteos son un set de prueba con errores conocidos, cargado para ilustrar el comportamiento. Lo que se implementa son las reglas; la estructura real la valida Capital Humano y se carga aparte.

**Los ocho perfiles sí son definitivos.** Administradora, Director, Gerente Ejecutivo, Gerente Operativo, Coordinador/Supervisor, Capital Humano, Equipo interno y Pasante INCES.

**Los permisos hoy se resuelven en el navegador.** Es lo primero a corregir: cada endpoint debe volver a evaluar el acceso del lado del servidor. Ocultar un ítem de menú no es seguridad.

**Tres cosas se calculan, no se guardan:** el equipo de una persona, la existencia de un artículo en almacén, y la cadena de herencia de un perfil. `esquema.sql` las trae como vistas (`v_usuario_equipo`, `v_articulo_existencia`) justamente para que nadie las persista.

**Nadie se borra.** Desincorporar es marcar `activo = false`. El expediente, el historial y los documentos se conservan.

**Dos accesos no vienen del perfil.** Tener reportes directos, o estar asignado como responsable de un paso de aprobación, habilita las vistas de equipo sin importar el perfil. `menus-por-perfil.json` muestra el caso real: el Coordinador ve *Notificaciones del equipo* por esa vía, no por su perfil.

---

## Una inconsistencia a resolver

En el prototipo, **Director y Gerente Operativo ven el módulo Ventas pero Gerente Ejecutivo no**, aunque los dos primeros heredan del tercero. Es un problema de la configuración de perfiles, no del mecanismo de herencia. Está anotado en `datos/menus-por-perfil.json` y en la última lámina de la presentación. **Confirmar la intención antes de implementar.**

---

## Alcance

| | |
|---|---|
| Perfiles | 8, con herencia |
| Destinos de navegación | 35 · 24 de menú + 11 subpantallas |
| Enlaces externos | 3 · Eureka, Liveconnect, SAC |
| Permisos granulares | 13 |
| Tipos de solicitud | 198 en 23 categorías, 5 departamentos |
| Pasos de aprobación | 8 · uno dinámico, siete configurables |
| Categorías de biblioteca | 10, con visibilidad propia |
| Entidades a modelar | 26 |
| Endpoints | 80 |
| Iconos | 26 |

Persistencia actual: `localStorage`. Backend: pendiente — es el objeto de esta entrega.

---

*Consultora Alca, C.A. · RIF J-411024449 · VEPAGOS*
