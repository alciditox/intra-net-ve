export interface Perfil {
  key: string;
  label: string;
  base_key: string | null;
  descripcion: string | null;
  sistema: boolean;
  orden: number;
}

export interface Pantalla {
  id: string;
  titulo: string;
  grupo: string;
  padre_id: string | null;
  icono: string | null;
  href_externo: string | null;
  orden: number;
}

export interface PantallaSub extends Pantalla {
  sub?: PantallaSub[];
}

export interface Usuario {
  id: number;
  nombre: string;
  cargo: string;
  area: string;
  perfil_key: string;
  supervisor_id: number | null;
  email: string;
  cedula: string | null;
  password_hash: string;
  telefono: string | null;
  linkedin: string | null;
  ciudad: string | null;
  cumple: string | null;
  tipo_sangre?: string | null;
  alergias?: string | null;
  condicion_medica?: string | null;
  emerg_nombre?: string | null;
  emerg_telefono?: string | null;
  es_ancla_equipo: boolean;
  nombre_equipo: string | null;
  activo: boolean;
  creado_en: Date;
}

export interface PermisoCatalogo {
  clave: string;
  grupo: string;
  label: string;
  descripcion: string;
  nav: string | null;
}

export interface MenuGroup {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  title: string;
  icon: string | null;
  href: string | null;
  sub: MenuItem[] | null;
}

export interface MenuResponse {
  groups: MenuGroup[];
  badges: Record<string, number>;
}

export interface LoginRequest {
  email: string;
  password: string;
  cedula?: string;
}

export interface JwtPayload {
  userId: number;
  perfil: string;
  email: string;
}

export interface AuthenticatedRequest extends import('express').Request {
  user?: JwtPayload;
}
