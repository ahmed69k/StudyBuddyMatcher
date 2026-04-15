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
    contactInfo: String
    participants: [SessionParticipant!]!
    createdAt: String!
    updatedAt: String!
  }

  input CreateSessionInput {
    topic: String!
    description: String
    dateTime: String!
    duration: Int!
    sessionType: SessionType!
    creatorId: String!
    contactInfo: String
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
