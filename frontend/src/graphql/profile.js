import { gql } from "@apollo/client";

export const GET_PROFILE = gql`
  query GetProfile {
    getProfile {
      id
      userId
      courses {
        id
        name
      }
      topics {
        id
        name
      }
      studyPreference {
        id
        pace
        mode
        groupSize
        studyStyle
      }
    }
  }
`;

export const ADD_COURSE = gql`
  mutation AddCourse($name: String!) {
    addCourse(name: $name) {
      id
      name
      profileId
    }
  }
`;

export const DELETE_COURSE = gql`
  mutation DeleteCourse($courseId: String!) {
    deleteCourse(courseId: $courseId) {
      id
      name
    }
  }
`;

export const ADD_TOPIC = gql`
  mutation AddTopic($name: String!) {
    addTopic(name: $name) {
      id
      name
      profileId
    }
  }
`;

export const DELETE_TOPIC = gql`
  mutation DeleteTopic($topicId: String!) {
    deleteTopic(topicId: $topicId) {
      id
      name
    }
  }
`;

export const UPSERT_STUDY_PREFERENCE = gql`
  mutation UpsertStudyPreference(
    $pace: String!
    $mode: String!
    $groupSize: Int!
    $studyStyle: String!
  ) {
    upsertStudyPreference(
      pace: $pace
      mode: $mode
      groupSize: $groupSize
      studyStyle: $studyStyle
    ) {
      id
      pace
      mode
      groupSize
      studyStyle
    }
  }
`;