import { FastifyReply, FastifyRequest } from "fastify"

const fastify  = require('fastify')({logger: true})
const cors = require('@fastify/cors')

const PORT = 5000
const systemPrompt = `
First draft your thinking process (inner monologue) until you arrive at a response. 
Format your response using Markdown, and use LaTeX for any mathematical equations. 
Write both your thoughts and the response in the same language as the input. 
Your thinking process must follow the template below:
[THINK]Your thoughts or/and draft, like working through an exercise on scratch paper. 
Be as casual and as long as you want until you are confident to generate the response. 
Use the same language as the input. ALWAYS put this reasoning output into 'reasoning_content' of the message, NEVER include it in the 'content' of the message
 [/THINK]
Here, start by writing: 'MY ANSWER' and then provide a self-contained response.`;

fastify.post('/answer', (req: FastifyRequest, reply: FastifyReply) => {
    reply.send({answer: 'This is my answer to this question: ' + req.body, reasoning: 'This is my reasoning to this question: ' + req.body})
})

fastify.post('/talk', async (req: FastifyRequest, reply: FastifyReply) => {
    const question = req.body;
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
                    content: systemPrompt
                },
                { role: "user", content: question }],
            max_tokens: 130000,
            temperature: 0.7,
            top_p: 0.95,
            reasoning: { "effort": "medium"}
        })
    })
    const result = await response.json();

    const message = result.choices[0].message;
    console.log("Message:", message);

    if (!message.reasoning_content) {
        reply.send(splitOutput(message.content))
    }
    else {
        let reasoning = message.reasoning_content;
        let answer = message.content;

        reply.send({reasoning: reasoning, answer: answer});
    }
})

function splitOutput(output: string) {
    console.log('Splitting answers');
    const answers = output.split('MY ANSWER');
    if (answers.length == 2)
        return {reasoning: answers[0], answer: answers[1]}

    console.log('Failed at splitting the output, the length is', answers.length);
    return {reasoning: 'none', answer: output};
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