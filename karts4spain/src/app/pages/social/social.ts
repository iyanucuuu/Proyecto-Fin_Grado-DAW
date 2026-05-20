import { Component, afterNextRender, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ApiService } from '../../services/api.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface MensajeSocial {
  id: number;
  id_pista: number;
  id_usuario: number;
  username: string;
  mensaje: string;
  created_at: string;
  esMio: boolean;
  initials: string;
}

interface CarreraSocial {
  id: number;
  id_pista: number;
  id_usuario_creador: number;
  username_creador: string;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string;
  created_at: string;
}

interface Resena {
  id: number;
  id_pista: number;
  id_usuario: number;
  username: string;
  foto_perfil: string | null;
  comentario: string;
  nota: number;       // DB: valoracion
  asfalto: number | null; // DB: estado_asfalto
  created_at: string; // DB: fecha_creacion
  esMia: boolean;
  initials: string;
}

interface PistaInfo {
  id_pista: number;
  nombre: string;
  ccaa: string;
  tipo_kart: string;
  entorno: string;
  url: string | null;
  foto: string | null;
}

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, Footer],
  templateUrl: './social.html',
  styleUrl: './social.css'
})
export class Social implements OnDestroy, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  pista: PistaInfo | null = null;
  mensajes: MensajeSocial[] = [];
  carreras: CarreraSocial[] = [];
  cargando = true;

  idPista = 0;
  idUsuario = 0;
  usernameActual = '';

  nuevoMensaje = '';
  enviando = false;

  mostrarModalCarrera = false;
  nuevaCarrera = { titulo: '', descripcion: '', fecha_hora: '' };
  creandoCarrera = false;
  errorCarrera = '';

  eliminandoCarreraId: number | null = null;

  // Inscripciones a carreras abiertas
  inscripcionesMap: Map<number, { id_usuario: number; username: string; foto_perfil: string | null }[]> = new Map();
  apuntandoCarreraId: number | null = null;

  tabActiva: 'chat' | 'carreras' | 'resenas' = 'chat';

  // Reseñas
  resenas: Resena[] = [];
  cargandoResenas = false;
  miResena = { comentario: '', nota: 0, asfalto: 0, notaHover: 0, asfaltoHover: 0 };
  guardandoResena = false;
  yaResene = false;
  errorResena = '';

  private channel: RealtimeChannel | null = null;
  private debeScrollear = false;

  constructor(
    private route: ActivatedRoute,
    private supa: SupabaseService,
    private api: ApiService,
    private cd: ChangeDetectorRef
  ) {
    afterNextRender(async () => {
      this.idUsuario      = parseInt(localStorage.getItem('id_usuario') || '0');
      this.usernameActual = localStorage.getItem('nombrePiloto') || '';
      this.idPista        = parseInt(this.route.snapshot.paramMap.get('id') || '0');

      await this.cargarPista();
      await Promise.all([this.cargarMensajes(), this.cargarCarreras(), this.cargarResenas()]);
      this.cargando = false;
      this.cd.detectChanges();
      this.suscribirRealtime();
    });
  }

  ngOnDestroy(): void {
    if (this.channel) this.supa.supabase.removeChannel(this.channel);
  }

  ngAfterViewChecked(): void {
    if (this.debeScrollear) {
      this.scrollChat();
      this.debeScrollear = false;
    }
  }

  private scrollChat(): void {
    try {
      const el = this.chatContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  // ─── CARGA ─────────────────────────────────────────────────────────────────

  async cargarPista(): Promise<void> {
    this.pista = await this.api.getPistaPorId(this.idPista) ?? null;
  }

  async cargarMensajes(): Promise<void> {
    const data = await this.api.getMensajesPista(this.idPista);
    this.mensajes = (data ?? []).map((m: any) => this.mapMensaje(m));
    this.debeScrollear = true;
  }

  async cargarCarreras(): Promise<void> {
    const data = await this.api.getCarrerasPista(this.idPista);
    const ahora = new Date();
    this.carreras = ((data ?? []) as CarreraSocial[])
      .filter(c => new Date(c.fecha_hora) >= ahora);
    await this.cargarInscripciones();
  }

  async cargarInscripciones(): Promise<void> {
    if (this.carreras.length === 0) return;
    const ids = this.carreras.map(c => c.id);
    const data = await this.api.getInscritosLotePista(ids);

    this.inscripcionesMap = new Map();
    for (const row of (data ?? []) as any[]) {
      const idCarrera = Number(row.id_carrera);
      const lista = this.inscripcionesMap.get(idCarrera) ?? [];
      lista.push({ id_usuario: Number(row.id_usuario), username: row.username, foto_perfil: row.foto_perfil ?? null });
      this.inscripcionesMap.set(idCarrera, lista);
    }
  }

  inscritosDeCarrera(idCarrera: number) {
    return this.inscripcionesMap.get(idCarrera) ?? [];
  }

  yaApuntado(idCarrera: number): boolean {
    return this.inscritosDeCarrera(idCarrera).some(i => i.id_usuario === this.idUsuario);
  }

  async toggleInscripcion(carrera: CarreraSocial): Promise<void> {
    if (!this.idUsuario || this.apuntandoCarreraId === carrera.id) return;
    this.apuntandoCarreraId = carrera.id;
    try {
      if (this.yaApuntado(carrera.id)) {
        await this.api.desinscribirsePista(carrera.id, this.idUsuario);
      } else {
        const fotoPerfil = localStorage.getItem('foto_perfil') || null;
        await this.api.inscribirsePista(carrera.id, {
          id_usuario:  this.idUsuario,
          username:    this.usernameActual,
          foto_perfil: fotoPerfil ?? undefined
        });
      }
    } catch {}
    await this.cargarInscripciones();
    this.apuntandoCarreraId = null;
    this.cd.detectChanges();
  }

  private mapMensaje(m: any): MensajeSocial {
    return {
      id: m.id,
      id_pista: m.id_pista,
      id_usuario: m.id_usuario,
      username: m.username,
      mensaje: m.mensaje,
      created_at: m.created_at,
      esMio: m.id_usuario === this.idUsuario,
      initials: (m.username ?? '?').slice(0, 2).toUpperCase()
    };
  }

  // ─── REALTIME ───────────────────────────────────────────────────────────────

  private suscribirRealtime(): void {
    this.channel = this.supa.supabase
      .channel(`social_pista_${this.idPista}`)
      .on('postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'chat_pista', filter: `id_pista=eq.${this.idPista}` },
        (payload: any) => {
          this.mensajes.push(this.mapMensaje(payload.new));
          this.debeScrollear = true;
          this.cd.detectChanges();
        })
      .on('postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'chat_pista', filter: `id_pista=eq.${this.idPista}` },
        (payload: any) => {
          this.mensajes = this.mensajes.filter(m => m.id !== payload.old.id);
          this.cd.detectChanges();
        })
      .on('postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'carreras_pista', filter: `id_pista=eq.${this.idPista}` },
        (payload: any) => {
          const nueva = payload.new as CarreraSocial;
          if (new Date(nueva.fecha_hora) >= new Date()) {
            this.carreras.push(nueva);
            this.carreras.sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
          }
          this.cd.detectChanges();
        })
      .on('postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'carreras_pista', filter: `id_pista=eq.${this.idPista}` },
        (payload: any) => {
          this.carreras = this.carreras.filter(c => c.id !== payload.old.id);
          this.cd.detectChanges();
        })
      .subscribe();
  }

  // ─── CHAT ───────────────────────────────────────────────────────────────────

  async enviarMensaje(): Promise<void> {
    const texto = this.nuevoMensaje.trim();
    if (!texto || !this.idUsuario || this.enviando) return;
    this.enviando = true;
    this.nuevoMensaje = '';
    await this.api.enviarMensajePista({
      id_pista:   this.idPista,
      id_usuario: this.idUsuario,
      username:   this.usernameActual,
      mensaje:    texto
    });
    this.enviando = false;
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }

  // ─── CARRERAS ───────────────────────────────────────────────────────────────

  abrirModalCarrera(): void {
    if (!this.idUsuario) return;
    this.nuevaCarrera = { titulo: '', descripcion: '', fecha_hora: '' };
    this.errorCarrera = '';
    this.mostrarModalCarrera = true;
  }

  cerrarModalCarrera(): void {
    this.mostrarModalCarrera = false;
  }

  async crearCarrera(): Promise<void> {
    if (!this.nuevaCarrera.titulo.trim() || !this.nuevaCarrera.fecha_hora) return;
    this.creandoCarrera = true;
    this.errorCarrera = '';
    try {
      const carreraCreada = await this.api.crearCarreraPista({
        id_pista:           this.idPista,
        id_usuario_creador: this.idUsuario,
        username_creador:   this.usernameActual,
        titulo:             this.nuevaCarrera.titulo.trim(),
        descripcion:        this.nuevaCarrera.descripcion?.trim() || null,
        fecha_hora:         this.nuevaCarrera.fecha_hora
      });
      if (carreraCreada?.id) {
        // Auto-inscribir al creador en su propia carrera
        const fotoPerfil = localStorage.getItem('foto_perfil') || null;
        await this.api.inscribirsePista(carreraCreada.id, {
          id_usuario:  this.idUsuario,
          username:    this.usernameActual,
          foto_perfil: fotoPerfil ?? undefined
        });
        this.cerrarModalCarrera();
        this.tabActiva = 'carreras';
        await this.cargarCarreras();
      } else {
        this.errorCarrera = 'Error al crear la carrera. Inténtalo de nuevo.';
      }
    } catch {
      this.errorCarrera = 'Error al crear la carrera. Inténtalo de nuevo.';
    }
    this.creandoCarrera = false;
    this.cd.detectChanges();
  }

  async eliminarCarrera(carrera: CarreraSocial): Promise<void> {
    if (carrera.id_usuario_creador !== this.idUsuario) return;
    this.eliminandoCarreraId = carrera.id;
    await this.api.eliminarCarreraPista(carrera.id);
    this.carreras = this.carreras.filter(c => c.id !== carrera.id);
    this.eliminandoCarreraId = null;
  }

  // ─── RESEÑAS ────────────────────────────────────────────────────────────────

  async cargarResenas(): Promise<void> {
    this.cargandoResenas = true;
    try {
      const data = await this.api.getResenas(this.idPista);
      this.resenas = (data ?? []).map((r: any) => ({
        id:          r.id_resena,
        id_pista:    r.pista?.id_pista ?? this.idPista,
        id_usuario:  r.usuario?.id_usuario ?? 0,
        username:    r.usuario?.username    ?? 'Piloto',
        foto_perfil: r.usuario?.foto_perfil ?? null,
        comentario:  r.comentario           ?? '',
        nota:        r.valoracion           ?? 0,
        asfalto:     r.estado_asfalto       ?? null,
        created_at:  r.fecha_creacion,
        esMia:       r.usuario?.id_usuario === this.idUsuario,
        initials:    (r.usuario?.username ?? '?').slice(0, 2).toUpperCase()
      }));

      // Precargar la reseña propia si ya existe
      const mia = this.resenas.find(r => r.esMia);
      if (mia) {
        this.miResena = { comentario: mia.comentario, nota: mia.nota, asfalto: mia.asfalto ?? 0, notaHover: 0, asfaltoHover: 0 };
        this.yaResene = true;
      } else {
        this.yaResene = false;
      }
    } catch {}
    this.cargandoResenas = false;
    this.cd.detectChanges();
  }

  async publicarResena(): Promise<void> {
    if (!this.idUsuario || !this.miResena.comentario.trim() || !this.miResena.nota) return;
    this.guardandoResena = true;
    this.errorResena = '';
    try {
      if (this.yaResene) {
        await this.api.eliminarResena(this.idUsuario, this.idPista);
      }
      await this.api.crearResena({
        id_pista:       this.idPista,
        id_usuario:     this.idUsuario,
        comentario:     this.miResena.comentario.trim(),
        valoracion:     this.miResena.nota,
        estado_asfalto: this.miResena.asfalto || null
      });
      await this.cargarResenas();
    } catch (e: any) {
      this.errorResena = e?.error?.error ?? 'Error al guardar la reseña. ¿Está el backend activo?';
      this.cd.detectChanges();
    }
    this.guardandoResena = false;
  }

  async eliminarResena(): Promise<void> {
    if (!this.idUsuario || !confirm('¿Eliminar tu reseña?')) return;
    try {
      await this.api.eliminarResena(this.idUsuario, this.idPista);
      this.miResena = { comentario: '', nota: 0, asfalto: 0, notaHover: 0, asfaltoHover: 0 };
      this.yaResene = false;
      await this.cargarResenas();
    } catch {}
  }

  starResenaActiva(hover: number, nota: number, estrella: number): boolean {
    return estrella <= (hover || nota);
  }

  // ─── UTILS ──────────────────────────────────────────────────────────────────

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  esHoy(iso: string): boolean {
    const d = new Date(iso);
    const hoy = new Date();
    return d.getDate() === hoy.getDate() && d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
  }
}
