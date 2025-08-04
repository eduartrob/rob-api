import * as authService from '../services/authService'
import { UserDocument, User } from '../models/userModel'
import { createVerificationCode, validateVerificationCode } from '../services/verificationService'
import { sendResetCodeEmail } from '../services/emailService'
import mongoose from 'mongoose';

export class UserController {
    async getUsers() {
        return await User.find().exec();    
    }
    async getUserById(id: string): Promise<UserDocument | null> {
        const user = await User.findById(id).exec();
        if (!user) {
            throw new Error('error-get-user');
        }
        return user;
    }
    async getUserByName(name: string, email: string, phone: string): Promise<UserDocument | null> {
        const user = await User.findOne({ name, email, phone }).exec();
        if (user) {
            throw new Error('get-user');
        }
        return user;
    }
    async getUserByUsername(email: string, password: string, fsmToken: string): Promise<{ token: string; user: { name: string; email: string; phone: string; region?: string} }> {
        const user = await User.findOne({ email }).exec();

        if (!user || !(await authService.comparePassword(password, user.password))) {
            throw new Error('invalid-credentials');
        }
        const token = authService.generateToken({ id: user._id, email: user.email });
        const userData = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            region: user.region, // Incluye la región si existe
        };
        console.log(`User ${user.name} signed in with FCM Token: ${fsmToken}`);
        if(token){
            await this.updateUserFcmToken(user?.id, fsmToken);
        }

        return { token, user: userData };
}
    async getUserByEmail(email: string): Promise<UserDocument | null> {
        const user = await User.findOne({ email }).exec();
        if (!user) {
            throw new Error('error-get-user');
        }
        return user;
    }








    async createUser(data:{name: string, email: string, password: string, phone: string, fsmToken: string}): Promise<{ user: { name: string; email: string; phone: string; region?: string; }, token: string }> {
        const hashPassword = await authService.hashPassword(data.password);
        const newUser = new User({ ...data, password: hashPassword });
        const savedUser = await newUser.save();
        const token = authService.generateToken({ id: savedUser._id, email: savedUser.email });
        const userData = {
            name: savedUser.name,
            email: savedUser.email,
            phone: savedUser.phone,
            region: savedUser.region,
        };
        if(token){
            await this.updateUserFcmToken(savedUser.id, data.fsmToken);
        }
        return { 
            user: userData, 
            token: token 
        };
    }

    async updateUser(id: string, data: { name?: string, email?: string, password?: string, phone?: string }): Promise<UserDocument | null> {
        const updateData: { name?: string, email?: string, password?: string, phone?: string } = { ...data };
        if (updateData.password) {
            const hashedPassword = await authService.hashPassword(updateData.password);
            updateData.password = hashedPassword;
        }
        const user = await User.findByIdAndUpdate(id, updateData, { new: true }).exec();
        if (!user) {
            throw new Error('error-get-user');
        }
        return user;
    }


    async deleteUser(id: string): Promise<{ message: string }> {
        const user = await User.findById(id).exec();
        if (!user) {
            throw new Error('user-not-found');
        }
        await User.findByIdAndDelete(id).exec();
        return { message: 'User deleted successfully' };
    }










    async requestPasswordReset(userId: mongoose.Types.ObjectId, email: string): Promise<number> {
        const code = await createVerificationCode(userId);
        await sendResetCodeEmail(email, code.toString());
        return code;
    }
    async verifyResetCode(codeVerification: number): Promise<{ userId: string }> {
        const result = await validateVerificationCode(codeVerification);
        console.log("Verification result:", result);
        if (!result) {
            throw new Error('invalid-code');
        }

        return { userId: result.userId.toString() };
    }





    async updateUserFcmToken(userId: string, fcmToken: string) {
        console.log(`Updating FCM Token for user ${userId}: ${fcmToken}`);
        await User.updateMany(
            {
                _id: { $ne: userId }, // No actualizar al usuario actual
                fcmTokens: fcmToken   // Buscar documentos que contengan este token en el array
            },
            {
                $pull: { fcmTokens: fcmToken } // Eliminar el token del array
            }
        ).exec();
        console.log(`FCM Token ${fcmToken} eliminado de otros usuarios (si existía).`);

        // PASO 2: Agregar el fcmToken al usuario actual (si no está ya presente).
        const user = await User.findById(userId);

        if (!user) {
            console.warn(`Usuario con ID ${userId} no encontrado para actualizar FCM Token.`);
            return;
        }

        if (!user.fcmTokens.includes(fcmToken)) {
            user.fcmTokens.push(fcmToken);
            await user.save();
            console.log(`FCM Token ${fcmToken} añadido/actualizado para el usuario ${userId}`);
        } else {
            console.log(`FCM Token ${fcmToken} ya existía para el usuario ${userId}.`);
        }
   
    }
}