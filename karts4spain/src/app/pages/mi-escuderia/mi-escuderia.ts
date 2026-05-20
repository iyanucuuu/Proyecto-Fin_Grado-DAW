import { Component, afterNextRender, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ApiService } from '../../services/api.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Miembro {
  id_usuario: number;
  username: string;
  foto_perfil: string | null;
  initials: string;
  es_lider: boolean;
}

interface CarreraClan {
  id: number;
  id_escuderia: number;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string;
  pista: string | null;
  id_creador: number;
  username_creador: string;
  created_at: string;
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
  selector: 'app-mi-escuderia',
  standalone: true,
  imports: [CommonModule, FormsModule, Header, Footer],
  templateUrl: './mi-escuderia.html',
  styleUrl: './mi-escuderia.css'
})
export class MiEscuderia implements OnDestroy {
  // Referencia al contenedor del chat para hacer scroll automático al último mensaje
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  // Datos de la escudería, sus miembros, mensajes del chat y carreras programadas
  escuderia: any = null;
  miembros: Miembro[] = [];
  mensajes: MensajeChat[] = [];
  carreras: CarreraClan[] = [];
  cargando = true;

  // Datos del piloto logueado leídos del localStorage
  idUsuario: number = 0;
  usernameActual: string = '';
  fotoPerfil: string | null = null;
  idEscuderia: number = 0; // leído del parámetro de ruta

  // Estado del campo de texto del chat
  nuevoMensaje = '';
  enviando = false;

  // Estado del modal para crear una nueva carrera de clan
  mostrarModalCarrera = false;
  nuevaCarrera = { titulo: '', descripcion: '', fecha_hora: '', pista: '' };
  creandoCarrera = false;

  // Lista de pistas para el desplegable del modal de carrera
  listaPistas: { id_pista: number; nombre: string; ccaa: string }[] = [];
  cargandoPistas = false;

  // Tab activa: vista de escudería/miembros o chat en tiempo real
  tabActiva: 'escuderia' | 'chat' = 'escuderia';

  // ID de la carrera que está siendo eliminada (para mostrar spinner en el botón)
  eliminandoCarreraId: number | null = null;

