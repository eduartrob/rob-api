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
    cb(null, true);
  }
});

// Exporta el middleware de Multer configurado para campos específicos
export const uploadAppFiles = upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'appFile', maxCount: 1 },
  { name: 'screenshots', maxCount: 5 },
  { name: 'screenshotsToKeep', maxCount: 1 }
]);