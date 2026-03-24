import { FastifyReply, FastifyRequest, FastifyPluginAsync } from "fastify"
import { AIResponse, Conversation } from "../model/model"
import { getChatHistory, getChatContext, askAI, addChatToHistory } from "../controller/chatController"
import { magistralPrompt, systemPromptNoCode, userPromptSuffixCode, userPromptSuffixNoCode, userPrompts } from "../model/prompts"
import { toggleShowReasoning } from "../controller/helper"

export const routes: FastifyPluginAsync = async (fastify, opts) => {
    fastify.get('/chatHistory', (req: FastifyRequest, reply: FastifyReply) => {
        reply.send({chatHistory: getChatHistory()});
    })

    fastify.post('/ask', async (req: FastifyRequest<{Body: string}>, reply: FastifyReply) => {
        const question : string = req.body;
        const qInput: Conversation = {question: question, responses: []};
        addChatToHistory(qInput);
        
        reply.send({chatHistory: getChatHistory()});
    })

    fastify.post('/respond', async (req: FastifyRequest<{Body: {generateCode: boolean}}>, reply: FastifyReply) => {
        const generateCode = req.body.generateCode;
        const context = getChatContext();
        console.log("Asking:", context);

        const _systemPrompt = generateCode ? magistralPrompt : systemPromptNoCode;
        let userPrompt = generateCode ? context + userPromptSuffixCode : context + userPromptSuffixNoCode;
        const numAnswers = generateCode ? 3 : 1;

        const responsePromises: Promise<AIResponse>[] = [];
        for (let i=0; i<numAnswers; i++) {
            userPrompt += userPrompts[i];
            responsePromises.push(askAI(_systemPrompt, userPrompt));
        }

        const responses: AIResponse[] = await Promise.all(responsePromises);

        const currentConv = getChatHistory().pop();
        const newConv : Conversation = {question: currentConv!.question, responses};
        getChatHistory().push(newConv);
        
        reply.send({chatHistory: getChatHistory()});
    })

    fastify.post('/toggleShowChatReasoning', (req: FastifyRequest<{Body: {reasoning: string}}>, reply: FastifyReply) => {
        toggleShowReasoning(getChatHistory(), req.body.reasoning);

        reply.send({chatHistory: getChatHistory()});
    })
}