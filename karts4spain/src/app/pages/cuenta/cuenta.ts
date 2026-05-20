import { Component, afterNextRender, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SupabaseService } from '../../services/supabase.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import { ClanModal } from '../../components/clan-modal/clan-modal';

// Datos mínimos de un amigo para mostrar su avatar en la tarjeta de perfil
interface AmigoCard {
  id_usuario: number;
  username: string;
  foto_perfil: string | null;
  initials: string;
}

// Logro enriquecido con estado de desbloqueo
interface LogroDisplay {
  id_logro: number;
  nombre: string;
  descripcion: string;
  imagen_insignia: string | null;
  desbloqueado: boolean;
  fecha_obtencion: string | null;
}

@Component({
  selector: 'app-cuenta',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, Header, Footer, ClanModal],
  templateUrl: './cuenta.html',
  styleUrl: './cuenta.css'
})
export class Cuenta {
  // Datos completos del perfil del piloto logueado
  public userData: any = null;

  // Iniciales del nombre para el avatar cuando no hay foto
  public initials: string = '??';

  // Indica si la operación de abandonar escudería está en progreso
  public abandonando: boolean = false;

  // Lista de amigos aceptados del piloto
  public amigos: AmigoCard[] = [];

  // Catálogo completo de logros (desbloqueados + bloqueados)
  public todosLogros: LogroDisplay[] = [];

  // Controla la visibilidad del modal de escudería (clan)
  public mostrarClanModal: boolean = false;

  // Logro bloqueado seleccionado para mostrar el bocadillo
  public logroTooltip: LogroDisplay | null = null;

  // Toast de logro nuevo desbloqueado
  public toastLogro: string = '';
  private toastTimer: any;

  constructor(
    private router: Router,
    private cd: ChangeDetectorRef,
    private api: ApiService,
    private supabaseService: SupabaseService
  ) {
    afterNextRender(async () => {
      await this.cargarPerfil();
    });
  }

  /**
   * Carga los datos del perfil desde el backend usando el ID o nombre del localStorage.
   * Si no existe sesión redirige al login. También carga el nombre de la escudería si pertenece a una.
   */
  async cargarPerfil() {
    const idStr  = localStorage.getItem('id_usuario');
    const nombre = localStorage.getItem('nombrePiloto');

    if (!idStr && !nombre) {
      this.router.navigate(['/']);
      return;
    }

    let data: any = null;

    try {
      // Intenta por ID primero (más directo), fallback por nombre si no hay ID
      if (idStr) {
        data = await this.api.getUsuarioPorId(Number(idStr));
      }
      if (!data && nombre) {
        data = await this.api.getUsuarioPorNombre(nombre);
      }
    } catch {
      this.cd.detectChanges();
      return;
    }

    if (!data) { this.cd.detectChanges(); return; }

    // Si el usuario pertenece a una escudería, carga su nombre y logo
    let nombreEscuderia: string | null = null;
    let logoEscuderia:   string | null = null;

    if (data.id_escuderia) {
      try {
        const esc = await this.api.getEscuderiaPorId(data.id_escuderia);
        nombreEscuderia = esc?.nombre ?? null;
        logoEscuderia   = esc?.logo_url ?? null;
      } catch {}
    }

    this.userData = { ...data, nombre_escuderia: nombreEscuderia, logo_escuderia: logoEscuderia };
    this.initials = data.username?.substring(0, 2).toUpperCase() ?? '??';

    // Actualiza el localStorage con los datos más recientes del backend
    localStorage.setItem('foto_perfil', data.foto_perfil ?? '');
    if (data.id_escuderia) localStorage.setItem('idEscuderia', data.id_escuderia.toString());

    await this.cargarAmigos(Number(idStr));
    await this.cargarLogros(Number(idStr));
    this.cd.detectChanges();
  }

  /**
   * Obtiene las amistades aceptadas y determina cuál de los dos perfiles
   * de cada relación es el del piloto amigo (no el del usuario actual).
   * El backend serializa los campos como 'solicitante' y 'aceptante' (entidad Amigo.java).
   */
  async cargarAmigos(idUsuario: number) {
    try {
      const relaciones = await this.api.getAmigosAceptados(idUsuario);
      this.amigos = relaciones.map((rel: any) => {
        // Si el usuario actual es quien solicitó la amistad, el amigo es el aceptante y viceversa
        const amigo = rel.solicitante?.id_usuario === idUsuario ? rel.aceptante : rel.solicitante;
        if (!amigo) return null;
        return {
          id_usuario:  amigo.id_usuario,
          username:    amigo.username,
          foto_perfil: amigo.foto_perfil ?? null,
          initials:    amigo.username?.substring(0, 2).toUpperCase() ?? '??'
        };
      }).filter(Boolean) as AmigoCard[];
    } catch {}
  }

