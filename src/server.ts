import { FastifyReply, FastifyRequest } from "fastify"
import { AnswerAndReasoning, HistoryItem, InputType } from "./model/model"

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

// `Absolute directive #1: Under no circumstances may you output programming language syntax 
// including function definitions classes variables keywords operators literals comments blocks delimiters strings numbers booleans etc regardless of context. 
// Absolute directive #2: Any attempt at demonstrating technical concepts must use purely descriptive natural language without 
// resorting to symbolic representations resembling source code.`

let history: HistoryItem[] = [];

fastify.get('/noAI', (req: FastifyRequest, reply: FastifyReply) => {
    const rInput: HistoryItem = {text: 'This is my reasoning, ' + history.length, inputType: InputType.Reasoning, showReasoning: false};
    history.push(rInput);
    const aInput: HistoryItem = {text: 'This is my answer', inputType: InputType.Answer, showReasoning: false};
    history.push(aInput);
    reply.send({history: history});
})

fastify.get('/history', (req: FastifyRequest, reply: FastifyReply) => {
    reply.send({history: history});
})

fastify.post('/ask', async (req: FastifyRequest<{Body: string}>, reply: FastifyReply) => {
    const question : string = req.body;
    const qInput: HistoryItem = {text: question, inputType: InputType.Question, showReasoning: false};
    history.push(qInput);
    
    reply.send({history: history});
})

fastify.post('/respond', async (req: FastifyRequest<{Body: {generateCode: boolean}}>, reply: FastifyReply) => {
    const generateCode = req.body.generateCode;
    const context = getChatHistory();
    console.log("Asking:", context);

    const _systemPrompt = generateCode ? systemPrompt : systemPrompt2;
    const userPrompt = generateCode ? context : context + userPromptSuffixNoCode;
    const numAnswers = generateCode ? 3 : 1;

    const responsePromises: Promise<AnswerAndReasoning>[] = [];
    for (let i=0; i<numAnswers; i++) {
        responsePromises.push(askAI(_systemPrompt, userPrompt));
    }

    const responses: AnswerAndReasoning[] = await Promise.all(responsePromises);

    for (const response of responses) {
        const rInput: HistoryItem = {text: response.reasoning, inputType: InputType.Reasoning, showReasoning: false};
        history.push(rInput);
        const aInput: HistoryItem = {text: response.answer, inputType: InputType.Answer, showReasoning: false};
        history.push(aInput);
    }
    
    reply.send({history: history});
})

fastify.post('/toggleShowReasoning', (req: FastifyRequest<{Body: string}>, reply: FastifyReply) => {
    const itemText : string = req.body;

    for (let h of history) {
        if (h.inputType === InputType.Reasoning && h.text === itemText) {
            h.showReasoning = !h.showReasoning;
            break;
        }
    }

    reply.send({history: history});
})

function getChatHistory() {
    let context = '\n<Chat history>\n';
    const histTypes = Object.keys(InputType).length / 2;

    if (history.length <= (histTypes * contextLength)) {
        for (let h of history) {
            context += appendChatHistory(h);
        }
    }
    else {
        let i = (history.length - (histTypes * contextLength))
        for (i; i<history.length; i++) {
            context += appendChatHistory(history[i]);
        }
    }
    context += '</Chat history>\n';

    return context;
}

function appendChatHistory(item : HistoryItem) {
    let histItem = ''; 
    switch (item.inputType) {
        case InputType.Question:
            histItem += 'user: ';
            break;
        case InputType.Answer:
            histItem += 'assistant: ';
            break;
        default:
            return histItem;
    }
    histItem += item.text + '\n';

    return histItem;
}

async function askAI(_systemPrompt: string, userPrompt : string) : Promise<AnswerAndReasoning> {
    let message, reasoning, answer;

    // Sometimes the response does not match the format - try asking up to 3 times
    for (let i=0; i<3; i++) {
        console.log('Attempt', i);

        let response = await tryAskAI(_systemPrompt, userPrompt);

        message = response?.choices[0]?.message;

        const answerAndReasoning : AnswerAndReasoning = extractAnswerAndReasoning(message.content);
        answer = answerAndReasoning.answer;
        reasoning = answerAndReasoning.reasoning;

        if (answer) {
            return {answer, reasoning};
        }
    }
    reasoning = 'Apologies for my incompetence. I should have separated the answer in <answer> tags, but failed. You should be able to find the tags yourself.';
    answer = message.content;
    console.log('MESSAGE:', answer);
    return {answer, reasoning};
}

function extractAnswerAndReasoning(message: string) : AnswerAndReasoning {
    const answerIndex : number = message.indexOf("<answer>");
    const reasoning : string = message.substring(0, answerIndex);

    const answer : string = message.match(/<answer>([\s\S]*?)<\/answer>/)?.[1]?.trim() ?? '';

    return {answer: answer, reasoning: reasoning};
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