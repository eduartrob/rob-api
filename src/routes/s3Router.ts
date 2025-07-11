// src/routes/s3Routes.ts
import express from "express";
import multer from "multer";
import { S3Controller } from "../controllers/s3Controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { generateSignedUrl } from "../config/s3Client";

const s3Router = express.Router();
const upload = multer();
const s3Controller = new S3Controller();


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


s3Router.post("/upload-icon", authMiddleware, upload.single("file"), async (req, res): Promise<void> => {
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
    await s3Controller.uploadIcon(file, userId);
    res.status(201).json({ message: "Icon uploaded successfully"});
  } catch (error: any) {
    console.error("Error uploading icon:", error);
    res.status(500).json({ message: error.message || "Icon upload failed" });
  }
});

s3Router.post("/upload-screenshot", authMiddleware, upload.single("file"), async (req, res): Promise<void> => {
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
    await s3Controller.uploadScreenshot(file, userId);
    res.status(201).json({ message: "Screenshot uploaded successfully"});
  } catch (error: any) {
    console.error("Error uploading screenshot:", error);
    res.status(500).json({ message: error.message || "Screenshot upload failed" });
  }
});

s3Router.post("/upload-apk", authMiddleware, upload.single("file"), async (req, res): Promise<void> => {
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
    await s3Controller.uploadApk(file, userId);
    res.status(201).json({ message: "APK uploaded successfully"});
  } catch (error: any) {
    console.error("Error uploading APK:", error);
    res.status(500).json({ message: error.message || "APK upload failed" });
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

