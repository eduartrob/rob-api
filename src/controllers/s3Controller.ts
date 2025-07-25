import { uploadImageProfile, generatePresignedUrl, uploadAppIcon, uploadAppScreenshot, uploadAppApk, deleteFileFromS3 } from "../services/fileService";
import { UserFile } from "../models/userFileModel";
import { AppFile } from "../models/appFileModel";
import { Types } from "mongoose";
import { App } from "../models/appModel";
type MulterFile = Express.Multer.File;

function cleanUrl(url: string): string {
    try {
        const parsedUrl = new URL(url);
        // Retorna la URL sin el querystring ni el hash
        return parsedUrl.origin + parsedUrl.pathname;
    } catch (e) {
        // En caso de que la URL sea inválida, retorna la original para evitar errores,
        // aunque esto podría mantener el problema si la URL es realmente inválida.
        // Es mejor asegurarse de que las URLs almacenadas sean válidas.
        const errorMessage = (e instanceof Error) ? e.message : String(e);
        console.warn(`Invalid URL for cleaning: ${url}. Error: ${errorMessage}`);
        return url;
    }
}

export class S3Controller {
  async getAppFilesByAppId(appId: string): Promise<any> {
    if (!Types.ObjectId.isValid(appId)) {
      throw new Error("Invalid application ID.");
    }

    const appFileDoc = await AppFile.findOne({ appId: new Types.ObjectId(appId) }).exec();

    if (!appFileDoc) {
      throw new Error("App files not found for this application ID.");
    }

    // Generar URLs firmadas para todos los archivos
    const signedIconUrl = appFileDoc.iconKey ? await generatePresignedUrl(appFileDoc.iconKey) : null;
    const signedAppFileUrl = appFileDoc.appFileKey ? await generatePresignedUrl(appFileDoc.appFileKey) : null;

    const signedScreenshotUrls = await Promise.all(
      appFileDoc.screenshots.map(async (screenshot) => {
        return screenshot.key ? await generatePresignedUrl(screenshot.key) : null;
      })
    );

    return {
      message: "Application files retrieved successfully.",
      appFiles: {
        appId: appFileDoc.appId,
        iconUrl: signedIconUrl,
        appFileUrl: signedAppFileUrl,
        appFileSize: appFileDoc.appFileSize,
        screenshots: signedScreenshotUrls.filter(url => url !== null),
        uploadedAt: appFileDoc.uploadedAt,
      },
    };
  }

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



