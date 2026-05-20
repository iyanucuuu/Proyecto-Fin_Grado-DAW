import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * @deprecated Servicio legado. Usar ApiService en su lugar, que centraliza
 * todas las llamadas HTTP al backend con un patrón consistente (firstValueFrom).
 * Este servicio queda únicamente por compatibilidad mientras no haya referencias activas.
 */
@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private API_URL = 'http://localhost:8080/api/usuarios';

  constructor(private http: HttpClient) { }

  // Devuelve todos los usuarios como Observable (patrón antiguo)
  getUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL);
  }
}
