import { gql } from "@apollo/client";

export const SESSION_FEEDBACK = gql`
  query SessionFeedback($sessionId: String!) {
    sessionFeedback(sessionId: $sessionId) {
      id
      sessionId
      reviewerId
      revieweeId
      overallRating
      punctuality
      helpfulness
      communication
      noShow
      comment
      createdAt
    }
  }
`;

export const SUBMIT_FEEDBACK = gql`
  mutation SubmitFeedback($input: SubmitFeedbackInput!) {
    submitFeedback(input: $input) {
      id
      revieweeId
      overallRating
    }
  }
`;
