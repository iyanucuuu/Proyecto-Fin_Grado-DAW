# ─── Stage 1: Build Angular ────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependencias primero (capa cacheada si package.json no cambia)
COPY package*.json ./
RUN npm ci

# Copiar el código fuente
COPY . .

# Credenciales inyectadas como build args desde docker-compose / .env
ARG SUPABASE_URL=https://TU_PROYECTO.supabase.co
ARG SUPABASE_KEY=TU_ANON_PUBLIC_KEY

# Crear environment.ts a partir de la plantilla e inyectar valores
RUN cp src/environments/environment.example.ts src/environments/environment.ts && \
    sed -i "s|https://TU_PROYECTO.supabase.co|${SUPABASE_URL}|g" src/environments/environment.ts && \
    sed -i "s|TU_ANON_PUBLIC_KEY|${SUPABASE_KEY}|g"             src/environments/environment.ts && \
    sed -i "s|http://localhost:8080/api|/api|g"                  src/environments/environment.ts

# Compilar en modo producción
RUN npm run build

# Renombrar index.csr.html → index.html para que Nginx lo sirva correctamente
RUN mv dist/karts4spain/browser/index.csr.html dist/karts4spain/browser/index.html || true


# ─── Stage 2: Servir con Nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Copiar los ficheros estáticos compilados
COPY --from=build /app/dist/karts4spain/browser /usr/share/nginx/html

# Copiar la configuración personalizada de Nginx
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
