import { FastifyReply, FastifyRequest, FastifyPluginAsync } from "fastify"
import { getReviewHistory, addToReviewHistory } from "../controller/reviewController"
import { AIResponse, Conversation } from "../model/model"
import { askAI } from "../controller/chatController"
import { magistralPrompt } from "../model/prompts"
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
        const response: AIResponse = await askAI(magistralPrompt, userPrompt);

        const currentConv = getReviewHistory().pop();
        const newConv : Conversation = {question: currentConv!.question, responses: [response]};
        getReviewHistory().push(newConv);
        
        reply.send({reviewHistory: getReviewHistory()});
    })

    fastify.post('/toggleShowReviewReasoning', (req: FastifyRequest<{Body: {reasoning: string}}>, reply: FastifyReply) => {
        toggleShowReasoning(getReviewHistory(), req.body.reasoning);

        reply.send({reviewHistory: getReviewHistory()});
    })
}