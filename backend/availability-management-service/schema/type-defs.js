import gql from "graphql-tag";

const typeDefs = gql`

  type Availability {
    id: ID!
    userId: String!
    dayOfWeek: String!
    startHour: Int!
    endHour: Int!
    createdAt: String!
  }

  type DeleteAvailabilityPayload {
    message: String!
    id: ID!
  }

  # Add multiple days with separate hours
  input AvailabilityDayInput {
    dayOfWeek: String!
    startHour: Int!
    endHour: Int!
  }

  #array of objects so each object for a day with hours of its own
  input AddAvailabilityInput {
    days: [AvailabilityDayInput!]!
  }
  

  # Update allows partial changes
  input UpdateAvailabilityInput {
    dayOfWeek: String
    startHour: Int
    endHour: Int
  }

  type Query {
    # current logged-in user
    getMyAvailability: [Availability!]!

    # optional
    getAvailabilityById(id: ID!): Availability
  }

  type Mutation {

    # create multiple slots (Mon to Sat etc.)
    addAvailability(input: AddAvailabilityInput!): [Availability!]!

    # update one slot
    updateAvailability(
      id: ID!,
      input: UpdateAvailabilityInput!
    ): Availability!

    # delete one slot
    deleteAvailability(id: ID!): DeleteAvailabilityPayload!
  }
`;

export default typeDefs;
