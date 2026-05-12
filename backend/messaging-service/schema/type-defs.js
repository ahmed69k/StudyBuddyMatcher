import gql from "graphql-tag"

const typeDefs = gql`
    type Message{
        id:ID!
        senderId:ID!
        senderName:String!
        message:String!
        conversationId:String!
        sendDate:String!
    }
    type Conversation{
        id:ID!
        users:[ID!]!
        messages:[Message]!
        createDate:String!
    }
    type Query{
        getUserConversations:[Conversation]!

    }
    type Mutation{
        sendMessage(input:SendMessageInput!):SendMessagePayload!
        createConversation(input:CreateConversationInput!):Conversation!
    }
    input SendMessageInput{
        conversationId:ID!
        message:String!
    }
    type SendMessagePayload{
        response:String!
        message:Message!
    }
    input CreateConversationInput{
        addedUser:ID!
    }
    type Subscription{
        messageSent(conversationId: ID!):Message!
    }
    `

export default typeDefs