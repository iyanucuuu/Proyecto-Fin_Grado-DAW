# Karts4Spain — Trabajo de Fin de Grado (DAW)

Proyecto de Trabajo de Fin de Grado: **Karts4Spain**, una plataforma social para aficionados al karting en España, con mapa interactivo de circuitos, gestión de usuarios y sistema de clanes.

## Contenido del repositorio

```
TrabajoFinGrado/
├── karts4spain/                  # Frontend (Angular SSR)
├── backend/karts4spain-backend/  # API REST (Spring Boot)
├── Karts4Spain_Memoria.docx      # Memoria del TFG
└── Karts4Spain_Presentacion.pptx # Presentación del TFG
```

## Stack tecnológico

- **Frontend:** Angular (con Server-Side Rendering / Express), Bootstrap, Mapbox GL
- **Backend:** Spring Boot (Java), Spring Data JPA
- **Base de datos:** PostgreSQL / Supabase
- **Despliegue:** Docker y Docker Compose (ver `karts4spain/despliegue.md`)

## Puesta en marcha

### Frontend

```bash
cd karts4spain
npm install
npm start
```

Disponible en `http://localhost:4200`.

### Backend

```bash
cd backend/karts4spain-backend
mvn spring-boot:run
```

### Despliegue con Docker

La guía completa paso a paso (instalación de Docker y arranque del proyecto completo con un solo comando) está en [`karts4spain/despliegue.md`](karts4spain/despliegue.md).

## Documentación del TFG

- **Memoria:** `Karts4Spain_Memoria.docx`
- **Presentación:** `Karts4Spain_Presentacion.pptx`

## Autor

Iyán Gironés Suárez
