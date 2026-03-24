import { AIResponse, Conversation } from "../model/model"

let reviewHistory: Conversation[] = [];

export function getReviewHistory() : Conversation[] {
    return reviewHistory;
}

export function addToReviewHistory(con : Conversation) : void {
    reviewHistory.push(con);
}