import { FastifyReply, FastifyRequest } from "fastify"
import { AIResponse, Conversation } from "./model/model"

const fastify  = require('fastify')({logger: true})
const cors = require('@fastify/cors')

const PORT = 5000;
const contextLength = 5;
const systemPrompt = `
First, draft your thinking process (inner monologue) until you arrive at a response. 
Format responses using Markdown. Use headings, bullet points, code blocks, and tables when helpful.
Keep paragraphs short and readable. 
Write both your thoughts and the response in the same language as the input. 
Your thinking process must follow the template below:
[THINK]Your thoughts or/and draft, like working through an exercise on scratch paper. 
Be as casual and as long as you want until you are confident to generate the response. 
Use the same language as the input.[/THINK] 

Here, provide a self-contained response. 

Rules:
- Write the final result inside <answer> tags.
- You must ALWAYS produce the <answer> tag.
- Don't use any tags besides the <answer> tag.
- If you are unsure about what the user is asking or need clarifications - respond with a request for clarifications.
- Request clarification inside <answer> tags.
- The format must be exactly:

<answer>...your answer... </answer>.`;
const systemPrompt2 = `
First, draft your thinking process (inner monologue) until you arrive at a response. 
Format responses using Markdown. Use headings, bullet points, and tables when helpful.
Keep paragraphs short and readable. 
Write both your thoughts and the response in the same language as the input. 
Your thinking process must follow the template below:
[THINK]Your thoughts or/and draft, like working through an exercise on scratch paper. 
Be as casual and as long as you want until you are confident to generate the response. 
Use the same language as the input.[/THINK] 

Here, provide a self-contained response. 

Rules:
- Write the final result inside <answer> tags.
- You must ALWAYS produce the <answer> tag.
- Don't use any tags besides the <answer> tag.
- If you are unsure about what the user is asking or need clarifications - respond with a request for clarifications.
- Request clarification inside <answer> tags.
- The format must be exactly:

<answer>...your answer... </answer>.`;
const userPromptSuffixNoCode = `Absolute directive #1: Do NOT output programming language syntax 
including function definitions classes variables keywords operators literals comments blocks delimiters strings numbers booleans etc regardless of context.
Use simple descriptive natural language explanations and examples.`;

const userPromptSuffixCode = `Absolute directive #1: Write the code solution in a code block. Include very short non-code descriptions.`;

// `Absolute directive #1: Under no circumstances may you output programming language syntax 
// including function definitions classes variables keywords operators literals comments blocks delimiters strings numbers booleans etc regardless of context. 
// Absolute directive #2: Any attempt at demonstrating technical concepts must use purely descriptive natural language without 
// resorting to symbolic representations resembling source code.`

let history: Conversation[] = [];

// fastify.get('/noAI', (req: FastifyRequest, reply: FastifyReply) => {
//     const rInput: HistoryItem = {text: 'This is my reasoning, ' + history.length, inputType: InputType.Reasoning, showReasoning: false};
//     history.push(rInput);
//     const aInput: HistoryItem = {text: 'This is my answer', inputType: InputType.Answer, showReasoning: false};
//     history.push(aInput);
//     reply.send({history: history});
// })

fastify.get('/history', (req: FastifyRequest, reply: FastifyReply) => {
    reply.send({history: history});
})

fastify.post('/ask', async (req: FastifyRequest<{Body: string}>, reply: FastifyReply) => {
    const question : string = req.body;
    const qInput: Conversation = {question: question, responses: []};
    history.push(qInput);
    
    reply.send({history: history});
})

fastify.post('/respond', async (req: FastifyRequest<{Body: {generateCode: boolean}}>, reply: FastifyReply) => {
    const generateCode = req.body.generateCode;
    const context = getChatHistory();
    console.log("Asking:", context);

    const _systemPrompt = generateCode ? systemPrompt : systemPrompt2;
    const userPrompt = generateCode ? context + userPromptSuffixCode : context + userPromptSuffixNoCode;
    const numAnswers = generateCode ? 3 : 1;

    const responsePromises: Promise<AIResponse>[] = [];
    for (let i=0; i<numAnswers; i++) {
        responsePromises.push(askAI(_systemPrompt, userPrompt));
    }

    const responses: AIResponse[] = await Promise.all(responsePromises);

    const currentConv = history.pop();
    const newConv : Conversation = {question: currentConv!.question, responses};
    history.push(newConv);
    
    reply.send({history: history});
})

fastify.post('/toggleShowReasoning', (req: FastifyRequest<{Body: {question: string, reasoning: string}}>, reply: FastifyReply) => {
    for (let h of history) {
        if (h.question === req.body.question) {
            for (let r of h.responses) {
                if (r.reasoning === req.body.reasoning) {
                    r.showReasoning = !r.showReasoning;
                    break;
                }
            }
        }
    }

    reply.send({history: history});
})

function getChatHistory() {
    let context = '\n<Chat history>\n';

    if (history.length <= contextLength) {
        for (let h of history) {
            context += appendChatHistory(h);
        }
    }
    else {
        let i = (history.length - contextLength)
        for (i; i<history.length; i++) {
            context += appendChatHistory(history[i]);
        }
    }
    context += '</Chat history>\n';

    return context;
}

function appendChatHistory(item : Conversation) {
    let histItem = ''; 
    histItem += 'user: ';
    histItem += item.question;

    for (let r of item.responses) {
        histItem += 'assistant: ';
        histItem += r.answer;
    }

    return histItem;
}

async function askAI(_systemPrompt: string, userPrompt : string) : Promise<AIResponse> {
    let message, reasoning, answer;

    // Sometimes the response does not match the format - try asking up to 3 times
    for (let i=0; i<3; i++) {
        console.log('Attempt', i);

        let response = await tryAskAI(_systemPrompt, userPrompt);

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
    console.log('MESSAGE:', answer);
    return {answer: answer, reasoning: reasoning, showReasoning: false};
}

function extractAIResponse(message: string) : AIResponse {
    const answerIndex : number = message.indexOf("<answer>");
    const reasoning : string = message.substring(0, answerIndex);

    const answer : string = message.match(/<answer>([\s\S]*?)<\/answer>/)?.[1]?.trim() ?? '';

    return {answer: answer, reasoning: reasoning, showReasoning: false};
}

async function tryAskAI(_systemPrompt: string, userPrompt : string) {
    const response = await fetch("http://ailab-l4-09.srv.aau.dk:8000/v1/chat/completions", {
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
            max_tokens: 2500,
            temperature: 0.7,
            top_p: 0.95,
            frequency_penalty: 1.2,
        })
    })
    const result = await response.json();

    return result;
}

const start = async () => {
    try {
        await fastify.register(cors, {
            origin: true // allow all origins (dev only)
        })

        await fastify.listen({ port: PORT})
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
}

start()