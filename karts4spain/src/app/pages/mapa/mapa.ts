import { Component, AfterViewInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';
import mapboxgl from 'mapbox-gl';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule, Header, Footer],
  templateUrl: './mapa.html',
  styleUrl: './mapa.css'
})
export class Mapa implements AfterViewInit, OnDestroy {
  map!: mapboxgl.Map;
  mapCanarias!: mapboxgl.Map;

  private mapaListo     = false;
  private canariasListo = false;
  private pistasCanariasPendientes: any[] = [];

  // Popups abiertos (mutamos en sitio, nunca reasignamos)
  openPopups:         mapboxgl.Popup[] = [];
  openCanariasPopups: mapboxgl.Popup[] = [];

  pistasCount   = 0;
  canariasCount = 0;
  cargando      = false;

  filtroCCAA    = '';
  filtroTipo    = '';
  filtroEntorno = '';

  estiloActual = 'dark-v11';
  estilos = [
    { label: 'Oscuro',   icon: 'moon-stars-fill', value: 'dark-v11' },
    { label: 'Satélite', icon: 'broadcast',        value: 'satellite-streets-v12' },
    { label: 'Calles',   icon: 'map-fill',         value: 'streets-v12' }
  ];

  constructor(
    private supabaseService: SupabaseService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngAfterViewInit() {
    (window as any).__mapIrAPistas = (encodedNombre: string) => {
      this.zone.run(() => {
        this.router.navigate(['/pistas'], { queryParams: { nombre: decodeURIComponent(encodedNombre) } });
      });
    };

    (mapboxgl as any).accessToken = environment.mapboxToken;

    // ── Mapa principal: Península + Baleares ────────────────────────────────
    this.map = new mapboxgl.Map({
      container: 'map',
      style: `mapbox://styles/mapbox/${this.estiloActual}`,
      center: [-3.7, 40.5],
      zoom: 5.8,
      maxBounds: [[-12.0, 36.0], [5.5, 44.5]]
    });
    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    this.map.addControl(new mapboxgl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    this.map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
    this.map.addControl(
      new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true }),
      'top-right'
    );
    this.map.on('load', () => {
      this.mapaListo = true;
      this.fetchAndRenderPistas();
    });

    // ── Mini-mapa: Islas Canarias ───────────────────────────────────────────
    this.mapCanarias = new mapboxgl.Map({
      container: 'map-canarias',
      style: `mapbox://styles/mapbox/${this.estiloActual}`,
      center: [-15.5, 28.2],
      zoom: 6.5,
      attributionControl: false
    });
    this.mapCanarias.on('load', () => {
      this.canariasListo = true;
      if (this.pistasCanariasPendientes.length > 0) {
        this.renderPistasEnMapa(this.mapCanarias, this.pistasCanariasPendientes, true);
        this.zone.run(() => {
          this.canariasCount = this.pistasCanariasPendientes.length;
          this.cdr.detectChanges();
        });
        this.pistasCanariasPendientes = [];
      }
    });
  }

  ngOnDestroy() {
    delete (window as any).__mapIrAPistas;
    if (this.map)         this.map.remove();
    if (this.mapCanarias) this.mapCanarias.remove();
  }

  // ── Cargar pistas desde Supabase y renderizarlas ────────────────────────
  async fetchAndRenderPistas(): Promise<void> {
    if (!this.mapaListo) return;
    this.zone.run(() => { this.cargando = true; this.cdr.detectChanges(); });

    let todasLasPistas: any[] = [];
    try {
      const { data, error } = await this.supabaseService.getPistas({
        ccaa:      this.filtroCCAA    || undefined,
        tipo_kart: this.filtroTipo    || undefined,
        entorno:   this.filtroEntorno || undefined
      });
      if (error) throw error;
      todasLasPistas = data ?? [];
    } catch (err) {
      console.error('Error cargando pistas:', err);
      this.zone.run(() => { this.cargando = false; this.cdr.detectChanges(); });
      return;
    }

    // Cerrar popups abiertos
    this.openPopups.forEach(p => p.remove());         this.openPopups.length = 0;
    this.openCanariasPopups.forEach(p => p.remove()); this.openCanariasPopups.length = 0;
    this.pistasCanariasPendientes = [];

    // ── Rangos de coordenadas válidos ──
    const enLatPen = (v: number) => v >= 36.0 && v <= 44.5;   // Latitud Península
    const enLngPen = (v: number) => v >= -12.0 && v <= 5.5;   // Longitud Península
    const enLatCan = (v: number) => v >= 27.0 && v <= 29.5;   // Latitud Canarias
    const enLngCan = (v: number) => v >= -18.5 && v <= -13.0; // Longitud Canarias

    const pistasPeninsula: any[] = [];
    const pistasCanarias:  any[] = [];

    for (const pista of todasLasPistas) {
      if (pista.lat == null || pista.lng == null) continue;
      let lat = Number(pista.lat);
      let lng = Number(pista.lng);
      if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) continue;

      if (pista.ccaa === 'Canarias') {
        // Detectar lat/lng intercambiados: si lat no es válido como latitud pero lng sí,
        // Y además lat sería válido como longitud → intercambiar
        if (!enLatCan(lat) && enLatCan(lng) && enLngCan(lat)) [lat, lng] = [lng, lat];
        if (enLatCan(lat) && enLngCan(lng)) pistasCanarias.push({ ...pista, lat, lng });

      } else {
        // Misma lógica para la península: más permisiva que antes (solo exige que lat sea inválido)
        if (!enLatPen(lat) && enLatPen(lng) && enLngPen(lat)) [lat, lng] = [lng, lat];
        if (enLatPen(lat) && enLngPen(lng)) pistasPeninsula.push({ ...pista, lat, lng });
      }
    }

