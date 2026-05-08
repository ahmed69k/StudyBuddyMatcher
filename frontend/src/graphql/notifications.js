import { gql } from "@apollo/client";

export const GET_MY_NOTIFICATIONS = gql`
  query GetMyNotifications {
    getMyNotifications {
      id
      recipient
      subject
      message
      date
      readStatus
    }
  }
`;

export const SEND_NOTIFICATION = gql`
  mutation SendNotification($input: sendPayload!) {
    sendNotification(input: $input)
  }
`;

export const OPEN_NOTIFICATION = gql`
  mutation OpenNotification($notificationID: ID!) {
    openNotification(notificationID: $notificationID) {
      id
      recipient
      subject
      message
      date
      readStatus
    }
  }
`;