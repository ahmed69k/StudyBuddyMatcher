import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const graphqlUri =
  import.meta.env.VITE_GRAPHQL_URL || "http://localhost:4001/";

const httpLink = new HttpLink({
  uri: graphqlUri.endsWith("/") ? graphqlUri : `${graphqlUri}/`,
});
const authLink = setContext((_, {headers})=>{
    const token = localStorage.getItem("token");
    return{
        headers: {
            ...headers,
            authorization: token?`Bearer ${token}` : ""
        },
    };
});

const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
})
export default client;
