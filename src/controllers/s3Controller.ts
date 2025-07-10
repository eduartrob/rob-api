import { uploadImageProfile, uploadIcon, uploadScreenshot, uploadApk, generatePresignedUrl } from "../services/fileService";
import { UserFile } from "../models/userFileModel";
type MulterFile = Express.Multer.File;

export class S3Controller {
  async uploadImageProfile(file: MulterFile, userId: string) {
    if (!file) {
      throw new Error("file-required");
    }
    const result = await uploadImageProfile(file, userId);
    const savedFile = await UserFile.create({
      userId: userId,
      key: result.Key,
      url: result.Location,
      contentType: file.mimetype,
    });

    return {
      message: "Imagen de perfil subida con éxito",
      file: {
        id: savedFile._id,
        url: savedFile.url,
        contentType: savedFile.contentType,
        uploadedAt: savedFile.uploadedAt,
      },
    };

  }

  


  async uploadIcon(file: MulterFile, userId: string) {
    if (!file) {
      throw new Error("file-required");
    }

    const result = await uploadIcon(file);

    const savedFile = await UserFile.create({
      userId: userId,
      key: result.Key,
      url: result.Location,
      contentType: file.mimetype,
    });

    return {
      message: "Icono subido con éxito",
      file: {
        id: savedFile._id,
        url: savedFile.url,
        contentType: savedFile.contentType,
        uploadedAt: savedFile.uploadedAt,
      },
    };
  }

  async uploadScreenshot(file: MulterFile, userId: string) {
    if (!file) {
      throw new Error("file-required");
    }

    const result = await uploadScreenshot(file);

    const savedFile = await UserFile.create({
      userId: userId,
      key: result.Key,
      url: result.Location,
      contentType: file.mimetype,
    });

    return {
      message: "Captura de pantalla subida con éxito",
      file: {
        id: savedFile._id,
        url: savedFile.url,
        contentType: savedFile.contentType,
        uploadedAt: savedFile.uploadedAt,
      },
    };
  } 

  async uploadApk(file: MulterFile, userId: string) {
    if (!file) {
      throw new Error("file-required");
    }

    const result = await uploadApk(file);

    const savedFile = await UserFile.create({
      userId: userId,
      key: result.Key,
      url: result.Location,
      contentType: file.mimetype,
    });

    return {
      message: "APK subido con éxito",
      file: {
        id: savedFile._id,
        url: savedFile.url,
        contentType: savedFile.contentType,
        uploadedAt: savedFile.uploadedAt,
      },
    };
  }

  
   async listUserFiles(userId: string) {
    const files = await UserFile.find({ userId }).exec();

    const filesWithUrl = await Promise.all(
      files.map(async (file) => {
        const signedUrl = await generatePresignedUrl(file.key);
        return {
          id: file._id,
          url: signedUrl,
          contentType: file.contentType,
          uploadedAt: file.uploadedAt,
        };
      })
    );

    return filesWithUrl;
  }
}


