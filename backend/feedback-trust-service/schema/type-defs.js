import gql from "graphql-tag";

const typeDefs = gql`
  type Feedback {
    id: String!
    sessionId: String!
    reviewerId: String!
    revieweeId: String!
    overallRating: Int!
    punctuality: Int!
    helpfulness: Int!
    communication: Int!
    noShow: Boolean!
    comment: String
    createdAt: String!
    updatedAt: String!
  }

  type TrustProfile {
    userId: String!
    averageRating: Float!
    reliabilityScore: Float!
    totalReviews: Int!
    noShowCount: Int!
    updatedAt: String!
  }

  input SubmitFeedbackInput {
    sessionId: String!
    revieweeId: String!
    overallRating: Int!
    punctuality: Int!
    helpfulness: Int!
    communication: Int!
    noShow: Boolean = false
    comment: String
  }

  type Query {
    healthCheck: String!
    trustProfile(userId: String!): TrustProfile
    myTrustProfile: TrustProfile
    myReceivedFeedback: [Feedback!]!
    sessionFeedback(sessionId: String!): [Feedback!]!
  }

  type Mutation {
    submitFeedback(input: SubmitFeedbackInput!): Feedback!
  }
`;

export default typeDefs;
