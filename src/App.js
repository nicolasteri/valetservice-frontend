import React from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";
import CompanyLogin from "./pages/CompanyLogin";
import OperatorLogin from "./pages/OperatorLogin";
import ManagerDashboard from "./pages/ManagerDashboard";
import ErrorBoundary from "./components/ErrorBoundary";
// import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <>
      <Navbar />

      {/* Toast container globale */}
      <ToastContainer position="bottom-center" autoClose={2500} />

      <Routes>
        {/* Routes pubbliche */}
        <Route path="/" element={<CompanyLogin />} />
        <Route path="/company-login" element={<CompanyLogin />} />
        <Route path="/operator-login" element={<OperatorLogin />} />
        <Route path="/manager-dashboard" element={<ManagerDashboard />} />

        {/* Dashboard protetta dall’ErrorBoundary */}
        <Route
          path="/dashboard"
          element={
            <ErrorBoundary>
              {/* Se più avanti riattivi PrivateRoute, wrappa Dashboard qui dentro */}
              <Dashboard />
            </ErrorBoundary>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
