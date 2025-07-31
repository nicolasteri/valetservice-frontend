import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { showToast } from "../utils/ui/showToast";

function OperatorLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const companyCodeRaw = queryParams.get("company_code");

  const [locationCode, setLocationCode] = useState("");
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    const storedCompanyId = localStorage.getItem("company_id");
    if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId));
    } else {
      showToast.error("Missing company reference");
      navigate("/company-login");
    }
  }, [navigate]);
 
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanCompanyCode = companyCodeRaw?.replace(/-/g, "") || "";

    // 🧪 DEBUG START
    console.log("Sending to API:", {
    location_code: locationCode,
    company_code: cleanCompanyCode,
    });
    // 🧪 DEBUG END

    try {
      const response = await axios.post("https://api.italinks.com/valet/operator_login.php", {
        location_code: locationCode,
        company_code: cleanCompanyCode,
      });

      // 🧪 DEBUG: log della risposta dal backend
      console.log("API response:", response.data);

      const data = response.data;

      if (data.success) {
        localStorage.setItem("company_id", data.company_id);
        localStorage.setItem("location_id", data.location_id);
        localStorage.setItem("company_name", data.company_name);
        localStorage.setItem("location_name", data.location_name);

        showToast.success(`Welcome to ${data.location_name}`);

        console.log("✅ Dati salvati nel localStorage, pronto a navigare");

        // 👇 Aspetta 100ms per assicurarti che i dati siano scritti prima del redirect
        setTimeout(() => {
          console.log("🚀 Redirecting to dashboard...");
          navigate("/dashboard");
        }, 500);
      }
      else {
              showToast.error(data.error || "Invalid location code");
            }
          } catch (error) {
            showToast.error("Server error during login");
          }
        };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center">Operator Login</h2>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2">Location Code</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            className="border p-2 w-full rounded mb-4 text-center"
            value={locationCode}
            onChange={(e) => setLocationCode(e.target.value.replace(/\D/g, ""))}
            placeholder="1234"
            maxLength={4}
            required
          />
          <button type="submit" className="bg-blue-600 text-white w-full py-2 rounded">
            Enter Dashboard
          </button>
        </form>
      </div>
    </div>
  );
}

export default OperatorLogin;
