import { BaseMessage } from "@langchain/core/messages";
import {
  Annotation,
  END,
  MemorySaver,
  messagesStateReducer,
  START,
  StateGraph,
} from "@langchain/langgraph";
import {
  step1,
  refundNode,
  step3,
  step4,
  step2,
  feedbackNode,
  step5,
} from "./nodes";

export interface IInterrupt {
  type: "refund" | "feedback";
  message: string;
}

export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  gotFeedback: Annotation<boolean>,
});

const shouldGetFeedback = (state: typeof StateAnnotation.State) => {
  if (state.gotFeedback) {
    return END;
  } else {
    return "refund";
  }
};

export const createGraph = () => {
  const workflow = new StateGraph(StateAnnotation)
    .addNode("step1", step1)
    .addNode("step2", step2)
    .addNode("step3", step3)
    .addNode("step4", step4)
    .addNode("refund", refundNode)
    .addNode("feedback", feedbackNode)
    .addNode("step5", step5)
    .addEdge(START, "step1")
    .addEdge("step1", "step2")
    .addEdge("step2", "step3")
    .addConditionalEdges("step3", shouldGetFeedback)
    .addEdge("refund", "step4")
    .addEdge("step4", "feedback")
    .addEdge("feedback", "step5")
    .addEdge("step5", END);

  const graph = workflow.compile({
    checkpointer: new MemorySaver(),
  });

  return graph;
};
