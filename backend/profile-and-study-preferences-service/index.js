import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './src/graphql/typeDefs.js';
import { resolvers } from './src/graphql/resolvers.js';
import { connectProducer } from './src/kafka.js';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// ORIGINAL: const server = new ApolloServer({ typeDefs, resolvers });
const server = new ApolloServer({
  typeDefs,
  resolvers,
  // EDIT: INTROSPECTION ON FOR GRAPHQL GATEWAY
  introspection: true,
});

// ORIGINAL: listen: { port: 3001 } only (no PORT env, host not always 0.0.0.0 in older copies)
// EDIT: PORT FROM ENV (DOCKER COMPOSE SETS PORT)
const port = Number(process.env.PORT) || 3001;
// ORIGINAL: jwt.verify(token, process.env.SECRET_KEY)
// EDIT: TRIM JWT SECRET FROM .ENV
const jwtSecret = process.env.SECRET_KEY?.trim();

connectProducer().catch((err) =>
  console.warn('⚠️ Kafka producer (profile-and-study-preferences-service):', err?.message || err)
);

const { url } = await startStandaloneServer(server, {
  // EDIT: 0.0.0.0 FOR DOCKER; PORT FROM ENV ABOVE
  listen: { port, host: '0.0.0.0' },
  context: async ({ req }) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return { user: null };
    // ORIGINAL: no missing-secret guard
    // EDIT: GUARD IF SECRET_KEY MISSING
    if (!jwtSecret) {
      console.warn('profile-and-study-preferences-service: SECRET_KEY is not set');
      return { user: null };
    }
    try {
      // ORIGINAL: const user = jwt.verify(token, process.env.SECRET_KEY);
      // EDIT: VERIFY WITH TRIMMED SECRET
      const user = jwt.verify(token, jwtSecret);
      return { user };
    } catch (err) {
      console.warn('Invalid token:', err.message);
      return { user: null };
    }
  },
});



console.log(`Profile service running at ${url}`);
