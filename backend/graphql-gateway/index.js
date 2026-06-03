import "dotenv/config";
import fs from "fs";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { stitchSchemas } from "@graphql-tools/stitch";
import { buildHTTPExecutor } from "@graphql-tools/executor-http";
import { schemaFromExecutor } from "@graphql-tools/wrap";

/**
 * Docker network (service:port): auth 3000, profile 3001, availability 3002, matching 3003,
 * study session 3004, notifications 3005, feedback trust 4010. Gateway: 4001.
 * study session 3004, notifications 3005, messaging HTTP 8000 (WS subscriptions 8001). Gateway: 4001.
 * Host machine (docker-compose publish): auth is localhost:3007 → container 3000; other services match their port.
 * [label, envVar, local default when gateway runs on host] — Apollo: POST to service root `/`.
 */
const SUBGRAPH_SPECS = [
  // ORIGINAL auth fallback when gateway runs on host: "http://127.0.0.1:3000/" (auth in Docker is published on 3007).
  ["auth", "AUTH_GRAPHQL_URL", "http://127.0.0.1:3007/"],
  ["profile", "PROFILE_GRAPHQL_URL", "http://127.0.0.1:3001/"],
  ["notification", "NOTIFICATION_GRAPHQL_URL", "http://127.0.0.1:3005/"],
  ["matching", "MATCHING_GRAPHQL_URL", "http://127.0.0.1:3003/"],
  ["availability", "AVAILABILITY_GRAPHQL_URL", "http://127.0.0.1:3002/"],
  ["studySession", "STUDY_SESSION_GRAPHQL_URL", "http://127.0.0.1:3004/"],
  ["feedbackTrust", "FEEDBACK_TRUST_GRAPHQL_URL", "http://127.0.0.1:4010/"],
  ["messaging", "MESSAGING_GRAPHQL_URL", "http://127.0.0.1:8000/"],
];

function normalizeEndpoint(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  return s.endsWith("/") ? s : `${s}/`;
}

/** True when this Node process runs inside a Linux container (Compose service DNS works). */
function isDockerContainer() {
  try {
    return fs.existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

/** Hostnames that only resolve on the Docker Compose network (`ENOTFOUND` if the gateway runs on your PC). */
const DOCKER_COMPOSE_SERVICE_HOSTS = new Set([
  "matching-service",
  "user-and-auth-service",
  "profile-and-study-preferences-service",
  "notification-service",
  "availability-management-service",
  "study-session-scheduling-service",
  "feedback-trust-service",
  "messaging-service",
]);

function endpointUsesComposeHostname(url) {
  try {
    const u = new URL(url);
    return DOCKER_COMPOSE_SERVICE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function resolveSubgraphEndpoint(envVar, fallback) {
  const fromEnv = normalizeEndpoint(process.env[envVar] || "");
  const fb = normalizeEndpoint(fallback);
  if (!fromEnv) return fb;
  if (!isDockerContainer() && endpointUsesComposeHostname(fromEnv)) {
    console.warn(
      `[graphql-gateway] ${envVar}=${fromEnv} uses a Compose-only hostname on the host; using ${fb} instead (run subgraphs with ports published, or run the gateway in Docker).`,
    );
    return fb;
  }
  return fromEnv;
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
    const endpoint = resolveSubgraphEndpoint(envVar, fallback);
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
// ORIGINAL: only the line above (no localhost hint).
// EDIT: clarify browser URL because Apollo may print http://0.0.0.0:PORT/ which Edge rejects.
console.log(`[graphql-gateway] use in browser: http://localhost:${port}/ (0.0.0.0 is listen-only, not a valid browser URL)`);
