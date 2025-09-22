import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { showToast } from "../utils/ui/showToast";
import { api } from "../api.js";

const isDev = process.env.NODE_ENV !== "production";

function OperatorLogin() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const companyCodeRaw = queryParams.get("company_code"); // da URL, come nel tuo file

  const [locationCode, setLocationCode] = useState("");

  // Prima controllavi localStorage company_id; ora controlliamo la query "company_code"
  useEffect(() => {
    if (!companyCodeRaw) {
      showToast.error("Missing company reference");
      navigate("/company-login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyCodeRaw, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // normalizza i codici: solo cifre
    const cleanCompanyCode = (companyCodeRaw || "").replace(/\D/g, "");
    const cleanLocationCode = (locationCode || "").replace(/\D/g, "");

    if (isDev) {
      console.log("Sending to API:", {
        location_code: cleanLocationCode,
        company_code: cleanCompanyCode,
      });
    }

    try {
      const { data } = await api.post("/operator_login.php", {
        location_code: cleanLocationCode,
        company_code: cleanCompanyCode,
      });

      if (isDev) console.log("API response:", data);

      if (data?.success) {
        // ✅ Sessione è nel cookie HttpOnly: NON salviamo IDs nel localStorage.
        // Se la tua UI header usa i nomi da localStorage, puoi (temporaneamente) salvarne SOLO i nomi:
        // localStorage.setItem("company_name", data.company_name);
        // localStorage.setItem("location_name", data.location_name);

        // (facoltativo) valida la sessione e/o carica contesto
        try {
          await api.get("/me.php");
        } catch {
          // se fallisce, non bloccare il redirect: la sessione è già attiva
        }

        showToast.success(`Welcome to ${data.location_name}`);

        setTimeout(() => {
          if (isDev) console.log("🚀 Redirecting to dashboard...");
          navigate("/dashboard");
        }, 300);
      } else {
        showToast.error(data?.error || "Invalid location code");
      }
    } catch (error) {
      showToast.error("Server error during login");
      if (isDev) console.error(error);
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
            placeholder="xxxx"
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
