# 🏎️ Karts4Spain

**Plataforma social para la comunidad del karting en España** — Trabajo Fin de Grado (DAW)

Karts4Spain es una aplicación web full-stack que conecta a los aficionados y competidores del karting en España. Los pilotos pueden descubrir circuitos, registrar sus tiempos, competir en un ranking nacional, crear escuderías y relacionarse con otros kartistas de toda España.

---

## ✨ Funcionalidades principales

| Módulo | Descripción |
|---|---|
| 🔐 **Autenticación** | Registro, inicio de sesión y gestión de cuenta vía Supabase Auth (con verificación por email) |
| 🗺️ **Mapa interactivo** | Más de 70 circuitos de karting geolocalizados en toda España con Mapbox GL. Filtros por CCAA, tipo de kart y entorno |
| 🏁 **Directorio de pistas** | Listado completo de circuitos con valoraciones, reseñas y marcado de favoritos |
| 🏆 **Ranking global** | Clasificación de pilotos a nivel nacional con puntos y posición actual |
| 🤝 **Sistema de amigos** | Envío y gestión de solicitudes de amistad entre pilotos |
| 🏎️ **Escuderías (clanes)** | Crear o unirse a equipos por comunidad autónoma, con chat propio y gestión de carreras del clan |
| 💬 **Social Hub** | Chats de pista, grupos sociales, mensajería directa y calendario de eventos |
| 👤 **Perfiles públicos** | Página de piloto con estadísticas, logros desbloqueados y actividad |
| 🎖️ **Logros** | Sistema de insignias que se desbloquean al cumplir objetivos dentro de la plataforma |

---

## 🛠️ Stack tecnológico

### Frontend
- **[Angular 21](https://angular.dev/)** — Framework SPA con SSR (Angular Universal)
- **[Bootstrap 5](https://getbootstrap.com/)** + **Bootstrap Icons** — UI y estilos responsive
- **[Supabase JS](https://supabase.com/docs/reference/javascript/)** — Autenticación y acceso a base de datos en tiempo real
- **[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)** — Mapa interactivo con marcadores y popups personalizados
- **TypeScript 5.9** · **RxJS 7**

### Backend
- **[Spring Boot 3.2](https://spring.io/projects/spring-boot)** — API REST con Java 17
- **Spring Data JPA** + **Hibernate** — ORM y acceso a datos
- **[PostgreSQL](https://www.postgresql.org/)** — Base de datos relacional (alojada en Supabase)
- **Lombok** — Reducción de boilerplate en entidades

### Infraestructura
- **[Supabase](https://supabase.com/)** — BaaS: Auth, PostgreSQL, Storage (avatares)
- **[Docker](https://www.docker.com/) + Docker Compose** — Contenerización de frontend y backend
- **Nginx** — Servidor web para el frontend en producción

---

## 📁 Estructura del repositorio

```
karts4spain/             ← Proyecto Angular (frontend)
│
├── src/
│   ├── app/
│   │   ├── components/  ← Componentes reutilizables (header, footer, modales)
│   │   ├── pages/       ← Páginas de la aplicación (inicio, mapa, ranking…)
│   │   └── services/    ← Servicios (Supabase, API REST)
│   └── environments/    ← Variables de entorno (ver configuración)
│
├── docker/              ← Dockerfiles y docker-compose.yml
└── public/              ← Assets estáticos (imágenes, iconos, logros)

backend/
└── karts4spain-backend/ ← Proyecto Spring Boot (API REST)
    └── src/main/java/org/example/
        ├── controllers/ ← Endpoints REST (pilotos, pistas, escuderías…)
        ├── entities/    ← Entidades JPA (Usuario, Pista, Escudería…)
        └── repositories/← Repositorios Spring Data JPA
```

---

## ⚙️ Instalación y puesta en marcha

### Requisitos previos
- Node.js ≥ 20 y npm ≥ 10
- Java 17
- Maven 3.x
- Docker y Docker Compose (opcional, para despliegue)
- Cuenta en [Supabase](https://supabase.com) y [Mapbox](https://www.mapbox.com/)

---

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/karts4spain.git
cd karts4spain
```

---

### 2. Configurar el frontend (Angular)

```bash
cd karts4spain
npm install
```

Crea el archivo de entorno copiando el ejemplo:

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

Edita `src/environments/environment.ts` y rellena tus credenciales:

```typescript
export const environment = {
  production: false,
  backendUrl: 'http://localhost:8080/api',
  supabaseUrl: 'https://TU_PROYECTO.supabase.co',   // Supabase > Settings > API
  supabaseKey: 'TU_ANON_PUBLIC_KEY'
};
```

> 💡 La clave `supabaseKey` es la **anon/public key**, segura para el cliente.

Arranca el servidor de desarrollo:

```bash
ng serve
# Abre http://localhost:4200
```

---

### 3. Configurar el backend (Spring Boot)

```bash
cd backend/karts4spain-backend
```

Crea el archivo de configuración copiando el ejemplo:

```bash
cp src/main/resources/application.properties.example src/main/resources/application.properties
```

Edita `application.properties` con los datos de tu base de datos PostgreSQL de Supabase (disponibles en **Supabase > Settings > Database > Connection string**):

```properties
spring.datasource.url=jdbc:postgresql://db.TU_PROYECTO.supabase.co:5432/postgres?sslmode=require
spring.datasource.username=postgres.TU_PROYECTO_ID
spring.datasource.password=TU_PASSWORD
```

Arranca la API:

```bash
./mvnw spring-boot:run
# API disponible en http://localhost:8080/api
```

---

### 4. Despliegue con Docker (recomendado para producción)

```bash
cd karts4spain/docker
cp .env.example .env
# Edita .env con tus credenciales
docker compose up --build
```

Esto levanta:
- **Backend** → `http://localhost:8080`
- **Frontend** (Nginx) → `http://localhost:4200`

Consulta [`karts4spain/despliegue.md`](karts4spain/despliegue.md) para instrucciones detalladas de instalación de Docker en Windows y Linux.

---

## 🔑 Variables de entorno / Credenciales

| Archivo | Plantilla disponible | Descripción |
|---|---|---|
| `karts4spain/src/environments/environment.ts` | `environment.example.ts` | URL Supabase + anon key + URL del backend |
| `backend/.../application.properties` | `application.properties.example` | Cadena de conexión PostgreSQL de Supabase |
| `karts4spain/docker/.env` | `.env.example` | Variables para Docker Compose |

> ⚠️ **Ninguno de estos archivos se incluye en el repositorio.** Siempre parte de los archivos `.example`.

---

## 🗺️ Pantallas de la aplicación

| Ruta | Página |
|---|---|
| `/` | Login y registro de pilotos |
| `/inicio` | Home con top 3 pistas mejor valoradas |
| `/mapa` | Mapa interactivo de circuitos de España |
| `/pistas` | Directorio de pistas con filtros y reseñas |
| `/ranking` | Clasificación global de pilotos |
| `/social` | Hub social con chats de pista, grupos y eventos |
| `/buscador-clanes` | Búsqueda y filtrado de escuderías |
| `/mi-escuderia/:id` | Escudería: miembros, chat y carreras del clan |
| `/amigos` | Gestión de amigos y solicitudes |
| `/cuenta` | Perfil propio con logros y estadísticas |
| `/perfil/:username` | Perfil público de cualquier piloto |

---

## 📜 Licencia

Proyecto académico — Trabajo Fin de Grado · Desarrollo de Aplicaciones Web (DAW)
