import { FastifyReply, FastifyRequest, FastifyPluginAsync } from "fastify"
import { getReviewHistory, addToReviewHistory } from "../controller/reviewController"
import { AIResponse, Conversation, FollowUp } from "../model/model"
import { askAI, generateQuestionAnswer } from "../controller/chatController"
import { magistralPrompt, socraticQuestionPrompt } from "../model/prompts"
import { toggleShowReasoning } from "../controller/helper"

export const routes: FastifyPluginAsync = async (fastify, opts) => {
    fastify.get('/reviewHistory', (req: FastifyRequest, reply: FastifyReply) => {
        reply.send({reviewHistory: getReviewHistory()});
    })

    fastify.post('/askCodeReview', async (req: FastifyRequest<{Body: string}>, reply: FastifyReply) => {
            const question : string = req.body;
            
            const qInput: Conversation = {question: question, responses: []};
            addToReviewHistory(qInput);
            
            reply.send({reviewHistory: getReviewHistory()});
        })

    fastify.post('/codeReview', async (req: FastifyRequest<{Body: {code: string}}>, reply: FastifyReply) => {
        const code = req.body.code;
        console.log("Asking:", code);

        const userPrompt = "Review this code: " + code; 
        // const response: AIResponse = await askAI(magistralPrompt, userPrompt);

        // const currentConv = getReviewHistory()[getReviewHistory().length - 1];
        // currentConv.responses = [response];
        
        reply.send({reviewHistory: getReviewHistory()});
    })

    fastify.post('/toggleShowReviewReasoning', (req: FastifyRequest<{Body: {reasoning: string}}>, reply: FastifyReply) => {
        toggleShowReasoning(getReviewHistory(), req.body.reasoning);

        reply.send({reviewHistory: getReviewHistory()});
    })
}