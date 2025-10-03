#!/bin/bash

# Salir inmediatamente si un comando falla
set -e

echo "### Iniciando script de configuración para Rob-API ###"

function install_docker() {
    if ! command -v docker &> /dev/null; then
        echo ">>> Instalando Docker..."
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl
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
    else
        echo ">>> Docker ya está instalado."
    fi
}

function setup_docker_permissions() {
    if ! groups "$USER" | grep -q '\bdocker\b'; then
        echo ""
        echo ">>> Añadiendo el usuario '$USER' al grupo de Docker..."
        sudo usermod -aG docker "$USER"
        echo "!!! ACCIÓN REQUERIDA !!!"
        echo "Se han actualizado los permisos. Por favor, sal de la sesión SSH y vuelve a conectarte."
        echo "Luego, ejecuta el script de nuevo: ./setup.sh"
        exit 1
    fi
}

function clone_or_update_repo() {
    if [ -d "rob-api" ]; then
        echo ">>> El directorio rob-api ya existe. Entrando y actualizando..."
        cd rob-api
        git pull origin develop
    else
        echo ">>> Clonando el repositorio (rama develop)..."
        git clone -b develop https://github.com/eduartrob/rob-api.git
        cd rob-api
    fi
}

# --- PASO 1: Instalar Docker ---
install_docker

# --- PASO 2: Verificar y configurar permisos de Docker ---
# Si el usuario no está en el grupo 'docker', el script lo añadirá y se detendrá,
# pidiendo al usuario que se reconecte y vuelva a ejecutarlo.
setup_docker_permissions

# --- PASO 3: Clonar o actualizar el repositorio ---
clone_or_update_repo

# --- PASO 4: Pausa para cargar el archivo .env ---
if [ ! -f ".env" ]; then
    echo ""
    echo ">>> PAUSA: El archivo .env no se ha encontrado."
    read -p ">>> Por favor, carga tu archivo '.env' en el directorio '$(pwd)' y luego presiona [Enter] para continuar..."
    if [ ! -f ".env" ]; then
        echo ">>> ERROR: El archivo .env sigue sin encontrarse. Abortando."
        exit 1
    fi
fi

# --- PASO 5: Levantar la aplicación ---
echo ">>> Construyendo imagen y levantando la aplicación con 'docker compose up -d --build'..."

docker compose up --build -d

echo ""
echo "### ¡Configuración completada! La aplicación debería estar corriendo. ###"
echo "Puedes ver los logs con: docker compose logs -f"