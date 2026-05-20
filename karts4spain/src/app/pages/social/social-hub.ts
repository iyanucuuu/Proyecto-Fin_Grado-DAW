import {
  Component, OnDestroy, ChangeDetectorRef,
  ViewChild, ElementRef, AfterViewChecked, afterNextRender
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ApiService } from '../../services/api.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PistaHub {
  id_pista:           number;
  nombre:             string;
  ccaa:               string;
  tipo_kart:          string;
  entorno:            string;
  foto:               string | null;
  mensajes_recientes: number;
}

interface Conversacion {
  id_usuario:     number;
  username:       string;
  foto_perfil:    string | null;
  initials:       string;
  ultimo_mensaje: string;
  ultimo_at:      string;
  no_leidos:      number;
}

interface MensajeDM {
  id:              number;
  id_remitente:    number;
  id_destinatario: number;
  mensaje:         string;
  created_at:      string;
  leido:           boolean;
  esMio:           boolean;
}

interface Grupo {
  id:          number;
  nombre:      string;
  descripcion: string | null;
  creado_por:  number;
  foto_url:    string | null;
  created_at:  string;
  initials:    string;
}

interface AmigoDM {
  id_usuario:  number;
  username:    string;
  foto_perfil: string | null;
  initials:    string;
}

interface MensajeGrupo {
  id:         number;
  id_grupo:   number;
  id_usuario: number;
  username:   string;
  mensaje:    string;
  created_at: string;
  esMio:      boolean;
  initials:   string;
}

@Component({
  selector: 'app-social-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, Header, Footer],
  templateUrl: './social-hub.html',
  styleUrl: './social-hub.css'
})
export class SocialHub implements OnDestroy, AfterViewChecked {
  @ViewChild('dmChat')    dmChat!:    ElementRef;
  @ViewChild('grupoChat') grupoChat!: ElementRef;

  tabActiva: 'circuitos' | 'mensajes' | 'grupos' = 'circuitos';

  // ── Tab Circuitos ────────────────────────────────────────────────────────────
  pistas:    PistaHub[] = [];
  filtradas: PistaHub[] = [];
  cargando  = true;

  busqueda      = '';
  filtroCCAA    = '';
  filtroTipo    = '';
  filtroEntorno = '';
  soloActivos   = false;

  ccaas:    string[] = [];
  tipos:    string[] = [];
  entornos: string[] = [];

  // ── Tab Mensajes (DMs) ───────────────────────────────────────────────────────
  idUsuario    = 0;
  username     = '';
  conversaciones: Conversacion[] = [];
  convActiva: Conversacion | null = null;
  mensajesDM: MensajeDM[] = [];
  nuevoDM       = '';
  enviandoDM    = false;
  cargandoConvs = false;
  cargandoDMs   = false;
  private dmChannel: RealtimeChannel | null = null;
  private dmScrollPending = false;

  // ── Tab Grupos ───────────────────────────────────────────────────────────────
  grupos:       Grupo[] = [];
  grupoActivo:  Grupo | null = null;
  mensajesGrupo: MensajeGrupo[] = [];
  nuevoMsgGrupo  = '';
  enviandoGrupo  = false;
  cargandoGrupos = false;
  cargandoMsgsGrupo = false;
  mostrarCrearGrupo = false;
  nuevoGrupo = { nombre: '', descripcion: '' };
  creandoGrupo = false;
  private grupoChannel: RealtimeChannel | null = null;
  private grupoScrollPending = false;

  // ── Nuevo DM ─────────────────────────────────────────────────────────────────
  mostrarNuevoMensaje = false;
  busquedaNuevoDM    = '';
  amigos: AmigoDM[]  = [];
  cargandoAmigos     = false;

  // ── Añadir miembro al grupo ───────────────────────────────────────────────────
  mostrarAnadirMiembro = false;
  busquedaAnadir       = '';
  miembrosGrupoIds: number[] = [];
  anadiendo            = false;

