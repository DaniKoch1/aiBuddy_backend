import { FastifyReply, FastifyRequest, FastifyPluginAsync } from "fastify"
import { AIResponse, ChatMode, FollowUp } from "../model/model"
import { askAI, generateQuestionAnswer } from "../controller/chatController"
import { codeReview, codeReviewFeedback, codeReviewQuestion1, codeReviewQuestion2, feedback, magistralPrompt, socraticQuestion1, socraticQuestion2, socraticQuestionPrompt, systemPromptNoCode, userPromptSuffixCode, userPromptSuffixNoCode, userPrompts } from "../model/prompts"
import { shuffleArray } from "../controller/helper"


export const routes: FastifyPluginAsync = async (fastify, opts) => {

    
    fastify.post('/askUnderstand', async (req: FastifyRequest<{Body: {chatContext: string}}>, reply: FastifyReply) => {
        const context = req.body.chatContext;

        const _systemPrompt = systemPromptNoCode;
        const userPrompt = context + userPromptSuffixNoCode;
        const temperature = 0.7; //use the recommended value

        const response: AIResponse = await askAI(_systemPrompt, userPrompt, temperature, true);
        reply.send({responses: [response]});
    });
    fastify.post('/askCode', async (req: FastifyRequest<{Body: {chatContext: string}}>, reply: FastifyReply) => {
        const context = req.body.chatContext;

        const _systemPrompt = magistralPrompt;
        const userPrompt = context + userPromptSuffixCode;
        const numAnswers = 3;
        const temperature = 1; //be more creative to generate various code responses

        const responsePromises: Promise<AIResponse>[] = [];
        for (let i = 0; i < numAnswers; i++) {
            const isCorrect = userPrompts[i] == '';
            responsePromises.push(askAI(_systemPrompt, userPrompt + userPrompts[i], temperature, isCorrect));
        }

        const responses: AIResponse[] = await Promise.all(responsePromises);
        const shuffledResponses = shuffleArray(responses);
        
        reply.send({responses: shuffledResponses});
    });
    fastify.post('/requestReview', async (req: FastifyRequest<{Body: {code: string}}>, reply: FastifyReply) => {
        const code = req.body.code;

        const _systemPrompt = magistralPrompt;
        const userPrompt = codeReview + code;
        const temperature = 0.7; //use the recommended value

        const response: AIResponse = await askAI(_systemPrompt, userPrompt, temperature, true);
        reply.send({responses: [response]});
    });

    fastify.post('/converseSocratically', async (req: FastifyRequest<{Body: {chatContext: string, followUp: FollowUp}}>, reply: FastifyReply) => {
        const chatContext = req.body.chatContext;
        const followUp = req.body.followUp;

        if (!followUp.lowQuestion) {
            const lowQuestion : string = await generateQuestionAnswer(socraticQuestion1, chatContext);
            followUp.lowQuestion = lowQuestion;
        }
        else if (followUp.lowAnswer && !followUp.highQuestion) {
            const userPromt = chatContext + '\nAssistant: ' + followUp.lowQuestion + '\nUser: ' + followUp.lowAnswer;
            const highQuestion : string = await generateQuestionAnswer(socraticQuestion2, userPromt);
            followUp.highQuestion = highQuestion;
        }
        else if (followUp.highAnswer) {
            const userPromt = chatContext + '\nAssistant: ' + followUp.lowQuestion + '\nUser: ' + followUp.lowAnswer + '\nAssistant: ' + followUp.highQuestion + '\nUser: ' + followUp.highAnswer;
            const finalFeedback : string = await generateQuestionAnswer(feedback, userPromt);
            followUp.feedback = finalFeedback;
        }
        
        reply.send({followUp: followUp});
    })

    fastify.post('/converseCodeReview', async (req: FastifyRequest<{Body: {code: string, followUp: FollowUp}}>, reply: FastifyReply) => {
        const code = req.body.code;
        const followUp = req.body.followUp;

        if (!followUp.lowQuestion) {
            const lowQuestion : string = await generateQuestionAnswer(codeReviewQuestion1, code);
            followUp.lowQuestion = lowQuestion;
        }
        else if (followUp.lowAnswer && !followUp.highQuestion) {
            const userPromt = code + '\nAssistant: ' + followUp.lowQuestion + '\nUser: ' + followUp.lowAnswer;
            const highQuestion : string = await generateQuestionAnswer(codeReviewQuestion2, userPromt);
            followUp.highQuestion = highQuestion;
        }
        else if (followUp.highAnswer) {
            const userPromt = code + '\nAssistant: ' + followUp.lowQuestion + '\nUser: ' + followUp.lowAnswer + '\nAssistant: ' + followUp.highQuestion + '\nUser: ' + followUp.highAnswer;
            const finalFeedback : string = await generateQuestionAnswer(codeReviewFeedback, userPromt);
            followUp.feedback = finalFeedback;
        }
        
        reply.send({followUp: followUp});
    })
}