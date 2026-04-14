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

  type Query {
    userProfile(userId: String!): UserProfile
    userProfiles: [UserProfile!]!
    recommendMatches(userId: String!, maxResults: Int = 10): [MatchResult!]!
  }

  type Mutation {
    upsertUserProfile(profile: UserProfileInput!): UserProfile!
    deleteUserProfile(userId: String!): Boolean!
  }
`;

export default typeDefs;
