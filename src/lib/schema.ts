import mongoose, {
  Schema,
  model,
  InferSchemaType,
  Document,
  Types,
} from "mongoose";

export enum MessageRole {
  USER = "user",
  ASSISTANT = "assistant",
  SYSTEM = "system",
  TOOL = "tool",
}

export interface ISession extends Document {
  createdAt: Date;
}
export interface IMessage {
  session: Types.ObjectId;
  content: string;
  role: MessageRole;
  toolCallId?: string;
  createdAt: Date;
}

const SessionSchema: Schema<ISession> = new Schema({
  createdAt: { type: Date, required: true },
});

const MessageSchema: Schema<IMessage & Document> = new Schema({
  content: { type: String, required: true },
  role: { type: String, required: true },
  toolCallId: { type: String, required: false, default: null },
  createdAt: { type: Date, required: true },
  session: { type: Schema.Types.ObjectId, ref: "Session", required: true },
});

export const Message = model("Message", MessageSchema);
export const Session = mongoose.model<ISession>("Session", SessionSchema);
