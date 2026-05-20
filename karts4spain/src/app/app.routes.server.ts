import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client  // Renderizado en el cliente para poder usar localStorage, Mapbox, etc.
  }
];
