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

Para configurar la aplicación en una nueva instancia EC2 (basada en Ubuntu), solo necesitas ejecutar un script que automatiza toda la instalación y configuración.

1.  **Conéctate a tu instancia EC2 por SSH.**

2.  **Descarga y ejecuta el script de configuración**:
    Este comando descargará la última versión del script `setup.sh` de la rama `develop` y lo ejecutará.
    ```bash
    wget https://raw.githubusercontent.com/eduartrob/rob-api/develop/setup.sh
    chmod +x setup.sh
    ./setup.sh
    ```

3.  **Sigue las instrucciones del script**:
    *   El script te pedirá que **pegues el contenido de tu archivo `.env`** de producción.
    *   Te informará que necesitas **salir y volver a entrar a la sesión SSH** para que los permisos de Docker se apliquen correctamente. Después de volver a conectarte, puedes ejecutar `./setup.sh` de nuevo si es necesario, y el script omitirá los pasos ya completados.

¡Y eso es todo! El script se encarga de instalar Docker, clonar el repositorio y levantar la aplicación. A partir de este punto, el pipeline de CI/CD en GitHub se encargará de los despliegues futuros automáticamente.

### Conclusiones

La implementación de este pipeline de CI/CD nos permite:
- **Agilizar el desarrollo**: Los cambios se integran y despliegan automáticamente, permitiendo que el equipo se enfoque en escribir código.
- **Reducir errores humanos**: La automatización elimina los pasos manuales propensos a errores durante el despliegue.
- **Consistencia de entornos**: El uso de Docker garantiza que la aplicación se ejecute de la misma manera en el entorno local, de pruebas y de producción.
- **Escalabilidad**: Esta configuración sienta las bases para futuras mejoras, como la orquestación con Kubernetes o el uso de servicios más avanzados de AWS como ECS o Fargate.
