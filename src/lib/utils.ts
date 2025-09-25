import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { Types } from "mongoose";
import { IMessage, MessageRole } from "./schema";

export function convertToLangchainMessages(messages: IMessage[]) {
  const langchainMessages: BaseMessage[] = [];

  for (const message of messages) {
    if (message.role === MessageRole.USER) {
      langchainMessages.push(new HumanMessage(message.content));
    } else if (message.role === MessageRole.ASSISTANT) {
      langchainMessages.push(new AIMessage(message.content));
    } else if (message.role === MessageRole.SYSTEM) {
      langchainMessages.push(new SystemMessage(message.content));
    } else if (message.role === MessageRole.TOOL) {
      langchainMessages.push(
        new ToolMessage({
          content: message.content,
          tool_call_id: message.toolCallId!,
        })
      );
    }
  }

  return langchainMessages;
}

export const convertToNormalMessages = (
  messages: BaseMessage[],
  sessionId: string
) => {
  const normalMessages: IMessage[] = [];
  for (const message of messages) {
    if (message instanceof HumanMessage) {
      normalMessages.push({
        content: message.content as string,
        role: MessageRole.USER,
        session: new Types.ObjectId(sessionId),
        createdAt: new Date(),
      });
    }
    if (message instanceof AIMessage) {
      normalMessages.push({
        content: message.content as string,
        role: MessageRole.ASSISTANT,
        session: new Types.ObjectId(sessionId),
        createdAt: new Date(),
      });
    }
    if (message instanceof SystemMessage) {
      normalMessages.push({
        content: message.content as string,
        role: MessageRole.SYSTEM,
        session: new Types.ObjectId(sessionId),
        createdAt: new Date(),
      });
    }
    if (message instanceof ToolMessage) {
      normalMessages.push({
        content: message.content as string,
        role: MessageRole.TOOL,
        toolCallId: message.tool_call_id,
        session: new Types.ObjectId(sessionId),
        createdAt: new Date(),
      });
    }
  }
  return normalMessages;
};
