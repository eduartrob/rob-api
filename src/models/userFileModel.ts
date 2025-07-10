import mongoose from "mongoose";

export interface IUserFile extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  key: string;
  url: string;
  contentType: string;
  uploadedAt: Date;
  
}

const userFileSchema = new mongoose.Schema<IUserFile>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  key: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

export const UserFile = mongoose.model<IUserFile>("UserFile", userFileSchema);

