import gql from "graphql-tag";

const typeDefs = gql`
    type User{
        id:ID!
        email:String!
        password:String!
        username:String!
        friends:[ID]!
        profilePicture:String
    }
    type Query{
        getAllUsers:[User!]!
        getUser(id:ID!):User!
    }
    input createUserInput{
        email:String!
        password: String!
        username: String!
        profilePicture:String
    }
    type Mutation{
        createUser(input: createUserInput!):User
    }
`
export default typeDefs