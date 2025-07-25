import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import express from "express";
import multer from "multer";
import { S3Controller } from "../controllers/s3Controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { generateSignedUrl } from "../config/s3Client";
import { Types } from "mongoose";

import { s3Client } from "../config/s3Client";
import { uploadAppFiles } from "../middlewares/multerConfig";



const s3Router = express.Router();
const upload = multer();
const s3Controller = new S3Controller();

s3Router.get("/get-image-profile", authMiddleware, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }

    const userId = req.user.userId as string;
    const bucketName = process.env.IDRIVE_BUCKET || "storage-rob";
    const key = `profile-images/${userId}/profile.jpg`;

    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      }));
      const signedUrl = await generateSignedUrl(bucketName, key, 3600);
      res.status(200).json({ message: "Profile image URL retrieved successfully", fileUrl: signedUrl });
    } catch (headError: any) {
      if (headError.name === 'NotFound' || headError.name === 'NoSuchKey') {
        res.status(404).json({ message: "Profile image not found for this user", fileUrl: null });
        return;
      }
      throw headError;
    }
  } catch (error: any) {
    console.error("Error retrieving profile image URL:", error);
    res.status(500).json({ message: error.message || "Failed to retrieve profile image URL" });
  }
});

s3Router.get("/get-app-files/:appId", async (req, res): Promise<void> => {
  try {
    const { appId } = req.params;

    if (!appId || !Types.ObjectId.isValid(appId)) {
      res.status(400).json({ message: "Valid appId is required in the URL parameters." });
      return;
    }

    const result = await s3Controller.getAppFilesByAppId(appId);
    res.status(200).json(result);

  } catch (error: any) {
    console.error(`Error retrieving application files for appId ${req.params.appId}:`, error);
    if (error.message === "App files not found for this application ID.") {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message || "Failed to retrieve application files." });
    }
  }
});


s3Router.post("/upload-image-profile", authMiddleware, upload.single("file"), async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }

    const userId = req.user.userId as string;
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: "File is required" });
      return;
    }
    await s3Controller.uploadImageProfile(file, userId);
    const bucketName = process.env.IDRIVE_BUCKET || "storage-rob";
    const key = `profile-images/${userId}/profile.jpg`;
    const signedUrl = await generateSignedUrl(bucketName, key, 3600);
    res.status(201).json({ message: "Image uploaded successfully", fileUrl: signedUrl });
  } catch (error: any) {
    console.error("Error uploading image:", error);
    res.status(500).json({ message: error.message || "Image upload failed" });
  }
});

s3Router.post("/upload-app-files", authMiddleware, uploadAppFiles, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }

    const appId = req.body.appId;
    const userId = req.user.userId as string;

    const files = req.files as {
      icon?: Express.Multer.File[],
      appFile?: Express.Multer.File[],
      screenshots?: Express.Multer.File[]
    };

    let screenshotsToKeepUrls: string[] = [];
    if (req.body.screenshotsToKeep) {
      try {
        screenshotsToKeepUrls = JSON.parse(req.body.screenshotsToKeep);
        if (!Array.isArray(screenshotsToKeepUrls)) {
          throw new Error("screenshotsToKeep must be a JSON array of strings.");
        }
      } catch (parseError) {
        console.error("Error parsing screenshotsToKeep:", parseError);
        res.status(400).json({ message: "Invalid screenshotsToKeep format. Must be a JSON array of strings." });
        return;
      }
    }

    if (!appId || !Types.ObjectId.isValid(appId)) {
      res.status(400).json({ message: "Valid appId is required in the request body." });
      return;
    }

    const hasNewFiles = (files.icon && files.icon.length > 0) ||
                        (files.appFile && files.appFile.length > 0) ||
                        (files.screenshots && files.screenshots.length > 0);

    if (!hasNewFiles && screenshotsToKeepUrls.length === 0) {
      res.status(400).json({ message: "At least one new file (icon, appFile, or screenshots) or existing screenshot URLs (screenshotsToKeep) must be provided for upload/update." });
      return;
    }

    const result = await s3Controller.uploadAppFiles(files, appId, userId, screenshotsToKeepUrls);
    res.status(201).json(result);

  } catch (error: any) {
    console.error("Error uploading application files:", error);
    res.status(500).json({ message: error.message || "Failed to upload application files." });
  }
});

s3Router.delete("/delete-app-files/:appId", authMiddleware, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }
    const userId = req.user.userId as string;


    const { appId } = req.params; 

    if (!appId || !Types.ObjectId.isValid(appId)) {
      res.status(400).json({ message: "Valid appId is required in the URL parameters." });
      return;
    }

    const result = await s3Controller.deleteAppFiles(appId, userId);
    res.status(200).json(result);

  } catch (error: any) {
    console.error(`Error deleting application files for appId ${req.params.appId}:`, error);
    // Manejar específicamente el error de autorización
    if (error.message === "Unauthorized: You do not have permission to delete files for this app.") {
      res.status(403).json({ message: error.message }); // 403 Forbidden
    } else if (error.message === "App not found.") {
      res.status(404).json({ message: error.message }); // 404 Not Found si la app no existe
    } else {
      res.status(500).json({ message: error.message || "Failed to delete application files." });
    }
  }
});

s3Router.get("/files", authMiddleware, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }
    const userId = req.user.userId as string;
    const files = await s3Controller.listUserFiles(userId);
    res.json({ files });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener archivos" });
  }
});

export default s3Router;

