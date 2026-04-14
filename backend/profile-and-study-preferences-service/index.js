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
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return { user: null };
    try {
      const user = jwt.verify(token, process.env.SECRET_KEY);
      return { user };
    } catch (err) {
      console.warn('Invalid token:', err.message);
      return { user: null };
    }
  },
});
await connectProducer();
console.log(`Profile service running at ${url}`);