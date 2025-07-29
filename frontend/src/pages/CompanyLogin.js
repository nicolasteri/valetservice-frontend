import React, { useState } from "react";
import axios from "axios";
import { showToast } from "../utils/ui/showToast";
import { useNavigate } from "react-router-dom";

function CompanyLogin() {
  const [companyCodeFormatted, setCompanyCodeFormatted] = useState("");
  const [companyId, setCompanyId] = useState(null);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleCompanyCodeChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    const formatted = raw.match(/.{1,3}/g)?.join("-").slice(0, 11) || "";
    setCompanyCodeFormatted(formatted);
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    const rawCompanyCode = companyCodeFormatted.replace(/-/g, "");

    try {
      const response = await axios.post("https://api.italinks.com/valet/verify_codes.php", {
        company_code: rawCompanyCode,
      });

      if (response.data.success && response.data.access_level === "COMPANY_ONLY") {
        setCompanyId(response.data.company_id);
        setStep(2);
      } else {
        showToast.error("Company code not valid.");
      }
    } catch (error) {
      showToast.error("Server error.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center">Company Access</h2>

        {step === 1 && (
          <form onSubmit={handleCompanySubmit}>
            <label className="block mb-2">Company Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{9}|\d{3}-\d{3}-\d{3}"
              className="border p-2 w-full rounded mb-4 tracking-widest text-center"
              value={companyCodeFormatted}
              onChange={handleCompanyCodeChange}
              placeholder="123-456-789"
              maxLength={11}
              required
            />
            <button type="submit" className="bg-blue-600 text-white w-full py-2 rounded">
              Next
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <button
              className="bg-green-600 text-white w-full py-2 rounded"
              onClick={() =>
                navigate(`/operator-login?company_code=${companyCodeFormatted.replace(/-/g, "")}`)
              }
            >
              Operator Access
            </button>
            <button
              className="bg-purple-600 text-white w-full py-2 rounded"
              onClick={() => navigate(`/manager-login?company_id=${companyId}`)}
            >
              Manager Access
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompanyLogin;
