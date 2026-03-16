export type Conversation = {
    question: string;
    responses: AIResponse[];
}

export type AIResponse = {
  answer: string;
  reasoning: string;
  showReasoning: Boolean;
};