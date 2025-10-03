#!/bin/bash

# Salir inmediatamente si un comando falla
set -e

echo "### Iniciando script de configuración para Rob-API ###"

# --- Funciones de Ayuda ---

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

function install_nginx_certbot() {
    if ! command -v nginx &> /dev/null; then
        echo ">>> Instalando Nginx..."
        sudo apt-get update
        sudo apt-get install -y nginx
        sudo systemctl start nginx
        sudo systemctl enable nginx
    else
        echo ">>> Nginx ya está instalado."
    fi

    if ! command -v certbot &> /dev/null; then
        echo ">>> Instalando Certbot..."
        sudo apt-get install -y certbot python3-certbot-nginx
    else
        echo ">>> Certbot ya está instalado."
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

# --- PASO 1: Instalar dependencias del servidor ---
install_docker
install_nginx_certbot

# --- PASO 2: Verificar y configurar permisos ---
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

# --- PASO 5: Construir y levantar el contenedor de la API ---
echo ">>> Construyendo imagen de la API y levantando el contenedor..."
docker compose up --build -d

# --- PASO 6: Configurar Nginx ---
echo ""
echo "### Configuración de Nginx y HTTPS ###"

# Crear el archivo de configuración de Nginx para tu dominio
NGINX_CONF_PATH="/etc/nginx/sites-available/rob-api"
echo ">>> Creando archivo de configuración de Nginx en $NGINX_CONF_PATH..."

sudo tee "$NGINX_CONF_PATH" > /dev/null <<EOF
server {
    listen 80;
    server_name store.eduartrob.xyz;

    location / {
        proxy_pass http://localhost:3000; # Redirige el tráfico al contenedor de la API
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo ">>> Activando la configuración de Nginx..."
sudo ln -sf /etc/nginx/sites-available/rob-api /etc/nginx/sites-enabled/

echo ">>> Verificando la sintaxis de Nginx..."
sudo nginx -t

echo ">>> Reiniciando Nginx para aplicar los cambios..."
sudo systemctl restart nginx

echo ">>> Solicitando certificado SSL con Certbot..."
sudo certbot --nginx -d store.eduartrob.xyz --non-interactive --agree-tos -m eduartrob@gmail.com

echo ""
echo "### ¡Configuración completada! La aplicación debería estar corriendo. ###"
echo "Puedes ver los logs con: docker compose logs -f"