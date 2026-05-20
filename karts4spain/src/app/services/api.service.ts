import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

// URL base del backend Spring Boot, leída del archivo de entorno (no en el código fuente).
const BASE = environment.backendUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {

  constructor(private http: HttpClient) {}

  // ─── AUTH ─────────────────────────────────────────────────────────────────────

  /** Valida credenciales contra la BD y devuelve el objeto usuario si son correctas */
  login(email: string, password: string) {
    return firstValueFrom(
      this.http.post<any>(`${BASE}/usuarios/login`, { email, password })
    );
  }

  /** Crea un nuevo usuario en la BD (no crea sesión de Supabase Auth, eso se hace aparte) */
  registrar(datos: { username: string; email: string; password: string; comunidad_autonoma: string }) {
    return firstValueFrom(
      this.http.post<any>(`${BASE}/usuarios/registrar`, datos)
    );
  }

  // ─── USUARIOS ────────────────────────────────────────────────────────────────

  /** Obtiene un usuario por su ID numérico */
  getUsuarioPorId(id: number) {
    return firstValueFrom(this.http.get<any>(`${BASE}/usuarios/${id}`));
  }

  /** Obtiene un usuario por su email (codificado para evitar problemas con caracteres especiales) */
  getUsuarioPorEmail(email: string) {
    return firstValueFrom(this.http.get<any>(`${BASE}/usuarios/email/${encodeURIComponent(email)}`));
  }

  /** Obtiene un usuario por su nombre de usuario */
  getUsuarioPorNombre(username: string) {
    return firstValueFrom(this.http.get<any>(`${BASE}/usuarios/username/${encodeURIComponent(username)}`));
  }

  /** Actualiza campos parciales del perfil del usuario (comunidad, password, foto) */
  actualizarUsuario(id: number, cambios: Partial<{ comunidad_autonoma: string; password: string; foto_perfil: string }>) {
    return firstValueFrom(this.http.put<any>(`${BASE}/usuarios/${id}`, cambios));
  }

  /** Asigna al usuario a una escudería por sus IDs respectivos */
  unirseEscuderia(idUsuario: number, idEscuderia: number) {
    return firstValueFrom(this.http.put<any>(`${BASE}/usuarios/${idUsuario}/escuderia/${idEscuderia}`, {}));
  }

  /** Desvincula al usuario de su escudería actual (pone id_escuderia = null) */
  abandonarEscuderia(idUsuario: number) {
    return firstValueFrom(this.http.put<any>(`${BASE}/usuarios/${idUsuario}/abandonar-escuderia`, {}));
  }

  // ─── PISTAS ──────────────────────────────────────────────────────────────────

  /** Devuelve la lista de pistas aplicando filtros opcionales de CCAA, tipo de kart y entorno */
  getPistas(filtros: { ccaa?: string; tipo_kart?: string; entorno?: string } = {}) {
    let params = new HttpParams();
    if (filtros.ccaa)      params = params.set('ccaa', filtros.ccaa);
    if (filtros.tipo_kart) params = params.set('tipo_kart', filtros.tipo_kart);
    if (filtros.entorno)   params = params.set('entorno', filtros.entorno);
    return firstValueFrom(this.http.get<any[]>(`${BASE}/pistas`, { params }));
  }

  /** Obtiene los datos completos de una pista por su ID */
  getPistaPorId(id: number) {
    return firstValueFrom(this.http.get<any>(`${BASE}/pistas/${id}`));
  }

  // ─── ESCUDERÍAS ──────────────────────────────────────────────────────────────

  /** Devuelve todas las escuderías sin filtros */
  getEscuderias() {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/escuderias/todas`));
  }

  /** Devuelve escuderías filtradas opcionalmente por comunidad autónoma */
  getEscuderiasFiltradas(comunidad?: string) {
    let params = new HttpParams();
    if (comunidad) params = params.set('comunidad', comunidad);
    return firstValueFrom(this.http.get<any[]>(`${BASE}/escuderias/filtradas`, { params }));
  }

  /** Obtiene los datos de una escudería por su ID */
  getEscuderiaPorId(id: number) {
    return firstValueFrom(this.http.get<any>(`${BASE}/escuderias/${id}`));
  }

  /** Devuelve la lista de usuarios miembros de una escudería */
  getMiembrosEscuderia(idEscuderia: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/escuderias/${idEscuderia}/miembros`));
  }

  /** Cuenta el número de miembros actuales de una escudería */
  countMiembrosEscuderia(idEscuderia: number) {
    return firstValueFrom(this.http.get<{ count: number }>(`${BASE}/escuderias/${idEscuderia}/miembros/count`));
  }

  /** Crea una nueva escudería con el piloto indicado como líder */
  crearEscuderia(idLider: number, datos: any) {
    return firstValueFrom(this.http.post<any>(`${BASE}/escuderias/crear/${idLider}`, datos));
  }

  /** Elimina permanentemente una escudería por su ID */
  eliminarEscuderia(id: number) {
    return firstValueFrom(this.http.delete<any>(`${BASE}/escuderias/eliminar/${id}`));
  }

  /** Devuelve todos los usuarios registrados (usado para calcular miembros por escudería) */
  getTodosUsuarios() {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/usuarios`));
  }

  // ─── LOGROS ──────────────────────────────────────────────────────────────────

  /** Devuelve el catálogo completo de logros de la plataforma (desbloqueados + bloqueados) */
  getTodosLogros() {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/logros`));
  }

  /** Devuelve los logros desbloqueados por un usuario, incluyendo nombre, descripción e imagen */
  getLogrosUsuario(idUsuario: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/logros/usuario/${idUsuario}`));
  }

  // ─── AMIGOS ──────────────────────────────────────────────────────────────────

  /** Devuelve las relaciones de amistad aceptadas de un usuario (incluye datos del solicitante y del aceptante) */
  getAmigosAceptados(idUsuario: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/amigos/usuario/${idUsuario}`));
  }

  /** Devuelve todas las relaciones de un usuario (aceptadas, pendientes y rechazadas) */
  getTodasRelaciones(idUsuario: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/amigos/relaciones/${idUsuario}`));
  }

  /** Devuelve las solicitudes de amistad pendientes dirigidas al usuario */
  getSolicitudesPendientes(idUsuario: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/amigos/pendientes/${idUsuario}`));
  }

  /** Cuenta cuántas solicitudes pendientes tiene el usuario (usado para el badge del header) */
  countSolicitudesPendientes(idUsuario: number) {
    return firstValueFrom(this.http.get<{ count: number }>(`${BASE}/amigos/pendientes/count/${idUsuario}`));
  }

  /** Envía una solicitud de amistad del piloto solicitante al piloto aceptante */
  enviarSolicitudAmistad(idSolicita: number, idAcepta: number) {
    return firstValueFrom(this.http.post<any>(`${BASE}/amigos`, { idSolicita, idAcepta }));
  }

  /** Acepta una solicitud de amistad por el ID de la relación */
  aceptarSolicitud(idRelacion: number) {
    return firstValueFrom(this.http.put<any>(`${BASE}/amigos/${idRelacion}/aceptar`, {}));
  }

  /** Elimina una relación de amistad (sirve tanto para rechazar como para eliminar amigo) */
  eliminarRelacion(idRelacion: number) {
    return firstValueFrom(this.http.delete<any>(`${BASE}/amigos/${idRelacion}`));
  }

  /** Devuelve el estado de amistad entre dos usuarios: "aceptado" | "pendiente" | "ninguno" */
  getEstadoAmistad(idUsuario: number, idOtro: number) {
    return firstValueFrom(
      this.http.get<{ estado: string }>(`${BASE}/amigos/estado`, {
        params: { idUsuario: idUsuario.toString(), idOtro: idOtro.toString() }
      })
    );
  }

  // ─── CLASIFICACIÓN ────────────────────────────────────────────────────────────

  /** Devuelve las estadísticas de carrera de un piloto concreto */
  getClasificacion(idUsuario: number) {
    return firstValueFrom(this.http.get<any>(`${BASE}/clasificacion/${idUsuario}`));
  }

  /** Devuelve el ranking completo de pilotos (incluye datos del usuario anidado) */
  getRankingCompleto() {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/clasificacion`));
  }

  /** Devuelve el historial de carreras de un piloto por su username */
  getHistorialPiloto(username: string) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/clasificacion/historial/${encodeURIComponent(username)}`));
  }

  // ─── CARRERAS DE CLAN ─────────────────────────────────────────────────────────

  /** Lista las carreras programadas de una escudería */
  getCarrerasClan(idEscuderia: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/carreras-clan/escuderia/${idEscuderia}`));
  }

  /** Devuelve los inscritos de una carrera de clan */
  getInscritosClan(idCarrera: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/carreras-clan/${idCarrera}/inscritos`));
  }

  /** Crea una nueva carrera de clan */
  crearCarreraClan(datos: any) {
    return firstValueFrom(this.http.post<any>(`${BASE}/carreras-clan`, datos));
  }

  /** Inscribe al usuario en una carrera de clan */
  inscribirseClan(idCarrera: number, datos: { id_usuario: number; username: string; foto_perfil?: string }) {
    return firstValueFrom(this.http.post<any>(`${BASE}/carreras-clan/${idCarrera}/inscribirse`, datos));
  }

  /** Elimina la inscripción del usuario de una carrera de clan */
  desinscribirseClan(idCarrera: number, idUsuario: number) {
    return firstValueFrom(this.http.delete<any>(`${BASE}/carreras-clan/${idCarrera}/inscribirse/${idUsuario}`));
  }

  /** Elimina una carrera de clan (solo el creador) junto con sus mensajes de chat */
  eliminarCarreraClan(idCarrera: number) {
    return firstValueFrom(this.http.delete<any>(`${BASE}/carreras-clan/${idCarrera}`));
  }

  // ─── CHAT DEL CLAN ────────────────────────────────────────────────────────────

  /** Obtiene los últimos 100 mensajes del chat de una escudería */
  getMensajesClan(idEscuderia: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/chat-clan/${idEscuderia}`));
  }

  /** Envía un mensaje al chat de la escudería */
  enviarMensajeClan(datos: any) {
    return firstValueFrom(this.http.post<any>(`${BASE}/chat-clan`, datos));
  }

  /** Elimina un mensaje del chat del clan por su ID */
  eliminarMensajeClan(idMensaje: number) {
    return firstValueFrom(this.http.delete<any>(`${BASE}/chat-clan/${idMensaje}`));
  }

  // ─── USUARIOS BATCH ──────────────────────────────────────────────────────────

  /** Obtiene varios usuarios a la vez por sus IDs (para evitar N+1 en conversaciones) */
  getUsuariosBatch(ids: number[]) {
    return firstValueFrom(this.http.post<any[]>(`${BASE}/usuarios/batch`, ids));
  }

  // ─── MENSAJES DIRECTOS ────────────────────────────────────────────────────────

  /** Todos los mensajes en los que participa el usuario (para listar conversaciones) */
  getMensajesDirectosUsuario(idUsuario: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/mensajes-directos/usuario/${idUsuario}`));
  }

  /** Historial de mensajes entre dos usuarios */
  getConversacionDM(a: number, b: number) {
    return firstValueFrom(
      this.http.get<any[]>(`${BASE}/mensajes-directos/conversacion`, {
        params: { a: a.toString(), b: b.toString() }
      })
    );
  }

  /** Envía un mensaje directo */
  enviarMensajeDirecto(datos: { id_remitente: number; id_destinatario: number; mensaje: string }) {
    return firstValueFrom(this.http.post<any>(`${BASE}/mensajes-directos`, datos));
  }

  /** Marca como leídos todos los mensajes de remitente → destinatario no leídos */
  marcarLeidosDM(remitente: number, destinatario: number) {
    return firstValueFrom(
      this.http.put<any>(`${BASE}/mensajes-directos/leer`, null, {
        params: { remitente: remitente.toString(), destinatario: destinatario.toString() }
      })
    );
  }

  /** Marca un mensaje individual como leído */
  marcarUnoLeidoDM(id: number) {
    return firstValueFrom(this.http.put<any>(`${BASE}/mensajes-directos/${id}/leer`, null));
  }

  // ─── GRUPOS SOCIALES ──────────────────────────────────────────────────────────

  /** Grupos a los que pertenece el usuario */
  getGruposUsuario(idUsuario: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/grupos/usuario/${idUsuario}`));
  }

  /** Crea un grupo nuevo (el creador se añade automáticamente como miembro) */
  crearGrupo(datos: { nombre: string; descripcion?: string | null; creado_por: number }) {
    return firstValueFrom(this.http.post<any>(`${BASE}/grupos`, datos));
  }

  /** IDs de los miembros de un grupo */
  getMiembrosGrupo(idGrupo: number) {
    return firstValueFrom(this.http.get<number[]>(`${BASE}/grupos/${idGrupo}/miembros`));
  }

  /** Añade a un usuario a un grupo */
  anadirMiembroGrupo(idGrupo: number, idUsuario: number) {
    return firstValueFrom(this.http.post<any>(`${BASE}/grupos/${idGrupo}/miembros`, { id_usuario: idUsuario }));
  }

  /** Abandona (o expulsa de) un grupo */
  abandonarGrupo(idGrupo: number, idUsuario: number) {
    return firstValueFrom(this.http.delete<any>(`${BASE}/grupos/${idGrupo}/miembros/${idUsuario}`));
  }

  /** Mensajes de un grupo (últimos 200) */
  getMensajesGrupo(idGrupo: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/grupos/${idGrupo}/mensajes`));
  }

  /** Envía un mensaje a un grupo */
  enviarMensajeGrupo(idGrupo: number, datos: { id_usuario: number; username: string; mensaje: string }) {
    return firstValueFrom(this.http.post<any>(`${BASE}/grupos/${idGrupo}/mensajes`, datos));
  }

  // ─── FAVORITAS ────────────────────────────────────────────────────────────────

  /** Devuelve los IDs de pistas favoritas del usuario */
  getFavoritas(idUsuario: number) {
    return firstValueFrom(this.http.get<number[]>(`${BASE}/favoritas/${idUsuario}`));
  }

  /** Añade una pista a los favoritos del usuario */
  addFavorita(idUsuario: number, idPista: number) {
    return firstValueFrom(this.http.post<any>(`${BASE}/favoritas`, { id_usuario: idUsuario, id_pista: idPista }));
  }

  /** Quita una pista de los favoritos del usuario */
  removeFavorita(idUsuario: number, idPista: number) {
    return firstValueFrom(this.http.delete<any>(`${BASE}/favoritas/${idUsuario}/${idPista}`));
  }

  // ─── VALORACIONES ─────────────────────────────────────────────────────────────

  /** Devuelve todas las valoraciones de todas las pistas (para construir el mapa en la lista) */
  getAllValoraciones() {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/valoraciones/todas`));
  }

  /** Devuelve todas las valoraciones de una pista */
  getValoraciones(idPista: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/valoraciones/pista/${idPista}`));
  }

  /** Crea o actualiza la valoración del usuario sobre una pista */
  valorarPista(datos: { id_pista: number; id_usuario: number; nota: number }) {
    return firstValueFrom(this.http.post<any>(`${BASE}/valoraciones`, datos));
  }

  /** Elimina la valoración del usuario sobre una pista */
  eliminarValoracion(idUsuario: number, idPista: number) {
    return firstValueFrom(
      this.http.delete<any>(`${BASE}/valoraciones`, {
        params: { idPista: idPista.toString(), idUsuario: idUsuario.toString() }
      })
    );
  }

  // ─── CHAT PISTA (SOCIAL) ──────────────────────────────────────────────────────

  /** Obtiene los últimos 100 mensajes del chat de una pista */
  getMensajesPista(idPista: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/chat-pista/${idPista}`));
  }

  /** Envía un mensaje al chat de la pista */
  enviarMensajePista(datos: any) {
    return firstValueFrom(this.http.post<any>(`${BASE}/chat-pista`, datos));
  }

  /** Número de mensajes por pista en las últimas 24 h (para el hub social) */
  getConteoChatRecientes() {
    return firstValueFrom(this.http.get<Record<string, number>>(`${BASE}/chat-pista/conteo-recientes`));
  }

  // ─── CARRERAS ABIERTAS (SOCIAL) ───────────────────────────────────────────────

  /** Devuelve las carreras de clan programadas en una pista por su nombre (para la vista de pistas) */
  getCarrerasClanPorPista(nombre: string) {
    return firstValueFrom(
      this.http.get<any[]>(`${BASE}/carreras-clan/pista`, { params: { nombre } })
    );
  }

  /** Devuelve las carreras abiertas programadas en una pista */
  getCarrerasPista(idPista: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/carreras-pista/${idPista}`));
  }

  /** Devuelve los inscritos de varias carreras de pista a la vez (evita N+1 queries) */
  getInscritosLotePista(ids: number[]) {
    return firstValueFrom(this.http.post<any[]>(`${BASE}/carreras-pista/inscritos/lote`, ids));
  }

  /** Crea una nueva carrera abierta en una pista */
  crearCarreraPista(datos: any) {
    return firstValueFrom(this.http.post<any>(`${BASE}/carreras-pista`, datos));
  }

  /** Inscribe al usuario en una carrera abierta de pista */
  inscribirsePista(idCarrera: number, datos: { id_usuario: number; username: string; foto_perfil?: string }) {
    return firstValueFrom(this.http.post<any>(`${BASE}/carreras-pista/${idCarrera}/inscribirse`, datos));
  }

  /** Elimina la inscripción del usuario de una carrera de pista */
  desinscribirsePista(idCarrera: number, idUsuario: number) {
    return firstValueFrom(this.http.delete<any>(`${BASE}/carreras-pista/${idCarrera}/inscribirse/${idUsuario}`));
  }

  /** Elimina una carrera abierta (solo el creador) */
  eliminarCarreraPista(idCarrera: number) {
    return firstValueFrom(this.http.delete<any>(`${BASE}/carreras-pista/${idCarrera}`));
  }

  // ─── RESEÑAS PISTAS ──────────────────────────────────────────────────────────

  /** Devuelve las reseñas de una pista */
  getResenas(idPista: number) {
    return firstValueFrom(this.http.get<any[]>(`${BASE}/resenas/pista/${idPista}`));
  }

  /** Comprueba si el usuario ya dejó reseña en esta pista */
  existeResena(idUsuario: number, idPista: number) {
    return firstValueFrom(
      this.http.get<{ existe: boolean }>(`${BASE}/resenas/existe`, {
        params: { idUsuario: idUsuario.toString(), idPista: idPista.toString() }
      })
    );
  }

  /** Crea una reseña de pista */
  crearResena(datos: any) {
    return firstValueFrom(this.http.post<any>(`${BASE}/resenas`, datos));
  }

  /** Elimina la reseña del usuario en una pista */
  eliminarResena(idUsuario: number, idPista: number) {
    return firstValueFrom(
      this.http.delete<any>(`${BASE}/resenas`, {
        params: { idUsuario: idUsuario.toString(), idPista: idPista.toString() }
      })
    );
  }
}
