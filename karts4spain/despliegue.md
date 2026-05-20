# Guía de Despliegue con Docker: Karts4Spain

Esta guía explica paso a paso cómo instalar Docker y levantar el proyecto **Karts4Spain** (frontend Angular + backend Spring Boot) en cualquier máquina usando un único comando.

---

## 1. Instalación de Docker

### A. Windows

1. **Comprueba los requisitos:** Windows 10/11 de 64 bits con la virtualización activada en la BIOS.
2. **Descarga:** Visita [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/) y descarga el instalador.
3. **Instala:**
   - Ejecuta el `.exe`.
   - Asegúrate de marcar la opción **"Use the WSL 2 based engine"**.
   - Reinicia el equipo cuando se solicite.
4. **Verifica** la instalación abriendo PowerShell o CMD:
   ```powershell
   docker --version
   docker compose version
   ```

### B. Ubuntu (Linux)

1. **Actualiza los paquetes e instala dependencias:**
   ```bash
   sudo apt-get update
   sudo apt-get install ca-certificates curl gnupg -y
   ```
2. **Añade la clave GPG oficial de Docker:**
   ```bash
   sudo mkdir -m 0755 -p /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   ```
3. **Configura el repositorio:**
   ```bash
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   ```
4. **Instala Docker Engine y el plugin Compose:**
   ```bash
   sudo apt-get update
   sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
   ```
5. **(Opcional) Usar Docker sin `sudo`:**
   ```bash
   sudo usermod -aG docker $USER
   ```
   *Cierra sesión y vuelve a entrar para que tenga efecto.*

---

## 2. Clonar los repositorios

Clona el **frontend** y el **backend** como carpetas hermanas (en el mismo directorio padre):

```bash
git clone <URL_REPOSITORIO_FRONTEND>   karts4spain
git clone <URL_REPOSITORIO_BACKEND>    karts4spain-backend
```

La estructura debe quedar así:

```
📁 carpeta-padre/
├── 📁 karts4spain/          ← frontend (Angular)
└── 📁 karts4spain-backend/  ← backend (Spring Boot)
```

> **Nota:** Si el nombre de tu carpeta del backend es diferente, edita la línea `context:` del servicio `backend` en `docker/docker-compose.yml` para que apunte a la ruta correcta.

---

## 3. Configurar las credenciales

Accede a la carpeta `docker/` del frontend y crea el fichero `.env` a partir de la plantilla:

```bash
cd karts4spain/docker
cp .env.example .env
```

Abre `.env` con cualquier editor y rellena los valores con los datos de tu proyecto Supabase. Los encontrarás en **Supabase → Settings → API** y **Settings → Database**:

```env
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_KEY=TU_ANON_PUBLIC_KEY

SPRING_DATASOURCE_URL=jdbc:postgresql://db.TU_PROYECTO.supabase.co:5432/postgres
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=TU_PASSWORD_DE_SUPABASE
```

> ⚠️ **Nunca subas el fichero `.env` al repositorio.**

---

## 4. Construir y arrancar los contenedores

Desde la carpeta `docker/`, ejecuta:

```bash
docker compose up --build
```

Este comando construye las imágenes (solo la primera vez o cuando haya cambios en el código) y levanta los dos servicios. Espera hasta ver en la consola mensajes como:

```
karts4spain-backend   | Started KartsApplication in X seconds
karts4spain-frontend  | /docker-entrypoint.sh: Configuration complete
```

Para ejecutarlo en segundo plano (sin bloquear la terminal):

```bash
docker compose up --build -d
```

---

## 5. Cómo acceder a la aplicación

Una vez levantados los contenedores, abre el navegador y ve a:

```
http://localhost:4200
```

El backend también es accesible directamente en:

```
http://localhost:8080/api/pistas
```

---

## 6. Comandos útiles

- **Ver los contenedores en ejecución:**
  ```bash
  docker ps
  ```
- **Ver los logs en tiempo real:**
  ```bash
  docker compose logs -f
  ```
- **Ver los logs de un servicio concreto:**
  ```bash
  docker compose logs -f frontend
  docker compose logs -f backend
  ```
- **Parar los contenedores:**
  ```bash
  docker compose stop
  ```
- **Parar y eliminar los contenedores:**
  ```bash
  docker compose down
  ```
- **Reconstruir desde cero (tras cambios en el código):**
  ```bash
  docker compose up --build
  ```
