import { AIResponse } from "../model/model"
import { LLM_URL } from "../server";

export async function generateQuestionAnswer(_systemPrompt: string, userPrompt : string) : Promise<string> {
    const response = await tryAskAI(_systemPrompt, userPrompt, 0.7);

    const message = response?.choices[0]?.message;

    return message.content;
}

export async function askAI(_systemPrompt: string, userPrompt : string, temperature: number, isCorrect: boolean) : Promise<AIResponse> {
    let message;

    // Sometimes the response does not match the format - try asking up to 3 times
    for (let i=0; i<3; i++) {
        console.log('Attempt', i);

        const response = await tryAskAI(_systemPrompt, userPrompt, temperature);

        message = response?.choices[0]?.message;

        const answerAndReasoning : {answer: string, reasoning: string} = extractAIResponse(message.content);

        if (answerAndReasoning.answer) {
            return {answer: answerAndReasoning.answer, reasoning: answerAndReasoning.reasoning, showReasoning: false, isCorrect: isCorrect};
        }
    }
    const reasoning = 'Apologies for my incompetence. I should have separated the answer in <answer> tags, but failed. You should be able to find the tags yourself.';
    const answer = message.content;
    return {answer: answer, reasoning: reasoning, showReasoning: false, isCorrect: isCorrect};
}

function extractAIResponse(message: string) : {answer: string, reasoning: string} {
    const answerIndex : number = message.indexOf("<answer>");
    const reasoning : string = message.substring(0, answerIndex);

    const answer : string = message.match(/<answer>([\s\S]*?)<\/answer>/)?.[1]?.trim() ?? '';

    return {answer: answer, reasoning: reasoning};
}

async function tryAskAI(_systemPrompt: string, userPrompt : string, temperature: number) {
    const response = await fetch(LLM_URL + ":8000/v1/chat/completions", {
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
            temperature: temperature,
            top_p: 0.95,
        })
    })
    const result = await response.json();

    return result;
}