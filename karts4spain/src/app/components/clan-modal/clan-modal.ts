import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges,
  ChangeDetectorRef, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import type { RealtimeChannel } from '@supabase/supabase-js';

const PUNTOS_CLAN: number[] = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

interface Miembro {
  id_usuario: number;
  username: string;
  foto_perfil: string | null;
  initials: string;
  es_lider: boolean;
}

interface CarreraClan {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string;
  pista: string | null;
  username_creador: string;
  inscritos: Inscrito[];
  yaInscrito: boolean;
}

interface Inscrito {
  id_usuario: number;
  username: string;
  foto_perfil: string | null;
}

interface MensajeChat {
  id: number;
  id_usuario: number;
  username: string;
  foto_perfil: string | null;
  mensaje: string;
  tipo: 'mensaje' | 'carrera';
  id_carrera: number | null;
  created_at: string;
  carrera?: CarreraClan;
  esMio: boolean;
  initials: string;
}

@Component({
  selector: 'app-clan-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clan-modal.html',
  styleUrl: './clan-modal.css'
})
export class ClanModal implements OnInit, OnDestroy, OnChanges {
  @Input() idEscuderia!: number;
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  escuderia: any = null;
  miembros: Miembro[] = [];
  mensajes: MensajeChat[] = [];
  carreras: CarreraClan[] = [];
  cargando = true;

  idUsuario: number = 0;
  usernameActual: string = '';
  fotoPerfil: string | null = null;

  tabActiva: 'escuderia' | 'chat' | 'resultados' | 'clasificacion' = 'escuderia';
  nuevoMensaje = '';
  enviando = false;

  mostrarModalCarrera = false;
  nuevaCarrera = { titulo: '', descripcion: '', fecha_hora: '', pista: '' };
  creandoCarrera = false;

  // Lista de pistas para el desplegable del modal de carrera
  listaPistas: { id_pista: number; nombre: string; ccaa: string }[] = [];
  cargandoPistas = false;

  // ── Resultados carreras de clan ──────────────────────────────────────────
  carrerasSinResultadoClan: CarreraClan[] = [];
  carreraResultadoSeleccionada: CarreraClan | null = null;
  inscritosResultado: { id_usuario: number; username: string; foto_perfil: string | null; posicion: number }[] = [];
  guardandoResultadoClan = false;
  errorResultadoClan = '';

  // ── Clasificación interna clan ───────────────────────────────────────────
  clasificacionClan: {
    posicion: number; id_usuario: number; username: string;
    foto_perfil: string | null; puntos_totales: number;
    carreras_corridas: number; victorias: number; podios: number;
  }[] = [];
  cargandoClasificacion = false;

  private channel: RealtimeChannel | null = null;

