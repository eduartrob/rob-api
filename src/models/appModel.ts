import mongoose, {Schema, Document, Double} from "mongoose";

export interface AppDocument extends Document {
    name: string;
    description: string;
    version: string;
    developerId: string;
    releaseDate: Date;
    rate: Double;
}

const AppSchema: Schema<AppDocument> = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    version: { type: String, required: true },
    developerId: { type: String, required: true },
    releaseDate: { type: Date, required: true },
    rate: { type: Schema.Types.Double, required: true, default: 0.0 }
});

export const App = mongoose.model<AppDocument>('App', AppSchema);