import { VerificationCode } from "../models/codeVerification";
import mongoose from "mongoose";
import { publishPasswordResetEvent } from "./eventService";

function generateRandomCode(length = 6): number {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return parseInt(code, 10);
}
export async function createVerificationCode(userId: mongoose.Types.ObjectId, userEmail: string): Promise<number> {
  const code = generateRandomCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

  await VerificationCode.findOneAndDelete({ userId });
  await VerificationCode.create({
    userId,
    code,
    expiresAt,
  });

  // Publicar el evento para que el servicio de notificaciones lo procese
  await publishPasswordResetEvent(userEmail, code.toString());

  return code;
}

export async function validateVerificationCode(code: number): Promise<{ userId: mongoose.Types.ObjectId } | null> {
  const record = await VerificationCode.findOne({ code });

  if (!record || record.expiresAt < new Date()) return null;

  record.used = true;
  await record.save();

  return { userId: record.userId };
}