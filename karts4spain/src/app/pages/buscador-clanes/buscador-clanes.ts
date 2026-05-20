import { Component, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';

// Datos de una escudería enriquecidos con el conteo de miembros actuales
interface EscuderiaCard {
  id_escuderia: number;
  nombre: string;
  descripcion: string;
  logo_url: string;
  comunidad_autonoma: string;
  max_miembros: number;
  miembros_actuales: number; // calculado a partir de todos los usuarios
  uniendose: boolean;        // bloquea el botón mientras se procesa la petición
}

// Lista centralizada de comunidades autónomas (reutilizada en varios componentes)
const COMUNIDADES = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias',
  'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
  'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia',
  'Navarra', 'País Vasco', 'Valencia', 'Ceuta', 'Melilla'
];

@Component({
  selector: 'app-buscador-clanes',
  standalone: true,
  imports: [CommonModule, FormsModule, Header, Footer],
  templateUrl: './buscador-clanes.html',
  styleUrl: './buscador-clanes.css'
})
export class BuscadorClanes {
  // Lista completa de clanes cargados desde el backend
  clanes: EscuderiaCard[] = [];

  // Lista filtrada localmente (sin nueva petición al servidor)
  clanesFiltrados: EscuderiaCard[] = [];

  cargando = true;

  // Datos del usuario logueado leídos del localStorage
  idUsuario: number | null = null;
  comunidadUsuario = '';

  // Valores actuales de los filtros del panel lateral
  filtroComunidad = '';
  filtroNombre = '';
  filtroMiembrosMin = 0;
  filtroMiembrosMax = 50;
  soloConPlazas = false;

  readonly comunidades = COMUNIDADES;

  constructor(private api: ApiService, private router: Router) {
    afterNextRender(async () => {
      const idStr = localStorage.getItem('id_usuario');
      this.idUsuario = idStr ? Number(idStr) : null;
      this.comunidadUsuario = localStorage.getItem('comunidad_autonoma') ?? '';
      await this.cargarClanes();
    });
  }

  /**
   * Carga las escuderías filtradas por comunidad y calcula el número de miembros
   * de cada una cruzando con la lista completa de usuarios (el backend no lo precalcula).
   */
  async cargarClanes() {
    this.cargando = true;

    try {
      // Peticiones en paralelo para mejorar el tiempo de carga
      const [escuderias, todosUsuarios] = await Promise.all([
        this.api.getEscuderiasFiltradas(this.filtroComunidad || undefined),
        this.api.getTodosUsuarios()
      ]);

      // Agrupa los usuarios por id_escuderia para obtener el conteo de miembros
      const conteo: Record<number, number> = {};
      todosUsuarios
        .filter((u: any) => u.id_escuderia != null)
        .forEach((u: any) => {
          conteo[u.id_escuderia] = (conteo[u.id_escuderia] || 0) + 1;
        });

      this.clanes = escuderias.map((e: any) => ({
        id_escuderia:       e.id_escuderia,
        nombre:             e.nombre,
        descripcion:        e.descripcion ?? '',
        logo_url:           e.logo_url ?? '',
        comunidad_autonoma: e.comunidad_autonoma ?? '',
        max_miembros:       e.max_miembros ?? 15,
        miembros_actuales:  conteo[e.id_escuderia] ?? 0,
        uniendose:          false
      }));

      this.aplicarFiltros();
    } catch (err) {
      console.error('[BuscadorClanes] Error al cargar escuderías:', err);
    }

    this.cargando = false;
  }

  /** Filtra la lista de clanes en memoria según los valores actuales de los filtros */
  aplicarFiltros() {
    this.clanesFiltrados = this.clanes.filter(c => {
      const coincideNombre = !this.filtroNombre || c.nombre.toLowerCase().includes(this.filtroNombre.toLowerCase());
      const coincidePlazas = !this.soloConPlazas || c.miembros_actuales < c.max_miembros;
      const coincideTamaño = c.max_miembros >= this.filtroMiembrosMin && c.max_miembros <= (this.filtroMiembrosMax || 9999);
      return coincideNombre && coincidePlazas && coincideTamaño;
    });
  }

  // Lanza una nueva carga desde el servidor aplicando el filtro de comunidad actual
  async buscar() { await this.cargarClanes(); }

  /** Inscribe al usuario logueado en la escudería seleccionada y redirige a su perfil */
  async unirse(clan: EscuderiaCard) {
    if (!this.idUsuario) { alert('Inicia sesión para unirte a un clan.'); return; }
    if (clan.miembros_actuales >= clan.max_miembros) { alert('Esta escudería está llena.'); return; }

    // Comprobar si el usuario ya pertenece a una escudería
    const idEscuderiaActual = localStorage.getItem('idEscuderia');
    if (idEscuderiaActual && idEscuderiaActual !== '0' && idEscuderiaActual !== '') {
      alert('Ya perteneces a una escudería. Debes abandonarla antes de unirte a otra.');
      return;
    }

    if (!confirm(`¿Quieres unirte a "${clan.nombre}"?`)) return;

    clan.uniendose = true;
    try {
      await this.api.unirseEscuderia(this.idUsuario, clan.id_escuderia);
      alert(`¡Ya eres miembro de ${clan.nombre}!`);
      this.router.navigate(['/cuenta']);
    } catch (err: any) {
      alert('Error al unirse: ' + (err.error?.message ?? err.message));
      clan.uniendose = false;
    }
  }

  // Devuelve el número de plazas libres de una escudería (mínimo 0)
  plazasLibres(c: EscuderiaCard): number { return Math.max(0, c.max_miembros - c.miembros_actuales); }

  // Devuelve el porcentaje de ocupación (0-100) para la barra de progreso
  porcentajeOcupacion(c: EscuderiaCard): number { return Math.min(100, Math.round((c.miembros_actuales / c.max_miembros) * 100)); }
}
