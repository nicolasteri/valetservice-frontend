import React from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import Dashboard from "./pages/Dashboard";
import NotFoundPage from "./pages/NotFoundPage";
import './App.css';
import CompanyLogin from "./pages/CompanyLogin";
import OperatorLogin from "./pages/OperatorLogin";
import ManagerDashboard from "./pages/ManagerDashboard";

function App() {
  return (
    <>
      <Navbar />

      {/* Toast container globale */}
      <ToastContainer position="bottom-center" autoClose={2500} />

      <Routes>
        {/* Routes publiques */} 
        <Route path="/" element={<CompanyLogin />} />
        <Route path="/company-login" element={<CompanyLogin />} />
        <Route path="/operator-login" element={<OperatorLogin />} />
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />

        <Route
          path="/dashboard"
          element={<Dashboard />} />
            {/*<PrivateRoute>
              <Dashboard />
            </PrivateRoute>*/}
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
