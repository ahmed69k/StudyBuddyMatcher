import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import { typeDefs } from './src/graphql/typeDefs.js';
import { resolvers } from './src/graphql/resolvers.js';
import { connectProducer } from './src/kafka.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const app = express();
app.use(express.json());

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) return { userId: null };
        try {
          const decoded = jwt.verify(token, process.env.SECRET);
          return { userId: decoded.userId };
        } catch {
          return { userId: null };
        }
      },
    })
  );

  await connectProducer();

  app.listen(3001, () => {
    console.log('Profile service running on port 3001');
    console.log('GraphQL endpoint: http://localhost:3001/graphql');
  });
}

startServer().catch(console.error);