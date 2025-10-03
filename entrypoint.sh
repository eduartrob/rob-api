#!/bin/sh

# Salir inmediatamente si un comando falla
set -e

# Variables de entorno (puedes pasarlas desde docker-compose si lo deseas)
DOMAIN="store.eduartrob.xyz"
EMAIL="eduartrob@gmail.com"
STAGING=0 # Cambia a 1 para usar el entorno de pruebas de Let's Encrypt

# Instalar Certbot y OpenSSL dentro del contenedor
echo ">>> Instalando Certbot y OpenSSL en el contenedor..."
apk add --no-cache certbot openssl

echo "### Iniciando script de Certbot ###"

# Ruta de los certificados
live_path="/etc/letsencrypt/live/$DOMAIN"

# Comprobar si los certificados ya existen
if [ -d "$live_path" ]; then
  echo ">>> Los certificados para $DOMAIN ya existen. Saltando creación."
else
  echo ">>> No se encontraron certificados para $DOMAIN. Creando certificados dummy..."

  # Crear directorio para los certificados dummy
  mkdir -p /etc/letsencrypt/live/$DOMAIN

  # Generar certificados dummy para que Nginx pueda iniciar
  openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
    -keyout "$live_path/privkey.pem" \
    -out "$live_path/fullchain.pem" \
    -subj "/CN=localhost"

  echo ">>> Certificados dummy creados."
fi

# Iniciar Nginx en segundo plano
echo ">>> Iniciando Nginx en segundo plano..."
nginx -g 'daemon off;' &

# Esperar a que Nginx se inicie
sleep 5

# Reemplazar los certificados dummy con los reales de Let's Encrypt
echo ">>> Solicitando certificados reales de Let's Encrypt..."
certbot certonly --webroot --webroot-path=/var/www/certbot -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email --force-renewal

echo ">>> Certificados reales obtenidos. Recargando Nginx..."
nginx -s reload

# Mantener el contenedor en ejecución y comprobar la renovación cada 12 horas
trap exit TERM; while :; do certbot renew --quiet; sleep 12h & wait $${!}; done