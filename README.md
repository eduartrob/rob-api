# apiMovil

Utilidad para funcionalidad de la aplicacion rob-store

## Flujo de Integración y Despliegue Continuo (CI/CD)

Este proyecto está configurado con un pipeline de CI/CD automatizado utilizando GitHub Actions y Docker para facilitar la integración de código y el despliegue en un entorno de AWS.

### Ramas
- `main`: Contiene el código estable y de producción.
- `develop`: Es la rama de integración principal. Todo el código nuevo debe ser fusionado aquí a través de Pull Requests.

### Pipeline de CI/CD

El pipeline se activa automáticamente cada vez que se realiza un `push` a la rama `develop`. Las acciones que se realizan son:

1.  **Construcción de la Imagen Docker**: GitHub Actions construye una imagen Docker de la aplicación utilizando el `Dockerfile` optimizado que se encuentra en la raíz del proyecto. Este proceso compila el código TypeScript a JavaScript y empaqueta la aplicación con sus dependencias de producción.

2.  **Publicación en Docker Hub**: Una vez construida, la imagen es etiquetada como `latest` y publicada en nuestro registro de contenedores en Docker Hub.

3.  **Despliegue en AWS EC2**: El workflow se conecta de forma segura a nuestra instancia EC2 a través de SSH y ejecuta los siguientes comandos:
    - Crea un archivo `.env` con las variables de entorno de producción, las cuales están almacenadas de forma segura como secrets en GitHub.
    - Descarga (`pull`) la imagen más reciente de la API desde Docker Hub.
    - Utiliza `docker-compose` para detener los contenedores actuales (API, Nginx, MongoDB) y levantar los nuevos con la configuración actualizada.

### Arquitectura de Despliegue con HTTPS

La aplicación se despliega utilizando Nginx como un proxy inverso para gestionar el tráfico web y proporcionar terminación SSL (HTTPS).

- **Nginx**: Actúa como la puerta de entrada. Recibe todo el tráfico en los puertos 80 y 443. Redirige todo el tráfico HTTP a HTTPS y pasa las solicitudes seguras al contenedor de la API.
- **Certbot**: Se utiliza para obtener y renovar automáticamente los certificados SSL de Let's Encrypt, asegurando que la comunicación sea siempre cifrada.
- **API (Node.js)**: Se ejecuta en un contenedor sin estar expuesta directamente a internet. Solo Nginx puede comunicarse con ella.

### Manejo de Migraciones de Base de Datos

Para MongoDB, el concepto de "migraciones" se maneja de manera diferente a las bases de datos SQL. En este proyecto, se pueden crear scripts que actualicen el esquema o transformen datos.

Actualmente, no hay un sistema de migración formal implementado. Sin embargo, el `docker-compose.yml` está configurado para persistir los datos de MongoDB en un volumen en el host de EC2 (`./data:/data/db`). Esto asegura que los datos no se pierdan entre despliegues.

Para futuras migraciones, se recomienda integrar una librería como `migrate-mongo` y añadir un paso en el script de despliegue para ejecutar las migraciones antes de reiniciar el servidor de la aplicación.

### Configuración de HTTPS (Certbot) - 100% Automático

El sistema está diseñado para configurar y renovar los certificados SSL de forma completamente automática, sin necesidad de intervención manual en el servidor.

**¿Cómo funciona?**

1.  **Primer Despliegue**: Cuando el pipeline se ejecuta por primera vez en una instancia EC2 nueva, un script de arranque (`nginx/entrypoint.sh`) dentro del contenedor de Nginx detecta que no existen certificados SSL.
2.  **Certificados Dummy**: El script crea certificados autofirmados temporales. Esto permite que Nginx se inicie sin errores.
3.  **Obtención de Certificados Reales**: Con Nginx ya en funcionamiento, el script solicita a Let's Encrypt (usando Certbot) que genere los certificados SSL válidos para `store.eduartrob.xyz`.
4.  **Recarga de Nginx**: Una vez obtenidos los certificados reales, el script ordena a Nginx que los cargue, todo sin interrumpir el servicio.
5.  **Renovación Automática**: El mismo script se encarga de comprobar y renovar los certificados automáticamente cada 12 horas.

**Tu única tarea de configuración inicial en el servidor EC2 es:**

1.  Instalar Docker y Docker Compose.
2.  Clonar el repositorio.
3.  Asegurarte de que tu dominio `store.eduartrob.xyz` apunta a la IP de la instancia.

### Guía de Puesta en Marcha Inicial (En el Servidor EC2)

Una vez que el repositorio está listo en tu máquina y has preparado tu instancia EC2 (con Docker, Docker Compose y Git instalados), sigue estos pasos **la primera y única vez** que configures el servidor:

1.  **Clona el repositorio en tu EC2**:
    ```bash
    git clone https://github.com/tu-usuario/tu-repositorio.git rob-api
    cd rob-api
    ```

2.  **Crea el archivo de entorno (`.env`)**: El pipeline automático lo crea por ti, pero para este primer arranque manual, debes crearlo tú.
    ```bash
    # Crea el archivo .env
    nano .env
    ```
    Dentro de ese archivo, pega el contenido de tus variables de entorno de producción (el mismo que usarás en el *secret* `ENV_FILE` de GitHub).

3.  **Ejecuta la aplicación con Docker Compose**:
    No ejecutas un archivo específico, sino que usas Docker Compose, que lee el archivo `docker-compose.yml` y levanta todos los servicios por ti.
    ```bash
    docker-compose up -d
    ```
    Este único comando descargará las imágenes necesarias, iniciará los contenedores (API, Base de Datos, Nginx) y el script de Nginx se encargará automáticamente de generar los certificados SSL. A partir de aquí, el pipeline de GitHub Actions se encargará de las futuras actualizaciones.

### Conclusiones

La implementación de este pipeline de CI/CD nos permite:
- **Agilizar el desarrollo**: Los cambios se integran y despliegan automáticamente, permitiendo que el equipo se enfoque en escribir código.
- **Reducir errores humanos**: La automatización elimina los pasos manuales propensos a errores durante el despliegue.
- **Consistencia de entornos**: El uso de Docker garantiza que la aplicación se ejecute de la misma manera en el entorno local, de pruebas y de producción.
- **Escalabilidad**: Esta configuración sienta las bases para futuras mejoras, como la orquestación con Kubernetes o el uso de servicios más avanzados de AWS como ECS o Fargate.
