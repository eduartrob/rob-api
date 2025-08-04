import { Router } from 'express';
import mongoose from 'mongoose';

import { UserController } from '../controllers/userController';
import { verifyToken, extractToken } from '../middlewares/authMiddleware';
import { addTokenToBlacklist } from '../utils/tokenBlackList';
import { authMiddleware } from "../middlewares/authMiddleware";


import serviceAccount from '../config/serviceAccountKey.json';
import * as admin from 'firebase-admin';
import { User } from '../models/userModel';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});
console.log('Firebase Admin SDK inicializado.');


const userController = new UserController();
const userRouter = Router();

userRouter.get('/all', async (req, res):Promise<void> => {
    try {
        const users = await userController.getUsers();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'error getting users' });
    }
});
userRouter.get('/:id', async (req, res):Promise<void> => {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id) ) {
        res.status(406).json({ message: "required fields or invalid ID" });
        return;
    }
    try {
        const user = await userController.getUserById(id);
        if (user) {
            res.status(200).json(user);
        }
    } catch (error: any) {
        if(error.message === 'error-get-user'){
            res.status(404).json({ message: "user-not-found" });
            return;
        } else {
            res.status(500).json({ message: "Internal server error"});
            return;
        }
    }
});
userRouter.post('/sign-up', async (req, res):Promise<void> => {
    const { name, email, password, phone, fsmToken } = req.body;
    if(!name || !email || !password || !phone || !fsmToken){
        res.status(406).json({ message: "required fields" });
        return;
    }
    try {
        const existUser = await userController.getUserByName(name, email, phone);
        if (existUser) {
            res.status(409).json({ error: 'User with provided name, email, or phone already exists' });
            return;
        }
        const resultUser = await userController.createUser({ name, email, password, phone, fsmToken});
   

        res.setHeader("Authorization", `Bearer ${resultUser.token}`);
        res.status(201).json({ message: "User created successfully", data: resultUser.user });
    }  catch (error: any) {
        console.error("Error in sign-up:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
  }
});
userRouter.post('/sign-in', async (req, res):Promise<void> => {
    const { email, password, fsmToken } = req.body;
    if (!email || !password || !fsmToken) {
        res.status(406).json({ message: "required fields" });
        return;
    }
    try {
        const userData = await userController.getUserByUsername(email, password, fsmToken);
        if (userData) {
            res.setHeader("Authorization", `Bearer ${userData.token}`);
            res.status(200).json({ message: "Login successful", data: userData.user });
            return;
        }
    } catch (error: any) {
        if (error.message === 'invalid-credentials') {
            res.status(404).json({ message: "email-password-incorrect" });
            return;
        } else {
            res.status(500).json({ message: "Internal server error", error });
            return;
        }
    }
});
userRouter.put('/update-user', authMiddleware, async (req, res):Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized: user not found" });
            return;
        }
        const userId = req.user.userId as string;
        const { name, email, password, phone } = req.body;
        if (!name && !email && !password && !phone) {
            res.status(400).json({ message: "No fields provided to update" });
            return;
        }
        const updatedUser = await userController.updateUser(userId, { name: name, email: email, password: password, phone: phone });
        res.status(200).json(updatedUser);

    } catch (error) {
        res.status(500).json({ message: "Internal server error", error });
    }
}); 
userRouter.delete('/:id', async (req, res):Promise<void> => {
    const { id } = req.params;
    if(!id){
        res.status(406).json({message: "required fields"})
    }
    try {
        const userDelete = await userController.deleteUser(id)
        if(userDelete){
            res.status(200).json({message: "user delete sucellesfull"})
        }
    } catch (error: any) {
        if (error.message === 'user-not-found') {
            res.status(404).json({ message: "user-not-found" });
            return;
        } else {
            res.status(500).json({ message: "Internal server error", error });
            return;
        }
    }
})

userRouter.post('/validate-token', async (req, res): Promise<void> => {
  try {
    const { userId } = verifyToken(req);
    const user = await userController.getUserById(userId);
    if (user) {
      res.status(200).json({ message: 'token-valid' });
    }
  } catch (error: any) {
    console.error('Error validating token:', error);
    if (error.message === 'no-token') {
      res.status(401).json({ message: 'no-token' });
    } else if (error.message === 'invalid-token') {
      res.status(401).json({ message: 'token-expired' });
    } else {
      res.status(500).json({ message: 'internal-error' });
    }
  }
});

userRouter.post('/logout', async (req, res): Promise<void> => {
  try {    
    const token = extractToken(req);
    const payload: any = verifyToken(req);

    let exp = payload.exp;
    if (!exp && token) {
      const decoded: any = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      exp = decoded.exp;
    }
    if(token){
        await addTokenToBlacklist(token, new Date(exp * 1000));
        res.status(200).json({ message: 'logout-successful' });
        return
    }
  } catch (error: any) {
    if (error.message === 'invalid-token') {
        res.status(401).json({ message: 'invalid-token' });
        return;
    }
    console.error('Logout error:', error);
    res.status(500).json({ message: 'internal-error' });
    return;
  }
});

