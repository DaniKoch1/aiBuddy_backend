import { FastifyReply, FastifyRequest, FastifyPluginAsync } from "fastify"
import { AIResponse, Conversation, FollowUp } from "../model/model"
import { getChatHistory, getChatContext, askAI, addChatToHistory, generateQuestionAnswer } from "../controller/chatController"
import { feedback, magistralPrompt, socraticQuestion1, socraticQuestion2, socraticQuestionPrompt, systemPromptNoCode, userPromptSuffixCode, userPromptSuffixNoCode, userPrompts } from "../model/prompts"
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
        const temperature = generateCode ? 1 : 0.7; //be more creative to generate various code responses, stick to the recommended 0.7 for text

        const responsePromises: Promise<AIResponse>[] = [];
        for (let i=0; i<numAnswers; i++) {
            userPrompt += userPrompts[i];
            responsePromises.push(askAI(_systemPrompt, userPrompt, temperature));
        }

        const responses: AIResponse[] = await Promise.all(responsePromises);

        const currentConv = getChatHistory()[getChatHistory().length - 1];

        currentConv.responses = responses;
        
        reply.send({chatHistory: getChatHistory()});
    })

    fastify.post('/converseSocratically', async (req: FastifyRequest<{Body: {followUp: FollowUp}}>, reply: FastifyReply) => {
        const currentConv = getChatHistory()[getChatHistory().length - 1];
        const followUp = req.body.followUp;
        currentConv.followUp = followUp;

        if (!followUp.lowQuestion) {
            const lowQuestion : string = await generateQuestionAnswer(socraticQuestion1, getChatContext());
            followUp.lowQuestion = lowQuestion;
        }
        else if (followUp.lowAnswer && !followUp.highQuestion) {
            const userPromt = getChatContext() + '\nAssistant: ' + followUp.lowQuestion + '\nUser: ' + followUp.lowAnswer;
            const highQuestion : string = await generateQuestionAnswer(socraticQuestion2, userPromt);
            followUp.highQuestion = highQuestion;
        }
        else if (followUp.highAnswer) {
            const userPromt = getChatContext() + '\nAssistant: ' + followUp.lowQuestion + '\nUser: ' + followUp.lowAnswer + '\nAssistant: ' + followUp.highQuestion + '\nUser: ' + followUp.highAnswer;
            const finalFeedback : string = await generateQuestionAnswer(feedback, userPromt);
            followUp.feedback = finalFeedback;
        }
        
        currentConv.followUp = followUp;
        reply.send({chatHistory: getChatHistory()});
    })

    fastify.post('/toggleShowChatReasoning', (req: FastifyRequest<{Body: {reasoning: string}}>, reply: FastifyReply) => {
        toggleShowReasoning(getChatHistory(), req.body.reasoning);

        reply.send({chatHistory: getChatHistory()});
    })
}