/**
 * Generates Postman Collection v2.1 with all GraphQL operations per service.
 * Run: node backend/scripts/generate-postman-collection.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "postman", "StudyBuddyMatcher-GraphQL.postman_collection.json");

const authHeader = [
  { key: "Content-Type", value: "application/json" },
  { key: "Authorization", value: "Bearer {{authToken}}" },
];

const noAuthHeader = [{ key: "Content-Type", value: "application/json" }];

function req(name, url, query, variables, useAuth = true) {
  const body = JSON.stringify(
    {
      query: query.trim(),
      variables: variables || {},
    },
    null,
    0
  );
  return {
    name,
    request: {
      method: "POST",
      header: useAuth ? authHeader : noAuthHeader,
      body: { mode: "raw", raw: body },
      url: url,
      description:
        useAuth
          ? "Set collection variable `authToken` (JWT from login). Omit or clear for public-only calls."
          : "",
    },
  };
}

const V = {
  email: "user@example.com",
  userId: "REPLACE_USER_ID",
  receiverId: "REPLACE_RECEIVER_ID",
  requestId: "REPLACE_REQUEST_ID",
  availabilityId: "REPLACE_AVAILABILITY_ID",
  courseId: "REPLACE_COURSE_ID",
  topicId: "REPLACE_TOPIC_ID",
  sessionId: "REPLACE_SESSION_ID",
  conversationId: "REPLACE_CONVERSATION_ID",
  notificationId: "REPLACE_NOTIFICATION_ID",
};

const collections = [];

// --- user-and-auth-service (host 3007) ---
const UA = "{{baseUrlUserAuth}}";
collections.push({
  name: "1. user-and-auth-service",
  description: "Direct: http://localhost:3007/ (Apollo POST to root)",
  item: [
    req("Query getAllUsers", UA, `query { getAllUsers { id email username profilePicture university academicYear phoneNumber } }`, {}, false),
    req(
      "Query getUser",
      UA,
      `query GetUser($email: String!) { getUser(email: $email) { id email username profilePicture university academicYear phoneNumber friends } }`,
      { email: V.email },
      false
    ),
    req(
      "Query me",
      UA,
      `query { me { id email username profilePicture university academicYear phoneNumber friends } }`,
      {}
    ),
    req(
      "Mutation register",
      UA,
      `mutation Register($input: createUserInput!) {
        register(input: $input) { id email username profilePicture university academicYear phoneNumber }
      }`,
      {
        input: {
          email: "newuser@example.com",
          password: "secret123",
          username: "newuser",
          profilePicture: null,
          university: "Example U",
          academicYear: 2,
          phoneNumber: "+1000000000",
        },
      },
      false
    ),
    req(
      "Mutation login",
      UA,
      `mutation Login($input: loginUserInput!) {
        login(input: $input) { token user { id email username } }
      }`,
      { input: { email: V.email, password: "secret123" } },
      false
    ),
    req(
      "Mutation deleteProfile",
      UA,
      `mutation DeleteProfile($email: String!) { deleteProfile(email: $email) { message user { id email } } }`,
      { email: V.email },
      true
    ),
    req(
      "Mutation updateUsername",
      UA,
      `mutation { updateUsername(username: "newName") { message old new } }`,
      {}
    ),
    req(
      "Mutation updateEmail",
      UA,
      `mutation { updateEmail(email: "updated@example.com") { message old new } }`,
      {}
    ),
    req(
      "Mutation updatePassword",
      UA,
      `mutation { updatePassword(password: "newSecret123") }`,
      {}
    ),
    req(
      "Mutation updateProfilePicture",
      UA,
      `mutation { updateProfilePicture(profilePicture: "https://example.com/pic.png") { message old new } }`,
      {}
    ),
    req(
      "Mutation updateUniversity",
      UA,
      `mutation { updateUniversity(university: "Other University") { message old new } }`,
      {}
    ),
    req(
      "Mutation updateAcademicYear",
      UA,
      `mutation { updateAcademicYear(academicYear: 3) { message old new } }`,
      {}
    ),
    req(
      "Mutation updatePhoneNumber",
      UA,
      `mutation { updatePhoneNumber(phoneNumber: "+49123456789") { message old new } }`,
      {}
    ),
  ],
});

// --- profile-and-study-preferences-service ---
const PR = "{{baseUrlProfile}}";
collections.push({
  name: "2. profile-and-study-preferences-service",
  description: "http://localhost:3001/ — JWT required for all operations.",
  item: [
    req(
      "Query getProfile",
      PR,
      `query {
        getProfile {
          id userId
          courses { id name profileId }
          topics { id name profileId }
          studyPreference { id profileId pace mode groupSize studyStyle }
        }
      }`,
      {}
    ),
    req(
      "Mutation addCourse",
      PR,
      `mutation { addCourse(name: "Linear Algebra") { id name profileId } }`,
      {}
    ),
    req(
      "Mutation deleteCourse",
      PR,
      `mutation DeleteCourse($courseId: String!) { deleteCourse(courseId: $courseId) { id name } }`,
      { courseId: V.courseId },
      {}
    ),
    req(
      "Mutation addTopic",
      PR,
      `mutation { addTopic(name: "Exam prep") { id name profileId } }`,
      {}
    ),
    req(
      "Mutation deleteTopic",
      PR,
      `mutation DeleteTopic($topicId: String!) { deleteTopic(topicId: $topicId) { id name } }`,
      { topicId: V.topicId },
      {}
    ),
    req(
      "Mutation upsertStudyPreference",
      PR,
      `mutation {
        upsertStudyPreference(pace: "medium", mode: "hybrid", groupSize: 3, studyStyle: "structured") {
          id profileId pace mode groupSize studyStyle
        }
      }`,
      {}
    ),
  ],
});

// --- matching-service ---
const MT = "{{baseUrlMatching}}";
collections.push({
  name: "3. matching-service",
  description: "http://localhost:3003/",
  item: [
    req(
      "Query userProfile",
      MT,
      `query UserProfile($userId: String!) { userProfile(userId: $userId) { id userId name email courses topics studyPace studyMode preferredGroupSize studyStyle availability createdAt updatedAt } }`,
      { userId: V.userId },
      false
    ),
    req(
      "Query userProfiles",
      MT,
      `query { userProfiles { id userId name email courses topics studyPace studyMode preferredGroupSize studyStyle availability } }`,
      {},
      false
    ),
    req(
      "Query recommendMatches",
      MT,
      `query Recommend($userId: String!, $maxResults: Int) {
        recommendMatches(userId: $userId, maxResults: $maxResults) {
          compatibilityScore reasons
          profile { id userId name email courses topics }
        }
      }`,
      { userId: V.userId, maxResults: 10 },
      false
    ),
    req(
      "Query buddyRequest",
      MT,
      `query BuddyReq($id: ID!) {
        buddyRequest(id: $id) { id requesterId receiverId status message createdAt updatedAt }
      }`,
      { id: V.requestId },
      false
    ),
    req(
      "Query myIncomingBuddyRequests",
      MT,
      `query In($status: BuddyRequestStatus) {
        myIncomingBuddyRequests(status: $status) { id requesterId receiverId status message createdAt updatedAt }
      }`,
      { status: null },
      true
    ),
    req(
      "Query myOutgoingBuddyRequests",
      MT,
      `query Out($status: BuddyRequestStatus) {
        myOutgoingBuddyRequests(status: $status) { id requesterId receiverId status message createdAt updatedAt }
      }`,
      { status: null },
      true
    ),
    req(
      "Mutation upsertUserProfile",
      MT,
      `mutation Upsert($profile: UserProfileInput!) {
        upsertUserProfile(profile: $profile) {
          id userId name email courses topics studyPace studyMode preferredGroupSize studyStyle availability updatedAt
        }
      }`,
      {
        profile: {
          userId: V.userId,
          name: "Alex",
          courses: ["CS101"],
          topics: ["Graphs"],
          studyPace: "medium",
          studyMode: "online",
          preferredGroupSize: 2,
          studyStyle: "collaborative",
          availability: [],
        },
      },
      true
    ),
    req(
      "Mutation deleteUserProfile",
      MT,
      `mutation DelProf($userId: String!) { deleteUserProfile(userId: $userId) }`,
      { userId: V.userId },
      true
    ),
    req(
      "Mutation sendBuddyRequest",
      MT,
      `mutation Send($input: SendBuddyRequestInput!) {
        sendBuddyRequest(input: $input) { id requesterId receiverId status message createdAt }
      }`,
      { input: { receiverId: V.receiverId, message: "Want to study?" } },
      true
    ),
    req(
      "Mutation respondToBuddyRequest",
      MT,
      `mutation Respond($requestId: ID!, $decision: BuddyRequestDecision!) {
        respondToBuddyRequest(requestId: $requestId, decision: $decision) { id status updatedAt }
      }`,
      { requestId: V.requestId, decision: "ACCEPT" },
      true
    ),
    req(
      "Mutation cancelBuddyRequest",
      MT,
      `mutation Cancel($requestId: ID!) {
        cancelBuddyRequest(requestId: $requestId) { id status updatedAt }
      }`,
      { requestId: V.requestId },
      true
    ),
  ],
});

// --- availability ---
const AV = "{{baseUrlAvailability}}";
collections.push({
  name: "4. availability-management-service",
  description: "http://localhost:3002/",
  item: [
    req(
      "Query getMyAvailability",
      AV,
      `query { getMyAvailability { id userId dayOfWeek startHour endHour createdAt } }`,
      {}
    ),
    req(
      "Query getAvailabilityById",
      AV,
      `query One($id: ID!) { getAvailabilityById(id: $id) { id userId dayOfWeek startHour endHour createdAt } }`,
      { id: V.availabilityId },
      {}
    ),
    req(
      "Mutation addAvailability",
      AV,
      `mutation Add($input: AddAvailabilityInput!) {
        addAvailability(input: $input) { id userId dayOfWeek startHour endHour createdAt }
      }`,
      {
        input: {
          days: [
            { dayOfWeek: "Monday", startHour: 14, endHour: 17 },
            { dayOfWeek: "Wednesday", startHour: 10, endHour: 12 },
          ],
        },
      },
      true
    ),
    req(
      "Mutation updateAvailability",
      AV,
      `mutation Upd($id: ID!, $input: UpdateAvailabilityInput!) {
        updateAvailability(id: $id, input: $input) { id dayOfWeek startHour endHour }
      }`,
      {
        id: V.availabilityId,
        input: { dayOfWeek: "Tuesday", startHour: 15, endHour: 18 },
      },
      true
    ),
    req(
      "Mutation deleteAvailability",
      AV,
      `mutation Del($id: ID!) { deleteAvailability(id: $id) { message id } }`,
      { id: V.availabilityId },
      true
    ),
  ],
});

// --- notification ---
const NT = "{{baseUrlNotification}}";
collections.push({
  name: "5. notification-service",
  description: "http://localhost:3005/",
  item: [
    req(
      "Query getMyNotifications",
      NT,
      `query { getMyNotifications { id recipient subject message date readStatus } }`,
      {}
    ),
    req(
      "Mutation sendNotification",
      NT,
      `mutation Send($input: sendPayload!) {
        sendNotification(input: $input)
      }`,
      {
        input: {
          recipient: V.email,
          subject: "Hello",
          message: "Test notification body",
        },
      },
      true
    ),
    req(
      "Mutation openNotification",
      NT,
      `mutation Open($notificationID: ID!) {
        openNotification(notificationID: $notificationID) { id readStatus subject message }
      }`,
      { notificationID: V.notificationId },
      true
    ),
  ],
});

// --- study session ---
const SS = "{{baseUrlStudySession}}";
collections.push({
  name: "6. study-session-scheduling-service",
  description: "http://localhost:3004/",
  item: [
    req(
      "Query session",
      SS,
      `query Session($id: String!) {
        session(id: $id) {
          id topic description dateTime duration sessionType creatorId contactInfo
          participants { id userId joinedAt }
          createdAt updatedAt
        }
      }`,
      { id: V.sessionId },
      false
    ),
    req(
      "Query sessions",
      SS,
      `query {
        sessions {
          id topic description dateTime duration sessionType creatorId contactInfo
          participants { userId joinedAt }
        }
      }`,
      {},
      false
    ),
    req(
      "Query sessionsByUser",
      SS,
      `query ByUser($userId: String!) {
        sessionsByUser(userId: $userId) { id topic dateTime duration sessionType creatorId }
      }`,
      { userId: V.userId },
      false
    ),
    req(
      "Mutation createSession",
      SS,
      `mutation Create($input: CreateSessionInput!) {
        createSession(input: $input) {
          id topic description dateTime duration sessionType creatorId contactInfo participants { userId }
        }
      }`,
      {
        input: {
          topic: "Calculus review",
          description: "Chapter 5",
          dateTime: new Date().toISOString(),
          duration: 90,
          sessionType: "ONLINE",
          creatorId: V.userId,
          contactInfo: "discord: user#123",
        },
      },
      false
    ),
    req(
      "Mutation updateSession",
      SS,
      `mutation Upd($sessionId: String!, $input: UpdateSessionInput!) {
        updateSession(sessionId: $sessionId, input: $input) { id topic description dateTime duration sessionType contactInfo updatedAt }
      }`,
      {
        sessionId: V.sessionId,
        input: { topic: "Updated topic", duration: 60 },
      },
      false
    ),
    req(
      "Mutation joinSession",
      SS,
      `mutation Join($sessionId: String!, $userId: String!) {
        joinSession(sessionId: $sessionId, userId: $userId) { id participants { userId } }
      }`,
      { sessionId: V.sessionId, userId: V.userId },
      false
    ),
    req(
      "Mutation leaveSession",
      SS,
      `mutation Leave($sessionId: String!, $userId: String!) {
        leaveSession(sessionId: $sessionId, userId: $userId) { id participants { userId } }
      }`,
      { sessionId: V.sessionId, userId: V.userId },
      false
    ),
    req(
      "Mutation cancelSession",
      SS,
      `mutation Cancel($sessionId: String!, $userId: String!) {
        cancelSession(sessionId: $sessionId, userId: $userId)
      }`,
      { sessionId: V.sessionId, userId: V.userId },
      false
    ),
  ],
});

// --- messaging ---
const MS = "{{baseUrlMessaging}}";
collections.push({
  name: "7. messaging-service",
  description:
    "http://localhost:8000/ (HTTP). Subscriptions use WebSocket ws://localhost:8001/graphql — not included as REST; use Apollo Studio or a WS client.",
  item: [
    req(
      "Query getUserConversations",
      MS,
      `query {
        getUserConversations {
          id users createDate
          messages { id senderId message conversationId sendDate }
        }
      }`,
      {}
    ),
    req(
      "Mutation sendMessage",
      MS,
      `mutation Send($input: SendMessageInput!) {
        sendMessage(input: $input) { response message { id senderId message conversationId sendDate } }
      }`,
      {
        input: {
          conversationId: V.conversationId,
          message: "Hello from collection",
        },
      },
      true
    ),
    req(
      "Mutation createConversation",
      MS,
      `mutation Create($input: CreateConversationInput!) {
        createConversation(input: $input) { id users createDate }
      }`,
      { input: { addedUser: V.receiverId } },
      true
    ),
  ],
});

// --- feedback-trust ---
const FB = "{{baseUrlFeedbackTrust}}";
collections.push({
  name: "8. feedback-trust-service",
  description: "http://localhost:4010/",
  item: [
    req(
      "Query healthCheck",
      FB,
      `query { healthCheck }`,
      {},
      false
    ),
    req(
      "Query trustProfile",
      FB,
      `query Trust($userId: String!) { trustProfile(userId: $userId) { userId averageRating reliabilityScore totalReviews noShowCount updatedAt } }`,
      { userId: V.userId },
      false
    ),
    req(
      "Query myTrustProfile",
      FB,
      `query { myTrustProfile { userId averageRating reliabilityScore totalReviews noShowCount updatedAt } }`,
      {}
    ),
    req(
      "Query myReceivedFeedback",
      FB,
      `query { myReceivedFeedback { id sessionId reviewerId revieweeId overallRating punctuality helpfulness communication noShow comment createdAt } }`,
      {}
    ),
    req(
      "Query sessionFeedback",
      FB,
      `query Sf($sessionId: String!) {
        sessionFeedback(sessionId: $sessionId) { id reviewerId revieweeId overallRating comment }
      }`,
      { sessionId: V.sessionId },
      false
    ),
    req(
      "Mutation submitFeedback",
      FB,
      `mutation Submit($input: SubmitFeedbackInput!) {
        submitFeedback(input: $input) {
          id sessionId reviewerId revieweeId overallRating punctuality helpfulness communication noShow comment createdAt
        }
      }`,
      {
        input: {
          sessionId: V.sessionId,
          revieweeId: V.receiverId,
          overallRating: 5,
          punctuality: 5,
          helpfulness: 4,
          communication: 5,
          noShow: false,
          comment: "Great session",
        },
      },
      true
    ),
  ],
});

// --- Gateway (optional single entry) ---
const GW = "{{baseUrlGateway}}";
collections.push({
  name: "9. graphql-gateway (stitched)",
  description:
    "http://localhost:4001/ — merges subgraphs; forward Authorization to subgraphs. Conflicting type/field names across services may fail stitching — prefer direct service folders for reliability.",
  item: [
    req(
      "Gateway: health via feedback subgraph",
      GW,
      `query { healthCheck }`,
      {},
      false
    ),
    req(
      "Gateway: me (auth)",
      GW,
      `query { me { id email username } }`,
      {},
      true
    ),
    req(
      "Gateway: getProfile (auth)",
      GW,
      `query { getProfile { id userId } }`,
      {},
      true
    ),
  ],
});

const collection = {
  info: {
    name: "StudyBuddyMatcher — GraphQL (all services)",
    description:
      `Postman Collection v2.1. Import into Postman, Insomnia, or Thunder Client (File → Import).\n\n` +
      `**Endpoints (docker-compose host ports)**\n` +
      `- user-and-auth: \`localhost:3007\` (container maps 3007→3000)\n` +
      `- profile: \`3001\` · matching: \`3003\` · availability: \`3002\` · study-session: \`3004\` · notification: \`3005\` · messaging: \`8000\` · feedback-trust: \`4010\` · gateway: \`4001\`\n\n` +
      `Apollo Server standalone: **POST /** with JSON body \`{ "query": "...", "variables": {} }\`.\n\n` +
      `**Apollo Sandbox**: open the service URL in a browser (e.g. \`http://localhost:3001/\`) when introspection is enabled.\n\n` +
      `Set **authToken** after login (JWT). Services that verify JWT expect \`Authorization: Bearer <token>\`.`,
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrlUserAuth", value: "http://localhost:3007" },
    { key: "baseUrlProfile", value: "http://localhost:3001" },
    { key: "baseUrlMatching", value: "http://localhost:3003" },
    { key: "baseUrlAvailability", value: "http://localhost:3002" },
    { key: "baseUrlStudySession", value: "http://localhost:3004" },
    { key: "baseUrlNotification", value: "http://localhost:3005" },
    { key: "baseUrlMessaging", value: "http://localhost:8000" },
    { key: "baseUrlFeedbackTrust", value: "http://localhost:4010" },
    { key: "baseUrlGateway", value: "http://localhost:4001" },
    { key: "authToken", value: "" },
  ],
  item: collections,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(collection, null, 2), "utf8");
console.log("Wrote", outPath);
