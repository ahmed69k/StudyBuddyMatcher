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
