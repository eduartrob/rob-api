#!/bin/bash

# Salir inmediatamente si un comando falla
set -e

echo "### Iniciando script de configuración del servidor para Rob-API ###"

# --- 1. Instalación de Docker y Docker Compose ---
echo ">>> Actualizando paquetes e instalando dependencias..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl

echo ">>> Instalando Docker..."
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo ">>> Docker y Docker Compose instalados correctamente."

# --- 2. Configuración de permisos para Docker ---
echo ">>> Añadiendo el usuario actual al grupo de Docker..."
sudo usermod -aG docker $USER
echo "!!! IMPORTANTE: Para que los permisos de Docker tomen efecto, necesitas salir y volver a entrar a la sesión SSH, o ejecutar 'newgrp docker'."

# --- 3. Clonar el repositorio ---
if [ -d "rob-api" ]; then
  echo ">>> El directorio rob-api ya existe. Omitiendo clonación."
else
  echo ">>> Clonando el repositorio..."
  git clone https://github.com/eduartrob/rob-api.git
fi

cd rob-api

# --- 4. Crear el archivo .env ---
echo ">>> Creando el archivo .env..."
read -p "Por favor, pega el contenido de tu archivo .env de producción y presiona Enter: " env_content
echo "$env_content" > .env
echo ">>> Archivo .env creado."

# --- 5. Levantar la aplicación ---
echo ">>> Ejecutando 'docker compose up -d'. Puede que necesites ejecutar 'newgrp docker' primero si este es el primer uso."
echo "Si el siguiente comando falla por permisos, ejecuta 'newgrp docker' y luego './setup.sh' de nuevo."

docker compose up -d

echo "### ¡Configuración completada! La aplicación debería estar corriendo. ###"
echo "Puedes ver los logs con: docker compose logs -f"