    // Renderizar en mapas
    this.renderPistasEnMapa(this.map, pistasPeninsula, false);

    if (this.canariasListo) {
      this.renderPistasEnMapa(this.mapCanarias, pistasCanarias, true);
    } else {
      this.pistasCanariasPendientes = pistasCanarias;
    }

    this.zone.run(() => {
      this.canariasCount = pistasCanarias.length;
      this.pistasCount   = pistasPeninsula.length + pistasCanarias.length;
      this.cargando      = false;
      this.cdr.detectChanges();
    });
  }

  // ── Renderizar pistas en un mapa usando capas GeoJSON nativas (WebGL) ───
  // Esto elimina cualquier movimiento al hacer zoom: los puntos son
  // geometría pura renderizada en GPU, no elementos DOM.
  private renderPistasEnMapa(targetMap: mapboxgl.Map, pistas: any[], esCanarias: boolean) {
    const SOURCE_ID = 'pistas-source';
    const LAYER_ID  = 'pistas-puntos';

    const geojson: any = {
      type: 'FeatureCollection',
      features: pistas.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat]   // ← Mapbox usa [longitud, latitud]
        },
        properties: {
          nombre:        p.nombre        ?? '',
          tipo_kart:     p.tipo_kart     ?? '—',
          entorno:       p.entorno       ?? '—',
          ccaa:          p.ccaa          ?? '—',
          url:           p.url           ?? '',
          encodedNombre: encodeURIComponent(p.nombre ?? '')
        }
      }))
    };

    // Si la fuente ya existe (filtros / recarga), solo actualizamos los datos
    if (targetMap.getSource(SOURCE_ID)) {
      (targetMap.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData(geojson);
      return;
    }

    // ── Primera vez: crear fuente y capa ──────────────────────────────────
    targetMap.addSource(SOURCE_ID, { type: 'geojson', data: geojson });

    targetMap.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        // Tamaño del punto crece con el zoom
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          4,  5,
          8,  8,
          14, 13
        ] as any,
        'circle-color':        '#e10600',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': 'rgba(255,255,255,0.9)',
        'circle-opacity':      0.92
      }
    });

    // Referencia a los popups correctos (sin reasignar el array)
    const popups = esCanarias ? this.openCanariasPopups : this.openPopups;

    // ── Click → popup ─────────────────────────────────────────────────────
    targetMap.on('click', LAYER_ID, (e: any) => {
      if (!e.features?.[0]) return;
      const props  = e.features[0].properties;
      const coords: [number, number] = e.features[0].geometry.coordinates.slice();

      // Cerrar popups anteriores
      popups.forEach((popup: mapboxgl.Popup) => popup.remove());
      popups.length = 0;

      const popup = new mapboxgl.Popup({ offset: 14, maxWidth: '270px', closeButton: true })
        .setLngLat(coords)
        .setHTML(`
          <div class="popup-racing">
            <h3>${props['nombre']}</h3>
            <div class="popup-row"><span class="popup-label">Motor</span><span>${props['tipo_kart']}</span></div>
            <div class="popup-row"><span class="popup-label">Entorno</span><span>${props['entorno']}</span></div>
            <div class="popup-row"><span class="popup-label">Región</span><span>${props['ccaa']}</span></div>
            ${props['url'] ? `<a href="${props['url']}" target="_blank" class="popup-web-btn"><i class="bi bi-globe2"></i> VER WEB</a>` : ''}
            <button onclick="window.__mapIrAPistas('${props['encodedNombre']}')" class="popup-pistas-btn"><i class="bi bi-flag-fill"></i> VER EN PISTAS</button>
          </div>
        `)
        .addTo(targetMap);
      popups.push(popup);
    });

    // ── Cursor pointer al pasar sobre un punto ────────────────────────────
    targetMap.on('mouseenter', LAYER_ID, () => {
      targetMap.getCanvas().style.cursor = 'pointer';
    });
    targetMap.on('mouseleave', LAYER_ID, () => {
      targetMap.getCanvas().style.cursor = '';
    });
  }

  // ── Cambiar estilo del mapa ─────────────────────────────────────────────
  cambiarEstilo(estilo: string) {
    this.estiloActual = estilo;
    let pending = 2;
    const onBothLoaded = () => { if (--pending === 0) this.fetchAndRenderPistas(); };

    this.map.setStyle(`mapbox://styles/mapbox/${estilo}`);
    this.map.once('style.load', onBothLoaded);

    this.mapCanarias.setStyle(`mapbox://styles/mapbox/${estilo}`);
    this.mapCanarias.once('style.load', () => { this.canariasListo = true; onBothLoaded(); });
  }

  resetFilters() {
    this.filtroCCAA = ''; this.filtroTipo = ''; this.filtroEntorno = '';
    this.fetchAndRenderPistas();
  }
}
