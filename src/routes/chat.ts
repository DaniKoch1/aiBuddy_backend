import { FastifyReply, FastifyRequest, FastifyPluginAsync } from "fastify"
import { AIResponse, FollowUp } from "../model/model"
import { askAIWithReasoning, continueFollowUp } from "../controller/chatController"
import { codeReview, userPromptSuffixCode, userPromptSuffixNoCode, userPrompts } from "../model/prompts"
import { shuffleArray } from "../controller/helper"


export const routes: FastifyPluginAsync = async (fastify, opts) => {

    
    fastify.post('/askUnderstand', async (req: FastifyRequest<{Body: {chatContext: string}}>, reply: FastifyReply) => {
        const context = req.body.chatContext;
        console.log('Context: ', context);

        const userPrompt = context + userPromptSuffixNoCode;
        const temperature = 0.7; //use the recommended value

        const response: AIResponse = await askAIWithReasoning(userPrompt, temperature);
        reply.send({responses: [response]});
    });

    fastify.post('/askCode', async (req: FastifyRequest<{Body: {chatContext: string}}>, reply: FastifyReply) => {
        const context = req.body.chatContext;

        const userPrompt = context + userPromptSuffixCode;
        const temperature = 1; //be more creative to generate various code responses

        const responsePromises: Promise<AIResponse>[] = [];
        for (let i = 0; i < userPrompts.length; i++) {
            const isCorrect = userPrompts[i] == '';
            responsePromises.push(askAIWithReasoning(userPrompt + userPrompts[i], temperature, isCorrect));
        }

        const responses: AIResponse[] = await Promise.all(responsePromises);
        const shuffledResponses = shuffleArray(responses);
        
        reply.send({responses: shuffledResponses});
    });

    fastify.post('/requestReview', async (req: FastifyRequest<{Body: {code: string}}>, reply: FastifyReply) => {
        const code = req.body.code;

        const userPrompt = codeReview + code;
        const temperature = 0.7; //use the recommended value

        const response: AIResponse = await askAIWithReasoning(userPrompt, temperature);
        reply.send({ responses: [response] });
    });

    fastify.post('/converseSocratically', async (req: FastifyRequest<{Body: {chatContext: string, followUp: FollowUp}}>, reply: FastifyReply) => {
        const chatContext = req.body.chatContext;
        const followUp = req.body.followUp;

        const newFollowUp = await continueFollowUp(chatContext, followUp, false);
        
        reply.send({followUp: newFollowUp});
    })

    fastify.post('/converseCodeReview', async (req: FastifyRequest<{Body: {code: string, followUp: FollowUp}}>, reply: FastifyReply) => {
        const code = req.body.code;
        const followUp = req.body.followUp;

        const newFollowUp = await continueFollowUp(code, followUp, true);
        
        reply.send({followUp: newFollowUp});
    })
}