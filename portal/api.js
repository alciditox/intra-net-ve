/* ===== API Bridge — conecta el frontend con el backend TypeScript ===== */
/* Este archivo se carga ANTES de app.js y establece las funciones de API */
window.SV_API = (function () {
  'use strict';

  var API_BASE = '/api';
  var TOKEN_KEY = 'sv_jwt_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function headers() {
    var h = { 'Content-Type': 'application/json' };
    var t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }

  async function request(method, path, body) {
    var opts = { method: method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);
    var res = await fetch(API_BASE + path, opts);
    if (res.status === 401) {
      clearToken();
      return { error: 'No autenticado', status: 401 };
    }
    var data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'Error del servidor', status: res.status };
    }
    return data;
  }

  // ===== AUTH =====
  async function login(email, password, cedula) {
    var result = await request('POST', '/auth/login', { email: email, password: password, cedula: cedula });
    if (result.token) {
      setToken(result.token);
    }
    return result;
  }

  function logout() {
    clearToken();
  }

  function isLoggedIn() {
    return !!getToken();
  }

  async function getMe() {
    return await request('GET', '/auth/me');
  }

  // ===== MENU =====
  async function getMenu() {
    return await request('GET', '/menu');
  }

  // ===== USERS =====
  async function getUsers() {
    return await request('GET', '/users');
  }

  async function getUser(id) {
    return await request('GET', '/users/' + id);
  }

  // ===== PERFILES =====
  async function getPerfiles() {
    return await request('GET', '/perfiles');
  }

  async function getPerfil(key) {
    return await request('GET', '/perfiles/' + key);
  }

  async function createPerfil(data) {
    return await request('POST', '/perfiles', data);
  }

  async function updatePerfil(key, data) {
    return await request('PUT', '/perfiles/' + key, data);
  }

  async function deletePerfil(key) {
    return await request('DELETE', '/perfiles/' + key);
  }

  // ===== PANTALLAS =====
  async function getPantallas() {
    return await request('GET', '/pantallas');
  }

  async function getPantallasPerfil(key) {
    return await request('GET', '/pantallas/perfil/' + key);
  }

  async function setPantallasPerfil(key, pantallas) {
    return await request('PUT', '/pantallas/perfil/' + key, { pantallas: pantallas });
  }

  // ===== PERMISOS =====
  async function getPermisosCatalogo() {
    return await request('GET', '/permisos/catalogo');
  }

  async function getPermisosPerfil(key) {
    return await request('GET', '/permisos/perfil/' + key);
  }

  async function setPermisosPerfil(key, permisos) {
    return await request('PUT', '/permisos/perfil/' + key, { permisos: permisos });
  }

  async function getPermisosUsuario(id) {
    return await request('GET', '/permisos/usuario/' + id);
  }

  async function grantPermiso(userId, clave) {
    return await request('POST', '/permisos/grant', { usuario_id: userId, clave: clave });
  }

  async function revokePermiso(userId, clave) {
    return await request('POST', '/permisos/revoke', { usuario_id: userId, clave: clave });
  }

  return {
    login: login,
    logout: logout,
    isLoggedIn: isLoggedIn,
    getMe: getMe,
    getMenu: getMenu,
    getUsers: getUsers,
    getUser: getUser,
    getPerfiles: getPerfiles,
    getPerfil: getPerfil,
    createPerfil: createPerfil,
    updatePerfil: updatePerfil,
    deletePerfil: deletePerfil,
    getPantallas: getPantallas,
    getPantallasPerfil: getPantallasPerfil,
    setPantallasPerfil: setPantallasPerfil,
    getPermisosCatalogo: getPermisosCatalogo,
    getPermisosPerfil: getPermisosPerfil,
    setPermisosPerfil: setPermisosPerfil,
    getPermisosUsuario: getPermisosUsuario,
    grantPermiso: grantPermiso,
    revokePermiso: revokePermiso,
    getToken: getToken,
    clearToken: clearToken,
  };
})();
