import { Component, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';

interface Pista {
  id_pista:   number;
  nombre:     string;
  ccaa:       string;
  tipo_kart:  string;
  entorno:    string;
  url:        string | null;
  foto:       string | null;
  lat:        number;
  lng:        number;
  // Rating
  mediaNotas:       number;
  totalValoraciones: number;
  miNota:           number;
  guardandoNota:    boolean;
  notaHover:        number;
  // Favoritos
  esFavorita:       boolean;
  guardandoFav:     boolean;
}

interface CarreraClan {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_hora: string;
  pista: string;
  username_creador: string;
}

interface CarreraAbierta {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_hora: string;
  username_creador: string;
}

@Component({
  selector: 'app-pistas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, Footer],
  templateUrl: './pistas.html',
  styleUrl: './pistas.css'
})
export class Pistas {
  pistas:   Pista[] = [];
  filtradas: Pista[] = [];
  cargando = true;

  filtroCCAA      = '';
  filtroTipo      = '';
  filtroEntorno   = '';
  filtroBuscar    = '';
  soloFavoritas   = false;   // Toggle: mostrar únicamente pistas marcadas como favoritas

  paginaActual  = 1;
  readonly POR_PAGINA = 15;

  ccaas:    string[] = [];
  tipos:    string[] = [];
  entornos: string[] = [];

  // Modal info
  pistaSeleccionada: Pista | null = null;

  // Modal carreras
  pistaCarreras: Pista | null = null;
  carreras: CarreraClan[] = [];
  carrerasAbiertas: CarreraAbierta[] = [];
  cargandoCarreras = false;
  idEscuderiaUsuario: number | null = null;
  idUsuario: number | null = null;
  usernameActual = '';

  // Formulario nueva carrera abierta
  mostrarFormNuevaCarrera = false;
  nuevaCarreraTitulo = '';
  nuevaCarreraDescripcion = '';
  nuevaCarreraFechaHora = '';
  creandoCarrera = false;
  errorNuevaCarrera = '';

  // Inscripciones carreras abiertas
  inscripcionesMap: Map<number, { id_usuario: number; username: string; foto_perfil: string | null }[]> = new Map();
  apuntandoCarreraId: number | null = null;

  constructor(
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {
    afterNextRender(async () => {
      await this.init();
    });
  }

  private async init() {
    this.idUsuario = parseInt(localStorage.getItem('id_usuario') || '0') || null;
    this.idEscuderiaUsuario = parseInt(localStorage.getItem('idEscuderia') || '0') || null;
    this.usernameActual = localStorage.getItem('nombrePiloto') || '';

    // Carga pistas primero; valoraciones y favoritas son opcionales
    let rawPistas: any[] = [], valData: any[] = [], favIds: any[] = [];
    try { rawPistas = await this.api.getPistas(); } catch (e) { console.error('Error getPistas:', e); }
    try { valData   = await this.api.getAllValoraciones(); } catch (e) { console.warn('Sin valoraciones:', e); }
    try { favIds    = this.idUsuario ? await this.api.getFavoritas(this.idUsuario) : []; } catch (e) { favIds = []; }

    const idsFavoritas = new Set<number>((favIds ?? []).map((id: any) => Number(id)));

    const valMap = new Map<number, { suma: number; total: number; miNota: number }>();
    for (const v of (valData ?? [])) {
      const idPista = Number(v.id_pista);
      const prev = valMap.get(idPista) ?? { suma: 0, total: 0, miNota: 0 };
      valMap.set(idPista, {
        suma:   prev.suma + v.nota,
        total:  prev.total + 1,
        miNota: (Number(v.id_usuario) === this.idUsuario) ? v.nota : prev.miNota
      });
    }

    this.pistas = (rawPistas ?? []).map((p: any) => {
      const idPista = Number(p.id_pista);
      const val = valMap.get(idPista) ?? { suma: 0, total: 0, miNota: 0 };
      return {
        id_pista:          idPista,
        nombre:            p.nombre,
        ccaa:              p.ccaa,
        tipo_kart:         p.tipo_kart,
        entorno:           p.entorno,
        url:               p.url ?? null,
        foto:              p.foto ?? null,
        lat:               p.lat,
        lng:               p.lng,
        mediaNotas:        val.total > 0 ? val.suma / val.total : 0,
        totalValoraciones: val.total,
        miNota:            val.miNota,
        guardandoNota:     false,
        notaHover:         0,
        esFavorita:        idsFavoritas.has(idPista),
        guardandoFav:      false
      } as Pista;
    });

    this.ccaas    = [...new Set(this.pistas.map(p => p.ccaa).filter(Boolean))].sort();
    this.tipos    = [...new Set(this.pistas.map(p => p.tipo_kart).filter(Boolean))].sort();
    this.entornos = [...new Set(this.pistas.map(p => p.entorno).filter(Boolean))].sort();

    const nombreParam = this.route.snapshot.queryParamMap.get('nombre');
    if (nombreParam) {
      this.filtroBuscar = nombreParam;
    }

    this.aplicarFiltros();
    this.cargando = false;
    this.cd.detectChanges();

    if (nombreParam) {
      setTimeout(() => {
        const first = document.querySelector('.pista-row') as HTMLElement;
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }

  aplicarFiltros() {
    this.paginaActual = 1;
    const buscar = this.filtroBuscar.toLowerCase();
    this.filtradas = this.pistas.filter(p => {
      if (this.soloFavoritas && !p.esFavorita)                      return false;
      if (this.filtroCCAA    && p.ccaa      !== this.filtroCCAA)    return false;
      if (this.filtroTipo    && p.tipo_kart !== this.filtroTipo)    return false;
      if (this.filtroEntorno && p.entorno   !== this.filtroEntorno) return false;
      if (buscar && !p.nombre.toLowerCase().includes(buscar))       return false;
      return true;
    });
  }

  resetFiltros() {
    this.filtroCCAA = ''; this.filtroTipo = ''; this.filtroEntorno = '';
    this.filtroBuscar = ''; this.soloFavoritas = false;
    this.aplicarFiltros();
  }

  get paginadas(): Pista[] {
    const inicio = (this.paginaActual - 1) * this.POR_PAGINA;
    return this.filtradas.slice(inicio, inicio + this.POR_PAGINA);
  }

  get totalPaginas(): number {
    return Math.ceil(this.filtradas.length / this.POR_PAGINA);
  }

  get paginas(): (number | '…')[] {
    const total = this.totalPaginas;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const arr: (number | '…')[] = [1];
    if (this.paginaActual > 3) arr.push('…');
    for (let i = Math.max(2, this.paginaActual - 1); i <= Math.min(total - 1, this.paginaActual + 1); i++) arr.push(i);
    if (this.paginaActual < total - 2) arr.push('…');
    arr.push(total);
    return arr;
  }

  irPagina(p: number | '…') {
    if (typeof p === 'number') { this.paginaActual = p; window.scrollTo({ top: 200, behavior: 'smooth' }); }
  }

  // ─── RATING ─────────────────────────────────────────────────────────────────

  starArray(n: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  moverEstrella(event: MouseEvent, pista: Pista, s: number): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    pista.notaHover = (event.clientX - rect.left) < rect.width / 2 ? s - 0.5 : s;
  }

  estrActiva(pista: Pista, estrella: number): boolean {
    const ref = pista.notaHover || pista.miNota;
    return estrella <= Math.floor(ref);
  }

  estrMitad(pista: Pista, s: number): boolean {
    const ref = pista.notaHover || pista.miNota;
    return ref > 0 && s === Math.ceil(ref) && ref % 1 !== 0;
  }

  estrMedia(pista: Pista, estrella: number): boolean {
    return !pista.notaHover && pista.miNota === 0 && estrella <= Math.floor(pista.mediaNotas);
  }

  estrMediaMitad(pista: Pista, s: number): boolean {
    return !pista.notaHover && pista.miNota === 0 && pista.mediaNotas > 0
      && s === Math.ceil(pista.mediaNotas) && pista.mediaNotas % 1 !== 0;
  }

  esTipEstrella(pista: Pista, s: number): boolean {
    const ref = pista.notaHover;
    if (!ref || ref !== pista.miNota) return false;
    return ref % 1 === 0 ? s === ref : s === Math.ceil(ref);
  }

  async votarNota(pista: Pista, nota: number): Promise<void> {
    if (!this.idUsuario || pista.guardandoNota) return;

    if (pista.miNota === nota) {
      await this.quitarNota(pista);
      return;
    }

    pista.guardandoNota = true;
    try {
      await this.api.valorarPista({ id_pista: pista.id_pista, id_usuario: this.idUsuario, nota });
      const oldNota  = pista.miNota;
      const oldTotal = pista.totalValoraciones;
      const oldSuma  = pista.mediaNotas * oldTotal;
      if (oldNota === 0) {
        pista.totalValoraciones++;
        pista.mediaNotas = (oldSuma + nota) / pista.totalValoraciones;
      } else {
        pista.mediaNotas = (oldSuma - oldNota + nota) / oldTotal;
      }
      pista.miNota = nota;
    } catch {}
    pista.guardandoNota = false;
    pista.notaHover     = 0;
    this.cd.detectChanges();
  }

  async quitarNota(pista: Pista): Promise<void> {
    if (!this.idUsuario) return;
    pista.guardandoNota = true;
    try {
      await this.api.eliminarValoracion(this.idUsuario, pista.id_pista);
      const oldNota  = pista.miNota;
      const oldTotal = pista.totalValoraciones;
      if (oldTotal > 1) {
        pista.mediaNotas       = (pista.mediaNotas * oldTotal - oldNota) / (oldTotal - 1);
        pista.totalValoraciones--;
      } else {
        pista.mediaNotas       = 0;
        pista.totalValoraciones = 0;
      }
      pista.miNota = 0;
    } catch {}
    pista.guardandoNota = false;
    pista.notaHover     = 0;
    this.cd.detectChanges();
  }

  // ─── FAVORITAS ──────────────────────────────────────────────────────────────

  toastMsg = '';
  private toastTimer: any;

  mostrarToast(msg: string): void {
    this.toastMsg = msg;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastMsg = ''; }, 2500);
  }

  async toggleFavorita(pista: Pista, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    if (!this.idUsuario || pista.guardandoFav) return;
    pista.guardandoFav = true;
    try {
      if (pista.esFavorita) {
        await this.api.removeFavorita(this.idUsuario, pista.id_pista);
        pista.esFavorita = false;
        this.mostrarToast('Eliminado de favoritos');
      } else {
        await this.api.addFavorita(this.idUsuario, pista.id_pista);
        pista.esFavorita = true;
        this.mostrarToast('¡Añadido a favoritos!');
      }
    } catch (e: any) {
      this.mostrarToast(e?.error?.error ?? 'Error al actualizar favoritos');
    }
    pista.guardandoFav = false;
    this.cd.detectChanges();
  }

  // ─── COMPARTIR ──────────────────────────────────────────────────────────────

  compartirPista(pista: Pista, event?: Event): void {
    if (event) event.stopPropagation();
    const url = `${window.location.origin}/pistas?nombre=${encodeURIComponent(pista.nombre)}`;
    navigator.clipboard.writeText(url).then(() => {
      this.mostrarToast('¡Enlace copiado!');
    }).catch(() => {
      const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(pista.nombre + ' karting')}`;
      navigator.clipboard.writeText(mapsUrl);
      this.mostrarToast('¡Enlace copiado!');
    });
  }

  // ─── NAVEGACIÓN SOCIAL ──────────────────────────────────────────────────────

  irASocial(pista: Pista): void {
    this.router.navigate(['/social', pista.id_pista]);
  }

  // ─── MODAL INFO ─────────────────────────────────────────────────────────────
  abrirInfo(pista: Pista) {
    this.pistaSeleccionada = pista;
    document.body.style.overflow = 'hidden';
  }

  cerrarInfo() {
    this.pistaSeleccionada = null;
    document.body.style.overflow = '';
  }

  // ─── MODAL CARRERAS ─────────────────────────────────────────────────────────
  async abrirCarreras(pista: Pista) {
    this.pistaCarreras = pista;
    this.cargandoCarreras = true;
    this.carreras = [];
    this.carrerasAbiertas = [];
    this.mostrarFormNuevaCarrera = false;
    this.errorNuevaCarrera = '';
    document.body.style.overflow = 'hidden';
    this.cd.detectChanges();

    // Carreras de escuderías (carreras_clan)
    const clanData = await this.api.getCarrerasClanPorPista(pista.nombre);
    this.carreras = (clanData ?? []) as CarreraClan[];

    // Carreras abiertas (carreras_pista) — filtrar futuras en cliente
    const abiertasData = await this.api.getCarrerasPista(pista.id_pista);
    const ahora = new Date();
    this.carrerasAbiertas = ((abiertasData ?? []) as any[])
      .filter(c => new Date(c.fecha_hora) >= ahora)
      .map(c => ({
        id:               c.id,
        titulo:           c.titulo,
        descripcion:      c.descripcion ?? null,
        fecha_hora:       c.fecha_hora,
        username_creador: c.username_creador ?? 'Piloto'
      }));

    await this.cargarInscripciones();
    this.cargandoCarreras = false;
    this.cd.detectChanges();
  }

  private async cargarInscripciones(): Promise<void> {
    if (this.carrerasAbiertas.length === 0) return;
    const ids = this.carrerasAbiertas.map(c => c.id);
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

  async toggleInscripcion(idCarrera: number): Promise<void> {
    if (!this.idUsuario || this.apuntandoCarreraId === idCarrera) return;
    this.apuntandoCarreraId = idCarrera;
    try {
      if (this.yaApuntado(idCarrera)) {
        await this.api.desinscribirsePista(idCarrera, this.idUsuario);
      } else {
        const fotoPerfil = localStorage.getItem('foto_perfil') || null;
        await this.api.inscribirsePista(idCarrera, {
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

  cerrarCarreras() {
    this.pistaCarreras = null;
    this.mostrarFormNuevaCarrera = false;
    this.errorNuevaCarrera = '';
    document.body.style.overflow = '';
  }

  // ─── NUEVA CARRERA ABIERTA ──────────────────────────────────────────────────

  abrirFormNuevaCarrera(): void {
    this.mostrarFormNuevaCarrera = true;
    this.nuevaCarreraTitulo = '';
    this.nuevaCarreraDescripcion = '';
    // default: mañana a las 10:00
    const m = new Date();
    m.setDate(m.getDate() + 1);
    m.setHours(10, 0, 0, 0);
    this.nuevaCarreraFechaHora = m.toISOString().slice(0, 16);
    this.errorNuevaCarrera = '';
  }

  cerrarFormNuevaCarrera(): void {
    this.mostrarFormNuevaCarrera = false;
    this.errorNuevaCarrera = '';
  }

  async crearCarreraAbierta(): Promise<void> {
    if (!this.idUsuario || !this.pistaCarreras) return;

    if (!this.nuevaCarreraTitulo.trim()) {
      this.errorNuevaCarrera = 'El título es obligatorio.';
      return;
    }
    if (!this.nuevaCarreraFechaHora) {
      this.errorNuevaCarrera = 'La fecha y hora son obligatorias.';
      return;
    }
    const fechaSeleccionada = new Date(this.nuevaCarreraFechaHora);
    if (fechaSeleccionada <= new Date()) {
      this.errorNuevaCarrera = 'La fecha debe ser futura.';
      return;
    }

    this.creandoCarrera = true;
    this.errorNuevaCarrera = '';

    try {
      await this.api.crearCarreraPista({
        titulo:             this.nuevaCarreraTitulo.trim(),
        descripcion:        this.nuevaCarreraDescripcion.trim() || null,
        fecha_hora:         fechaSeleccionada.toISOString(),
        id_pista:           this.pistaCarreras.id_pista,
        id_usuario_creador: this.idUsuario
      });

      // Recargar carreras abiertas
      const abiertasData = await this.api.getCarrerasPista(this.pistaCarreras.id_pista);
      const ahora = new Date();
      this.carrerasAbiertas = ((abiertasData ?? []) as any[])
        .filter(c => new Date(c.fecha_hora) >= ahora)
        .map(c => ({
          id:               c.id,
          titulo:           c.titulo,
          descripcion:      c.descripcion ?? null,
          fecha_hora:       c.fecha_hora,
          username_creador: c.username_creador ?? 'Piloto'
        }));

      this.creandoCarrera = false;
      this.mostrarFormNuevaCarrera = false;
      this.mostrarToast('¡Carrera creada con éxito!');
    } catch {
      this.errorNuevaCarrera = 'Error al crear la carrera. Inténtalo de nuevo.';
      this.creandoCarrera = false;
    }
    this.cd.detectChanges();
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatFechaCorta(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  // ─── MODAL RESEÑAS ──────────────────────────────────────────────────────────
  private _todasResenas: any[] = [];   // buffer completo de reseñas (paginación client-side)
  pistaResenas: Pista | null = null;
  resenasPista: any[] = [];
  cargandoResenas = false;
  resenasPagina = 0;           // número de páginas cargadas (10 por página)
  resenasTotal = 0;            // total de reseñas disponibles para esta pista
  cargandoMasResenas = false;
  readonly RESENAS_POR_PAGINA = 10;

  async abrirResenas(pista: Pista, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    this.pistaResenas = pista;
    this.cargandoResenas = true;
    this.resenasPista = [];
    this.resenasPagina = 0;
    document.body.style.overflow = 'hidden';
    this.cd.detectChanges();

    await this.cargarPaginaResenas(pista.id_pista, true);
    this.cargandoResenas = false;
    this.cd.detectChanges();
  }

  private async cargarPaginaResenas(idPista: number, reset: boolean): Promise<void> {
    if (reset) {
      // Carga todas las reseñas de la pista (paginación client-side)
      let data: any[] = [];
      try { data = await this.api.getResenas(idPista); } catch (e) { console.error('Error cargando reseñas:', e); }
      this._todasResenas = (data ?? []).map((r: any) => ({
        nota:         r.valoracion        ?? 0,
        nota_asfalto: r.estado_asfalto    ?? null,
        comentario:   r.comentario        ?? '',
        created_at:   r.fecha_creacion,
        username:     r.usuario?.username    ?? 'Piloto',
        foto_perfil:  r.usuario?.foto_perfil ?? null,
        initials:     (r.usuario?.username ?? '??').slice(0, 2).toUpperCase()
      }));
      this.resenasTotal = this._todasResenas.length;
      this.resenasPagina = 0;
    }
    const hasta = (this.resenasPagina + 1) * this.RESENAS_POR_PAGINA;
    this.resenasPista = this._todasResenas.slice(0, hasta);
    this.resenasPagina++;
  }

  async cargarMasResenas(): Promise<void> {
    if (!this.pistaResenas || this.cargandoMasResenas) return;
    this.cargandoMasResenas = true;
    await this.cargarPaginaResenas(this.pistaResenas.id_pista, false);
    this.cargandoMasResenas = false;
    this.cd.detectChanges();
  }

  get hayMasResenas(): boolean {
    return this.resenasPista.length < this.resenasTotal;
  }

  cerrarResenas(): void {
    this.pistaResenas = null;
    document.body.style.overflow = '';
  }

  starResenaDisplay(nota: number, s: number): boolean {
    return s <= nota;
  }
}
