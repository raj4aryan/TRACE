import { Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login.jsx"; // the file must be named exactly Login.jsx (capital L)
import ReportCrime from "./pages/ReportCrime";
import MyReports from "./pages/MyReports";
import Authority from "./pages/Authority";
import Admin from "./pages/Admin";
import ViewIncidents from "./pages/ViewIncidents";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestOnly from "./components/GuestOnly";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/report" element={<ProtectedRoute area="report"><ReportCrime /></ProtectedRoute>} />
        <Route path="/my-reports" element={<ProtectedRoute area="myreports"><MyReports /></ProtectedRoute>} />
        <Route path="/view-incidents" element={<ProtectedRoute area="incidents"><ViewIncidents /></ProtectedRoute>} />
        <Route path="/authority" element={<ProtectedRoute area="review"><Authority /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute area="admin"><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}