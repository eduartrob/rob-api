import mongoose, {Schema, Document} from 'mongoose';

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  region: string;
}

const UserSchema: Schema<UserDocument> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  region: { type: String, required: false, default: 'Desconocido' }
});

export const User = mongoose.model<UserDocument>('User', UserSchema);
