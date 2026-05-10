import { gql } from "@apollo/client";

export const GET_MY_AVAILABILITY = gql`
  query GetMyAvailability {
    getMyAvailability {
      id
      userId
      dayOfWeek
      startHour
      endHour
      createdAt
    }
  }
`;

export const ADD_AVAILABILITY = gql`
  mutation AddAvailability($input: AddAvailabilityInput!) {
    addAvailability(input: $input) {
      id
      dayOfWeek
      startHour
      endHour
    }
  }
`;

export const UPDATE_AVAILABILITY = gql`
  mutation UpdateAvailability($id: ID!, $input: UpdateAvailabilityInput!) {
    updateAvailability(id: $id, input: $input) {
      id
      dayOfWeek
      startHour
      endHour
    }
  }
`;

export const DELETE_AVAILABILITY = gql`
  mutation DeleteAvailability($id: ID!) {
    deleteAvailability(id: $id) {
      id
      message
    }
  }
`;
