import { gql } from "@apollo/client";

export const GET_ALL_USERS = gql`
  query GetAllUsers {
    getAllUsers {
      id
      email
      username
      profilePicture
      university
      academicYear
      phoneNumber
      friends
    }
  }
`;

export const GET_USER = gql`
  query GetUser($email: String!) {
    getUser(email: $email) {
      id
      email
      username
      profilePicture
      university
      academicYear
      phoneNumber
      friends
    }
  }
`;

export const GET_ME = gql`
  query Me {
    me {
      id
      email
      username
      profilePicture
      university
      academicYear
      phoneNumber
      friends
    }
  }
`;

/* =========================
   MUTATIONS
========================= */

export const REGISTER = gql`
  mutation Register($input: createUserInput!) {
    register(input: $input) {
      id
      email
      username
    }
  }
`;

export const LOGIN = gql`
  mutation Login($input: loginUserInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        username
        profilePicture
      }
    }
  }
`;

export const DELETE_PROFILE = gql`
  mutation DeleteProfile($email: String!) {
    deleteProfile(email: $email) {
      message
      user {
        id
        email
        username
      }
    }
  }
`;

export const UPDATE_USERNAME = gql`
  mutation UpdateUsername($username: String!) {
    updateUsername(username: $username) {
      message
      old
      new
    }
  }
`;

export const UPDATE_EMAIL = gql`
  mutation UpdateEmail($email: String!) {
    updateEmail(email: $email) {
      message
      old
      new
    }
  }
`;

export const UPDATE_PASSWORD = gql`
  mutation UpdatePassword($password: String!) {
    updatePassword(password: $password)
  }
`;

export const UPDATE_PROFILE_PICTURE = gql`
  mutation UpdateProfilePicture($profilePicture: String!) {
    updateProfilePicture(profilePicture: $profilePicture) {
      message
      old
      new
    }
  }
`;

export const UPDATE_UNIVERSITY = gql`
  mutation UpdateUniversity($university: String!) {
    updateUniversity(university: $university) {
      message
      old
      new
    }
  }
`;

export const UPDATE_ACADEMIC_YEAR = gql`
  mutation UpdateAcademicYear($academicYear: Int!) {
    updateAcademicYear(academicYear: $academicYear) {
      message
      old
      new
    }
  }
`;

export const UPDATE_PHONE_NUMBER = gql`
  mutation UpdatePhoneNumber($phoneNumber: String!) {
    updatePhoneNumber(phoneNumber: $phoneNumber) {
      message
      old
      new
    }
  }
`;