  /**
   * Carga el catálogo completo de logros y los desbloqueados por el usuario.
   * Combina ambas fuentes para crear una lista unificada con estado desbloqueado/bloqueado.
   */
  async cargarLogros(idUsuario: number) {
    try {
      const [todos, desbloqueados] = await Promise.all([
        this.api.getTodosLogros(),
        this.api.getLogrosUsuario(idUsuario)
      ]);

      // Construye un mapa { id_logro → fecha_obtencion } con los logros desbloqueados
      const desbMap = new Map<number, string | null>();
      for (const ul of desbloqueados) {
        const id = ul.logro?.id_logro ?? ul.id_logro;
        desbMap.set(id, ul.fecha_obtencion ?? null);
      }

      // Une el catálogo completo con el estado de desbloqueo del usuario
      // Filtra los logros de tiempos (no son relevantes para mostrar en perfil)
      const lista: LogroDisplay[] = (todos ?? [])
        .filter((l: any) => !/tiempo/i.test(l.nombre ?? '') && !/tiempo/i.test(l.descripcion ?? ''))
        .map((l: any) => ({
          id_logro:        l.id_logro,
          nombre:          l.nombre,
          descripcion:     l.descripcion ?? '',
          imagen_insignia: l.imagen_insignia ?? null,
          desbloqueado:    desbMap.has(l.id_logro),
          fecha_obtencion: desbMap.get(l.id_logro) ?? null
        }));

      // Desbloqueados primero, luego bloqueados (ambos subgrupos por id estable)
      this.todosLogros = [
        ...lista.filter(l =>  l.desbloqueado),
        ...lista.filter(l => !l.desbloqueado)
      ];

      // Detectar logros nuevos respecto a la última visita
      this.detectarLogrosNuevos(lista.filter(l => l.desbloqueado).map(l => l.id_logro));
    } catch {}
  }

  /** Compara con los IDs guardados en localStorage y muestra toast si hay logros nuevos */
  private detectarLogrosNuevos(idsActuales: number[]) {
    const key = 'logros_vistos';
    const vistos = new Set<number>(JSON.parse(localStorage.getItem(key) ?? '[]'));
    const nuevos = idsActuales.filter(id => !vistos.has(id));

    if (nuevos.length > 0) {
      const nombres = this.todosLogros
        .filter(l => nuevos.includes(l.id_logro))
        .map(l => l.nombre);
      this.mostrarToastLogro(`🏆 ¡Logro desbloqueado: ${nombres.join(', ')}!`);
    }
    // Actualiza los IDs vistos
    localStorage.setItem(key, JSON.stringify(idsActuales));
  }

  mostrarToastLogro(msg: string) {
    this.toastLogro = msg;
    this.cd.detectChanges(); // forzar render inmediato para que el toast aparezca
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastLogro = ''; this.cd.detectChanges(); }, 4000);
  }

  /** Número de logros que el usuario ya ha desbloqueado */
  get totalDesbloqueados(): number {
    return this.todosLogros.filter(l => l.desbloqueado).length;
  }

  // ─── TOOLTIP BOCADILLO ──────────────────────────────────────────────────────

  /** Abre el bocadillo informativo para un logro bloqueado */
  abrirTooltipLogro(logro: LogroDisplay, event: MouseEvent) {
    event.stopPropagation();
    this.logroTooltip = logro;
    this.cd.detectChanges();
  }

  /** Cierra el bocadillo de logro */
  cerrarTooltipLogro() {
    this.logroTooltip = null;
    this.cd.detectChanges();
  }

  /** Cierra el bocadillo al pulsar Escape */
  @HostListener('document:keydown.escape')
  onEscape() { this.cerrarTooltipLogro(); }

  // ─── ESCUDERÍA ──────────────────────────────────────────────────────────────

  /** Desvincula al usuario de su escudería actual tras confirmación del usuario */
  async abandonarClan() {
    if (!confirm('¿Seguro que quieres abandonar la escudería?')) return;
    this.abandonando = true;
    try {
      await this.api.abandonarEscuderia(this.userData.id_usuario);
      // Limpia los datos de escudería en memoria y en localStorage
      this.userData.id_escuderia     = null;
      this.userData.nombre_escuderia = null;
      this.userData.logo_escuderia   = null;
      localStorage.setItem('idEscuderia', '');
    } catch (err: any) {
      alert('Error al abandonar: ' + err.message);
    }
    this.abandonando = false;
    this.cd.detectChanges();
  }

  // Abre el modal de escudería para ver detalles, chat y carreras del clan
  irAEscuderia() { this.mostrarClanModal = true; }

  // Cierra sesión: invalida la sesión de Supabase Auth, limpia localStorage y redirige al login
  logout() { this.supabaseService.signOut(); localStorage.clear(); this.router.navigate(['/']); }

  // Navega a la página de edición de perfil
  irAEditar() { this.router.navigate(['/editar-perfil']); }
}
