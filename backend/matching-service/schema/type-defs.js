/** GraphQL SDL: types, queries, and mutations exposed by matching-service (and merged by the gateway). */
const typeDefs = `#graphql
  type UserProfile {
    id: String!
    userId: String!
    name: String!
    email: String
    courses: [String!]!
    topics: [String!]!
    studyPace: String
    studyMode: String
    preferredGroupSize: Int
    studyStyle: String
    availability: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  type MatchResult {
    profile: UserProfile!
    compatibilityScore: Int!
    reasons: [String!]!
  }

  input UserProfileInput {
    userId: String!
    name: String!
    email: String
    courses: [String!]
    topics: [String!]
    studyPace: String
    studyMode: String
    preferredGroupSize: Int
    studyStyle: String
    availability: [String!]
  }

  enum BuddyRequestStatus {
    PENDING
    ACCEPTED
    DECLINED
    CANCELLED
  }

  type BuddyRequest {
    id: ID!
    requesterId: String!
    receiverId: String!
    """Display name from the matching profile (not raw user id)."""
    requesterName: String!
    """Display name from the matching profile (not raw user id)."""
    receiverName: String!
    status: BuddyRequestStatus!
    message: String
    createdAt: String!
    updatedAt: String!
  }

  input SendBuddyRequestInput {
    receiverId: ID!
    message: String
  }

  enum BuddyRequestDecision {
    ACCEPT
    DECLINE
  }

  type Query {
    userProfile(userId: String!): UserProfile
    userProfiles: [UserProfile!]!
    recommendMatches(userId: String!, maxResults: Int = 10): [MatchResult!]!
    buddyRequest(id: ID!): BuddyRequest
    myIncomingBuddyRequests(status: BuddyRequestStatus): [BuddyRequest!]!
    myOutgoingBuddyRequests(status: BuddyRequestStatus): [BuddyRequest!]!
  }

  type Mutation {
    upsertUserProfile(profile: UserProfileInput!): UserProfile!
    deleteUserProfile(userId: String!): Boolean!
    sendBuddyRequest(input: SendBuddyRequestInput!): BuddyRequest!
    respondToBuddyRequest(requestId: ID!, decision: BuddyRequestDecision!): BuddyRequest!
    cancelBuddyRequest(requestId: ID!): BuddyRequest!
  }
`;

export default typeDefs;
