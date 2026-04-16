export type Conversation = {
  mode: ChatMode;
  question: string;
  followUp?: FollowUp;
  responses: AIResponse[];
}

export type AIResponse = {
  answer: string;
  reasoning: string;
  showReasoning: boolean;
  isCorrect: boolean;
};

export type FollowUp = {
  lowQuestion?: string;
  lowAnswer?: string;
  highQuestion?: string;
  highAnswer?: string;
  feedback?: string;
}

export enum ChatMode {
  Understand = "Understand",
  Code = "Code",
  CodeReview = "Code Review"
}