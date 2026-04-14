import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { stitchSchemas } from "@graphql-tools/stitch";
import { buildHTTPExecutor } from "@graphql-tools/executor-http";
import { schemaFromExecutor } from "@graphql-tools/wrap";

/**
 * Team HTTP ports: auth 3000, profile 3001, availability 3002, matching 3003,
 * study session 3004, notifications 3005, buddy request 3006. Gateway: 4001.
 * [label, envVar, local default] — Apollo standalone: POST to service root `/`.
 */
const SUBGRAPH_SPECS = [
  ["auth", "AUTH_GRAPHQL_URL", "http://127.0.0.1:3000/"],
  ["profile", "PROFILE_GRAPHQL_URL", "http://127.0.0.1:3001/"],
  ["notification", "NOTIFICATION_GRAPHQL_URL", "http://127.0.0.1:3005/"],
  ["matching", "MATCHING_GRAPHQL_URL", "http://127.0.0.1:3003/"],
  ["availability", "AVAILABILITY_GRAPHQL_URL", "http://127.0.0.1:3002/"],
  ["studySession", "STUDY_SESSION_GRAPHQL_URL", "http://127.0.0.1:3004/"],
  ["buddyRequest", "BUDDY_REQUEST_GRAPHQL_URL", "http://127.0.0.1:3006/"],
];

function normalizeEndpoint(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  return s.endsWith("/") ? s : `${s}/`;
}

function makeExecutor(endpoint) {
  return buildHTTPExecutor({
    endpoint,
    headers: (executorRequest) => {
      const auth = executorRequest?.context?.authorization;
      if (!auth) return {};
      return { authorization: auth };
    },
  });
}

async function loadSubschemas() {
  const subschemas = [];
  for (const [label, envVar, fallback] of SUBGRAPH_SPECS) {
    const endpoint = normalizeEndpoint(process.env[envVar] || fallback);
    if (!endpoint) {
      console.warn(`[graphql-gateway] skip ${label}: ${envVar} not set`);
      continue;
    }
    const executor = makeExecutor(endpoint);
    try {
      const schema = await schemaFromExecutor(executor, {});
      subschemas.push({ schema, executor });
      console.log(`[graphql-gateway] linked ${label} -> ${endpoint}`);
    } catch (err) {
      console.warn(`[graphql-gateway] skip ${label} (${endpoint}):`, err?.message || err);
    }
  }
  return subschemas;
}

const port = Number(process.env.PORT) || 4001;

const subschemas = await loadSubschemas();
if (subschemas.length === 0) {
  console.error("[graphql-gateway] no subgraphs could be loaded. Check URLs and that services are running.");
  process.exit(1);
}

let schema;
try {
  schema = stitchSchemas({
    subschemas,
    mergeTypes: true,
  });
} catch (err) {
  console.error("[graphql-gateway] stitchSchemas failed (type conflicts or merge issue):", err?.message || err);
  process.exit(1);
}

const server = new ApolloServer({
  schema,
  introspection: true,
});

const { url } = await startStandaloneServer(server, {
  listen: { port, host: "0.0.0.0" },
  cors: {
    origin:
      process.env.CORS_ORIGIN?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || true,
  },
  context: async ({ req }) => ({
    authorization: req.headers.authorization || "",
  }),
});

console.log(`[graphql-gateway] ready at ${url}`);
