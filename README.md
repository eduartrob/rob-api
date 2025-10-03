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
    - Descarga (`pull`) la imagen más reciente desde Docker Hub.
    - Utiliza `docker-compose` para detener los contenedores actuales y levantar los nuevos con la imagen actualizada.

### Manejo de Migraciones de Base de Datos

Para MongoDB, el concepto de "migraciones" se maneja de manera diferente a las bases de datos SQL. En este proyecto, se pueden crear scripts que actualicen el esquema o transformen datos.

Actualmente, no hay un sistema de migración formal implementado. Sin embargo, el `docker-compose.yml` está configurado para persistir los datos de MongoDB en un volumen en el host de EC2 (`./data:/data/db`). Esto asegura que los datos no se pierdan entre despliegues.

Para futuras migraciones, se recomienda integrar una librería como `migrate-mongo` y añadir un paso en el script de despliegue para ejecutar las migraciones antes de reiniciar el servidor de la aplicación.

### Conclusiones

La implementación de este pipeline de CI/CD nos permite:
- **Agilizar el desarrollo**: Los cambios se integran y despliegan automáticamente, permitiendo que el equipo se enfoque en escribir código.
- **Reducir errores humanos**: La automatización elimina los pasos manuales propensos a errores durante el despliegue.
- **Consistencia de entornos**: El uso de Docker garantiza que la aplicación se ejecute de la misma manera en el entorno local, de pruebas y de producción.
- **Escalabilidad**: Esta configuración sienta las bases para futuras mejoras, como la orquestación con Kubernetes o el uso de servicios más avanzados de AWS como ECS o Fargate.
