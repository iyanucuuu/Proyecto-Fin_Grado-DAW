import { Component, afterNextRender, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';

interface AmigoCard {
  id_relacion:        number;
  id_usuario:         number;
  username:           string;
  foto_perfil:        string | null;
  comunidad_autonoma: string | null;
  id_escuderia:       number | null;
  initials:           string;
  estado:             'aceptado' | 'pendiente';
  esSolicitante:      boolean;
  aceptando:          boolean;
  rechazando:         boolean;
}

interface UsuarioCard {
  id_usuario:         number;
  username:           string;
  foto_perfil:        string | null;
  comunidad_autonoma: string | null;
  id_escuderia:       number | null;
  initials:           string;
  enviandoSolicitud:  boolean;
  yaEnviado:          boolean;
  yaRecibido:         boolean;
  esAmigo:            boolean;
}

@Component({
  selector: 'app-amigos',
  standalone: true,
  imports: [CommonModule, FormsModule, Header, Footer],
  templateUrl: './amigos.html',
  styleUrl: './amigos.css'
})
export class Amigos {
  tabActiva: 'amigos' | 'recibidas' | 'enviadas' | 'conocer' = 'amigos';

  amigos:        AmigoCard[] = [];
  cargandoAmigos = true;

  todos:     UsuarioCard[] = [];
  filtrados: UsuarioCard[] = [];
  paginados: UsuarioCard[] = [];
  cargandoUsuarios = true;

  idUsuarioActual: number | null = null;
  idsAmigos:              Set<number> = new Set();
  idsPendientesEnviados:  Set<number> = new Set();
  idsPendientesRecibidos: Set<number> = new Set();

  busqueda        = '';
  filtroCCAA      = '';
  filtroTieneClan = '';

  paginaActual = 1;
  readonly POR_PAGINA = 10;
  totalPaginas = 1;

  readonly comunidades: string[] = [
    'Andalucía','Aragón','Asturias','Baleares','Canarias',
    'Cantabria','Castilla-La Mancha','Castilla y León','Cataluña',
    'Extremadura','Galicia','La Rioja','Madrid','Murcia',
    'Navarra','País Vasco','Valencia','Ceuta','Melilla'
  ];

  amigoSeleccionado: AmigoCard | null = null;
  toasts: { msg: string; tipo: 'ok' | 'error' }[] = [];

  constructor(
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    afterNextRender(async () => {
      const id = localStorage.getItem('id_usuario');
      this.idUsuarioActual = id ? Number(id) : null;
      await this.cargarAmigos();
      await this.cargarUsuarios();
    });
  }

  // ── Cargar relaciones desde el backend ────────────────────────────────────────
  async cargarAmigos(): Promise<void> {
    this.cargandoAmigos = true;
    if (!this.idUsuarioActual) { this.cargandoAmigos = false; return; }

    try {
      const relaciones = await this.api.getTodasRelaciones(this.idUsuarioActual);

      this.amigos = relaciones.map((rel: any) => {
        const esSolicitante = rel.solicitante?.id_usuario === this.idUsuarioActual;
        const otro = esSolicitante ? rel.aceptante : rel.solicitante;
        if (!otro) return null;
        return {
          id_relacion:        rel.id_relacion,
          id_usuario:         Number(otro.id_usuario),
          username:           otro.username ?? '?',
          foto_perfil:        otro.foto_perfil ?? null,
          comunidad_autonoma: otro.comunidad_autonoma ?? null,
          id_escuderia:       otro.id_escuderia ?? null,
          initials:           (otro.username ?? '?').slice(0, 2).toUpperCase(),
          estado:             rel.estado,
          esSolicitante,
          aceptando:  false,
          rechazando: false
        } as AmigoCard;
      }).filter(Boolean) as AmigoCard[];

      this.idsAmigos = new Set(this.amigos.filter(a => a.estado === 'aceptado').map(a => a.id_usuario));
      this.idsPendientesEnviados  = new Set(this.amigos.filter(a => a.estado === 'pendiente' && a.esSolicitante).map(a => a.id_usuario));
      this.idsPendientesRecibidos = new Set(this.amigos.filter(a => a.estado === 'pendiente' && !a.esSolicitante).map(a => a.id_usuario));

      if (this.todos.length > 0) {
        this.todos = this.todos.map(u => ({
          ...u,
          esAmigo:    this.idsAmigos.has(u.id_usuario),
          yaEnviado:  this.idsPendientesEnviados.has(u.id_usuario),
          yaRecibido: this.idsPendientesRecibidos.has(u.id_usuario)
        }));
        this.aplicarFiltros();
      }
    } catch (err) {
      console.error('Error cargando amigos:', err);
    }

    this.cargandoAmigos = false;
    this.cdr.detectChanges();
  }

  get amigosAceptados(): AmigoCard[] { return this.amigos.filter(a => a.estado === 'aceptado'); }
  get solicitudesRecibidas(): AmigoCard[] { return this.amigos.filter(a => a.estado === 'pendiente' && !a.esSolicitante); }
  get solicitudesEnviadas(): AmigoCard[]  { return this.amigos.filter(a => a.estado === 'pendiente' && a.esSolicitante); }

  showToast(msg: string, tipo: 'ok' | 'error' = 'ok'): void {
    const t = { msg, tipo };
    this.toasts.push(t);
    this.cdr.detectChanges();
    setTimeout(() => { this.toasts = this.toasts.filter(x => x !== t); this.cdr.detectChanges(); }, 4000);
  }

  async aceptarSolicitud(amigo: AmigoCard): Promise<void> {
    amigo.aceptando = true;
    this.cdr.detectChanges();
    try {
      await this.api.aceptarSolicitud(amigo.id_relacion);
      this.showToast(`¡${amigo.username} ahora es tu amigo!`);
      await this.cargarAmigos();
    } catch (err: any) {
      this.showToast(`Error al aceptar: ${err.message}`, 'error');
      amigo.aceptando = false;
      this.cdr.detectChanges();
    }
  }

  async rechazarSolicitud(amigo: AmigoCard): Promise<void> {
    amigo.rechazando = true;
    this.cdr.detectChanges();
    try {
      await this.api.eliminarRelacion(amigo.id_relacion);
      this.showToast('Solicitud rechazada.');
      await this.cargarAmigos();
    } catch (err: any) {
      this.showToast(`Error: ${err.message}`, 'error');
      amigo.rechazando = false;
      this.cdr.detectChanges();
    }
  }

  async cancelarSolicitud(amigo: AmigoCard): Promise<void> {
    amigo.rechazando = true;
    this.cdr.detectChanges();
    try {
      await this.api.eliminarRelacion(amigo.id_relacion);
      this.showToast('Solicitud cancelada.');
      await this.cargarAmigos();
    } catch (err: any) {
      this.showToast(`Error: ${err.message}`, 'error');
      amigo.rechazando = false;
      this.cdr.detectChanges();
    }
  }

  async cargarUsuarios(): Promise<void> {
    this.cargandoUsuarios = true;
    try {
      const data = await this.api.getTodosUsuarios();
      this.todos = data
        .filter((u: any) => u.id_usuario !== this.idUsuarioActual)
        .map((u: any) => ({
          id_usuario:         Number(u.id_usuario),
          username:           String(u.username ?? '?'),
          foto_perfil:        u.foto_perfil ?? null,
          comunidad_autonoma: u.comunidad_autonoma ?? null,
          id_escuderia:       u.id_escuderia ?? null,
          initials:           String(u.username ?? '?').slice(0, 2).toUpperCase(),
          enviandoSolicitud:  false,
          yaEnviado:          this.idsPendientesEnviados.has(Number(u.id_usuario)),
          yaRecibido:         this.idsPendientesRecibidos.has(Number(u.id_usuario)),
          esAmigo:            this.idsAmigos.has(Number(u.id_usuario))
        }));
      this.aplicarFiltros();
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
    this.cargandoUsuarios = false;
    this.cdr.detectChanges();
  }

  aplicarFiltros(): void {
    this.filtrados = this.todos.filter(u => {
      if (u.esAmigo || u.yaEnviado || u.yaRecibido) return false;
      const okNombre = !this.busqueda || u.username.toLowerCase().includes(this.busqueda.toLowerCase());
      const okCCAA   = !this.filtroCCAA || u.comunidad_autonoma === this.filtroCCAA;
      const okClan   = this.filtroTieneClan === 'si' ? u.id_escuderia !== null
                     : this.filtroTieneClan === 'no' ? u.id_escuderia === null : true;
      return okNombre && okCCAA && okClan;
    });
    this.paginaActual = 1;
    this.totalPaginas = Math.max(1, Math.ceil(this.filtrados.length / this.POR_PAGINA));
    this.actualizarPagina();
  }

  actualizarPagina(): void {
    const inicio = (this.paginaActual - 1) * this.POR_PAGINA;
    this.paginados = this.filtrados.slice(inicio, inicio + this.POR_PAGINA);
  }

  irPagina(n: number): void {
    if (n < 1 || n > this.totalPaginas) return;
    this.paginaActual = n;
    this.actualizarPagina();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get paginas(): number[] {
    const arr: number[] = [];
    const inicio = Math.max(1, this.paginaActual - 2);
    const fin    = Math.min(this.totalPaginas, this.paginaActual + 2);
    for (let i = inicio; i <= fin; i++) arr.push(i);
    return arr;
  }

  resetFiltros(): void {
    this.busqueda = ''; this.filtroCCAA = ''; this.filtroTieneClan = '';
    this.aplicarFiltros();
  }

  async enviarSolicitud(usuario: UsuarioCard): Promise<void> {
    if (!this.idUsuarioActual) return;
    if (usuario.yaEnviado || usuario.esAmigo || usuario.yaRecibido || usuario.enviandoSolicitud) return;

    usuario.enviandoSolicitud = true;
    try {
      await this.api.enviarSolicitudAmistad(this.idUsuarioActual, usuario.id_usuario);
      usuario.yaEnviado = true;
      this.idsPendientesEnviados.add(usuario.id_usuario);
      this.showToast(`¡Solicitud enviada a ${usuario.username}!`);
      this.cdr.detectChanges();
      await this.cargarAmigos();
    } catch (err: any) {
      const msg = err?.error?.error ?? err?.message ?? 'Error';
      if (msg.includes('duplicate') || err?.status === 409) {
        usuario.yaEnviado = true;
        this.idsPendientesEnviados.add(usuario.id_usuario);
        this.showToast('Solicitud ya enviada anteriormente.');
      } else {
        this.showToast(`Error al enviar solicitud: ${msg}`, 'error');
      }
      this.cdr.detectChanges();
    } finally {
      usuario.enviandoSolicitud = false;
    }
  }   

  cambiarTab(tab: 'amigos' | 'recibidas' | 'enviadas' | 'conocer'): void {
    this.tabActiva = tab;
    if (tab === 'conocer' && this.todos.length === 0) this.cargarUsuarios();
  }

  abrirPerfilAmigo(amigo: AmigoCard): void { this.amigoSeleccionado = amigo; document.body.style.overflow = 'hidden'; }
  cerrarPerfilAmigo(): void { this.amigoSeleccionado = null; document.body.style.overflow = ''; }

  irAMensajeDirecto(amigo: AmigoCard): void {
    this.cerrarPerfilAmigo();
    this.router.navigate(['/social'], { queryParams: { tab: 'mensajes', con: amigo.id_usuario } });
  }
}
