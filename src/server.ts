import {routes as chatRoutes} from './routes/chat'
import {routes as reviewRoutes} from './routes/review'

const fastify  = require('fastify')({logger: true})
const cors = require('@fastify/cors')

const PORT = 5000;

const start = async () => {
    try {
        await fastify.register(cors, {
            origin: true // allow all origins (dev only)
        })

        await fastify.register(chatRoutes);
        await fastify.register(reviewRoutes);

        await fastify.listen({ port: PORT, host: "0.0.0.0"})
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
}

start()