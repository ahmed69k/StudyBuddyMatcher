import { gql } from "@apollo/client";

export const MY_SESSIONS = gql`
  query MySessions {
    sessions {
      id
      topic
      description
      dateTime
      duration
      sessionType
      creatorId
      contactInfo
      participants {
        id
        userId
        joinedAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_SESSION = gql`
  mutation CreateSession($input: CreateSessionInput!) {
    createSession(input: $input) {
      id
      topic
      dateTime
      duration
      sessionType
    }
  }
`;

export const JOIN_SESSION = gql`
  mutation JoinSession($sessionId: String!, $userId: String!) {
    joinSession(sessionId: $sessionId, userId: $userId) {
      id
      participants {
        userId
      }
    }
  }
`;

export const GET_SESSION = gql`
  query Session($id: String!) {
    session(id: $id) {
      id
      topic
      description
      dateTime
      duration
      sessionType
      creatorId
      contactInfo
      participants {
        id
        userId
        joinedAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_SESSION = gql`
  mutation UpdateSession($sessionId: String!, $input: UpdateSessionInput!) {
    updateSession(sessionId: $sessionId, input: $input) {
      id
      topic
      description
      dateTime
      duration
      sessionType
      contactInfo
      updatedAt
    }
  }
`;

export const LEAVE_SESSION = gql`
  mutation LeaveSession($sessionId: String!, $userId: String!) {
    leaveSession(sessionId: $sessionId, userId: $userId) {
      id
      participants {
        userId
      }
    }
  }
`;

export const CANCEL_SESSION = gql`
  mutation CancelSession($sessionId: String!, $userId: String!) {
    cancelSession(sessionId: $sessionId, userId: $userId)
  }
`;
