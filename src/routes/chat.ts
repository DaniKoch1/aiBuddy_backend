import { FastifyReply, FastifyRequest, FastifyPluginAsync } from "fastify"
import { AIResponse, ChatMode, FollowUp } from "../model/model"
import { askAI, generateQuestionAnswer } from "../controller/chatController"
import { codeReview, feedback, magistralPrompt, socraticQuestion1, socraticQuestion2, socraticQuestionPrompt, systemPromptNoCode, userPromptSuffixCode, userPromptSuffixNoCode, userPrompts } from "../model/prompts"


export const routes: FastifyPluginAsync = async (fastify, opts) => {

    fastify.post('/respond', async (req: FastifyRequest<{Body: {chatMode: ChatMode, chatContext: string}}>, reply: FastifyReply) => {
        const context = req.body.chatContext;
        console.log("Asking:", context);
        console.log('Respond: ', req.body.chatMode);

        let _systemPrompt : string;
        let userPrompt : string;
        let numAnswers : number;
        let temperature : number;

        switch (req.body.chatMode) {
            case ChatMode.Understand:
                _systemPrompt = systemPromptNoCode;
                userPrompt = context + userPromptSuffixNoCode;
                numAnswers = 1;
                temperature = 0.7; //use the recommended value
                break;
            case ChatMode.Code:
                _systemPrompt = magistralPrompt;
                userPrompt = context + userPromptSuffixCode;
                numAnswers = 3;
                temperature = 1; //be more creative to generate various code responses
                break;
            case ChatMode.CodeReview:
                _systemPrompt = magistralPrompt;
                userPrompt = codeReview + context;
                numAnswers = 1;
                temperature = 0.7; //use the recommended value
                break;
        }

        const responsePromises: Promise<AIResponse>[] = [];
        for (let i = 0; i < numAnswers; i++) {
            userPrompt += userPrompts[i];
            responsePromises.push(askAI(_systemPrompt, userPrompt, temperature));
        }

        const responses: AIResponse[] = await Promise.all(responsePromises);
        
        reply.send({responses: responses});
    })

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
}