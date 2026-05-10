import { gql } from "@apollo/client";

/** Matching-service copy of the user (includes `availability` synced from availability-management via Kafka). */
export const GET_USER_PROFILE_MATCHING = gql`
  query UserProfileForMatching($userId: String!) {
    userProfile(userId: $userId) {
      userId
      name
      email
      courses
      topics
      studyPace
      studyMode
      preferredGroupSize
      studyStyle
      availability
      updatedAt
    }
  }
`;

export const RECOMMEND_MATCHES = gql`
  query RecommendMatches($userId: String!, $maxResults: Int) {
    recommendMatches(userId: $userId, maxResults: $maxResults) {
      compatibilityScore
      reasons
      profile {
        userId
        name
        email
        courses
        topics
        studyPace
        studyMode
        preferredGroupSize
        studyStyle
        availability
      }
    }
  }
`;

export const MY_INCOMING_BUDDY_REQUESTS = gql`
  query MyIncomingBuddyRequests($status: BuddyRequestStatus) {
    myIncomingBuddyRequests(status: $status) {
      id
      requesterId
      receiverId
      status
      message
      createdAt
      updatedAt
    }
  }
`;

export const MY_OUTGOING_BUDDY_REQUESTS = gql`
  query MyOutgoingBuddyRequests($status: BuddyRequestStatus) {
    myOutgoingBuddyRequests(status: $status) {
      id
      requesterId
      receiverId
      status
      message
      createdAt
      updatedAt
    }
  }
`;

export const SEND_BUDDY_REQUEST = gql`
  mutation SendBuddyRequest($input: SendBuddyRequestInput!) {
    sendBuddyRequest(input: $input) {
      id
      status
      receiverId
    }
  }
`;

export const RESPOND_TO_BUDDY_REQUEST = gql`
  mutation RespondToBuddyRequest($requestId: ID!, $decision: BuddyRequestDecision!) {
    respondToBuddyRequest(requestId: $requestId, decision: $decision) {
      id
      status
    }
  }
`;

/** Creates/updates the matching-service profile (required before recommendations & buddy requests). */
export const UPSERT_USER_PROFILE = gql`
  mutation UpsertUserProfile($profile: UserProfileInput!) {
    upsertUserProfile(profile: $profile) {
      userId
      name
      email
      courses
      topics
      studyPace
      studyMode
      preferredGroupSize
      studyStyle
      availability
      updatedAt
    }
  }
`;

export const CANCEL_BUDDY_REQUEST = gql`
  mutation CancelBuddyRequest($requestId: ID!) {
    cancelBuddyRequest(requestId: $requestId) {
      id
      status
    }
  }
`;