  // Canal de Supabase Realtime para recibir mensajes del chat en tiempo real
  private channel: RealtimeChannel | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    private api: ApiService,
    private cd: ChangeDetectorRef
  ) {
    afterNextRender(async () => {
      const idStr = localStorage.getItem('id_usuario');
      this.idUsuario = idStr ? Number(idStr) : 0;
      this.usernameActual = localStorage.getItem('nombrePiloto') ?? '';
      this.fotoPerfil = localStorage.getItem('foto_perfil') ?? null;

      const paramId = this.route.snapshot.paramMap.get('id');
      this.idEscuderia = paramId ? Number(paramId) : 0;

      if (!this.idUsuario || !this.idEscuderia) {
        this.router.navigate(['/cuenta']);
        return;
      }

      this.cargarTodo();
      this.suscribirseAlChat();
    });
  }

  ngOnDestroy() {
    this.channel?.unsubscribe();
  }

  async cargarTodo() {
    this.cargando = true;
    // cargarEscuderia() DEBE terminar antes que cargarMiembros(), porque
    // cargarMiembros() necesita this.escuderia?.id_lider para marcar al líder.
    await this.cargarEscuderia();
    await Promise.all([this.cargarMiembros(), this.cargarMensajes()]);
    this.cargando = false;
    this.cd.detectChanges();
    this.scrollAlFinal();
  }

  async cargarEscuderia() {
    // Usa el backend en lugar de Supabase directo
    this.escuderia = await this.api.getEscuderiaPorId(this.idEscuderia);
  }

  async cargarMiembros() {
    // Usa el endpoint del backend /api/escuderias/{id}/miembros
    const data = await this.api.getMiembrosEscuderia(this.idEscuderia);
    if (!data) return;
    this.miembros = data.map((u: any) => ({
      id_usuario: u.id_usuario, username: u.username, foto_perfil: u.foto_perfil ?? null,
      initials: u.username?.substring(0, 2).toUpperCase() ?? '??',
      es_lider: u.id_usuario === this.escuderia?.id_lider
    }));
    this.miembros.sort((a, b) => (b.es_lider ? 1 : 0) - (a.es_lider ? 1 : 0));
  }

  async cargarMensajes() {
    // Usa el backend /api/chat-clan/{idEscuderia}
    const data = await this.api.getMensajesClan(this.idEscuderia);
    if (!data) return;
    const carreras = await this.cargarCarreras();
    this.mensajes = data.map((m: any) => {
      const carrera = m.tipo === 'carrera' && m.id_carrera
        ? carreras.find(c => c.id === m.id_carrera) : undefined;
      return { ...m, esMio: m.id_usuario === this.idUsuario, initials: m.username?.substring(0, 2).toUpperCase() ?? '??', carrera };
    });
  }

  /** Devuelve true si la fecha/hora de la carrera ya ha pasado */
  esPasada(fechaHora: string): boolean {
    return new Date(fechaHora) < new Date();
  }

  async cargarCarreras(): Promise<CarreraClan[]> {
    // Carga carreras e inscritos desde el backend
    const carreras = await this.api.getCarrerasClan(this.idEscuderia);
    if (!carreras?.length) { this.carreras = []; return []; }

    // Carga inscritos de cada carrera
    const inscripcionesPromises = carreras.map((c: any) => this.api.getInscritosClan(c.id));
    const allInscritos = await Promise.all(inscripcionesPromises);

    // Eliminar automáticamente carreras cuya fecha pasó y nadie se apuntó
    const aEliminar = carreras.filter((c: any, i: number) => {
      const pasada = new Date(c.fecha_hora) < new Date();
      return pasada && allInscritos[i].length === 0;
    });
    for (const c of aEliminar) {
      await this.api.eliminarCarreraClan(c.id);
    }
    const idsEliminados = new Set(aEliminar.map((c: any) => c.id));

    this.carreras = carreras
      .filter((c: any) => !idsEliminados.has(c.id))
      .map((c: any, i: number) => {
        const inscritos = allInscritos[i] ?? [];
        return { ...c, inscritos, yaInscrito: inscritos.some((ins: any) => ins.id_usuario === this.idUsuario) };
      });
    return this.carreras;
  }

  suscribirseAlChat() {
    this.channel = this.supabase.supabase
      .channel(`clan-chat-${this.idEscuderia}`)
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
            initials: nuevo.username?.substring(0, 2).toUpperCase() ?? '??', carrera
          };
          if (!this.mensajes.find(m => m.id === msg.id)) {
            this.mensajes.push(msg);
            this.cd.detectChanges();
            this.scrollAlFinal();
          }
        }
      )
      .on('postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'chat_clan', filter: `id_escuderia=eq.${this.idEscuderia}` },
        (payload: any) => {
          this.mensajes = this.mensajes.filter(m => m.id !== payload.old.id);
          this.cd.detectChanges();
        }
      )
      .on('postgres_changes' as any,
        { event: 'DELETE', schema: 'public', table: 'carreras_clan', filter: `id_escuderia=eq.${this.idEscuderia}` },
        (payload: any) => {
          this.carreras = this.carreras.filter(c => c.id !== payload.old.id);
          this.cd.detectChanges();
        }
      )
      .subscribe();
  }

  async enviarMensaje() {
    const texto = this.nuevoMensaje.trim();
    if (!texto || this.enviando) return;
    this.enviando = true;
    this.nuevoMensaje = '';
    // POST a través del backend
    await this.api.enviarMensajeClan({
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
      try {
        const data = await this.api.getPistas();
        this.listaPistas = (data ?? []).map((p: any) => ({
          id_pista: p.id_pista,
          nombre: p.nombre,
          ccaa: p.ccaa ?? ''
        })).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
      } catch { }
      this.cargandoPistas = false;
      this.cd.detectChanges();
    }
  }

  async crearCarrera() {
    if (!this.nuevaCarrera.titulo || !this.nuevaCarrera.fecha_hora || this.creandoCarrera) return;
    this.creandoCarrera = true;
    try {
      // POST carrera al backend
      const carrera = await this.api.crearCarreraClan({
        id_escuderia: this.idEscuderia, titulo: this.nuevaCarrera.titulo,
        descripcion: this.nuevaCarrera.descripcion || null,
        fecha_hora: this.nuevaCarrera.fecha_hora,
        pista: this.nuevaCarrera.pista || null,
        id_creador: this.idUsuario, username_creador: this.usernameActual
      });
      if (carrera?.id) {
        // Mensaje de chat anunciando la carrera
        await this.api.enviarMensajeClan({
          id_escuderia: this.idEscuderia, id_usuario: this.idUsuario,
          username: this.usernameActual, foto_perfil: this.fotoPerfil,
          mensaje: `¡He organizado una nueva carrera: "${carrera.titulo}"!`,
          tipo: 'carrera', id_carrera: carrera.id
        });
        this.nuevaCarrera = { titulo: '', descripcion: '', fecha_hora: '', pista: '' };
        this.mostrarModalCarrera = false;
        await this.cargarCarreras();
      }
    } catch {}
    this.creandoCarrera = false;
    this.cd.detectChanges();
  }

  async eliminarCarrera(carrera: CarreraClan) {
    if (carrera.id_creador !== this.idUsuario) return;
    if (!confirm(`¿Eliminar la carrera "${carrera.titulo}"?`)) return;
    this.eliminandoCarreraId = carrera.id;
    // El backend elimina la carrera, sus inscripciones y los mensajes de chat asociados
    await this.api.eliminarCarreraClan(carrera.id);
    this.mensajes = this.mensajes.filter(m => !(m.tipo === 'carrera' && m.id_carrera === carrera.id));
    this.carreras = this.carreras.filter(c => c.id !== carrera.id);
    this.eliminandoCarreraId = null;
    this.cd.detectChanges();
  }

  async inscribirse(carrera: CarreraClan) {
    if (this.esPasada(carrera.fecha_hora)) return;
    if (carrera.yaInscrito) {
      await this.api.desinscribirseClan(carrera.id, this.idUsuario);
    } else {
      await this.api.inscribirseClan(carrera.id, {
        id_usuario: this.idUsuario, username: this.usernameActual, foto_perfil: this.fotoPerfil ?? undefined
      });
    }
    await this.cargarCarreras();
    this.mensajes = this.mensajes.map(m => {
      if (m.tipo === 'carrera' && m.id_carrera === carrera.id)
        return { ...m, carrera: this.carreras.find(c => c.id === carrera.id) };
      return m;
    });
    this.cd.detectChanges();
  }

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
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  cambiarTab(tab: 'escuderia' | 'chat') {
    this.tabActiva = tab;
    if (tab === 'chat') setTimeout(() => this.scrollAlFinal(), 100);
  }

  esLider(): boolean { return this.escuderia?.id_lider === this.idUsuario; }
}
