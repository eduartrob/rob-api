import { Router } from 'express';
import mongoose from 'mongoose';

import { AppController } from '../controllers/appController';
import { authMiddleware, verifyToken } from '../middlewares/authMiddleware';

const appController = new AppController();
const appRouter = Router()

appRouter.get('/all', async (req, res):Promise<void> => {
  try {
      const apps = await appController.getApps();
      res.status(200).json(apps);
  } catch (error) {
      res.status(500).json({ error: 'error getting apps' });
  }
})

appRouter.get('/my-applications', authMiddleware, async (req, res):Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized: user not found" });
    return;
  }
  const userId = req.user.userId as string;

  try {
      const app = await appController.getAppsByUserId(userId);
      if (app) {
          res.status(200).json(app);
      }
  } catch (error: any) {
    if (error.message === 'not-content-app') {
      res.status(204).json({ message: "No content" });
      return;
    } else if (error.message === 'error-get-app') {
      res.status(404).json({ message: "apps-not-found" });
      return;
    } else {
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  }
});

appRouter.post('/create', authMiddleware, async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized: user not found" });
    return;
  }
  const userId = req.user.userId as string;
  const { name, description, version, releaseDate } = req.body;
  if (!name || !description || !version || !releaseDate) {
      res.status(406).json({ message: "required fields" });
      return;
  }
  try {
    const newApp = await appController.createApp({
      name,
      description,
      version,
      releaseDate,
      developerId: userId
    });

    res.status(201).json({message: "App created successfully", app: newApp});
  } catch (error: any) {
    if (error.message === 'error-creating-app') {
      res.status(422).json({ message: "Error creating app" });
      return;
    } else {
      res.status(500).json({ message: "Internal server error", error });
    }
  }
});

appRouter.put('/update/:id', authMiddleware, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(406).json({ message: "required fields or invalid ID" });
      return;
    }
    const userId = req.user.userId as string;
    const { id } = req.params;
    const { name, description, size, version, releaseDate } = req.body;



    const app = await appController.getAppById(id);

    if (!app) {
      res.status(404).json({ message: "app-not-found" });
      return;
    }

    // Paso 2: verificar que la app le pertenece al usuario autenticado
    if (app.developerId !== userId) {
      res.status(403).json({ message: "No tienes permiso para editar esta app" });
      return;
    }

    // Paso 3: actualizar si todo está OK
    const updatedApp = await appController.updateApp(id, {
      name,
      description,
      size,
      version,
      releaseDate,
    });

    res.status(200).json(updatedApp);
  } catch (error: any) {
    if (error.message === 'error-get-app') {
      res.status(404).json({ message: "app-not-found" });
      return;
    } else if (error.message === 'error-creating-app') {
      res.status(422).json({ message: "Error creating app" });
      return;
    }
    res.status(500).json({ message: "Internal server error", error });
  }
});

appRouter.delete('/delete/:id', authMiddleware, async (req, res): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized: user not found" });
      return;
    }
    const userId = req.user.userId as string;
    const { id } = req.params;

    const app = await appController.getAppById(id);

    if (!app) {
      res.status(404).json({ message: "app-not-found" });
      return;
    }

    if (app.developerId !== userId) {
      res.status(403).json({ message: "No tienes permiso para eliminar esta app" });
      return;
    }

    await appController.deleteApp(id);

    res.status(200).json({ message: "App eliminada correctamente" });
  } catch (error: any) {
    if (error.message === 'app-not-found') {
      res.status(404).json({ message: "app-not-found" });
      return;
    }
    if (error.message === 'error-get-app') {
      res.status(404).json({ message: "app-not-found" });
      return;
    }
    res.status(500).json({ message: "Internal server error", error });
  }
});

export default appRouter;