  constructor(private supabase: SupabaseService, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.idUsuario      = Number(localStorage.getItem('id_usuario') ?? 0);
    this.usernameActual = localStorage.getItem('nombrePiloto') ?? '';
    this.fotoPerfil     = localStorage.getItem('foto_perfil') ?? null;
    this.cargarTodo();
    this.suscribirseAlChat();
    document.body.style.overflow = 'hidden';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['idEscuderia'] && !changes['idEscuderia'].firstChange) {
      this.channel?.unsubscribe();
      this.cargarTodo();
      this.suscribirseAlChat();
    }
  }

  ngOnDestroy() {
    this.channel?.unsubscribe();
    document.body.style.overflow = '';
  }

  close() { this.cerrar.emit(); }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) this.close();
  }

  async cargarTodo() {
    this.cargando = true;
    await Promise.all([this.cargarEscuderia(), this.cargarMiembros(), this.cargarMensajes()]);
    this.cargando = false;
    this.cd.detectChanges();
    this.scrollAlFinal();
  }

  async cargarEscuderia() {
    const { data } = await this.supabase.getEscuderiaPorId(this.idEscuderia);
    this.escuderia = data;
  }

  async cargarMiembros() {
    const { data } = await this.supabase.supabase
      .from('usuarios').select('id_usuario, username, foto_perfil')
      .eq('id_escuderia', this.idEscuderia);
    if (!data) return;
    this.miembros = data.map((u: any) => ({
      id_usuario:  u.id_usuario,
      username:    u.username,
      foto_perfil: u.foto_perfil ?? null,
      initials:    (u.username ?? '?').slice(0, 2).toUpperCase(),
      es_lider:    u.id_usuario === this.escuderia?.id_lider
    }));
    this.miembros.sort((a, b) => (b.es_lider ? 1 : 0) - (a.es_lider ? 1 : 0));
  }

  async cargarMensajes() {
    const { data } = await this.supabase.supabase
      .from('chat_clan').select('*')
      .eq('id_escuderia', this.idEscuderia)
      .order('created_at', { ascending: true }).limit(100);
    if (!data) return;
    const carreras = await this.cargarCarreras();
    this.mensajes = data.map((m: any) => ({
      ...m,
      esMio: m.id_usuario === this.idUsuario,
      initials: (m.username ?? '?').slice(0, 2).toUpperCase(),
      carrera: m.tipo === 'carrera' && m.id_carrera
        ? carreras.find((c: CarreraClan) => c.id === m.id_carrera)
        : undefined
    }));
  }

  /** Devuelve true si la fecha/hora de la carrera ya ha pasado */
  esPasada(fechaHora: string): boolean {
    return new Date(fechaHora) < new Date();
  }

  async cargarCarreras(): Promise<CarreraClan[]> {
    const { data: carreras } = await this.supabase.supabase
      .from('carreras_clan').select('*').eq('id_escuderia', this.idEscuderia);
    if (!carreras) return [];
    const { data: inscripciones } = await this.supabase.supabase
      .from('inscripciones_carrera').select('id_carrera, id_usuario, username, foto_perfil')
      .in('id_carrera', carreras.map((c: any) => c.id));

    // Auto-cancelar carreras cuya fecha pasó y nadie se apuntó
    const aEliminar = carreras.filter((c: any) => {
      const inscritos = (inscripciones ?? []).filter((i: any) => i.id_carrera === c.id);
      return new Date(c.fecha_hora) < new Date() && inscritos.length === 0;
    });
    for (const c of aEliminar) {
      await this.supabase.supabase.from('carreras_clan').delete().eq('id', c.id);
    }
    const idsEliminados = new Set(aEliminar.map((c: any) => c.id));

    this.carreras = carreras
      .filter((c: any) => !idsEliminados.has(c.id))
      .map((c: any) => {
        const inscritos = (inscripciones ?? []).filter((i: any) => i.id_carrera === c.id);
        return { ...c, inscritos, yaInscrito: inscritos.some((i: any) => i.id_usuario === this.idUsuario) };
      });
    return this.carreras;
  }

  suscribirseAlChat() {
    this.channel = this.supabase.supabase
      .channel(`clan-modal-${this.idEscuderia}`)
      .on('postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'chat_clan', filter: `id_escuderia=eq.${this.idEscuderia}` },
        async (payload: any) => {
          const nuevo = payload.new;
          let carrera: CarreraClan | undefined;
          if (nuevo.tipo === 'carrera' && nuevo.id_carrera) {
            await this.cargarCarreras();
            carrera = this.carreras.find(c => c.id === nuevo.id_carrera);
          }
          const msg: MensajeChat = {
            ...nuevo, esMio: nuevo.id_usuario === this.idUsuario,
            initials: (nuevo.username ?? '?').slice(0, 2).toUpperCase(), carrera
          };
          if (!this.mensajes.find(m => m.id === msg.id)) {
            this.mensajes.push(msg);
            this.cd.detectChanges();
            this.scrollAlFinal();
          }
        }
      ).subscribe();
  }

  async enviarMensaje() {
    const texto = this.nuevoMensaje.trim();
    if (!texto || this.enviando) return;
    this.enviando = true;
    this.nuevoMensaje = '';
    await this.supabase.supabase.from('chat_clan').insert({
      id_escuderia: this.idEscuderia, id_usuario: this.idUsuario,
      username: this.usernameActual, foto_perfil: this.fotoPerfil,
      mensaje: texto, tipo: 'mensaje'
    });
    this.enviando = false;
  }

  async abrirModalCarrera() {
    this.mostrarModalCarrera = true;
    if (this.listaPistas.length === 0) {
      this.cargandoPistas = true;
      const { data } = await this.supabase.supabase
        .from('pistas')
        .select('id_pista, nombre, ccaa')
        .order('nombre', { ascending: true });
      this.listaPistas = (data ?? []).map((p: any) => ({
        id_pista: p.id_pista,
        nombre: p.nombre,
        ccaa: p.ccaa ?? ''
      }));
      this.cargandoPistas = false;
      this.cd.detectChanges();
    }
  }

  async crearCarrera() {
    if (!this.nuevaCarrera.titulo || !this.nuevaCarrera.fecha_hora || this.creandoCarrera) return;
    this.creandoCarrera = true;
    const { data: carrera, error } = await this.supabase.supabase
      .from('carreras_clan').insert({
        id_escuderia: this.idEscuderia, titulo: this.nuevaCarrera.titulo,
        descripcion: this.nuevaCarrera.descripcion || null,
        fecha_hora: this.nuevaCarrera.fecha_hora,
        pista: this.nuevaCarrera.pista || null,
        id_creador: this.idUsuario, username_creador: this.usernameActual
      }).select().single();
    if (!error && carrera) {
      await this.supabase.supabase.from('chat_clan').insert({
        id_escuderia: this.idEscuderia, id_usuario: this.idUsuario,
        username: this.usernameActual, foto_perfil: this.fotoPerfil,
        mensaje: `¡He organizado una nueva carrera: "${carrera.titulo}"!`,
        tipo: 'carrera', id_carrera: carrera.id
      });
      this.nuevaCarrera = { titulo: '', descripcion: '', fecha_hora: '', pista: '' };
      this.mostrarModalCarrera = false;
      await this.cargarCarreras();
    }
    this.creandoCarrera = false;
    this.cd.detectChanges();
  }

  async inscribirse(carrera: CarreraClan) {
    if (carrera.yaInscrito) {
      await this.supabase.supabase.from('inscripciones_carrera')
        .delete().eq('id_carrera', carrera.id).eq('id_usuario', this.idUsuario);
    } else {
      await this.supabase.supabase.from('inscripciones_carrera').insert({
        id_carrera: carrera.id, id_usuario: this.idUsuario,
        username: this.usernameActual, foto_perfil: this.fotoPerfil
      });
    }
    await this.cargarCarreras();
    this.mensajes = this.mensajes.map(m =>
      m.tipo === 'carrera' && m.id_carrera === carrera.id
        ? { ...m, carrera: this.carreras.find(c => c.id === carrera.id) }
        : m
    );
    this.cd.detectChanges();
  }

  // ── TAB NAVIGATION ───────────────────────────────────────────────────────

  cambiarTab(tab: 'escuderia' | 'chat' | 'resultados' | 'clasificacion') {
    this.tabActiva = tab;
    if (tab === 'chat')          setTimeout(() => this.scrollAlFinal(), 100);
    if (tab === 'resultados')    this.cargarCarrerasSinResultadoClan();
    if (tab === 'clasificacion') this.cargarClasificacionClan();
  }

  // ── RESULTADOS CARRERAS DE CLAN ──────────────────────────────────────────

  async cargarCarrerasSinResultadoClan(): Promise<void> {
    const { data } = await this.supabase.supabase
      .from('carreras_clan')
      .select('*, inscripciones_carrera(id_usuario, username, foto_perfil)')
      .eq('id_escuderia', this.idEscuderia)
      .eq('resultados_guardados', false)
      .lt('fecha_hora', new Date().toISOString())
      .order('fecha_hora', { ascending: false });

    // Excluir carreras sin inscritos: se habrán auto-cancelado al cargar
    this.carrerasSinResultadoClan = ((data ?? []) as any[])
      .filter(c => (c.inscripciones_carrera ?? []).length > 0)
      .map(c => ({
        id: c.id, titulo: c.titulo, descripcion: c.descripcion ?? null,
        fecha_hora: c.fecha_hora, pista: c.pista ?? null,
        username_creador: c.username_creador,
        inscritos: (c.inscripciones_carrera ?? []).map((i: any) => ({
          id_usuario: i.id_usuario, username: i.username, foto_perfil: i.foto_perfil ?? null
        })),
        yaInscrito: (c.inscripciones_carrera ?? []).some((i: any) => i.id_usuario === this.idUsuario)
      }));
    this.cd.detectChanges();
  }

  abrirResultadosClan(carrera: CarreraClan): void {
    this.carreraResultadoSeleccionada = carrera;
    this.errorResultadoClan = '';
    this.inscritosResultado = carrera.inscritos.map(i => ({
      id_usuario:  i.id_usuario,
      username:    i.username,
      foto_perfil: i.foto_perfil,
      posicion:    0
    }));
  }

  cerrarResultadosClan(): void {
    this.carreraResultadoSeleccionada = null;
    this.inscritosResultado = [];
    this.errorResultadoClan = '';
  }

  asignarPosicionClan(inscrito: any, pos: number): void {
    if (inscrito.posicion === pos) { inscrito.posicion = 0; return; }
    const anterior = this.inscritosResultado.find(i => i.posicion === pos && i !== inscrito);
    if (anterior) anterior.posicion = 0;
    inscrito.posicion = pos;
  }

  get posicionesDisponiblesClan(): number[] {
    return Array.from({ length: this.inscritosResultado.length }, (_, i) => i + 1);
  }

  puntosParaPosicionClan(pos: number): number {
    const idx = pos - 1;
    return idx >= 0 && idx < PUNTOS_CLAN.length ? PUNTOS_CLAN[idx] : 0;
  }

  async guardarResultadosClan(): Promise<void> {
    if (!this.carreraResultadoSeleccionada) return;

    const sinPos = this.inscritosResultado.filter(i => i.posicion === 0);
    if (sinPos.length > 0) {
      this.errorResultadoClan = `Faltan ${sinPos.length} piloto(s) sin posición asignada.`;
      return;
    }
    const posiciones = this.inscritosResultado.map(i => i.posicion);
    if (new Set(posiciones).size !== posiciones.length) {
      this.errorResultadoClan = 'Hay posiciones repetidas.';
      return;
    }

    this.guardandoResultadoClan = true;
    this.errorResultadoClan = '';

    const rows = this.inscritosResultado.map(i => ({
      id_carrera:   this.carreraResultadoSeleccionada!.id,
      id_escuderia: this.idEscuderia,
      id_usuario:   i.id_usuario,
      username:     i.username,
      posicion:     i.posicion,
      puntos:       this.puntosParaPosicionClan(i.posicion)
    }));

    const { error } = await this.supabase.supabase.from('resultados_clan').insert(rows);
    if (error) {
      this.errorResultadoClan = 'Error al guardar. Inténtalo de nuevo.';
      this.guardandoResultadoClan = false;
      return;
    }

    await this.supabase.supabase.from('carreras_clan')
      .update({ resultados_guardados: true })
      .eq('id', this.carreraResultadoSeleccionada!.id);

    for (const row of rows) {
      const esVictoria = row.posicion === 1 ? 1 : 0;
      const esPodio    = row.posicion <= 3 ? 1 : 0;

      const { data: clasi } = await this.supabase.supabase
        .from('clasificacion_clan')
        .select('id, puntos_totales, carreras_corridas, victorias, podios')
        .eq('id_escuderia', this.idEscuderia)
        .eq('id_usuario', row.id_usuario)
        .maybeSingle();

      if (clasi) {
        await this.supabase.supabase.from('clasificacion_clan').update({
          puntos_totales:    (clasi.puntos_totales   ?? 0) + row.puntos,
          carreras_corridas: (clasi.carreras_corridas ?? 0) + 1,
          victorias:         (clasi.victorias ?? 0) + esVictoria,
          podios:            (clasi.podios    ?? 0) + esPodio
        }).eq('id', clasi.id);
      } else {
        await this.supabase.supabase.from('clasificacion_clan').insert({
          id_escuderia:      this.idEscuderia,
          id_usuario:        row.id_usuario,
          username:          row.username,
          puntos_totales:    row.puntos,
          carreras_corridas: 1,
          victorias:         esVictoria,
          podios:            esPodio
        });
      }
    }

    this.guardandoResultadoClan = false;
    this.cerrarResultadosClan();
    await this.cargarCarrerasSinResultadoClan();
  }

  // ── CLASIFICACIÓN INTERNA CLAN ───────────────────────────────────────────

  async cargarClasificacionClan(): Promise<void> {
    this.cargandoClasificacion = true;
    const { data } = await this.supabase.supabase
      .from('clasificacion_clan')
      .select('id_usuario, username, puntos_totales, carreras_corridas, victorias, podios')
      .eq('id_escuderia', this.idEscuderia)
      .order('puntos_totales', { ascending: false });

    this.clasificacionClan = ((data ?? []) as any[]).map((r, idx) => {
      const miembro = this.miembros.find(m => m.id_usuario === r.id_usuario);
      return {
        posicion:          idx + 1,
        id_usuario:        r.id_usuario,
        username:          r.username,
        foto_perfil:       miembro?.foto_perfil ?? null,
        puntos_totales:    r.puntos_totales,
        carreras_corridas: r.carreras_corridas,
        victorias:         r.victorias,
        podios:            r.podios
      };
    });
    this.cargandoClasificacion = false;
    this.cd.detectChanges();
  }

  medallaClaseClan(pos: number): string {
    if (pos === 1) return 'oro';
    if (pos === 2) return 'plata';
    if (pos === 3) return 'bronce';
    return '';
  }

  // ── UTILS ────────────────────────────────────────────────────────────────

  scrollAlFinal() {
    setTimeout(() => {
      if (this.chatContainer?.nativeElement)
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }, 50);
  }

  onEnter(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.enviarMensaje(); }
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  formatHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
}
