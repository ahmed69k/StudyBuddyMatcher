/** GraphQL SDL: study session entities and operations for this microservice. */
const typeDefs = `#graphql
  enum SessionType {
    ONLINE
    IN_PERSON
  }

  type SessionParticipant {
    id: String!
    userId: String!
    joinedAt: String!
  }

  type StudySession {
    id: String!
    topic: String!
    description: String
    dateTime: String!
    duration: Int!
    sessionType: SessionType!
    creatorId: String!
    """Link / location — only returned after you join or if you are the host."""
    contactInfo: String
    participants: [SessionParticipant!]!
    createdAt: String!
    updatedAt: String!
    viewerIsHost: Boolean!
    viewerHasJoined: Boolean!
    """True when a buddy invited you but you have not joined yet (not a participant)."""
    viewerInvitePending: Boolean!
  }

  input CreateSessionInput {
    topic: String!
    description: String
    dateTime: String!
    duration: Int!
    sessionType: SessionType!
    creatorId: String!
    contactInfo: String
    """Accepted study buddies to notify & list this session for; they join explicitly (not auto-added as participants)."""
    inviteParticipantUserIds: [String!]
  }

  input UpdateSessionInput {
    topic: String
    description: String
    dateTime: String
    duration: Int
    sessionType: SessionType
    contactInfo: String
  }

  type Query {
    session(id: String!): StudySession
    sessions: [StudySession!]!
    sessionsByUser(userId: String!): [StudySession!]!
  }

  type Mutation {
    createSession(input: CreateSessionInput!): StudySession!
    updateSession(sessionId: String!, input: UpdateSessionInput!): StudySession!
    joinSession(sessionId: String!, userId: String!): StudySession!
    leaveSession(sessionId: String!, userId: String!): StudySession!
    cancelSession(sessionId: String!, userId: String!): Boolean!
  }
`;

export default typeDefs;
