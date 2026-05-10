import { gql } from "@apollo/client";

/** Fragment: session card + detail shared fields (viewer* from API). */
export const STUDY_SESSION_FIELDS = gql`
  fragment StudySessionFields on StudySession {
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
    viewerIsHost
    viewerHasJoined
    viewerInvitePending
  }
`;

/** Uses JWT on the gateway; no userId variable so cache/refetch cannot drift from auth identity. */
export const MY_SESSIONS = gql`
  query MySessions {
    sessions {
      ...StudySessionFields
    }
  }
  ${STUDY_SESSION_FIELDS}
`;

export const CREATE_SESSION = gql`
  mutation CreateSession($input: CreateSessionInput!) {
    createSession(input: $input) {
      ...StudySessionFields
    }
  }
  ${STUDY_SESSION_FIELDS}
`;

export const JOIN_SESSION = gql`
  mutation JoinSession($sessionId: String!, $userId: String!) {
    joinSession(sessionId: $sessionId, userId: $userId) {
      ...StudySessionFields
    }
  }
  ${STUDY_SESSION_FIELDS}
`;

export const GET_SESSION = gql`
  query Session($id: String!) {
    session(id: $id) {
      ...StudySessionFields
    }
  }
  ${STUDY_SESSION_FIELDS}
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
      viewerIsHost
      viewerHasJoined
      viewerInvitePending
    }
  }
`;

export const LEAVE_SESSION = gql`
  mutation LeaveSession($sessionId: String!, $userId: String!) {
    leaveSession(sessionId: $sessionId, userId: $userId) {
      ...StudySessionFields
    }
  }
  ${STUDY_SESSION_FIELDS}
`;

export const CANCEL_SESSION = gql`
  mutation CancelSession($sessionId: String!, $userId: String!) {
    cancelSession(sessionId: $sessionId, userId: $userId)
  }
`;
