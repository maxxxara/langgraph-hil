import express from "express";
import { IMessage, Message, MessageRole, Session } from "./lib/schema";
import { connectDB } from "./lib/db";
import {
  convertToLangchainMessages,
  convertToNormalMessages,
} from "./lib/utils";
import { createGraph, IInterrupt } from "./agent/agent";
import { Types } from "mongoose";
import { PregelTaskDescription } from "@langchain/langgraph/dist/pregel/types";
import { Command } from "@langchain/langgraph";

const app = express();
const port = 3000;

const clearSession = async (sessionId: string) => {
  await Message.deleteMany({ session: new Types.ObjectId(sessionId) });
};

app.use(express.json());

app.post("/session", (req, res) => {
  const session = new Session({
    createdAt: new Date(),
  });
  session.save();
  res.send(session);
});

app.get("/session/:id", async (req, res) => {
  const messages = await Message.find({ session: req.params.id });
  if (!messages) {
    return [];
  }
  res.send(messages);
});

app.get("/sessions", async (req, res) => {
  const sessions = await Session.find();
  res.send(sessions);
});
const graph = createGraph();

app.post("/:id/message", async (req, res) => {
  const payload = {
    session: req.params.id,
    content: req.body.content,
    role: req.body.role,
    toolCallId: req.body.tool_call_id,
    createdAt: new Date(),
  };
  const message = new Message({
    session: payload.session,
    content: payload.content,
    role: payload.role,
    toolCallId: payload.toolCallId,
    createdAt: payload.createdAt,
  });
  await message.save();

  let messages = await Message.find({ session: payload.session });
  let conversationHistory = convertToLangchainMessages(
    messages as unknown as IMessage[]
  );

  const config = {
    configurable: { thread_id: req.params.id },
    streamMode: "values" as const,
  };

  const beforeGraphState = await graph.getState(config);
  const interrupedNode = beforeGraphState.tasks.find(
    (item: PregelTaskDescription) => item.interrupts.length > 0
  )?.interrupts[0]?.value as IInterrupt;
  let continueValue = null;
  if (interrupedNode) {
    if (interrupedNode.type === "refund") {
      if (
        conversationHistory[conversationHistory.length - 1]?.content === "yes"
      ) {
        continueValue = new Command({
          resume: "yes",
        });
      } else {
        continueValue = new Command({
          resume: "no",
        });
      }
    } else if (interrupedNode.type === "feedback") {
      continueValue = new Command({
        resume: conversationHistory[conversationHistory.length - 1]?.content,
      });
    }
  }

  // before this everything is fine
  // Only pass new messages if graph state already has messages
  const inputMessages =
    beforeGraphState.values?.messages?.length > 0
      ? conversationHistory.slice(beforeGraphState.values.messages.length)
      : conversationHistory;

  for await (const event of await graph.stream(
    continueValue
      ? continueValue
      : {
          messages: inputMessages,
          gotFeedback: beforeGraphState.values?.gotFeedback || false,
        },
    config
  )) {
    // @ts-ignore
    if (event.__interrupt__?.length > 0) {
      // @ts-ignore
      let message = event.__interrupt__[0].value as IInterrupt;
      if (message.type === "refund" || message.type === "feedback") {
        const newMessage = await Message.insertOne({
          session: payload.session,
          content: message.message,
          role: MessageRole.ASSISTANT,
          // type: message.type, // For better ux
          createdAt: new Date(),
        });
        return res.json(newMessage);
      }
    }
  }

  const graphState = (await graph.getState(config)).values;
  if (graphState.messages.length === 0) {
    return res.json([]);
  }

  // Debug logging to understand the flow
  console.log("=== DEBUG INFO ===");
  console.log("conversationHistory.length:", conversationHistory.length);
  console.log(
    "beforeGraphState.values?.messages?.length:",
    beforeGraphState.values?.messages?.length || 0
  );
  console.log("graphState.messages.length:", graphState.messages.length);
  console.log("inputMessages.length:", inputMessages.length);

  // Get only the messages that were added during this graph execution
  // These are the messages that came AFTER what the graph already had
  const previousGraphMessagesLength =
    beforeGraphState.values?.messages?.length || 0;
  const newMessages = convertToNormalMessages(
    graphState.messages.slice(previousGraphMessagesLength),
    payload.session
  );

  console.log("previousGraphMessagesLength:", previousGraphMessagesLength);
  console.log("newMessages.length:", newMessages.length);
  console.log("==================");

  await Message.insertMany(newMessages);
  res.send(newMessages);
});

app.listen(port, async () => {
  await connectDB();
  console.log(`Example app listening on port ${port}`);
});
