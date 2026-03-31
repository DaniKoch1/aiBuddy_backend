import { AIResponse, Conversation } from "../model/model"

let chatHistory: Conversation[] = [];
const contextLength = 5;

export function getChatHistory() : Conversation[] {
    return chatHistory;
}

export function addChatToHistory(con : Conversation) : void {
    chatHistory.push(con);
}

export function getChatContext() {
    let context = '\n<Chat history>\n';

    if (chatHistory.length <= contextLength) {
        for (let h of chatHistory) {
            context += appendChatContext(h);
        }
    }
    else {
        let i = (chatHistory.length - contextLength)
        for (i; i<chatHistory.length; i++) {
            context += appendChatContext(chatHistory[i]);
        }
    }
    context += '</Chat history>\n';

    return context;
}

function appendChatContext(item : Conversation) {
    let histItem = ''; 
    histItem += 'user: ';
    histItem += item.question + '\n';

    for (let r of item.responses) {
        histItem += 'assistant: ';
        histItem += r.answer + '\n';
    }

    return histItem;
}

export async function generateQuestionAnswer(_systemPrompt: string, userPrompt : string) : Promise<string> {
    const response = await tryAskAI(_systemPrompt, userPrompt);

    const message = response?.choices[0]?.message;

    return message.content;
}

export async function askAI(_systemPrompt: string, userPrompt : string) : Promise<AIResponse> {
    let message, reasoning, answer;

    // Sometimes the response does not match the format - try asking up to 3 times
    for (let i=0; i<3; i++) {
        console.log('Attempt', i);

        const response = await tryAskAI(_systemPrompt, userPrompt);

        message = response?.choices[0]?.message;

        const answerAndReasoning : AIResponse = extractAIResponse(message.content);
        answer = answerAndReasoning.answer;
        reasoning = answerAndReasoning.reasoning;

        if (answer) {
            return {answer: answer, reasoning: reasoning, showReasoning: false};
        }
    }
    reasoning = 'Apologies for my incompetence. I should have separated the answer in <answer> tags, but failed. You should be able to find the tags yourself.';
    answer = message.content;
    return {answer: answer, reasoning: reasoning, showReasoning: false};
}

function extractAIResponse(message: string) : AIResponse {
    const answerIndex : number = message.indexOf("<answer>");
    const reasoning : string = message.substring(0, answerIndex);

    const answer : string = message.match(/<answer>([\s\S]*?)<\/answer>/)?.[1]?.trim() ?? '';

    return {answer: answer, reasoning: reasoning, showReasoning: false};
}

async function tryAskAI(_systemPrompt: string, userPrompt : string) {
    const response = await fetch("http://ailab-l4-11.srv.aau.dk:8000/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "mistralai/Magistral-Small-2509",
            messages: [
                {
                    role: "system",
                    content: _systemPrompt
                },
                { role: "user", content: userPrompt }],
            max_tokens: 5000,
            temperature: 0.7,
            top_p: 0.95,
        })
    })
    const result = await response.json();

    return result;
}