import gql from "graphql-tag";

//NEED TO ALLOW USERS TO READ NOTIFICATIONS (read status) !!!! REMINDER
const typeDefs = gql`
    type Notification{ 
        id:ID!
        recipient:String!
        subject:String!
        message:String!
        date:String!
        readStatus:Boolean!
    }
    input sendPayload{
        recipient:String!
        subject:String!
        message:String!
    }
    type Mutation{
        sendNotification(input:sendPayload!):String!
        openNotification(notificationID:ID!):Notification!
    }
    type Query{
        getMyNotifications:[Notification]!
        
    }
`
export default typeDefs