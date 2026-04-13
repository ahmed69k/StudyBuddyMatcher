import gql from "graphql-tag";

const typeDefs = gql`
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
    buddyRequest(id: ID!): BuddyRequest
    myIncomingBuddyRequests(status: BuddyRequestStatus): [BuddyRequest!]!
    myOutgoingBuddyRequests(status: BuddyRequestStatus): [BuddyRequest!]!
  }

  type Mutation {
    sendBuddyRequest(input: SendBuddyRequestInput!): BuddyRequest!
    respondToBuddyRequest(requestId: ID!, decision: BuddyRequestDecision!): BuddyRequest!
    cancelBuddyRequest(requestId: ID!): BuddyRequest!
  }
`;

export default typeDefs;
