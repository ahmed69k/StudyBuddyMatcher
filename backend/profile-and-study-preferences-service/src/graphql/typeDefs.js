import { gql } from 'graphql-tag';

export const typeDefs = gql`

  type Profile {
    id: String
    userId: String
    courses: [Course]
    topics: [Topic]
    studyPreference: StudyPreference
  }

  type Course {
    id: String
    name: String
    profileId: String
  }

  type Topic {
    id: String
    name: String
    profileId: String
  }

  type StudyPreference {
    id: String
    profileId: String
    pace: String
    mode: String
    groupSize: Int
    studyStyle: String
  }

  type Query {
    getProfile(userId: String!): Profile
  }

  type Mutation {
    addCourse(userId: String!, name: String!): Course
    deleteCourse(courseId: String!): Course
    addTopic(userId: String!, name: String!): Topic
    deleteTopic(topicId: String!): Topic
    upsertStudyPreference(
      userId: String!
      pace: String!
      mode: String!
      groupSize: Int!
      studyStyle: String!
    ): StudyPreference
  }
`;