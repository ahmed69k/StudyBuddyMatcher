import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
} from "@apollo/client";

import { setContext } from "@apollo/client/link/context";

import { GraphQLWsLink } from "@apollo/client/link/subscriptions";

import { createClient } from "graphql-ws";

import { getMainDefinition } from "@apollo/client/utilities";

const graphqlUri =
  import.meta.env.VITE_GRAPHQL_URL || "http://localhost:4001/";

const websocketUri =
  import.meta.env.VITE_WS_URL || "ws://localhost:8001/graphql";

/* HTTP LINK */

const httpLink = new HttpLink({
  uri: graphqlUri.endsWith("/")
    ? graphqlUri
    : `${graphqlUri}/`,
});

/* AUTH LINK */

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      ...headers,
      authorization: token
        ? `Bearer ${token}`
        : "",
    },
  };
});

/* WEBSOCKET LINK */

const wsLink = new GraphQLWsLink(
  createClient({
    url: websocketUri,

    connectionParams: () => {
      const token = localStorage.getItem("token");

      return {
        Authorization: token
          ? `Bearer ${token}`
          : "",
      };
    },

    retryAttempts: 5,
  })
);

/* SPLIT TRAFFIC */

const splitLink = split(
  ({ query }) => {
    const definition =
      getMainDefinition(query);

    return (
      definition.kind ===
        "OperationDefinition" &&
      definition.operation ===
        "subscription"
    );
  },

  wsLink,

  authLink.concat(httpLink)
);

/* APOLLO CLIENT */

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export default client;