  import { ApolloServer } from "@apollo/server";
  import { startStandaloneServer } from "@apollo/server/standalone"
  import typeDefs from './schema/type-defs.js'
  import resolvers from './schema/resolvers.js'
  import pkg from "@prisma/client"
  const {PrismaClient} = pkg
  import jwt from "jsonwebtoken"
  import {PrismaPg} from "@prisma/adapter-pg"
  import "dotenv/config";
  import { WebSocketServer } from "ws";
  import { useServer } from "graphql-ws/lib/use/ws"
  import { makeExecutableSchema } from "@graphql-tools/schema"
  import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";

  const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
  export const prisma = new PrismaClient({adapter});
  const schema = makeExecutableSchema({
      typeDefs, 
      resolvers,

  });
  const wsServer = new WebSocketServer({
    host: "0.0.0.0",
    port: 8001,
    path: '/graphql'
  })
  useServer(
    {
      schema,
      context: async (ctx) => {
        const token = ctx.connectionParams?.Authorization?.replace("Bearer ", "");
        if (!token) return { user: null };

        try {
          const user = jwt.verify(token, process.env.SECRET_KEY);
          return { user };
        } catch {
          return { user: null };
        }
      },
    },
    wsServer
  );

  console.log("WebSocket server running at ws://localhost:8001/graphql");

  const server = new ApolloServer({
    schema,
    plugins:[
      ApolloServerPluginLandingPageLocalDefault({
        embed:{
          endpointIsEditable: true
        }
      })
    ]
  })

  const { url } = await startStandaloneServer(server,{
  listen: {port: 8000, host: "0.0.0.0"},
  context: ({ req }) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return { user: null }; 
    }

    try {
      const user = jwt.verify(token, process.env.SECRET_KEY);
      return { user };
    } catch (err) {
      console.warn("Invalid token:", err.message);
      return { user: null }; 
    }
  }
  })
  console.log(`Server is ready at ${url}`)
  

