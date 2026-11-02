import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Donors from "./pages/Donors";
import BloodStock from "./pages/BloodStock";
import Requests from "./pages/Requests";
import Reports from "./pages/Reports";
import Matcher from "./pages/Matcher";
import RequestTrack from "./pages/RequestTrack";
import Admin from "./pages/Admin";
import { ThemeProvider } from "./context/ThemeContext";

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function Shell() {
  const { user } = useAuth();
  return (
    <div className={user ? "app-shell" : "public-shell"}>
      <Navbar />
      <main className="main">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/donors"
          element={
            <PrivateRoute>
              <Donors />
            </PrivateRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <PrivateRoute>
              <BloodStock />
            </PrivateRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <PrivateRoute>
              <Requests />
            </PrivateRoute>
          }
        />
        <Route
          path="/requests/:id"
          element={
            <PrivateRoute>
              <RequestTrack />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <Admin />
            </PrivateRoute>
          }
        />
        <Route
          path="/matcher"
          element={
            <PrivateRoute allowedRoles={["admin", "hospital"]}>
              <Matcher />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <Reports />
            </PrivateRoute>
          }
        />
      </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ThemeProvider>
  );
}
