import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  // Cliente de Supabase inicializado con las credenciales del archivo de entorno
  private client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey);

  /** Expone el cliente directamente para queries personalizadas no cubiertas por los métodos del servicio */
  get supabase(): SupabaseClient {
    return this.client;
  }

  // ─── AUTH ─────────────────────────────────────────────────────────────────────

  /** Registra al usuario en Supabase Auth (envía email de confirmación) */
  signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password });
  }

  /** Inicia sesión con email y contraseña en Supabase Auth */
  signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  /** Cierra la sesión activa del usuario en Supabase Auth */
  signOut() {
    return this.client.auth.signOut();
  }

  /** Actualiza la contraseña del usuario actualmente autenticado en Supabase Auth */
  actualizarPassword(newPassword: string) {
    return this.client.auth.updateUser({ password: newPassword });
  }

  // ─── USUARIOS ────────────────────────────────────────────────────────────────

  /** Obtiene el perfil completo de un usuario a partir de su email */
  getUsuarioPorEmail(email: string) {
    return this.client
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();
  }

  /** Obtiene el perfil completo de un usuario a partir de su ID numérico */
  getUsuarioPorId(id: number) {
    return this.client
      .from('usuarios')
      .select('*')
      .eq('id_usuario', id)
      .maybeSingle();
  }

  /** Obtiene el perfil de un usuario por nombre de usuario (búsqueda insensible a mayúsculas) */
  getUsuarioPorNombre(username: string) {
    return this.client
      .from('usuarios')
      .select('*')
      .ilike('username', username)
      .maybeSingle();
  }

  /** Inserta un nuevo usuario en la tabla pública de usuarios */
  registrarUsuario(datos: {
    username: string;
    email: string;
    password: string;
    comunidad_autonoma: string;
  }) {
    return this.client
      .from('usuarios')
      .insert([datos])
      .select()
      .single();
  }

  /** Actualiza campos parciales del perfil (comunidad, password hasheado, foto) buscando por username */
  actualizarUsuario(username: string, cambios: Partial<{
    comunidad_autonoma: string;
    password: string;
    foto_perfil: string;
  }>) {
    return this.client
      .from('usuarios')
      .update(cambios)
      .eq('username', username);
  }

  /** Guarda la preferencia de tema ('claro' | 'oscuro') del usuario en la BD */
  actualizarTema(idUsuario: number, tema: 'claro' | 'oscuro') {
    return this.client
      .from('usuarios')
      .update({ tema })
      .eq('id_usuario', idUsuario);
  }

  /** Pone el id_escuderia del usuario a null (abandono de escudería) */
  abandonarEscuderia(username: string) {
    return this.client
      .from('usuarios')
      .update({ id_escuderia: null })
      .eq('username', username);
  }

  // ─── PISTAS ──────────────────────────────────────────────────────────────────

  /** Devuelve pistas aplicando filtros opcionales de CCAA, tipo de kart y entorno */
  getPistas(filtros: { ccaa?: string; tipo_kart?: string; entorno?: string } = {}) {
    let query = this.client.from('pistas').select('*');
    if (filtros.ccaa)      query = query.eq('ccaa', filtros.ccaa);
    if (filtros.tipo_kart) query = query.eq('tipo_kart', filtros.tipo_kart);
    if (filtros.entorno)   query = query.eq('entorno', filtros.entorno);
    return query;
  }

  /** Devuelve las carreras de clan programadas en una pista concreta a partir de ahora */
  getCarrerasPorPista(nombrePista: string) {
    return this.client
      .from('carreras_clan')
      .select('*')
      .ilike('pista', nombrePista)
      .gte('fecha_hora', new Date().toISOString())
      .order('fecha_hora', { ascending: true });
  }

  // ─── ESCUDERÍAS ──────────────────────────────────────────────────────────────

  /** Devuelve todas las escuderías registradas */
  getEscuderias() {
    return this.client.from('escuderias').select('*');
  }

  /** Obtiene una escudería específica por su ID */
  getEscuderiaPorId(id: number) {
    return this.client.from('escuderias').select('*').eq('id_escuderia', id).single();
  }

  /** Escuderías filtradas por comunidad y opcionalmente con un mínimo de plazas máximas */
  getEscuderiasFiltradas(comunidad?: string, maxMiembrosMin?: number) {
    let q = this.client.from('escuderias').select('*');
    if (comunidad) q = q.eq('comunidad_autonoma', comunidad);
    if (maxMiembrosMin) q = q.gte('max_miembros', maxMiembrosMin);
    return q.order('nombre', { ascending: true });
  }

  /** Cuenta cuántos usuarios pertenecen a una escudería concreta */
  getMiembrosDeEscuderia(idEscuderia: number) {
    return this.client
      .from('usuarios')
      .select('id_usuario', { count: 'exact', head: true })
      .eq('id_escuderia', idEscuderia);
  }

  /** Une al usuario a una escudería actualizando su campo id_escuderia */
  unirseEscuderia(idUsuario: number, idEscuderia: number) {
    return this.client
      .from('usuarios')
      .update({ id_escuderia: idEscuderia })
      .eq('id_usuario', idUsuario);
  }

  // ─── RANKING ─────────────────────────────────────────────────────────────────

  /** Devuelve la clasificación global de pilotos ordenada por posición actual */
  getRanking() {
    return this.client
      .from('clasificacion_general')
      .select(`*, usuarios (username, foto_perfil, comunidad_autonoma)`)
      .order('posicion_actual', { ascending: true });
  }

  // ─── LOGROS ──────────────────────────────────────────────────────────────────

  /** Devuelve los logros desbloqueados por un usuario con su detalle (nombre, descripción, imagen) */
  getLogrosUsuario(idUsuario: number) {
    return this.client
      .from('logros_usuarios')
      .select(`*, logros (nombre, descripcion, imagen_insignia)`)
      .eq('id_usuario', idUsuario);
  }

  // ─── EVENTOS ─────────────────────────────────────────────────────────────────

  /** Devuelve todos los eventos ordenados por fecha, con los datos de la pista asociada */
  getEventos() {
    return this.client
      .from('eventos')
      .select(`*, pistas (nombre, ccaa)`)
      .order('fecha_evento', { ascending: true });
  }

  // ─── AMIGOS ──────────────────────────────────────────────────────────────────

  /** Devuelve las amistades aceptadas del usuario con los datos de ambos perfiles (solicitante y receptor) */
  getAmigos(idUsuario: number) {
    return this.client
      .from('amigos')
      .select(`
        *,
        solicitante:usuarios!amigos_id_usuario_solicita_fkey (id_usuario, username, foto_perfil),
        receptor:usuarios!amigos_id_usuario_acepta_fkey (id_usuario, username, foto_perfil)
      `)
      .or(`id_usuario_solicita.eq.${idUsuario},id_usuario_acepta.eq.${idUsuario}`)
      .eq('estado', 'aceptado');
  }

  // ─── STORAGE ─────────────────────────────────────────────────────────────────

  /**
   * Sube un archivo de imagen al bucket 'avatares' de Supabase Storage y devuelve la URL pública.
   * Usa upsert:true para sobrescribir si ya existe y especifica contentType para evitar
   * errores de tipo MIME en determinados navegadores.
   */
  async subirAvatar(file: File, username: string): Promise<string | null> {
    const fileExt = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const fileName = `${Date.now()}_${username}.${fileExt}`;

    const { error } = await this.client.storage
      .from('avatares')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type || `image/${fileExt}`
      });

    if (error) {
      console.error('Error subiendo avatar:', error.message);
      return null;
    }

    const { data } = this.client.storage.from('avatares').getPublicUrl(fileName);
    return data.publicUrl;
  }
}