  async uploadAppFiles(
      files: {
          icon?: MulterFile[],
          appFile?: MulterFile[],
          screenshots?: MulterFile[]
      },
      appId: string,
      userId: string,
      screenshotsToKeepUrls: string[] // <-- ¡Este es el array de URLs firmadas del cliente!
  ) {
      if (!Types.ObjectId.isValid(appId)) {
          throw new Error("Invalid application ID.");
      }

      let appFileDoc = await AppFile.findOne({ appId: new Types.ObjectId(appId) });

      if (!appFileDoc) {
          if (!files.icon || files.icon.length === 0) {
              throw new Error("Icon file is required for new app file entry.");
          }
          if (!files.appFile || files.appFile.length === 0) {
              throw new Error("Application file (APK) is required for new app file entry.");
          }
          if (!files.screenshots || files.screenshots.length === 0) {
              throw new Error("At least one screenshot is required for new app file entry.");
          }

          appFileDoc = new AppFile({
              appId: new Types.ObjectId(appId),
              iconUrl: "", iconKey: "",
              appFileUrl: "", appFileKey: "",
              appFileSize: 0, appFileContentType: "",
              screenshots: [],
              uploadedAt: new Date(),
          });
      }

      // --- Subir y Actualizar Icono ---
      if (files.icon && files.icon.length > 0) {
          const iconFile = files.icon[0];
          if (appFileDoc.iconKey) {
              try {
                  await deleteFileFromS3(appFileDoc.iconKey);
                  console.log(`Old icon deleted: ${appFileDoc.iconKey}`);
              } catch (deleteError: any) {
                  console.warn(`Could not delete old icon (key: ${appFileDoc.iconKey}) for app ${appId}: ${deleteError.message}`);
              }
          }
          const iconUploadResult = await uploadAppIcon(iconFile, appId);
          if (!iconUploadResult.Location || !iconUploadResult.Key) {
              throw new Error("Icon upload failed: Location or Key is undefined.");
          }
          appFileDoc.iconUrl = iconUploadResult.Location;
          appFileDoc.iconKey = iconUploadResult.Key;
      }

      // --- Subir y Actualizar Archivo de la Aplicación (APK) ---
      if (files.appFile && files.appFile.length > 0) {
          const appFile = files.appFile[0];
          if (appFileDoc.appFileKey) {
              try {
                  await deleteFileFromS3(appFileDoc.appFileKey);
                  console.log(`Old app file deleted: ${appFileDoc.appFileKey}`);
              } catch (deleteError: any) {
                  console.warn(`Could not delete old app file (key: ${appFileDoc.appFileKey}) for app ${appId}: ${deleteError.message}`);
              }
          }
          const appFileUploadResult = await uploadAppApk(appFile, appId);
          if (!appFileUploadResult.Location || !appFileUploadResult.Key) {
              throw new Error("Application file upload failed: Location or Key is undefined.");
          }
          appFileDoc.appFileUrl = appFileUploadResult.Location;
          appFileDoc.appFileKey = appFileUploadResult.Key;
          appFileDoc.appFileSize = appFile.size;
      }

      // --- Lógica para Capturas de Pantalla ---
      const currentScreenshotsInDb = appFileDoc.screenshots || [];

      // Normalizar las URLs de las capturas de pantalla que el cliente quiere mantener
      const cleanedScreenshotsToKeepUrls = screenshotsToKeepUrls.map(url => cleanUrl(url));
      console.log("Cleaned screenshots to keep from client:", cleanedScreenshotsToKeepUrls);

      // 1. Identificar capturas de pantalla a eliminar de S3
      // Comparar las URLs limpias de la DB con las URLs limpias que se quieren mantener
      const screenshotsToDeleteFromS3 = currentScreenshotsInDb.filter(
          (screenshot: { url: string, key: string }) => {
              const cleanedDbUrl = cleanUrl(screenshot.url);
              const shouldDelete = !cleanedScreenshotsToKeepUrls.includes(cleanedDbUrl);
              if (shouldDelete) {
                  console.log(`Marking for deletion: ${screenshot.url} (cleaned: ${cleanedDbUrl})`);
              }
              return shouldDelete;
          }
      );

      for (const screenshotToDelete of screenshotsToDeleteFromS3) {
          try {
              await deleteFileFromS3(screenshotToDelete.key);
              console.log(`Screenshot deleted from S3: ${screenshotToDelete.key}`);
          } catch (deleteError: any) {
              console.warn(`Could not delete old screenshot (key: ${screenshotToDelete.key}) for app ${appId}: ${deleteError.message}`);
          }
      }

      // 2. Construir la nueva lista de capturas de pantalla para la DB
      const finalScreenshotsForDb: { url: string, key: string }[] = [];

      // Añadir las capturas de pantalla que el cliente quiere mantener (y que aún existen en la DB)
      // Usar las URLs limpias para encontrar la coincidencia
      for (const screenshotUrlToKeep of cleanedScreenshotsToKeepUrls) {
          const existingScreenshot = currentScreenshotsInDb.find(s => cleanUrl(s.url) === screenshotUrlToKeep);
          if (existingScreenshot) {
              finalScreenshotsForDb.push(existingScreenshot);
              console.log(`Keeping existing screenshot: ${existingScreenshot.url}`);
          }
      }

      // 3. Subir las nuevas capturas de pantalla y añadirlas a la lista final
      if (files.screenshots && files.screenshots.length > 0) {
          console.log(`Uploading ${files.screenshots.length} new screenshots.`);
          for (let i = 0; i < files.screenshots.length; i++) {
              const screenshot = files.screenshots[i];
              const screenshotUploadResult = await uploadAppScreenshot(screenshot, appId, i);
              if (!screenshotUploadResult.Location || !screenshotUploadResult.Key) {
                  throw new Error(`Screenshot ${i} upload failed: Location or Key is undefined.`);
              }
              finalScreenshotsForDb.push({
                  url: screenshotUploadResult.Location,
                  key: screenshotUploadResult.Key,
              });
              console.log(`Added new screenshot: ${screenshotUploadResult.Location}`);
          }
      } else {
          console.log("No new screenshots to upload.");
      }

      // Actualizar el array de screenshots en el documento de la base de datos
      appFileDoc.screenshots = finalScreenshotsForDb;

      // Actualizar la fecha de subida general
      appFileDoc.uploadedAt = new Date();

      await appFileDoc.save();
      console.log("AppFile document saved successfully.");

      return {
          message: "Archivos de aplicación actualizados y guardados con éxito.",
          appFiles: {
              id: appFileDoc._id,
              appId: appFileDoc.appId,
              iconUrl: appFileDoc.iconUrl,
              iconKey: appFileDoc.iconKey,
              appFileUrl: appFileDoc.appFileUrl,
              appFileKey: appFileDoc.appFileKey,
              appFileSize: appFileDoc.appFileSize,
              screenshots: appFileDoc.screenshots,
              uploadedAt: appFileDoc.uploadedAt,
          },
      };
  }
  
   async deleteAppFiles(appId: string, requestingUserId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(appId)) {
      throw new Error("Invalid application ID provided for deletion.");
    }
    if (!Types.ObjectId.isValid(requestingUserId)) {
        throw new Error("Invalid user ID provided for authorization.");
    }

    // 1. Verificar la propiedad de la aplicación
    const app = await App.findById(appId).exec();
    if (!app) {
      throw new Error("App not found."); // La aplicación no existe
    }
    // Convertir a string para comparación segura si developerId es ObjectId
    if (app.developerId.toString() !== requestingUserId.toString()) {
      // Si el usuario que solicita la eliminación no es el desarrollador de la app
      throw new Error("Unauthorized: You do not have permission to delete files for this app.");
    }

    // 2. Buscar el documento AppFile asociado
    const appFileDoc = await AppFile.findOne({ appId: new Types.ObjectId(appId) });

    if (!appFileDoc) {
      console.warn(`No AppFile document found for appId: ${appId}. No S3 files to delete.`);
      return { message: "No application files found for this app ID to delete." };
    }

    // 3. Eliminar archivos de S3
    const keysToDelete: string[] = [];

    if (appFileDoc.iconKey) { keysToDelete.push(appFileDoc.iconKey); }
    if (appFileDoc.appFileKey) { keysToDelete.push(appFileDoc.appFileKey); }
    for (const screenshot of appFileDoc.screenshots) {
      if (screenshot.key) { keysToDelete.push(screenshot.key); }
    }

    const deletePromises = keysToDelete.map(key => {
      return deleteFileFromS3(key).catch(error => {
        console.error(`Failed to delete S3 object with key ${key} for app ${appId}:`, error);
        return null;
      });
    });

    await Promise.all(deletePromises);
    console.log(`Attempted to delete ${keysToDelete.length} S3 objects for app ${appId}.`);

    // 4. Eliminar el documento AppFile de la base de datos
    await appFileDoc.deleteOne();

    return { message: `Application files for app ID ${appId} deleted successfully.` };
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


