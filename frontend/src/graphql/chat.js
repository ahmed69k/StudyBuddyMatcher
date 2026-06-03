import { gql } from "@apollo/client";

/**
 * CONVERSATIONS
 */
export const GET_CONVERSATIONS = gql`
  query {
    getUserConversations {
      id
      users
      createDate
      messages {
        id
        senderId
        senderName
        message
        sendDate
      }
    }
  }
`;

/**
 * SEND MESSAGE
 */
export const SEND_MESSAGE = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      response
      message {
        id
        senderId
        senderName
        message
        conversationId
        sendDate
      }
    }
  }
`;

/**
 * REAL-TIME SUBSCRIPTION
 */
export const MESSAGE_SUBSCRIPTION = gql`
  subscription MessageSent($conversationId: ID!) {
    messageSent(conversationId: $conversationId) {
      id
      senderId
      senderName
      message
      conversationId
      sendDate
    }
  }
`;
/**
 * CREATE CONVERSATION
 */
export const CREATE_CONVERSATION = gql`
  mutation CreateConversation($input: CreateConversationInput!) {
    createConversation(input: $input) {
      id
      users
      createDate
      messages {
        id
        senderId
        senderName
        message
        sendDate
      }
    }
  }
`;