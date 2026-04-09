import {routes as chatRoutes} from './routes/chat'
import {routes as reviewRoutes} from './routes/review'
import path from "path";
import fastifyStatic from "@fastify/static";

const fastify  = require('fastify')({logger: true})
const cors = require('@fastify/cors')

const PORT = 5000;
export const LLM_URL = process.env.LLM_URL;

const start = async () => {
    try {
        await fastify.register(cors, {
            origin: /srv\.aau\.dk$/
        })
        
        await fastify.register(fastifyStatic, {
            root: path.join(__dirname, "public"),
        });

        await fastify.register(chatRoutes);
        await fastify.register(reviewRoutes);

        await fastify.listen({ port: PORT, host: "0.0.0.0"})
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
}

start()