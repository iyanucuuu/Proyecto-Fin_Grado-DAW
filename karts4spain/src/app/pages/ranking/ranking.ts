import { Component, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';

interface PilotoRanking {
  posicion:           number;
  id_usuario:         number;
  username:           string;
  foto_perfil:        string | null;
  comunidad_autonoma: string | null;
  puntos_totales:     number;
  carreras_corridas:  number;
  victorias:          number;
  podios:             number;
  initials:           string;
}

interface ResultadoCarrera {
  id:             number;
  id_carrera:     number;
  username:       string;
  posicion:       number;
  puntos:         number;
  created_at:     string;
  titulo_carrera: string;
  nombre_pista:   string;
}

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Header, Footer],
  templateUrl: './ranking.html',
  styleUrl: './ranking.css'
})
export class Ranking {
  pilotos: PilotoRanking[] = [];
  pilotosFiltrados: PilotoRanking[] = [];
  cargando = true;

  busqueda        = '';
  filtroComunidad = '';
  comunidades:    string[] = [];

  pilotoDetalle:     PilotoRanking | null = null;
  historialCarreras: ResultadoCarrera[]  = [];
  cargandoHistorial  = false;
  mostrarDetalle     = false;

  idUsuario   = 0;
  miPosicion: PilotoRanking | null = null;

  constructor(private api: ApiService, private cd: ChangeDetectorRef) {
    afterNextRender(async () => {
      this.idUsuario = parseInt(localStorage.getItem('id_usuario') || '0');
      await this.cargarRanking();
    });
  }

  async cargarRanking(): Promise<void> {
    this.cargando = true;
    const data = await this.api.getRankingCompleto();

    // El backend devuelve ClasificacionGeneral con usuario anidado
    this.pilotos = ((data ?? []) as any[]).map((row, idx) => ({
      posicion:           idx + 1,
      id_usuario:         Number(row.id_usuario),
      username:           row.usuario?.username ?? 'Piloto ' + row.id_usuario,
      foto_perfil:        row.usuario?.foto_perfil ?? null,
      comunidad_autonoma: row.usuario?.comunidad_autonoma ?? null,
      puntos_totales:     row.puntos_totales   ?? 0,
      carreras_corridas:  row.carreras_corridas ?? 0,
      victorias:          row.victorias ?? 0,
      podios:             row.podios    ?? 0,
      initials:           (row.usuario?.username ?? '??').slice(0, 2).toUpperCase()
    }));

    this.comunidades = [...new Set(
      this.pilotos.map(p => p.comunidad_autonoma).filter(Boolean) as string[]
    )].sort();

    if (this.idUsuario) {
      this.miPosicion = this.pilotos.find(p => p.id_usuario === this.idUsuario) ?? null;
    }

    this.aplicarFiltros();
    this.cargando = false;
    this.cd.detectChanges();
  }

  aplicarFiltros(): void {
    const q = this.busqueda.toLowerCase();
    this.pilotosFiltrados = this.pilotos.filter(p => {
      if (q && !p.username.toLowerCase().includes(q)) return false;
      if (this.filtroComunidad && p.comunidad_autonoma !== this.filtroComunidad) return false;
      return true;
    });
  }

  resetFiltros(): void {
    this.busqueda = '';
    this.filtroComunidad = '';
    this.aplicarFiltros();
  }

  async abrirDetalle(piloto: PilotoRanking): Promise<void> {
    this.pilotoDetalle     = piloto;
    this.mostrarDetalle    = true;
    this.historialCarreras = [];
    this.cargandoHistorial = true;
    this.cd.detectChanges();

    const data = await this.api.getHistorialPiloto(piloto.username);

    // El backend devuelve ResultadoCarrera con carreraPista anidada (que incluye pista anidada)
    this.historialCarreras = ((data ?? []) as any[]).map(r => ({
      id:             r.id,
      id_carrera:     r.id_carrera,
      username:       r.username,
      posicion:       r.posicion,
      puntos:         r.puntos,
      created_at:     r.created_at,
      titulo_carrera: r.carrera_pista?.titulo          ?? 'Carrera',
      nombre_pista:   r.carrera_pista?.pista?.nombre   ?? 'Circuito'
    }));

    this.cargandoHistorial = false;
    this.cd.detectChanges();
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.pilotoDetalle  = null;
  }

  medallaClase(pos: number): string {
    if (pos === 1) return 'oro';
    if (pos === 2) return 'plata';
    if (pos === 3) return 'bronce';
    return '';
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  esMiPiloto(p: PilotoRanking): boolean {
    return this.idUsuario > 0 && p.id_usuario === this.idUsuario;
  }
}
