import {routes as chatRoutes} from './routes/chat'
import path from "path";
import fastifyStatic from "@fastify/static";

const fastify  = require('fastify')({logger: true})
const cors = require('@fastify/cors')

const PORT = 5000;
export const LLM_URL = process.env.LLM_URL || "http://ailab-l4-01.srv.aau.dk";
const testMode = false;

const start = async () => {
    try {
        await fastify.register(cors, {
            origin : testMode ? true : /srv\.aau\.dk$/
        })
        
        await fastify.register(fastifyStatic, {
            root: path.join(__dirname, "public"),
        });

        await fastify.register(chatRoutes);

        await fastify.listen({ port: PORT, host: "0.0.0.0"})
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
}

start()