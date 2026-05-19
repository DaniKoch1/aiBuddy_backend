import { AIResponse, FollowUp } from "../model/model"
import { codeReviewFeedback, codeReviewQuestion1, codeReviewQuestion2, magistralPrompt, socraticFeedback, socraticQuestion1, socraticQuestion2 } from "../model/prompts";
import { LLM_URL } from "../server";

export async function continueFollowUp(userInput : string, followUp : FollowUp, isReview : boolean) : Promise<FollowUp> {
    let newFollowUp = followUp;
    if (!newFollowUp.lowQuestion) {
        const systemPrompt : string = isReview ? codeReviewQuestion1 : socraticQuestion1;
        const userPromt  : string = userInput;

        const lowQuestion : string = await askAIWithoutReasoning(systemPrompt, userPromt);

        newFollowUp.lowQuestion = lowQuestion;
    }
    else if (newFollowUp.lowAnswer && !newFollowUp.highQuestion) {
        const systemPrompt : string = isReview ? codeReviewQuestion2 : socraticQuestion2;
        const userPromt  : string = userInput + '\nAssistant: ' + newFollowUp.lowQuestion + '\nUser: ' + newFollowUp.lowAnswer;
        
        const highQuestion : string = await askAIWithoutReasoning(systemPrompt, userPromt);

        newFollowUp.highQuestion = highQuestion;
    }
    else if (newFollowUp.highAnswer) {
        const systemPrompt : string = isReview ? codeReviewFeedback : socraticFeedback;
        const userPromt  : string = userInput + '\nAssistant: ' + newFollowUp.lowQuestion + '\nUser: ' + newFollowUp.lowAnswer + '\nAssistant: ' + newFollowUp.highQuestion + '\nUser: ' + newFollowUp.highAnswer;
        
        const finalFeedback : string = await askAIWithoutReasoning(systemPrompt, userPromt);
        
        newFollowUp.feedback = finalFeedback;
    }
    
    return newFollowUp;
}

async function askAIWithoutReasoning(systemPrompt: string, userPrompt : string) : Promise<string> {
    const temperature = 0.7; //use the recommended value

    const response = await askAI(systemPrompt, userPrompt, temperature);

    const message = response?.choices[0]?.message;

    return message.content;
}

export async function askAIWithReasoning(userPrompt : string, temperature: number, isCorrect?: boolean) : Promise<AIResponse> {
    let message;
    const systemPrompt : string = magistralPrompt;
    const maxRetries : number = 3;

    for (let i = 0; i < maxRetries; i++) {
        const response = await askAI(systemPrompt, userPrompt, temperature);

        message = response?.choices[0]?.message;

        const answerAndReasoning : { answer: string, reasoning: string } = extractAnswerAndReasoning(message.content);

        if (answerAndReasoning.answer) {
            const aiResponse : AIResponse = { answer: answerAndReasoning.answer, reasoning: answerAndReasoning.reasoning, showReasoning: false, isCorrect };
            return aiResponse;
        }
    }
    const reasoning = 'Apologies for my incompetence. I should have separated the answer in <answer> tags, but failed. You should be able to find the tags yourself.';
    const answer = message.content;
    const aiResponse : AIResponse = { answer: answer, reasoning: reasoning, showReasoning: false, isCorrect };

    return aiResponse;
}

function extractAnswerAndReasoning(message: string) : {answer: string, reasoning: string} {
    const answerIndex : number = message.lastIndexOf("<answer>");
    const reasoning : string = message.substring(0, answerIndex);
    
    let answer : string = message.substring(answerIndex);
    answer = answer.match(/<answer>([\s\S]*?)<\/answer>/)?.[1]?.trim() ?? '';

    return { answer: answer, reasoning: reasoning };
}

async function askAI(systemPrompt: string, userPrompt : string, temperature: number) {
    try {
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
                        content: systemPrompt
                    },
                    { role: "user", content: userPrompt }],
                max_tokens: 5000,
                temperature: temperature,
                top_p: 0.95,
            })
        });
        
        if (!response.ok) 
            throw new Error(`API request failed: ${response.status}`);

        return await response.json();
    } catch (error) {
        throw error;
    }
}