  constructor(
    private supa: SupabaseService,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {
    afterNextRender(async () => {
      this.idUsuario = parseInt(localStorage.getItem('id_usuario') || '0');
      this.username  = localStorage.getItem('nombrePiloto') || '';

      await this.cargarCircuitos();

      const tabParam = this.route.snapshot.queryParamMap.get('tab');
      const conParam = this.route.snapshot.queryParamMap.get('con');
      if (tabParam === 'mensajes') {
        this.tabActiva = 'mensajes';
        await this.cargarConversaciones();
        if (conParam) {
          const idCon = parseInt(conParam);
          await this.abrirConversacionPorId(idCon);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.limpiarCanalDM();
    this.limpiarCanalGrupo();
  }

  ngAfterViewChecked(): void {
    if (this.dmScrollPending) { this.scrollDM(); this.dmScrollPending = false; }
    if (this.grupoScrollPending) { this.scrollGrupo(); this.grupoScrollPending = false; }
  }

  private scrollDM(): void {
    try { const el = this.dmChat?.nativeElement; if (el) el.scrollTop = el.scrollHeight; } catch {}
  }
  private scrollGrupo(): void {
    try { const el = this.grupoChat?.nativeElement; if (el) el.scrollTop = el.scrollHeight; } catch {}
  }

  // ── CIRCUITOS ────────────────────────────────────────────────────────────────

  async cargarCircuitos(): Promise<void> {
    const [pistasData, conteoData] = await Promise.all([
      this.api.getPistas(),
      this.api.getConteoChatRecientes()
    ]);

    // Backend devuelve Map<Integer,Long> → JSON con claves string
    const conteo = new Map<number, number>();
    for (const [key, val] of Object.entries(conteoData)) {
      conteo.set(parseInt(key), Number(val));
    }

    this.pistas = pistasData.map((p: any) => ({
      id_pista:           p.id_pista,
      nombre:             p.nombre,
      ccaa:               p.ccaa ?? '',
      tipo_kart:          p.tipo_kart ?? '',
      entorno:            p.entorno ?? '',
      foto:               p.foto ?? null,
      mensajes_recientes: conteo.get(p.id_pista) ?? 0
    }));

    this.ccaas    = [...new Set(this.pistas.map(p => p.ccaa).filter(Boolean))].sort();
    this.tipos    = [...new Set(this.pistas.map(p => p.tipo_kart).filter(Boolean))].sort();
    this.entornos = [...new Set(this.pistas.map(p => p.entorno).filter(Boolean))].sort();
    this.pistas.sort((a, b) => b.mensajes_recientes - a.mensajes_recientes);
    this.aplicarFiltros();
    this.cargando = false;
    this.cd.detectChanges();
  }

  aplicarFiltros(): void {
    const q = this.busqueda.toLowerCase();
    this.filtradas = this.pistas.filter(p => {
      if (q && !p.nombre.toLowerCase().includes(q) && !p.ccaa.toLowerCase().includes(q)) return false;
      if (this.filtroCCAA    && p.ccaa      !== this.filtroCCAA)    return false;
      if (this.filtroTipo    && p.tipo_kart !== this.filtroTipo)    return false;
      if (this.filtroEntorno && p.entorno   !== this.filtroEntorno) return false;
      if (this.soloActivos   && p.mensajes_recientes === 0)         return false;
      return true;
    });
  }

  resetFiltros(): void {
    this.busqueda = ''; this.filtroCCAA = ''; this.filtroTipo = '';
    this.filtroEntorno = ''; this.soloActivos = false; this.aplicarFiltros();
  }

  entrar(pista: PistaHub): void { this.router.navigate(['/social', pista.id_pista]); }

  // ── MENSAJES (DMs) ───────────────────────────────────────────────────────────

  async cambiarTab(tab: 'circuitos' | 'mensajes' | 'grupos'): Promise<void> {
    this.tabActiva = tab;
    this.cd.detectChanges();
    if (tab === 'mensajes') await this.cargarConversaciones();
    if (tab === 'grupos')   await this.cargarGrupos();
  }

  async cargarConversaciones(): Promise<void> {
    if (!this.idUsuario) return;
    this.cargandoConvs = true;

    const data = await this.api.getMensajesDirectosUsuario(this.idUsuario);

    if (!data || data.length === 0) {
      this.conversaciones = [];
      this.cargandoConvs = false;
      this.cd.detectChanges();
      return;
    }

    // Ordenar por fecha desc para que el primer mensaje de cada partner sea el más reciente
    const sorted = [...data].sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Agrupar por partner (primer elemento = más reciente)
    const mapaConvs = new Map<number, any>();
    for (const m of sorted) {
      const partnerId = m.id_remitente === this.idUsuario ? m.id_destinatario : m.id_remitente;
      if (!mapaConvs.has(partnerId)) mapaConvs.set(partnerId, m);
    }

    const ids = [...mapaConvs.keys()];
    const usrs = await this.api.getUsuariosBatch(ids);
    const usrMap = new Map((usrs as any[]).map(u => [u.id_usuario, u]));

    this.conversaciones = ids.map(id => {
      const lastMsg = mapaConvs.get(id);
      const usr: any = usrMap.get(id) ?? {};
      const noLeidos = data.filter((m: any) =>
        m.id_remitente === id && m.id_destinatario === this.idUsuario && !m.leido
      ).length;
      return {
        id_usuario:     id,
        username:       usr.username ?? `Usuario ${id}`,
        foto_perfil:    usr.foto_perfil ?? null,
        initials:       (usr.username ?? '??').slice(0, 2).toUpperCase(),
        ultimo_mensaje: lastMsg.mensaje,
        ultimo_at:      lastMsg.created_at,
        no_leidos:      noLeidos
      } as Conversacion;
    }).sort((a, b) => new Date(b.ultimo_at).getTime() - new Date(a.ultimo_at).getTime());

    this.cargandoConvs = false;
    this.cd.detectChanges();
  }

  async abrirConversacion(conv: Conversacion): Promise<void> {
    this.convActiva = conv;
    this.limpiarCanalDM();
    await this.cargarMensajesDM(conv.id_usuario);
    this.suscribirDM(conv.id_usuario);
    // Marcar como leídos los mensajes de este partner → yo
    await this.api.marcarLeidosDM(conv.id_usuario, this.idUsuario).catch(() => {});
    conv.no_leidos = 0;
  }

  async abrirConversacionPorId(idPartner: number): Promise<void> {
    // Buscar si ya existe conversación en la lista
    let conv = this.conversaciones.find(c => c.id_usuario === idPartner);
    if (!conv) {
      try {
        const usr = await this.api.getUsuarioPorId(idPartner);
        if (usr) {
          conv = {
            id_usuario:     usr.id_usuario,
            username:       usr.username,
            foto_perfil:    usr.foto_perfil ?? null,
            initials:       usr.username.slice(0, 2).toUpperCase(),
            ultimo_mensaje: '',
            ultimo_at:      '',
            no_leidos:      0
          };
          this.conversaciones.unshift(conv);
        }
      } catch {}
    }
    if (conv) await this.abrirConversacion(conv);
  }

  async cargarMensajesDM(partnerId: number): Promise<void> {
    this.cargandoDMs = true;
    const data = await this.api.getConversacionDM(this.idUsuario, partnerId);
    this.mensajesDM = data.map((m: any) => ({
      id:              m.id,
      id_remitente:    m.id_remitente,
      id_destinatario: m.id_destinatario,
      mensaje:         m.mensaje,
      created_at:      m.created_at,
      leido:           m.leido,
      esMio:           m.id_remitente === this.idUsuario
    }));
    this.cargandoDMs = false;
    this.dmScrollPending = true;
    this.cd.detectChanges();
  }

  // Realtime — DEBE quedarse en Supabase (suscripción push)
  private suscribirDM(partnerId: number): void {
    this.dmChannel = this.supa.supabase
      .channel(`dm_${Math.min(this.idUsuario, partnerId)}_${Math.max(this.idUsuario, partnerId)}`)
      .on('postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'mensajes_directos' },
        (payload: any) => {
          const m = payload.new;
          const involucra = (m.id_remitente === this.idUsuario && m.id_destinatario === partnerId) ||
                            (m.id_remitente === partnerId    && m.id_destinatario === this.idUsuario);
          if (!involucra) return;
          this.mensajesDM.push({ ...m, esMio: m.id_remitente === this.idUsuario });
          this.dmScrollPending = true;
          // Marcar como leído via API REST (no Supabase client)
          if (m.id_remitente === partnerId && this.convActiva?.id_usuario === partnerId) {
            this.api.marcarUnoLeidoDM(m.id).catch(() => {});
          }
          this.cd.detectChanges();
        })
      .subscribe();
  }

  private limpiarCanalDM(): void {
    if (this.dmChannel) { this.supa.supabase.removeChannel(this.dmChannel); this.dmChannel = null; }
  }

  async enviarDM(): Promise<void> {
    const texto = this.nuevoDM.trim();
    if (!texto || !this.idUsuario || !this.convActiva || this.enviandoDM) return;
    this.enviandoDM = true;
    this.nuevoDM = '';
    await this.api.enviarMensajeDirecto({
      id_remitente:    this.idUsuario,
      id_destinatario: this.convActiva.id_usuario,
      mensaje:         texto
    });
    if (this.convActiva) {
      this.convActiva.ultimo_mensaje = texto;
      this.convActiva.ultimo_at = new Date().toISOString();
    }
    this.enviandoDM = false;
  }

  onEnterDM(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.enviarDM(); }
  }

  // ── GRUPOS ───────────────────────────────────────────────────────────────────

  async cargarGrupos(): Promise<void> {
    if (!this.idUsuario) return;
    this.cargandoGrupos = true;
    const data = await this.api.getGruposUsuario(this.idUsuario);
    this.grupos = data.map((g: any) => ({
      id:          g.id,
      nombre:      g.nombre,
      descripcion: g.descripcion ?? null,
      creado_por:  g.creado_por,
      foto_url:    g.foto_url ?? null,
      created_at:  g.created_at,
      initials:    g.nombre.slice(0, 2).toUpperCase()
    }));
    this.cargandoGrupos = false;
    this.cd.detectChanges();
  }

  async abrirGrupo(grupo: Grupo): Promise<void> {
    this.grupoActivo = grupo;
    this.limpiarCanalGrupo();
    await this.cargarMensajesGrupo(grupo.id);
    this.suscribirGrupo(grupo.id);
  }

  async cargarMensajesGrupo(idGrupo: number): Promise<void> {
    this.cargandoMsgsGrupo = true;
    const data = await this.api.getMensajesGrupo(idGrupo);
    this.mensajesGrupo = data.map((m: any) => ({
      id:         m.id,
      id_grupo:   m.id_grupo,
      id_usuario: m.id_usuario,
      username:   m.username,
      mensaje:    m.mensaje,
      created_at: m.created_at,
      esMio:      m.id_usuario === this.idUsuario,
      initials:   (m.username ?? '?').slice(0, 2).toUpperCase()
    }));
    this.cargandoMsgsGrupo = false;
    this.grupoScrollPending = true;
    this.cd.detectChanges();
  }

  // Realtime — DEBE quedarse en Supabase (suscripción push)
  private suscribirGrupo(idGrupo: number): void {
    this.grupoChannel = this.supa.supabase
      .channel(`grupo_${idGrupo}`)
      .on('postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'grupos_sociales_mensajes',
          filter: `id_grupo=eq.${idGrupo}` },
        (payload: any) => {
          const m = payload.new;
          this.mensajesGrupo.push({
            ...m, esMio: m.id_usuario === this.idUsuario,
            initials: (m.username ?? '?').slice(0, 2).toUpperCase()
          });
          this.grupoScrollPending = true;
          this.cd.detectChanges();
        })
      .subscribe();
  }

  private limpiarCanalGrupo(): void {
    if (this.grupoChannel) { this.supa.supabase.removeChannel(this.grupoChannel); this.grupoChannel = null; }
  }

  async enviarMsgGrupo(): Promise<void> {
    const texto = this.nuevoMsgGrupo.trim();
    if (!texto || !this.idUsuario || !this.grupoActivo || this.enviandoGrupo) return;
    this.enviandoGrupo = true;
    this.nuevoMsgGrupo = '';
    await this.api.enviarMensajeGrupo(this.grupoActivo.id, {
      id_usuario: this.idUsuario,
      username:   this.username,
      mensaje:    texto
    });
    this.enviandoGrupo = false;
  }

  onEnterGrupo(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.enviarMsgGrupo(); }
  }

  async crearGrupo(): Promise<void> {
    if (!this.nuevoGrupo.nombre.trim() || !this.idUsuario) return;
    this.creandoGrupo = true;
    try {
      const data = await this.api.crearGrupo({
        nombre:      this.nuevoGrupo.nombre.trim(),
        descripcion: this.nuevoGrupo.descripcion?.trim() || null,
        creado_por:  this.idUsuario
      });
      // El backend añade automáticamente al creador como miembro
      const nuevoG: Grupo = {
        id:          data.id,
        nombre:      data.nombre,
        descripcion: data.descripcion ?? null,
        creado_por:  data.creado_por,
        foto_url:    data.foto_url ?? null,
        created_at:  data.created_at,
        initials:    data.nombre.slice(0, 2).toUpperCase()
      };
      this.grupos.unshift(nuevoG);
      this.mostrarCrearGrupo = false;
      this.nuevoGrupo = { nombre: '', descripcion: '' };
      await this.abrirGrupo(nuevoG);
    } catch (e) { console.error('Error al crear grupo', e); }
    this.creandoGrupo = false;
  }

  async abandonarGrupo(grupo: Grupo): Promise<void> {
    if (!confirm(`¿Abandonar el grupo "${grupo.nombre}"?`)) return;
    await this.api.abandonarGrupo(grupo.id, this.idUsuario);
    this.grupos = this.grupos.filter(g => g.id !== grupo.id);
    if (this.grupoActivo?.id === grupo.id) {
      this.grupoActivo = null;
      this.limpiarCanalGrupo();
    }
  }

  // ── UTILS ────────────────────────────────────────────────────────────────────

  formatHora(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString()) {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  formatFechaCompleta(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString()) {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // ── AMIGOS (compartido por nuevo DM y añadir miembro) ────────────────────────

  private async cargarAmigos(): Promise<void> {
    if (!this.idUsuario) { this.amigos = []; this.cargandoAmigos = false; this.cd.detectChanges(); return; }
    const data = await this.api.getAmigosAceptados(this.idUsuario);
    this.amigos = (data as any[]).map(row => {
      // Backend devuelve objetos anidados solicitante/aceptante (no IDs sueltos)
      const esSolicita = row.solicitante?.id_usuario === this.idUsuario;
      const otro = esSolicita ? row.aceptante : row.solicitante;
      if (!otro) return null;
      return {
        id_usuario:  otro.id_usuario,
        username:    otro.username,
        foto_perfil: otro.foto_perfil ?? null,
        initials:    (otro.username ?? '??').slice(0, 2).toUpperCase()
      } as AmigoDM;
    }).filter(Boolean) as AmigoDM[];

    this.cargandoAmigos = false;
    this.cd.detectChanges();
  }

  // ── NUEVO MENSAJE PRIVADO ────────────────────────────────────────────────────

  async abrirNuevoMensaje(): Promise<void> {
    this.mostrarNuevoMensaje = true;
    this.busquedaNuevoDM    = '';
    this.cargandoAmigos     = true;
    this.cd.detectChanges();
    await this.cargarAmigos();
  }

  get amigosFiltraNuevoDM(): AmigoDM[] {
    const q = this.busquedaNuevoDM.toLowerCase();
    return q ? this.amigos.filter(a => a.username.toLowerCase().includes(q)) : this.amigos;
  }

  iniciarConversacion(amigo: AmigoDM): void {
    this.mostrarNuevoMensaje = false;
    this.abrirConversacionPorId(amigo.id_usuario);
  }

  // ── AÑADIR MIEMBRO AL GRUPO ──────────────────────────────────────────────────

  async abrirAnadirMiembro(): Promise<void> {
    if (!this.grupoActivo) return;
    this.mostrarAnadirMiembro = true;
    this.busquedaAnadir       = '';
    this.cargandoAmigos       = true;
    this.cd.detectChanges();

    // Cargar IDs de miembros actuales y lista de amigos en paralelo
    const [miembros] = await Promise.all([
      this.api.getMiembrosGrupo(this.grupoActivo.id),
      this.cargarAmigos()
    ]);
    this.miembrosGrupoIds = miembros;
  }

  get amigosParaAnadir(): AmigoDM[] {
    const q = this.busquedaAnadir.toLowerCase();
    return this.amigos
      .filter(a => !this.miembrosGrupoIds.includes(a.id_usuario))
      .filter(a => q ? a.username.toLowerCase().includes(q) : true);
  }

  async anadirMiembro(amigo: AmigoDM): Promise<void> {
    if (!this.grupoActivo || this.anadiendo) return;
    this.anadiendo = true;
    this.cd.detectChanges();
    try {
      await this.api.anadirMiembroGrupo(this.grupoActivo.id, amigo.id_usuario);
      this.miembrosGrupoIds = [...this.miembrosGrupoIds, amigo.id_usuario];
    } catch {}
    this.anadiendo = false;
    this.cd.detectChanges();
  }
}
