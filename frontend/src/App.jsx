import { Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ReportCrime from "./pages/ReportCrime";
import Authority from "./pages/Authority";
import Admin from "./pages/Admin";
import ViewIncidents from "./pages/ViewIncidents"; // <-- Add import
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/report" element={<ProtectedRoute><ReportCrime /></ProtectedRoute>} />
      
      {/* Add the new protected route here */}
      <Route path="/view-incidents" element={<ProtectedRoute><ViewIncidents /></ProtectedRoute>} />
      
      <Route path="/authority" element={<ProtectedRoute><Authority /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}