import { Conversation } from "../model/model";

export function toggleShowReasoning(history: Conversation[], reasoning: string) {
    for (let h of history) {
        for (let r of h.responses) {
            if (r.reasoning === reasoning) {
                r.showReasoning = !r.showReasoning;
                break;
            }
        }
    }
}