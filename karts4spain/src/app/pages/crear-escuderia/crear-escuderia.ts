import { Component, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';

// Lista de comunidades autónomas disponibles para la escudería
const COMUNIDADES = [
  'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias',
  'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
  'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia',
  'Navarra', 'País Vasco', 'Valencia', 'Ceuta', 'Melilla'
];

@Component({
  selector: 'app-crear-escuderia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, Footer],
  templateUrl: './crear-escuderia.html',
  styleUrl: './crear-escuderia.css'
})
export class CrearEscuderia {

  // Datos del formulario de creación de escudería
  // IMPORTANTE: las claves deben estar en snake_case para que el backend
  // con Jackson SNAKE_CASE las deserialice correctamente en los campos Java.
  public escuderia = {
    nombre: '',
    descripcion: '',
    logo_url: '⚡',
    max_miembros: 15,
    comunidad_autonoma: ''
  };

  readonly comunidades = COMUNIDADES;

  // Emblemas disponibles para elegir como logo de la escudería
  public emblemas = [
    { id: 1, icono: '⚡' }, { id: 2, icono: '🔥' }, { id: 3, icono: '💎' },
    { id: 4, icono: '👑' }, { id: 5, icono: '🦁' }, { id: 6, icono: '🦅' },
    { id: 7, icono: '🚀' }, { id: 8, icono: '💀' }, { id: 9, icono: '🐺' },
    { id: 10, icono: '⭐' }
  ];

  // Estado de carga durante el envío del formulario
  public cargando = false;

  // Mensaje de error a mostrar al usuario si falla la creación
  public errorMsg = '';

  // ID del piloto logueado, leído del localStorage
  public idPiloto: number | null = null;

  constructor(private api: ApiService, private router: Router) {
    afterNextRender(() => {
      const idStr = localStorage.getItem('id_usuario');
      this.idPiloto = idStr ? Number(idStr) : null;
      const comunidad = localStorage.getItem('comunidad_autonoma');
      if (comunidad) this.escuderia.comunidad_autonoma = comunidad;
    });
  }

  // Establece el emblema (emoji) seleccionado como logo de la escudería
  seleccionarEmblema(icono: string) {
    this.escuderia.logo_url = icono;
  }

  // Envía los datos al backend para crear la escudería y redirige a cuenta
  async guardarEscuderia() {
    if (!this.idPiloto) {
      this.errorMsg = 'Error de sesión. Vuelve a iniciar sesión.';
      return;
    }

    this.cargando = true;
    this.errorMsg = '';

    try {
      const res = await this.api.crearEscuderia(this.idPiloto, this.escuderia);
      const idNuevo = res.idEscuderia || res.id_escuderia;
      if (idNuevo) localStorage.setItem('idEscuderia', idNuevo.toString());
      localStorage.setItem('nombre_escuderia', res.nombre);
      localStorage.setItem('logo_escuderia', res.logo_url);
      this.router.navigate(['/cuenta']);
    } catch (err: any) {
      this.errorMsg = err?.error?.error ?? 'Error al crear el equipo. Inténtalo de nuevo.';
      this.cargando = false;
    }
  }
}
