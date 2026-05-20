# ─── Stage 1: Compilar el JAR con Maven ───────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /app

# Descargar dependencias primero (capa cacheada si pom.xml no cambia)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copiar el código fuente y compilar
COPY src ./src
RUN mvn clean package -DskipTests


# ─── Stage 2: Ejecutar con JRE ligero ─────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Las variables de entorno sobreescriben application.properties en Spring Boot
# Se pasan desde docker-compose.yml
ENTRYPOINT ["java", "-jar", "app.jar"]
