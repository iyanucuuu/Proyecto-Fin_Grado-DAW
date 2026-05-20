import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-inicio-sesion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inicio-sesion.html',
  styleUrl: './inicio-sesion.css'
})
export class InicioSesion {
  // true = muestra formulario de login, false = muestra formulario de registro
  esLogin = true;

  // Se activa tras registrarse para mostrar el aviso de confirmación por email
  esperandoConfirmacion = false;

  // Campos del formulario de login
  loginEmail = '';
  loginPassword = '';

  // Campos del formulario de registro
  regNombre = '';
  regComunidad = '';
  regEmail = '';
  regPassword = '';
  regPassword2 = '';

  // Estado general del componente
  cargando = false;
  errorMsg = '';

  // Controla la visibilidad de los campos de contraseña (mostrar/ocultar)
  mostrarLoginPass = false;
  mostrarRegPass = false;
  mostrarRegPass2 = false;

  constructor(
    private router: Router,
    private api: ApiService,
    private supabaseService: SupabaseService
  ) {}

  // Alterna entre el formulario de login y el de registro, limpiando errores
  toggleForm() {
    this.esLogin = !this.esLogin;
    this.errorMsg = '';
  }

  /** Calcula la fortaleza de la contraseña del formulario de registro */
  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const p = this.regPassword;
    if (p.length < 6) return 'weak';
    const hasNum     = /\d/.test(p);
    const hasSpecial = /[^a-zA-Z0-9]/.test(p);
    if (p.length >= 8 && hasNum && hasSpecial) return 'strong';
    if (p.length >= 6 && (hasNum || hasSpecial)) return 'medium';
    return 'weak';
  }

  /** Llama al backend para validar credenciales, guarda la sesión en localStorage y navega a inicio */
  async handleLogin() {
    this.errorMsg = '';
    this.cargando = true;

    try {
      const usuario = await this.api.login(this.loginEmail, this.loginPassword);

      // Persiste los datos de sesión en localStorage para que el resto de la app los use
      localStorage.setItem('id_usuario',        usuario.id_usuario.toString());
      localStorage.setItem('nombrePiloto',       usuario.username);
      localStorage.setItem('comunidad_autonoma', usuario.comunidad_autonoma ?? '');
      localStorage.setItem('foto_perfil',        usuario.foto_perfil ?? '');
      localStorage.setItem('idEscuderia',        usuario.id_escuderia?.toString() ?? '');

      // Autenticar en Supabase en segundo plano (necesario para subir imágenes al Storage)
      this.supabaseService.signIn(this.loginEmail, this.loginPassword).catch(() => {});

      this.router.navigate(['/inicio']);
    } catch (err: any) {
      const status = err?.status;
      if (status === 401) {
        this.errorMsg = 'Correo o contraseña incorrectos.';
      } else {
        this.errorMsg = 'Error de conexión con el servidor. ¿Está el backend arriba?';
      }
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Crea el usuario en el backend (BD) y luego lo registra en Supabase Auth
   * para enviar el email de confirmación. Si Supabase Auth falla por email duplicado
   * se ignora el error (la cuenta ya existía en Auth).
   */
  async handleRegister() {
    this.errorMsg = '';

    if (this.regPassword !== this.regPassword2) {
      this.errorMsg = '¡Las contraseñas no coinciden!';
      return;
    }
    if (this.regPassword.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.cargando = true;

    try {
      // 1. Crear usuario en la base de datos (backend Spring Boot)
      await this.api.registrar({
        username:           this.regNombre,
        email:              this.regEmail,
        password:           this.regPassword,
        comunidad_autonoma: this.regComunidad
      });

      // 2. Mostrar pantalla de confirmación inmediatamente (no bloquear en Supabase)
      this.esperandoConfirmacion = true;

      // 3. Enviar email de confirmación en segundo plano
      this.supabaseService.signUp(this.regEmail, this.regPassword)
        .then(({ error: authError }) => {
          if (authError && !authError.message.includes('already registered')) {
            console.warn('Supabase Auth signup warning:', authError.message);
          }
        })
        .catch(e => console.warn('Supabase signup error:', e));
    } catch (err: any) {
      const status = err?.status;
      if (status === 409) {
        this.errorMsg = err.error?.error ?? 'El email o nombre ya están en uso.';
      } else {
        this.errorMsg = 'Error al crear la cuenta. Inténtalo de nuevo.';
      }
    } finally {
      this.cargando = false;
    }
  }
}
