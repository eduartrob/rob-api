import multer from 'multer';
import path from 'path';

// Configuración de almacenamiento en memoria para Multer
// Esto es útil porque procesaremos los archivos antes de subirlos a S3
const storage = multer.memoryStorage();

// Configuración de Multer para manejar múltiples tipos de archivos
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Limite de 50MB por archivo (ajusta según tus necesidades)
  },
  fileFilter: (req, file, cb) => {
    // Puedes añadir lógica de validación de tipo de archivo aquí si lo deseas
    // Por ejemplo, solo permitir imágenes para el icono y screenshots, y APK para el appFile
    cb(null, true);
  }
});

// Exporta el middleware de Multer configurado para campos específicos
export const uploadAppFiles = upload.fields([
  { name: 'icon', maxCount: 1 }, // Solo 1 icono
  { name: 'appFile', maxCount: 1 }, // Solo 1 archivo de aplicación (ej. APK)
  { name: 'screenshots', maxCount: 5 } // Hasta 5 capturas de pantalla (ajusta el límite)
]);