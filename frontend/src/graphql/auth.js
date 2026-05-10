import { gql } from "@apollo/client";

/** Current user — include `id` for matching/session mutations that require `userId` / `creatorId`. */
export const GET_ME = gql`
  query Me {
    me {
      id
      username
      email
      profilePicture
    }
  }
`;

/** Existing auth query — used for session participant labels (avoids SessionParticipant.username on subgraph schema). */
export const GET_ALL_USERS_LABELS = gql`
  query GetAllUsersLabels {
    getAllUsers {
      id
      username
    }
  }
`;
