import gql from "graphql-tag";

const typeDefs = gql`
    type Notification{
        id:ID!
        recipient:String!
        subject:String!
        message:String!
        date:String!
    }
    input sendPayload{
        recipient:String!
        subject:String!
        message:String!
    }
    type Mutation{
        sendNotification(input:sendPayload!):String!
    }
    type Query{
        getMyNotifications:[Notification]!
    }
`
export default typeDefs