import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './src/graphql/typeDefs.js';
import { resolvers } from './src/graphql/resolvers.js';
import { connectProducer } from './src/kafka.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';



const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 3001 },
  context: async ({ req }) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return { userId: null };
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      return { userId: decoded.id };
    } catch {
      return { userId: null };
    }
  },
});

await connectProducer();
console.log(`Profile service running at ${url}`);