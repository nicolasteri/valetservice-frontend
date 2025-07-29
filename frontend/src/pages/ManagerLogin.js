import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { showToast } from "../utils/ui/showToast";

function ManagerLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const companyIdParam = queryParams.get("company_id");

  const [managerCodeFormatted, setManagerCodeFormatted] = useState("");

  // 🔠 Formatta visivamente in 123-456-789
  const handleInputChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    const formatted = raw.match(/.{1,3}/g)?.join("-").slice(0, 11) || "";
    setManagerCodeFormatted(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!companyIdParam) {
      showToast.error("Missing company reference");
      navigate("/company-login");
      return;
    }

    const rawManagerCode = managerCodeFormatted.replace(/-/g, "");

    try {
      const response = await axios.post("http://api.italinks.com/valet/verify_codes.php", {
        company_code: companyIdParam,
        manager_code: rawManagerCode,
      });

      if (response.data.success && response.data.access_level === "MANAGER") {
        localStorage.setItem("company_id", response.data.company_id);
        showToast.success("Manager login successful!");
        navigate("/manager-dashboard");
      } else {
        showToast.error(response.data.error || "Invalid manager code");
      }
    } catch (error) {
      console.error(error);
      showToast.error("Server error during login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center">Manager Login</h2>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2">Manager Code</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{9}|\d{3}-\d{3}-\d{3}"
            className="border p-2 w-full rounded mb-4 tracking-widest text-center"
            value={managerCodeFormatted}
            onChange={handleInputChange}
            placeholder="123-456-789"
            maxLength={11}
            required
          />
          <button type="submit" className="bg-purple-600 text-white w-full py-2 rounded">
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

export default ManagerLogin;
