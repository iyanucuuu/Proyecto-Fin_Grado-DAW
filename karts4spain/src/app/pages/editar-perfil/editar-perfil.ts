import { Component, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SupabaseService } from '../../services/supabase.service';
import { Header } from '../../components/header/header';

@Component({
  selector: 'app-editar-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, Header],
  templateUrl: './editar-perfil.html',
  styleUrl: './editar-perfil.css'
})
export class EditarPerfil {
  // Datos del usuario cargados desde el backend; se rellena con los valores actuales del perfil
  public user: any = {
    username: 'Cargando...',
    email: '',
    comunidad_autonoma: '',
    foto_perfil: null
  };

  // Nueva contraseña y su confirmación (vacíos = sin cambios)
  newPassword = '';
  repeatPassword = '';

  // Estado general del formulario
  cargando = false;
  errorMsg = '';
  successMsg = '';

  // Controla la visibilidad de los campos de contraseña (mostrar/ocultar)
  mostrarPass = false;
  mostrarPass2 = false;

  constructor(
    private router: Router,
    private api: ApiService,
    private supabaseService: SupabaseService
  ) {
    afterNextRender(async () => {
      const nombre = localStorage.getItem('nombrePiloto');
      if (!nombre) { this.router.navigate(['/cuenta']); return; }

      try {
        // Carga los datos actuales del perfil para pre-rellenar el formulario
        const data = await this.api.getUsuarioPorNombre(nombre);
        if (data) {
          this.user = { ...data };
          delete this.user.password; // nunca pre-rellenamos la contraseña por seguridad
        }
      } catch (err) {
        console.warn('No se pudieron cargar los datos del perfil:', err);
      }
    });
  }

  /**
   * Sube el archivo de imagen al bucket de Supabase Storage y actualiza
   * la URL de foto_perfil en la vista previa del formulario.
   */
  async subirFoto(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const publicUrl = await this.supabaseService.subirAvatar(file, this.user.username);
    if (publicUrl) {
      this.user.foto_perfil = publicUrl;
    } else {
      this.errorMsg = 'Error al subir la imagen.';
    }
  }

  /**
   * Computed: las contraseñas son válidas si están vacías (sin cambio)
   * o si coinciden y tienen al menos 6 caracteres.
   */
  get passwordsValidas(): boolean {
    if (!this.newPassword && !this.repeatPassword) return true;
    return this.newPassword.length >= 6 && this.newPassword === this.repeatPassword;
  }

  /**
   * Guarda los cambios en el backend. Si se proporcionó una nueva contraseña,
   * primero la actualiza en Supabase Auth (que la hashea automáticamente)
   * y luego envía todos los cambios al backend.
   */
  async guardarCambios() {
    this.errorMsg = '';
    this.successMsg = '';

    if (this.newPassword || this.repeatPassword) {
      if (this.newPassword !== this.repeatPassword) {
        this.errorMsg = 'Las contraseñas no coinciden.';
        return;
      }
      if (this.newPassword.length < 6) {
        this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
        return;
      }
    }

    this.cargando = true;

    const cambios: any = {
      comunidad_autonoma: this.user.comunidad_autonoma,
      foto_perfil:        this.user.foto_perfil
    };

    if (this.newPassword) {
      // Intenta actualizar en Supabase Auth (puede fallar si no hay sesión activa; no bloquea)
      this.supabaseService.actualizarPassword(this.newPassword).catch(() => {});
      cambios.password = this.newPassword;
    }

    try {
      await this.api.actualizarUsuario(this.user.id_usuario, cambios);
      // Sincroniza el localStorage con los datos recién guardados
      if (this.user.foto_perfil) localStorage.setItem('foto_perfil', this.user.foto_perfil);
      if (this.user.comunidad_autonoma) localStorage.setItem('comunidad_autonoma', this.user.comunidad_autonoma);
      this.successMsg = '¡Perfil actualizado, piloto!';
      this.newPassword = '';
      this.repeatPassword = '';
      // Redirige automáticamente a cuenta después de 1.2 segundos
      setTimeout(() => this.router.navigate(['/cuenta']), 1200);
    } catch (err: any) {
      this.errorMsg = 'Error al guardar: ' + (err.error?.message ?? err.message ?? 'Error desconocido');
    }

    this.cargando = false;
  }

  // Descarta los cambios y vuelve a la página de cuenta
  cancelar() {
    this.router.navigate(['/cuenta']);
  }
}
