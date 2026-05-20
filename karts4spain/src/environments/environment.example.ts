// Copia este archivo como environment.ts y rellena tus propias claves.
// El archivo environment.ts real está excluido del repositorio (.gitignore).
export const environment = {
  production: false,

  // URL del backend Spring Boot
  backendUrl: 'http://localhost:8080/api',

  // Credenciales del proyecto Supabase — encuéntralas en Settings > API
  supabaseUrl: 'https://TU_PROYECTO.supabase.co',
  supabaseKey: 'TU_ANON_PUBLIC_KEY',

  // Token público de Mapbox — encuéntralo en mapbox.com > Account > Tokens
  mapboxToken: 'TU_MAPBOX_PUBLIC_TOKEN'
};
