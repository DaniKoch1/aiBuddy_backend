export enum InputType {
    Question = 0,
    Answer,
    Reasoning
}

export type HistoryItem = {text: string, inputType: InputType, showReasoning: Boolean}

export type AnswerAndReasoning = {
  answer: string;
  reasoning: string;
};