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

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
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