import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { IInterrupt, StateAnnotation } from "./agent";
import { interrupt } from "@langchain/langgraph";
export const step1 = async (state: typeof StateAnnotation.State) => {
  console.log("step1 executed");
  return {};
};

export const step2 = async (state: typeof StateAnnotation.State) => {
  console.log("step2 executed");
  return {};
};

export const step3 = async (state: typeof StateAnnotation.State) => {
  console.log("step3 executed");
  return {};
};

export const refundNode = async (state: typeof StateAnnotation.State) => {
  console.log("refundNode executed");
  const userAnswer: string = interrupt<IInterrupt>({
    type: "refund",
    message: "Do you really want to refund order?",
  });
  let message;
  if (userAnswer.toLocaleLowerCase() === "yes") {
    message = new AIMessage("Order is successfully refunded");
  } else {
    message = new AIMessage("Order is not refunded");
  }
  console.log("userAnswer - ", userAnswer);
  return {};
};

export const step4 = async (state: typeof StateAnnotation.State) => {
  console.log("step4 executed");
  return {};
};

export const feedbackNode = async (state: typeof StateAnnotation.State) => {
  const userAnswer: string = interrupt<IInterrupt>({
    type: "feedback",
    message: "Please provide your feedback",
  });
  return {
    messages: [new AIMessage(`We got user feedback: ${userAnswer}`)],
    gotFeedback: true,
  };
};

export const step5 = async (state: typeof StateAnnotation.State) => {
  console.log("step5 executed");
  return {};
};
