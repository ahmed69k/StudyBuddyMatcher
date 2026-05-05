import { Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Register from "./components/Register";
import Login from "./components/Login";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import MatchingPage from "./pages/MatchingPage";
import MatchingProfileSetupPage from "./pages/MatchingProfileSetupPage";
import MatchDetailPage from "./pages/MatchDetailPage";
import StudySessionsPage from "./pages/StudySessionsPage";
import SessionCreatePage from "./pages/SessionCreatePage";
import SessionDetailPage from "./pages/SessionDetailPage";
import Notifications from "./pages/Notifications/Notifications";
import NotificationDetailsPage from "./pages/Notifications/NotificationDetailsPage";
import ProfileEdit from "./pages/Profile/ProfileEdit.jsx";
import ProfilePage from "./pages/Profile/Profile.jsx";

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications></Notifications>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <ProfileEdit/>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage/>
          </ProtectedRoute>
        } />

        <Route path="/notifications/:id" element={
          <ProtectedRoute>
            <NotificationDetailsPage />
          </ProtectedRoute>
        } />
        <Route
          path="/matches/setup"
          element={
            <ProtectedRoute>
              <MatchingProfileSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches/view/:userId"
          element={
            <ProtectedRoute>
              <MatchDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/matches"
          element={
            <ProtectedRoute>
              <MatchingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/new"
          element={
            <ProtectedRoute>
              <SessionCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/:sessionId"
          element={
            <ProtectedRoute>
              <SessionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions"
          element={
            <ProtectedRoute>
              <StudySessionsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;