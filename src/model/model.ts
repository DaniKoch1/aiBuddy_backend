export type Conversation = {
    question: string;
    followUp?: FollowUp;
    responses: AIResponse[];
}

export type AIResponse = {
  answer: string;
  reasoning: string;
  showReasoning: Boolean;
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