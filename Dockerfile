# ---- Etapa de Build ----
# Usamos una imagen de Node que contiene las herramientas de compilación
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copiamos package.json y package-lock.json para instalar dependencias
COPY package*.json ./

# Instalamos todas las dependencias, incluyendo las de desarrollo para compilar
RUN npm install

# Copiamos el resto del código fuente
COPY . .

# Compilamos el proyecto de TypeScript a JavaScript
RUN npm run build

# ---- Etapa de Producción ----
# Usamos una imagen base de Node más ligera para la ejecución
FROM node:18-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copiamos solo las dependencias de producción desde la etapa de build
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copiamos el código compilado desde la etapa de build
COPY --from=builder /usr/src/app/dist ./dist

# Exponemos el puerto en el que correrá la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "dist/index.js"]