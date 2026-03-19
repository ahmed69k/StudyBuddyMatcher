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
        me:User!
    }
    type AuthPayload{
        token:String,
        user: User
    }
    type DeletePayload{
        message:String,
        user:User
    }
    input createUserInput{
        email:String!
        password: String!
        username: String!
        profilePicture:String
    }
    input loginUserInput{
        email:String!
        password:String!
    }
    type UpdatePayload{
        message:String
        old:String
        new:String
    }

    type Mutation{
        createUser(input: createUserInput!):User!
        login(input: loginUserInput!):AuthPayload
        deleteProfile(email:String!):DeletePayload!
        updateUsername(username:String!):UpdatePayload!
        updateEmail(email:String!):UpdatePayload!
        updatePassword(password:String!):String!
        updateProfilePicture(profilePicture:String!):UpdatePayload!
    }
`
export default typeDefs