userRouter.post('/forgot', async (req, res): Promise<void> => {
  const { email } = req.body;
    if (!email) {
        res.status(406).json({ message: "required fields" });
        return;
    }
    try {
        const user = await userController.getUserByEmail(email);
        if(user){
            await userController.requestPasswordReset(user._id as mongoose.Types.ObjectId, user.email);
            res.status(200).json({ message: "continue-reset", validation: true});
        }
    }
    catch (error: any) {
        if (error.message === 'error-get-user') {
            res.status(404).json({ message: "user-not-found" });
            return;
        } else {
            console.error("Error in forgot password:", error);
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    }
});

userRouter.post('/verify-code', async (req, res): Promise<void> => {
  const { codeVerification } = req.body;
  if (!codeVerification) {
    res.status(406).json({ message: "required fields" });
    return;
  }
  try {
    const isValid = await userController.verifyResetCode(codeVerification);
    if (isValid) {
      res.status(200).json({ message: "code-valid", validation: true });
    }
  } catch (error: any) {
    if (error.message === 'invalid-code') {
      res.status(400).json({ message: "invalid-code" });
    } else {
      console.error("Error in verify code:", error);
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  }
});

userRouter.post('/reset-password', async (req, res): Promise<void> => {
    const { codeVerification, newPassword } = req.body;
    if (!codeVerification || !newPassword) {
        res.status(406).json({ message: "required fields" });
        return;
    } 
    try {
        const resetInfo = await userController.verifyResetCode(codeVerification);
        if(resetInfo){
            await userController.updateUser(resetInfo.userId, { password: newPassword });
            res.status(200).json({ message: "password-reset-success" });
        }
    } catch (error: any) {
        if (error.message === 'user-not-found') {
            res.status(404).json({ message: "user-not-found" });
        } else if (error.message === 'invalid-code') {
            res.status(400).json({ message: "invalid-code" });
        } else {
            console.error("Error in reset password:", error);
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    }
}); 


userRouter.post('/admin/login', async (req, res): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(406).json({ message: "required fields" });
        return;
    }
    try {
        const userData = await userController.getUserByUsername(email, password, "");
        if (userData) {
            res.setHeader("Authorization", `Bearer ${userData.token}`);
            res.status(200).json({ message: "Login successful", data: userData.user });
            return;
        }
    } catch (error: any) {
        if (error.message === 'invalid-credentials') {
            res.status(404).json({ message: "email-password-incorrect" });
            return;
        } else {    
            res.status(500).json({ message: "Internal server error", error });
            return;
        }
    }
});


userRouter.post('/admin/sendNotificationToUser', async (req, res): Promise<void> => {
    const { userId, title, body, customData } = req.body;

    if (!userId || !title || !body) {
        res.status(400).json({ message: 'Faltan userId, title o body.' });
        return;
    }

    try {
        const user = await userController.getUserById(userId);

        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            res.status(404).json({ message: 'Usuario no encontrado o sin tokens FCM.' });
            return;
        }

        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: customData || {}, // Datos personalizados opcionales
            tokens: user.fcmTokens, // Envía a todos los tokens de este usuario
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('Notificación enviada a usuario:', response);

        // Opcional: Procesar resultados para limpiar tokens inválidos
        // response.responses.forEach((resp, idx) => {
        //     if (!resp.success && resp.error && resp.error.code === 'messaging/registration-token-not-registered') {
        //         // Token inválido, deberías eliminar user.fcmTokens[idx] de la base de datos
        //         console.log(`Token inválido: ${user.fcmTokens[idx]} para usuario ${user.email}`);
        //     }
        // });

        res.status(200).json({ message: 'Notificación enviada al usuario.', firebaseResponse: response });

    } catch (error: any) {
        console.error('Error al enviar notificación a usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al enviar notificación a usuario.', error: error.message });
    }
});

userRouter.post('/admin/sendNotificationToAll', async (req, res): Promise<void> => {
    const { title, body, customData } = req.body;

    if (!title || !body) {
        res.status(400).json({ message: 'Faltan title o body.' });
        return;
    }

    try {
        const allUsers = await User.find({}, 'fcmTokens').exec();
        let allTokens: any[] = [];
        allUsers.forEach(user => {
            allTokens = allTokens.concat(user.fcmTokens || []);
        });

        // Eliminar duplicados si es necesario (aunque tu lógica de registro debería manejarlos)
        allTokens = [...new Set(allTokens)];

        if (allTokens.length === 0) {
            res.status(404).json({ message: 'No hay tokens FCM registrados en la base de datos.' });
            return;
        }

        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: customData || {}, // Datos personalizados opcionales
            tokens: allTokens, // Envía a todos los tokens únicos
        };

        const response = await admin.messaging().sendEachForMulticast(message); // Envía a múltiples tokens
        console.log('Notificación enviada a todos:', response);

        res.status(200).json({ message: 'Notificación enviada a todos los usuarios.', firebaseResponse: response });

    } catch (error) {
        console.error('Error al enviar notificación a todos:', error);
        res.status(500).json({ message: 'Error interno del servidor al enviar notificación a todos.'});
    }
});





export default userRouter;