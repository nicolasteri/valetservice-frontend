import React, { useState, useEffect } from "react";
import { FaWifi, FaDatabase, FaCog, FaTimesCircle } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import { showToast } from "../utils/ui/showToast";
import axios from "axios";
// import ShiftTracker from "../components/shifttracker";
import GoogleSheetShift from "../components/GoogleSheetShift";
import { confirmAndUpdatePopup } from "../utils/ui/ConfirmPopup";
import "react-confirm-alert/src/react-confirm-alert.css";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dbConnected, setDbConnected] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [customerData, setCustomerData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    vehicle_model: "",
    color: "",
    tag_number: "",
  });
  const resetCustomerForm = () => {
    setCustomerData({
      first_name: "",
      last_name: "",
      phone_number: "",
      vehicle_model: "",
      color: "",
      tag_number: "",
    });
  };
  const [companyId, setCompanyId] = useState(null);
  const [locationId, setLocationId] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [customers, setCustomers] = useState([]);
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [highlightTag, setHighlightTag] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(null);

  // Ordine di visualizzazione: più basso = più in alto nella dashboard
  const statusPriority = { PENDING: 0, CARE: 0, IN: 1 };   // più basso = più importante

  const sortByPriority = (arr) =>
    [...arr].sort((a, b) => {
      const pa = statusPriority[a.status] ?? 99;
      const pb = statusPriority[b.status] ?? 99;
      if (pa !== pb) return pa - pb;                       // gruppo per status
      return new Date(a.touchedAt) - new Date(b.touchedAt); // FIFO interno al gruppo
  });

  const formatElapsedTime = (timestamp) => {
    if (!timestamp) return "00:00";
    const now = currentTime;
    const start = new Date(timestamp).getTime();
    const diff = Math.floor((now - start) / 1000); // in secondi

    if (diff < 0) return "00:00";

    const hours = String(Math.floor(diff / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");

    return `${hours}h ${minutes}m`;
  };

  // Funzione per ordinare e timer status PENDING e CARE 
  const customSort = (customers) => {
    const pending = customers
      .filter((c) => c.status === "PENDING")
      .sort((a, b) => new Date(a.requested_at) - new Date(b.requested_at));
    const care = customers
      .filter((c) => c.status === "CARE")
      .sort((a, b) => new Date(a.requested_at) - new Date(b.requested_at));
    const inside = customers
      .filter((c) => c.status === "IN")
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return [...pending, ...care, ...inside];
  };


  // Blocco per login e controllo dati
  const [isLoading, setIsLoading] = useState(true); // stato isLoading per bloccare il render finché non ha verificato i dati x accesso

  useEffect(() => {
    const companyIdRaw = localStorage.getItem("company_id");
    const locationIdRaw = localStorage.getItem("location_id");
    const storedLocationName = localStorage.getItem("location_name");

    console.log("🚨 DASHBOARD localStorage check:");
    console.log("company_id (raw):", companyIdRaw);
    console.log("location_id (raw):", locationIdRaw);

    const parsedCompanyId = parseInt(companyIdRaw, 10);
    const parsedLocationId = parseInt(locationIdRaw, 10);

    if (!companyIdRaw || !locationIdRaw || isNaN(parsedCompanyId) || isNaN(parsedLocationId)) {
      showToast.error("Access denied. Please login.");
      navigate("/company-login");
      return;
    }

    // ✅ Set all at once
    setCompanyId(parsedCompanyId);
    setLocationId(parsedLocationId);
    if (storedLocationName) setLocationName(storedLocationName);

  }, [navigate]);

  useEffect(() => {
    if (
      typeof companyId === "number" &&
      typeof locationId === "number" &&
      !isNaN(companyId) &&
      !isNaN(locationId)
    ) {
      triggerOvernightUpdate();
      fetchCustomers();
      setIsLoading(false);
    }
  }, [companyId, locationId, filterStatus, searchQuery]);

 
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);


  const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentTime(Date.now()); // Forza il re-render ogni minuto
      }, 60000); // 60 secondi
      return () => clearInterval(interval); // pulizia
    }, []);


  const checkPhoneNumber = async (phone) => {
    try {
      const response = await axios.post("http://api.italinks.com/valet/check_phone.php", {
        phone_number: phone,
        company_id: companyId,
      });

      if (response.data.success && response.data.exists) {
        setExistingCustomer(response.data.customer);
        setShowExistingModal(true);
      }
    } catch (error) {
      showToast.error("Error in number control!");
    }
  };

  const fetchCustomers = () => {
    if (!locationId || !companyId) {
      console.warn("⚠️ fetchCustomers aborted: missing locationId or companyId");
      return;
    }

    // DEBUG
    console.log("📤 Sending filters:", {
      location_id: locationId,
      company_id: companyId,
      status: filterStatus,
      search: searchQuery,
      timeRange: "today"
    });

    fetch("http://api.italinks.com/valet/get_customers.php", {
      method: "POST",
      headers: {"Content-Type": "application/json",},
            // DOPO – niente field “status” se siamo in CLEAR-filter
      body: JSON.stringify({
        location_id: locationId,
        company_id: companyId,
        ...(filterStatus !== "ALL" && { status: filterStatus }), // <-- solo se diverso da ALL
        search: searchQuery,
        timeRange: "today"
      }),

    })
      .then((res) => {
        setDbConnected(res.ok);
        return res.json();
      })
      .then((data) => {
        if (data.success && data.customers) {

          const prepared = data.customers.map((c) => ({
            ...c,
            touchedAt: c.touchedAt || c.created_at,  // se il back-end lo manda ok; altrimenti fallback
          }));

          setCustomers(sortByPriority(prepared));    // 👈 set già ordinato
        } else {
          console.error("❌ Failed fetching customers:", data.error || data);
        }
      })

      .catch((err) => {
        console.error("🔥 Fetch error:", err);
        setDbConnected(false);
      });
  };

  const triggerOvernightUpdate = () => {
    if (!companyId || !locationId) {
      console.warn("⚠️ fetchCustomers aborted: missing locationId or companyId");
      return;
    }

    fetch("http://api.italinks.com/valet/update_overnight.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_id: companyId, location_id: locationId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          console.error("🔥 Overnight update error:", data.error);
        } else {
          console.log("🌙 Overnight updated:", data.count);
        }
      })
      .catch((err) => {
        console.error("❌ Overnight fetch failed", err);
      });
  };


  

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedValue = value;
  
    // Limita phone_number a 10 cifre
    if (name === "phone_number") {
      updatedValue = value.replace(/\D/g, "").slice(0, 10);
    }
  
    setCustomerData({ ...customerData, [name]: updatedValue });
  
    // Controlla nel DB quando inserisci la decima cifra
    if (name === "phone_number" && updatedValue.length === 10) {
      checkPhoneNumber(updatedValue);
    }
  }; 

  const handleClearSearch = () => setSearchQuery("");

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (!customerData.tag_number) {
      setHighlightTag(true);
      showToast.error("Insert Tag Number!");
      setTimeout(() => setHighlightTag(false), 1500);
      return;
    }
  
    try {
      const company_id = companyId;
      const location_id = locationId;
  
      // 🔍 Controlla se il cliente esiste già per questa company
      const responseCheck = await axios.post(
        "http://api.italinks.com/valet/check_phone.php",
        {
          phone_number: customerData.phone_number,
          company_id,
        }
      );
  
      if (responseCheck.data.success && responseCheck.data.exists) {
        // ✅ Cliente già registrato: crea solo record e aggiorna tag
        const customer_id = responseCheck.data.customer.customer_id;
  
        const responseAdd = await axios.post(
          "http://api.italinks.com/valet/add_existing_customer.php",
          {
            customer_id,
            tag_number: parseInt(customerData.tag_number),
            location_id,
          }
        );
  
        if (responseAdd.data.success) {
          showToast.success("Customer added successfully!");
          setShowFormModal(false);
          resetCustomerForm();
          fetchCustomers();
        } else {
          showToast.error("Error: " + responseAdd.data.error);
        }
  
      } else {
        // ✅ Cliente nuovo: registra tutto
        const payload = {
          ...customerData,
          company_id,
          location_id,
        };
  
        const responseNew = await fetch("http://api.italinks.com/valet/add_customers.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
  
        const dataNew = await responseNew.json();
  
        if (dataNew.success) {
          showToast.success("Customer added successfully!");
          setShowFormModal(false);
          resetCustomerForm();
          fetchCustomers();
        } else {
          showToast.error("Error: " + dataNew.error);
        }
      }
    } catch (error) {
      showToast.error("Connection error");
    }
  };

  const [tagStatus, setTagStatus] = useState(null); // 'available' | 'unavailable' | null
  const [checkingTag, setCheckingTag] = useState(false); // per gestire eventuale spinner


  const checkTagAvailability = async () => {
    if (!customerData.tag_number) {
      setTagStatus(null);
      return;
    }

    setCheckingTag(true);

    try {
      const response = await fetch("http://api.italinks.com/valet/check_tag.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tag_number: parseInt(customerData.tag_number),
          location_id: locationId,
          company_id: companyId,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("Errore nel controllo tag:", data.error || "Errore sconosciuto");
        setTagStatus(null);
      } else {
        setTagStatus(data.available ? "available" : "unavailable");
      }
    } catch (error) {
      console.error("Tag check failed", error);
      setTagStatus(null);
    }

    setCheckingTag(false);
  };



  const handleUseExistingCustomer = async () => {
    if (!customerData.tag_number) {
      setHighlightTag(true);
      showToast.error("Insert Tag Number!");
      setTimeout(() => setHighlightTag(false), 1500);
      return;
    }
  
    try {
      const location_id = locationId;

      const response = await axios.post("http://api.italinks.com/valet/add_existing_customer.php", {
        customer_id: existingCustomer.customer_id,
        tag_number: parseInt(customerData.tag_number),
        location_id,
        company_id: companyId
      });
  
      if (response.data.success) {
        showToast.success("Existing customer added successfully!");
        setShowExistingModal(false);
        setShowFormModal(false);
        resetCustomerForm();
        fetchCustomers();
      } else {
        showToast.error("Error: " + response.data.error);
      }
    } catch (error) {
      showToast.error("Server Error.");
    }
  };
  
  const updateStatus = async (customer_id, status) => {
    try {
      const response = await fetch("http://api.italinks.com/valet/update_customer_status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id,
          status,
          company_id: companyId,
          location_id: locationId,
          tag_number: selectedCustomer?.tag_number || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showToast.success("Status updated to " + status);

        setCustomers((prev) =>
          sortByPriority(
            prev.map((c) => {
              if (c.customer_id !== customer_id) return c;

              const updated = {
                ...c,
                status,
                touchedAt: Date.now(),
              };

              // ⏱ Se status diventa PENDING → parte il timer
              if (status === "PENDING") {
                updated.requested_at = new Date().toISOString();
              }

              // ➕ Se status diventa CARE → conserva il requested_at esistente
              else if (status === "CARE") {
                updated.requested_at = c.requested_at || null;
              }

              // 🧼 Se torna a IN → azzera il timer
              else if (status === "IN") {
                updated.requested_at = null;
              }

              // ✅ Se OUT → conserva requested_at per analisi
              else if (status === "OUT") {
                updated.requested_at = c.requested_at || null;
              }

              return updated;
            })
          )
        );

        setSelectedCustomer(null);
      } else {
        showToast.error("Status update failed: " + data.error);
      }
    } catch (error) {
      console.error("🔥 Error updating status:", error);
      showToast.error("An error occurred while updating status.");
    }
  };

 
    const handleCustomerClick = (customer) => {
      setSelectedCustomer(
        selectedCustomer?.customer_id === customer.customer_id ? null : customer
      );
    };
  

  const isToday = (createdAt) => {
    const entry = new Date(createdAt);
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(5, 0, 0, 0);
    if (now.getHours() < 5) start.setDate(start.getDate() - 1);
    end.setDate(start.getDate() + 1);
    end.setHours(4, 59, 59, 999);
    return entry >= start && entry <= end;
  };

  const getElapsedTime = (createdAt) => {
    const now = currentTime;
    const created = new Date(createdAt).getTime();
    const diff = now - created;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };


  const todayCustomers = customers.filter(c => isToday(c.created_at));
  const inToday = todayCustomers.length;
  const nowCount = todayCustomers.filter(c => ["IN", "PENDING", "CARE"].includes(c.status)).length;
  const outCount = todayCustomers.filter(c => c.status === "OUT").length;
  const overnightCustomers = customers.filter(c => c.status === "OVERNIGHT");
  const countOvernight = overnightCustomers.length;

  const filteredCustomers = sortByPriority(todayCustomers   
      .filter(c => !["OUT", "OVERNIGHT"].includes(c.status))
      .filter((c) => {
        const search = searchQuery.toLowerCase();
        const matchesSearch =
          c.first_name.toLowerCase().includes(search) ||
          c.last_name.toLowerCase().includes(search) ||
          c.phone_number.includes(search) ||
          (c.tag_number && c.tag_number.toString().includes(search));
        const matchesStatus = filterStatus === "ALL" || c.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
  );


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl font-semibold text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      
      {/* NAV BAR */}
  <div className="flex justify-between items-center bg-white px-6 py-3 shadow z-20">

  {/* Nome + Icone connessione */}
  <div className="flex items-center gap-3">
    <div className="text-lg font-semibold text-gray-800">
      {locationName || "Valet Dashboard"}
    </div>
    <div className="flex items-center gap-2">
      <FaWifi className={`text-2xl ${isOnline ? "text-green-500" : "text-red-500"}`} />
      <FaDatabase className={`text-2xl ${dbConnected ? "text-green-500" : "text-red-500"}`} />
    </div>
  </div>

  {/* Contatori */}
  <div className="flex gap-6 items-center text-sm font-semibold bg-gray-100 p-2 rounded-md">
    <div className="text-black-600">TOT: {inToday}</div>
    <div className="text-black-600">NOW: {nowCount}</div>
    <div className="text-black-600">OUT: {outCount}</div>

    {countOvernight > 0 && (
      <div className="text-black-600">OVN: {countOvernight}</div>
    )}
  </div>

  {/* Bottone impostazioni */}
  <button onClick={() => setShowSettingsModal(true)}>
    <FaCog className="text-2xl text-gray-500 hover:text-gray-700" title="Settings" />
  </button>

  </div>


      {/* TOP BAR */}
<div className={`p-4 shadow-sm z-10 flex flex-col gap-2 ${filterStatus !== "ALL" ? "bg-yellow-50" : "bg-gray-50"}`}>
  <div className="flex flex-wrap justify-between items-center gap-3">

    {/* Dropdown stato + etichetta attiva */}
    <div className="flex flex-col">
      <select
        value={filterStatus}
        onChange={(e) => setFilterStatus(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 bg-white text-sm shadow-sm focus:outline-none"
      >
        <option value="ALL">🔍 CLEAR Filter</option>
        <option value="IN">🟢 IN</option>
        <option value="PENDING">🟡 PENDING</option>
        <option value="CARE">🟣 CARE</option>
        <option value="OUT">🔴 OUT</option>
        <option value="OVERNIGHT">🌙 OVERNIGHT</option>
      </select>

      {filterStatus !== "ALL" && (
        <span className="text-sm text-gray-600 italic mt-1 ml-1">
          Filter: {filterStatus}
        </span>
      )}
    </div>

    {/* Barra di ricerca */}
    <div className="relative flex-1 min-w-[200px]">
      <input
        type="text"
        placeholder="Search by name, phone, or tag..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="border p-2 rounded w-full pr-10"
      />
      {searchQuery && (
        <FaTimesCircle
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 cursor-pointer"
          onClick={handleClearSearch}
        />
      )}
    </div>

    {/* Pulsante Add */}
    <button
      onClick={() => setShowFormModal(true)}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow text-sm h-[45px] w-[90px] flex flex-col items-center justify-center text-center"
    >
      <span>Add</span>
      <span>Customer</span>
      </button>
    </div>
  </div>



  {/* MAIN CONTENT - CLIENTI ATTUALI */}
  <div className="grid grid-cols-4 gap-4">
    {customSort(filteredCustomers).map((customer) => {
      const isSelected = selectedCustomer?.customer_id === customer.customer_id;
      const isPending = customer.status === "PENDING";
      const isCare = customer.status === "CARE";

      let bgColor = "bg-gray-800"; // default per IN
      if (isPending) bgColor = "bg-[#0c6cbc]";
      else if (isCare) bgColor = "bg-[#2bca65]";

      return (
        <div
          key={customer.customer_id}
          className={`relative text-white p-4 rounded cursor-pointer border-2 transition-all duration-200
            ${bgColor} ${isSelected ? 'border-blue-500 shadow-lg' : 'border-transparent'}`}
          onClick={() => handleCustomerClick(customer)}
        >
          <div className="font-semibold">TAG #{customer.tag_number}</div>

          {/* Tempo dall'ingresso */}
          <div className="text-xs mt-1">{getElapsedTime(customer.created_at)}</div>

          {/* ⏱ Timer da requested_at se status è PENDING o CARE */}
          {(isPending || isCare) && customer.requested_at && (
            <div className="text-xs text-yellow-300 font-semibold mt-1">
              ⏱ {formatElapsedTime(customer.requested_at)}
            </div>
          )}

          {/* Punto esclamativo se è pending */}
          {isPending && (
            <div className="absolute top-1 right-2 text-yellow-300 text-xl font-bold animate-pulse">
              !
            </div>
          )}
        </div>
      );
    })}
  </div>


        {/* OVERNIGHT CUSTOMERS */}
        {overnightCustomers.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-purple-700 mb-2">Overnight Vehicles</h3>
            <div className="grid grid-cols-4 gap-4">
            {overnightCustomers.map((customer) => {
              const isSelected = selectedCustomer?.customer_id === customer.customer_id;

              return (
                <div key={customer.customer_id}
                  className={`relative bg-purple-900 text-white p-4 rounded cursor-pointer border-2 transition-all duration-200 
                    ${isSelected ? 'border-yellow-400 shadow-lg' : 'border-transparent'}`}
                  onClick={() => handleCustomerClick(customer)}
                >
                  <div className="font-semibold">TAG #{customer.tag_number}</div>
                  <div className="text-xs mt-1">{getElapsedTime(customer.created_at)} (Overnight)</div>

                  {/* 🌙 Icona luna in alto a destra */}
                  <div className="absolute top-1 right-2 text-yellow-200 text-xl">
                    🌙
                  </div>
                </div>
              );
            })}

            </div>
          </div>
        )}

     {/* CUSTOMER INFO BAR */}
      {selectedCustomer && (
        <div className="fixed bottom-0 left-0 right-0 bg-white px-6 py-4 shadow-inner border-t z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-left w-full sm:w-1/2">
            <div className="font-semibold text-lg">{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
            <div className="text-sm">{selectedCustomer.phone_number}</div>
            <div className="text-sm">{selectedCustomer.vehicle_model} - {selectedCustomer.color}</div>
            <div className="text-sm">Status: {selectedCustomer.status}</div>
          </div>
          <div className="flex justify-center items-center w-full sm:w-1/2 gap-10">
            {selectedCustomer.status === "OVERNIGHT" ? (
              <button
                className="bg-red-600 text-white w-40 h-20 rounded-md text-md font-semibold"
                onClick={() =>
                  confirmAndUpdatePopup({
                    customerId: selectedCustomer.customer_id,
                    status: "OUT",
                    label: "Checkout",
                    updateStatus,
                  })
                }              >
                Checkout
              </button>
            ) : (
              <>
                <button
                  className="bg-[#0c6cbc] text-white w-40 h-20 rounded-md text-md font-semibold"
                  onClick={() =>
                    confirmAndUpdatePopup({
                      customerId: selectedCustomer.customer_id,
                      status: "PENDING",
                      label: "Request Vehicle",
                      updateStatus,
                    })
                  }
                                  >
                  Request Vehicle
                </button>
                <button
                  className="bg-[#2bca65] text-white w-40 h-20 rounded-md text-md font-semibold"
                  onClick={() =>
                    confirmAndUpdatePopup({
                      customerId: selectedCustomer.customer_id,
                      status: "CARE",
                      label: "Care",
                      updateStatus,
                    })
                  }
                                  >
                  Care
                </button>
                <button
                  className="bg-purple-600 text-white w-40 h-20 rounded-md text-md font-semibold"
                  onClick={() =>
                    confirmAndUpdatePopup({
                      customerId: selectedCustomer.customer_id,
                      status: "OVERNIGHT",
                      label: "Overnight",
                      updateStatus,
                    })
                  }
                                  >
                  Overnight
                </button>
                <button
                  className="bg-red-600 text-white w-40 h-20 rounded-md text-md font-semibold"
                  onClick={() =>
                    confirmAndUpdatePopup({
                      customerId: selectedCustomer.customer_id,
                      status: "OUT",
                      label: "Checkout",
                      updateStatus,
                    })
                  }
                                  >
                  Checkout
                </button>

                <button
                  className="bg-gray-800 text-white w-40 h-20 rounded-md text-md font-semibold"
                  onClick={() =>
                    confirmAndUpdatePopup({
                      customerId: selectedCustomer.customer_id,
                      status: "IN",
                      label: "Repark",
                      updateStatus,
                    })
                  }
                                  >
                  Repark
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* ADD CUSTOMER MODAL */}
        {showFormModal && (
          <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => {
            setShowFormModal(false);
            resetCustomerForm();

          }}>
        
            <div
              className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()} // click inside does nothing
            >
              <h2 className="text-xl font-semibold mb-4">New Customer</h2>

              <form onSubmit={handleSubmit}>

                {/* Tag Number (Obbligatorio) */}
                <label className="block mb-2">Tag Number*</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className={`border p-2 w-full rounded mb-4 transition-all duration-300 ${
                      highlightTag ? "border-red-500 animate-pulse" : ""
                    }`}
                    value={customerData.tag_number}
                    onChange={handleChange}
                    onBlur={checkTagAvailability}
                    name="tag_number"
                    required
                  />

                  {/* LED Status */}
                  {checkingTag && (
                    <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" title="Checking..."></div>
                  )}
                  {!checkingTag && tagStatus === "available" && (
                    <div className="w-3 h-3 rounded-full bg-green-500" title="Tag disponibile"></div>
                  )}
                  {!checkingTag && tagStatus === "unavailable" && (
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" title="Tag già in uso"></div>
                  )}
                </div>



                {/* Phone Number (Obbligatorio) */}
                <label className="block mb-2">Phone Number*</label>
                <input
                  type="tel"
                  className="border p-2 w-full rounded mb-4"
                  value={customerData.phone_number}
                  onChange={handleChange}
                  name="phone_number"
                  required
                />

                {/* Name (Obbligatorio) */}
                <label className="block mb-2">Name*</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded mb-4"
                  value={customerData.first_name}
                  onChange={handleChange}
                  name="first_name"
                  required
                />

                {/* Last Name (Facoltativo) */}
                <label className="block mb-2">Last Name</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded mb-4"
                  value={customerData.last_name}
                  onChange={handleChange}
                  name="last_name"
                />

                {/* Vehicle Model (Facoltativo) */}
                <label className="block mb-2">Vehicle Model</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded mb-4"
                  value={customerData.vehicle_model}
                  onChange={handleChange}
                  name="vehicle_model"
                />

                {/* Color (Facoltativo) */}
                <label className="block mb-2">Color</label>
                <input
                  type="text"
                  className="border p-2 w-full rounded mb-4"
                  value={customerData.color}
                  onChange={handleChange}
                  name="color"
                />

                {/* Bottoni Form */}
                <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="bg-gray-300 px-4 py-2 rounded"
                  onClick={() => {
                    setShowFormModal(false);
                    resetCustomerForm();

                  }}
                >
                  Cancel
                </button>

                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded flex items-center justify-center">
                    Add Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showExistingModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setShowExistingModal(false)} 
        >
          <div
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Customer Already Exists</h2>
            <p>Found: {existingCustomer.first_name} {existingCustomer.last_name}</p>
            <div className="flex justify-end gap-2 mt-4">

            <button
              className="bg-green-600 text-white px-4 py-2 rounded"
              onClick={() => {
                if (!customerData.tag_number) {
                  // Riempi solo i dati e chiedi il Tag Number
                  setCustomerData(prevData => ({
                    ...prevData,
                    first_name: existingCustomer.first_name || "",
                    last_name: existingCustomer.last_name || "",
                    vehicle_model: existingCustomer.vehicle_model || "",
                    color: existingCustomer.color || "",
                  }));
                  setShowExistingModal(false);
                  setHighlightTag(true);
                  showToast.info("Insert Tag Number!");
                  setTimeout(() => setHighlightTag(false), 2000);
                } else {
                  // Se tag già presente, procedi con l'inserimento diretto
                  handleUseExistingCustomer();
                }
              }}
            >
              Existing Customer
            </button>




              <button
                className="bg-gray-400 text-white px-4 py-2 rounded"
                onClick={() => setShowExistingModal(false)}
              >
                Other
              </button>
            </div>
          </div>
        </div>
      )}

        
      {/* Modale Settings Menu - Piccola */}
      {showSettingsModal && selectedSetting === null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Titolo centrale */}
            <h2 className="text-2xl font-semibold mb-6 text-center">Settings Menu</h2>

            {/* Voci Menu */}
            <div className="w-full space-y-4 flex flex-col items-center">
              <div
                className={`w-3/4 p-4 text-center cursor-pointer rounded shadow ${
                  selectedSetting === 'shift' ? 'bg-blue-200' : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedSetting('shift')}
              >
                Shift

              </div>

              {/* Bottone Close/Back nella modale Settings */}
              <div className="mt-6 flex justify-end">
                  <button
                    className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setShowSettingsModal(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" strokeWidth="2">
                      <path d="M9 11l-4 4l4 4m-4 -4h11a4 4 0 0 0 0 -8h-1"></path>
                    </svg>
                  </button>
                </div>

            </div>
          </div>
        </div>
      )}

      {/* Modale Shift - Grande Fissa */}
      {showSettingsModal && selectedSetting === 'shift' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => {
            setSelectedSetting(null);
            setShowSettingsModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-11/12 h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Corpo scrollabile */}
            <div className="flex-1 overflow-auto p-6">
              <GoogleSheetShift />
            </div>

            {/* Footer fisso con Back + Save + Logout */}
            <div className="p-4 border-t flex justify-center">
              <button className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setSelectedSetting(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" strokeWidth="2">
                  <path d="M9 11l-4 4l4 4m-4 -4h11a4 4 0 0 0 0 -8h-1"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Dashboard;
