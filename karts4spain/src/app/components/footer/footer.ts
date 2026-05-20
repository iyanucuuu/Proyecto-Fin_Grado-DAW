import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Componente de pie de página compartido por todas las vistas autenticadas
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {}
