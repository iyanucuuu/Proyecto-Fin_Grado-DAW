import { Routes } from '@angular/router';
import { InicioSesion }  from './pages/inicio-sesion/inicio-sesion';
import { Inicio }        from './pages/inicio/inicio';
import { Mapa }          from './pages/mapa/mapa';
import { Ranking }       from './pages/ranking/ranking';
import { Cuenta }        from './pages/cuenta/cuenta';
import { EditarPerfil }  from './pages/editar-perfil/editar-perfil';
import { BuscadorClanes }from './pages/buscador-clanes/buscador-clanes';
import { CrearEscuderia }from './pages/crear-escuderia/crear-escuderia';
import { Amigos }        from './pages/amigos/amigos';
import { MiEscuderia }   from './pages/mi-escuderia/mi-escuderia';
import { Pistas }        from './pages/pistas/pistas';
import { SocialHub }     from './pages/social/social-hub';
import { Social }        from './pages/social/social';
import { PerfilPublico } from './pages/perfil-publico/perfil-publico';

/**
 * Definición de rutas de la aplicación.
 * - La ruta '' (raíz) muestra el login/registro (InicioSesion).
 * - Las rutas autenticadas redirigen al login si el usuario no tiene sesión (comprobado en cada componente).
 * - 'mi-escuderia/:id' recibe el ID de la escudería como parámetro de ruta.
 * - El wildcard '**' redirige a inicio (home), no al login, porque lo normal es que el usuario ya tenga sesión.
 */
export const routes: Routes = [
  { path: '',                    component: InicioSesion   }, // Login / Registro
  { path: 'inicio',              component: Inicio         }, // Home con top pistas
  { path: 'mapa',                component: Mapa           }, // Mapa interactivo de circuitos
  { path: 'ranking',             component: Ranking        }, // Clasificación global de pilotos
  { path: 'amigos',              component: Amigos         }, // Gestión de amistades
  { path: 'cuenta',              component: Cuenta         }, // Perfil del piloto logueado
  { path: 'editar-perfil',       component: EditarPerfil   }, // Edición de datos del perfil
  { path: 'crear-clan',          component: CrearEscuderia }, // Formulario para crear nueva escudería
  { path: 'buscador-clanes',     component: BuscadorClanes }, // Búsqueda y filtro de escuderías
  { path: 'mi-escuderia/:id',    component: MiEscuderia    }, // Escudería concreta (chat + miembros)
  { path: 'pistas',              component: Pistas         }, // Directorio de circuitos de karting
  { path: 'social',              component: SocialHub      }, // Hub social (circuitos, mensajes, grupos)
  { path: 'social/:id',          component: Social         }, // Vista de circuito concreto con chat/carreras
  { path: 'perfil/:username',    component: PerfilPublico  }, // Perfil público de cualquier piloto
  { path: '**',                  redirectTo: 'inicio'      }  // Ruta desconocida → home
];
