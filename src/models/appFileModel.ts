import mongoose, {Schema, Document} from 'mongoose';

export interface IAppFile extends mongoose.Document {
  appId: mongoose.Types.ObjectId;
  iconUrl: string;
  iconKey: string;
  appFileUrl: string;
  appFileKey: string;
  appFileSize: number;
  screenshots: {url: string; key: string}[];
  uploadedAt: Date;
}

const appFileSchema = new mongoose.Schema<IAppFile>({
  appId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "App", 
    unique: true,
  },
  iconUrl: {
    type: String,
    required: true,
  },
  iconKey:{
    type: String,
    requited: true
  },
  appFileUrl: {
    type: String,
    required: true,
  },
  appFileKey:{
    type: String,
    required: true
  },
  appFileSize: {
    type: Number,
    required: true,
  },
  screenshots: [
    {
      url: { type: String, required: true },
      key: { type: String, required: true },
    },
  ],
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

export const AppFile = mongoose.model<IAppFile>("AppFile", appFileSchema);
