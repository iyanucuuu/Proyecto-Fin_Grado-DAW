import { Component, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Header } from '../../components/header/header';
import { Footer } from '../../components/footer/footer';

// Estructura de datos para cada pista del top 3 mostrado en el hero
interface TopPista {
  id_pista:   number;
  nombre:     string;
  ccaa:       string;
  tipo_kart:  string;
  foto:       string | null;
  media:      number; // media de valoraciones
  total:      number; // número total de valoraciones
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterLink, Header, Footer],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class Inicio {
  // Las tres pistas mejor valoradas, calculadas en cargarTop()
  topPistas: TopPista[] = [];

  // Indica si la petición a Supabase todavía está en curso
  cargandoTop = true;

  constructor(private api: ApiService, private cd: ChangeDetectorRef) {
    // afterNextRender garantiza que el código solo corre en el navegador (no en SSR)
    afterNextRender(async () => {
      await this.cargarTop();
      this.cd.detectChanges();
    });
  }

  /**
   * Carga todas las valoraciones de pistas, calcula la media de cada una
   * y luego recupera los datos completos de las 3 mejor valoradas.
   */
  private async cargarTop(): Promise<void> {
    let valData: any[] = [], pistasData: any[] = [];
    try { pistasData = await this.api.getPistas(); } catch (e) { this.cargandoTop = false; return; }
    try { valData    = await this.api.getAllValoraciones(); } catch (e) { console.warn('Sin valoraciones'); }

    // Agrupa las valoraciones por pista sumando notas y contando entradas
    const mapaVal = new Map<number, { suma: number; total: number }>();
    for (const v of (valData ?? [])) {
      const idPista = Number(v.id_pista);
      const prev = mapaVal.get(idPista) ?? { suma: 0, total: 0 };
      mapaVal.set(idPista, { suma: prev.suma + v.nota, total: prev.total + 1 });
    }

    if (mapaVal.size === 0) { this.cargandoTop = false; return; }

    // Ordena por media descendente (desempate por número de votos) y toma las 3 primeras
    const top3Ids = [...mapaVal.entries()]
      .map(([id, v]) => ({ id, media: v.suma / v.total, total: v.total }))
      .sort((a, b) => b.media - a.media || b.total - a.total)
      .slice(0, 3)
      .map(x => x.id);

    // Mantiene el orden del top (la consulta IN no garantiza orden)
    this.topPistas = top3Ids.map(id => {
      const p = (pistasData ?? []).find((x: any) => Number(x.id_pista) === id);
      const val = mapaVal.get(id)!;
      if (!p) return null;
      return {
        id_pista:  Number(p.id_pista),
        nombre:    p.nombre,
        ccaa:      p.ccaa,
        tipo_kart: p.tipo_kart,
        foto:      p.foto ?? null,
        media:     val.suma / val.total,
        total:     val.total
      } as TopPista;
    }).filter(Boolean) as TopPista[];

    this.cargandoTop = false;
  }

  // Devuelve un array [1,2,3,4,5] para iterar las estrellas en la plantilla
  starsArray(): number[] { return [1, 2, 3, 4, 5]; }

  // Determina si la estrella en posición i debe estar rellena según la media
  estrellasLlenas(media: number, i: number): boolean {
    return i <= Math.round(media);
  }
}
