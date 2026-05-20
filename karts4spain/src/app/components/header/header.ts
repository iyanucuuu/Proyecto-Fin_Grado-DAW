import { Component, afterNextRender, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { SupabaseService } from '../../services/supabase.service';

// Puntos F1 asignados según la posición final en la carrera (posición 1 = 25 pts, etc.)
const PUNTOS_POR_POSICION: number[] = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// Carrera de pista creada por el usuario que aún no tiene resultados registrados
interface CarreraPendiente {
  id: number;
  titulo: string;
  fecha_hora: string;
  id_pista: number;
  nombre_pista?: string;
}

// Piloto inscrito en una carrera con su posición asignada (0 = sin asignar aún)
interface Inscrito {
  id_usuario: number;
  username: string;
  foto_perfil: string | null;
  posicion: number;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnDestroy {
  // Datos del piloto logueado para mostrar en el avatar del header
  fotoPerfil: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('foto_perfil') : null;
  iniciales = typeof localStorage !== 'undefined' ? (localStorage.getItem('nombrePiloto') || '').slice(0, 2).toUpperCase() : '';

  // Estado del tema visual (claro/oscuro)
  modoClaro = false;

  // Número de solicitudes de amistad pendientes (muestra badge rojo)
  solicitudesPendientes = 0;

  // Controla si el menú móvil desplegable está visible
  menuAbierto = false;

  // Carreras de pista pasadas creadas por el usuario sin resultados guardados
  carrerasSinResultado: CarreraPendiente[] = [];
  mostrarModalResultados = false;
  carreraSeleccionada: CarreraPendiente | null = null;

  // Lista de pilotos inscritos en la carrera seleccionada para asignar posiciones
  inscritos: Inscrito[] = [];
  cargandoInscritos = false;
  guardandoResultados = false;
  errorResultados = '';

  private idUsuario = 0;

  // Suscripción a los eventos de navegación para refrescar el header en cada cambio de ruta
  private routerSub: Subscription | null = null;

  constructor(
    private router: Router,
    private api: ApiService,
    private supa: SupabaseService,
    private cd: ChangeDetectorRef
  ) {
    afterNextRender(async () => {
      // Aplica el tema guardado en localStorage mientras se carga la BD (evita parpadeo)
      const temaLocal = localStorage.getItem('tema');
      this.modoClaro = temaLocal === 'claro';
      this.aplicarTema();

      await this.refrescarDatos();
      await this.cargarTemaDesdeDB();

      this.routerSub = this.router.events
        .pipe(filter(e => e instanceof NavigationEnd))
        .subscribe(() => { this.refrescarDatos(); this.menuAbierto = false; });
    });
  }

  // Cancela la suscripción al router para evitar memory leaks al destruir el componente
  ngOnDestroy() { this.routerSub?.unsubscribe(); }

  // Cierra el menú móvil desplegable (llamado al hacer clic en un enlace o fuera del menú)
  cerrarMenu() { this.menuAbierto = false; }

  /**
   * Actualiza los datos del header (foto, iniciales, badges) leyendo el localStorage
   * y consultando el backend para el conteo de solicitudes y carreras pendientes.
   * Se llama al iniciar y en cada cambio de ruta.
   */
  private async refrescarDatos() {
    this.fotoPerfil = localStorage.getItem('foto_perfil') || null;
    const username = localStorage.getItem('nombrePiloto') || '';
    this.iniciales = username.slice(0, 2).toUpperCase();
    this.idUsuario = parseInt(localStorage.getItem('id_usuario') || '0');

    if (this.idUsuario) {
      try {
        const result = await this.api.countSolicitudesPendientes(this.idUsuario);
        this.solicitudesPendientes = result.count ?? 0;
      } catch {
        this.solicitudesPendientes = 0;
      }
      await this.cargarCarrerasSinResultado();
    } else {
      this.solicitudesPendientes = 0;
      this.carrerasSinResultado = [];
    }
    this.cd.detectChanges();
  }

  private async cargarCarrerasSinResultado(): Promise<void> {
    const { data } = await this.supa.supabase
      .from('carreras_pista')
      .select('id, titulo, fecha_hora, id_pista, pistas(nombre)')
      .eq('id_usuario_creador', this.idUsuario)
      .eq('resultados_guardados', false)
      .lt('fecha_hora', new Date().toISOString())
      .order('fecha_hora', { ascending: false });

    this.carrerasSinResultado = ((data ?? []) as any[]).map(c => ({
      id: c.id,
      titulo: c.titulo,
      fecha_hora: c.fecha_hora,
      id_pista: c.id_pista,
      nombre_pista: c.pistas?.nombre ?? ''
    }));
    this.cd.detectChanges();
  }

  async abrirModalResultados(carrera: CarreraPendiente): Promise<void> {
    this.carreraSeleccionada = carrera;
    this.errorResultados = '';
    this.mostrarModalResultados = true;
    this.menuAbierto = false;
    this.inscritos = [];
    this.cargandoInscritos = true;
    this.cd.detectChanges();

    // Cargar los inscritos reales de esta carrera
    const { data } = await this.supa.supabase
      .from('inscripciones_carrera_pista')
      .select('id_usuario, username, foto_perfil')
      .eq('id_carrera', carrera.id)
      .order('created_at', { ascending: true });

    this.inscritos = ((data ?? []) as any[]).map(i => ({
      id_usuario:  i.id_usuario,
      username:    i.username,
      foto_perfil: i.foto_perfil ?? null,
      posicion:    0
    }));

    this.cargandoInscritos = false;
    this.cd.detectChanges();
  }

  cerrarModalResultados(): void {
    this.mostrarModalResultados = false;
    this.carreraSeleccionada = null;
    this.inscritos = [];
    this.errorResultados = '';
  }

  // Asigna posición a un inscrito; si ya tenía esa posición otro, se la quita
  asignarPosicion(inscrito: Inscrito, pos: number): void {
    // Si el mismo piloto ya tenía esa posición, la quita (toggle)
    if (inscrito.posicion === pos) {
      inscrito.posicion = 0;
      return;
    }
    // Quitar la posición a quien la tuviera
    const anterior = this.inscritos.find(i => i.posicion === pos && i !== inscrito);
    if (anterior) anterior.posicion = 0;
    inscrito.posicion = pos;
  }

  get posicionesDisponibles(): number[] {
    return Array.from({ length: this.inscritos.length }, (_, i) => i + 1);
  }

  async guardarResultados(): Promise<void> {
    if (!this.carreraSeleccionada) return;

    // Validar que todos tengan posición asignada
    const sinPosicion = this.inscritos.filter(i => i.posicion === 0);
    if (sinPosicion.length > 0) {
      this.errorResultados = `Asigna una posición a todos los participantes (faltan ${sinPosicion.length}).`;
      return;
    }
    // Validar posiciones únicas
    const posiciones = this.inscritos.map(i => i.posicion);
    if (new Set(posiciones).size !== posiciones.length) {
      this.errorResultados = 'Hay posiciones repetidas. Cada piloto debe tener una posición única.';
      return;
    }

    this.guardandoResultados = true;
    this.errorResultados = '';

    const rows = this.inscritos.map(i => ({
      id_carrera: this.carreraSeleccionada!.id,
      id_pista:   this.carreraSeleccionada!.id_pista,
      id_usuario: i.id_usuario,
      username:   i.username,
      posicion:   i.posicion,
      puntos:     this.puntosParaPosicion(i.posicion)
    }));

    const { error: errRes } = await this.supa.supabase.from('resultados_carreras').insert(rows);
    if (errRes) {
      this.errorResultados = 'Error al guardar. Inténtalo de nuevo.';
      this.guardandoResultados = false;
      return;
    }

    // Marcar carrera como con resultado
    await this.supa.supabase
      .from('carreras_pista')
      .update({ resultados_guardados: true })
      .eq('id', this.carreraSeleccionada!.id);

    // Actualizar clasificacion_general
    for (const row of rows) {
      const esVictoria = row.posicion === 1 ? 1 : 0;
      const esPodio    = row.posicion <= 3 ? 1 : 0;

      const { data: clasi } = await this.supa.supabase
        .from('clasificacion_general')
        .select('id_ranking, puntos_totales, carreras_corridas, victorias, podios')
        .eq('id_usuario', row.id_usuario)
        .maybeSingle();

      if (clasi) {
        await this.supa.supabase
          .from('clasificacion_general')
          .update({
            puntos_totales:    (clasi.puntos_totales   ?? 0) + row.puntos,
            carreras_corridas: (clasi.carreras_corridas ?? 0) + 1,
            victorias:         (clasi.victorias ?? 0) + esVictoria,
            podios:            (clasi.podios    ?? 0) + esPodio
          })
          .eq('id_ranking', clasi.id_ranking);
      } else {
        await this.supa.supabase
          .from('clasificacion_general')
          .insert({
            id_usuario:        row.id_usuario,
            puntos_totales:    row.puntos,
            carreras_corridas: 1,
            victorias:         esVictoria,
            podios:            esPodio,
            posicion_actual:   0
          });
      }
    }

    // Recalcular posicion_actual global
    const { data: todos } = await this.supa.supabase
      .from('clasificacion_general')
      .select('id_ranking, puntos_totales')
      .order('puntos_totales', { ascending: false });

    if (todos) {
      for (let i = 0; i < todos.length; i++) {
        await this.supa.supabase
          .from('clasificacion_general')
          .update({ posicion_actual: i + 1 })
          .eq('id_ranking', (todos[i] as any).id_ranking);
      }
    }

    this.guardandoResultados = false;
    this.cerrarModalResultados();
    await this.cargarCarrerasSinResultado();
  }

  formatFechaCorta(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  puntosParaPosicion(pos: number): number {
    const idx = pos - 1;
    return idx >= 0 && idx < PUNTOS_POR_POSICION.length ? PUNTOS_POR_POSICION[idx] : 0;
  }

  /** Lee el tema guardado en la BD y lo aplica si difiere del localStorage */
  private async cargarTemaDesdeDB() {
    if (!this.idUsuario) return;
    try {
      const { data } = await this.supa.supabase
        .from('usuarios')
        .select('tema')
        .eq('id_usuario', this.idUsuario)
        .maybeSingle();
      if (data?.tema) {
        this.modoClaro = data.tema === 'claro';
        localStorage.setItem('tema', data.tema);
        this.aplicarTema();
        this.cd.detectChanges();
      }
    } catch {}
  }

  toggleTema() {
    this.modoClaro = !this.modoClaro;
    const tema = this.modoClaro ? 'claro' : 'oscuro';
    localStorage.setItem('tema', tema);
    this.aplicarTema();
    // Persiste en la BD de forma asíncrona (sin bloquear la UI)
    if (this.idUsuario) {
      this.supa.actualizarTema(this.idUsuario, tema as 'claro' | 'oscuro').then();
    }
  }

  private aplicarTema() {
    const html = document.documentElement;
    if (this.modoClaro) html.setAttribute('data-theme', 'light');
    else html.removeAttribute('data-theme');
  }
}
