import { Component, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { CommonModule }                from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService }                  from '../../services/api.service';
import { SupabaseService }             from '../../services/supabase.service';
import { Header }                      from '../../components/header/header';
import { Footer }                      from '../../components/footer/footer';

/** Logro desbloqueado para mostrar en el perfil público */
interface LogroPublico {
  id_logro:        number;
  nombre:          string;
  imagen_insignia: string | null;
  fecha_obtencion: string | null;
}

/** Estadísticas globales del piloto */
interface StatsGlobales {
  puntos_totales:    number;
  carreras_corridas: number;
  victorias:         number;
  podios:            number;
  posicion_actual:   number;
}

@Component({
  selector: 'app-perfil-publico',
  standalone: true,
  imports: [CommonModule, RouterLink, Header, Footer],
  templateUrl: './perfil-publico.html',
  styleUrl: './perfil-publico.css'
})
export class PerfilPublico {
  // Datos del piloto cuyo perfil se está visitando
  public usuario: any = null;

  // Iniciales para avatar de fallback
  public initials = '??';

  // Logros desbloqueados por este piloto
  public logros: LogroPublico[] = [];

  // Estadísticas de carrera del piloto
  public stats: StatsGlobales | null = null;

  // Nombre y logo de la escudería a la que pertenece
  public nombreEscuderia: string | null = null;
  public logoEscuderia:   string | null = null;

  // Estado de la carga
  public cargando  = true;
  public noEncontrado = false;

  // ID del usuario logueado (para mostrar "eres tú" o "añadir amigo")
  public idUsuarioLogueado = 0;

  // Estado de la solicitud de amistad
  public yaAmigos   = false;
  public solicitado = false;
  public enviandoSolicitud = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private supa: SupabaseService,
    private cd: ChangeDetectorRef
  ) {
    afterNextRender(async () => {
      this.idUsuarioLogueado = parseInt(localStorage.getItem('id_usuario') || '0');
      const username = this.route.snapshot.paramMap.get('username') ?? '';
      await this.cargarPerfil(username);
    });
  }

  /** Carga todos los datos del perfil público: usuario, escudería, logros, stats y estado de amistad */
  private async cargarPerfil(username: string) {
    try {
      const data = await this.api.getUsuarioPorNombre(username);
      if (!data) { this.noEncontrado = true; this.cargando = false; this.cd.detectChanges(); return; }

      // Redirige a /cuenta si el usuario visita su propio perfil
      if (data.id_usuario === this.idUsuarioLogueado) {
        this.router.navigate(['/cuenta']);
        return;
      }

      this.usuario  = data;
      this.initials = data.username?.substring(0, 2).toUpperCase() ?? '??';

      // Escudería
      if (data.id_escuderia) {
        try {
          const esc = await this.api.getEscuderiaPorId(data.id_escuderia);
          this.nombreEscuderia = esc?.nombre ?? null;
          this.logoEscuderia   = esc?.logo_url ?? null;
        } catch {}
      }

      // Logros desbloqueados
      await this.cargarLogros(data.id_usuario);

      // Estadísticas de carrera
      await this.cargarStats(data.id_usuario);

      // Estado de amistad
      await this.comprobarAmistad(data.id_usuario);

    } catch {
      this.noEncontrado = true;
    }

    this.cargando = false;
    this.cd.detectChanges();
  }

  /** Carga los logros desbloqueados por el usuario visitado */
  private async cargarLogros(idUsuario: number) {
    try {
      const desbloqueados = await this.api.getLogrosUsuario(idUsuario);
      this.logros = (desbloqueados ?? []).map((ul: any) => ({
        id_logro:        ul.logro?.id_logro ?? ul.id_logro,
        nombre:          ul.logro?.nombre   ?? ul.nombre   ?? '',
        imagen_insignia: ul.logro?.imagen_insignia ?? ul.imagen_insignia ?? null,
        fecha_obtencion: ul.fecha_obtencion ?? null
      }));
    } catch {}
  }

  /** Carga las estadísticas globales del piloto desde el backend */
  private async cargarStats(idUsuario: number) {
    try {
      const data = await this.api.getClasificacion(idUsuario);
      if (data) {
        this.stats = {
          puntos_totales:    data.puntos_totales    ?? 0,
          carreras_corridas: data.carreras_corridas ?? 0,
          victorias:         data.victorias         ?? 0,
          podios:            data.podios            ?? 0,
          posicion_actual:   data.posicion_actual   ?? 0
        };
      }
    } catch {}
  }

  /** Comprueba estado de amistad a través del backend */
  private async comprobarAmistad(idVisitado: number) {
    if (!this.idUsuarioLogueado) return;
    try {
      const { estado } = await this.api.getEstadoAmistad(this.idUsuarioLogueado, idVisitado);
      this.yaAmigos   = estado === 'aceptado';
      this.solicitado = estado === 'pendiente';
    } catch {}
  }

  /** Envía una solicitud de amistad a través del backend */
  async enviarSolicitud() {
    if (!this.idUsuarioLogueado || !this.usuario) return;
    this.enviandoSolicitud = true;
    try {
      await this.api.enviarSolicitudAmistad(this.idUsuarioLogueado, this.usuario.id_usuario);
      this.solicitado = true;
    } catch {}
    this.enviandoSolicitud = false;
    this.cd.detectChanges();
  }
}
