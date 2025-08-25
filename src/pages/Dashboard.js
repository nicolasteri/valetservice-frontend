import React, { useState, useEffect, useMemo } from "react";
import { FaWifi, FaDatabase, FaCog, FaTimesCircle } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import { showToast } from "../utils/ui/showToast";
import axios from "axios";
// import ShiftTracker from "../components/shifttracker";
import GoogleSheetShift from "../components/GoogleSheetShift";
import { confirmAndUpdatePopup } from "../utils/ui/ConfirmPopup";
import "react-confirm-alert/src/react-confirm-alert.css";
import { useNavigate } from "react-router-dom";

  const isBrowser = typeof window !== "undefined" && typeof navigator !== "undefined";


function Dashboard() {
  const navigate = useNavigate();

  // --- TIME HELPERS ---
  function parseMySQL(ts, assumeUTC = false) {
    if (!ts || ts === '0000-00-00 00:00:00') return null;
    const iso = String(ts).replace(' ', 'T');       // "YYYY-MM-DDTHH:mm:ss"
    const d = new Date(assumeUTC ? iso + 'Z' : iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatElapsedTime(timestamp) {
    const startDate = parseMySQL(timestamp, /* assumeUTC? */ false);
    if (!startDate) return "00h 00m";

    const diffSec = Math.floor((currentTime - startDate.getTime()) / 1000);
    const safe = diffSec < 0 || !Number.isFinite(diffSec) ? 0 : diffSec;

    const h = String(Math.floor(safe / 3600)).padStart(2, "0");
    const m = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
    return `${h}h ${m}m`;
  }

  function isToday(createdAt) {
    const entry = new Date(createdAt);
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(5, 0, 0, 0);
    if (now.getHours() < 5) start.setDate(start.getDate() - 1);
    end.setDate(start.getDate() + 1);
    end.setHours(4, 59, 59, 999);
    return entry >= start && entry <= end;
  }

  // Ordine di visualizzazione: più basso = più in alto nella dashboard
  const statusPriority = { PENDING: 0, CARE: 1, IN: 2, OVERNIGHT: 3, OUT: 4 };   // più basso = più importante

  function sortByPriority(arr) {
    return [...arr].sort((a, b) => {
      const pa = statusPriority[a.status] ?? 99;
      const pb = statusPriority[b.status] ?? 99;
      if (pa !== pb) return pa - pb;

      const aRef = a.status === "IN" ? a.created_at : (a.requested_at ?? a.touchedAt);
      const bRef = b.status === "IN" ? b.created_at : (b.requested_at ?? b.touchedAt);

      const aNum = (() => { const d = parseMySQL(aRef, false); return d ? d.getTime() : Number.POSITIVE_INFINITY; })();
      const bNum = (() => { const d = parseMySQL(bRef, false); return d ? d.getTime() : Number.POSITIVE_INFINITY; })();

      return aNum - bNum;
    });
  }
  // funzione di ordinamento custom per "priority"
  function customSort(customers) {
    const num = (ts) => {
      const d = parseMySQL(ts, /* assumeUTC? */ false);
      return d ? d.getTime() : Number.POSITIVE_INFINITY;
    };

    const pending = customers
      .filter((c) => c.status === "PENDING")
      .sort((a, b) => num(a.requested_at) - num(b.requested_at));

    const care = customers
      .filter((c) => c.status === "CARE")
      .sort((a, b) => num(a.requested_at) - num(b.requested_at));

    const inside = customers
      .filter((c) => c.status === "IN")
      .sort((a, b) => num(a.created_at) - num(b.created_at));

    return [...pending, ...care, ...inside];
  }
  const [isOnline, setIsOnline] = useState(() => (isBrowser ? navigator.onLine : true));
  const [dbConnected, setDbConnected] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  // Overnight list (separata dalla lista "today")
  const [overnights, setOvernights] = useState([]);

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
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(Date.now()), 1000); // ogni 1s
    return () => clearInterval(id);
  }, []);

  

  const [companyId, setCompanyId] = useState(null);
  const [locationId, setLocationId] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [customers, setCustomers] = useState([]);
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [highlightTag, setHighlightTag] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(null);


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
    const validIds =
      typeof companyId === "number" &&
      typeof locationId === "number" &&
      !isNaN(companyId) && !isNaN(locationId);

    if (!validIds) return;

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        await fetchCustomers();      // <-- aspetta che finisca
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [companyId, locationId, filterStatus, searchQuery, sortField, sortDir]);

 
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

  const checkPhoneNumber = async (phone) => {
    try {
      const response = await axios.post("https://api.italinks.com/valet/check_phone.php", {
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
    ///////// DEBUG
    console.log("📤 Sending filters:", {
      location_id: locationId,
      company_id: companyId,
      status: filterStatus,
      search: searchQuery,
      timeRange: "today"
    })
  }

  async function fetchOvernights() {
    try {
      const payload = {
        location_id: locationId,
        company_id: companyId,
        timeRange: "overnight",
        // se vuoi ordinare: arrival asc
        sortField: "arrival",
        sortDir: "asc",
      };

      const res = await fetch("https://api.italinks.com/valet/get_customers.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.customers)) {
        setOvernights(
          data.customers.map((c) => ({
            ...c,
            touchedAt: c.touchedAt || c.created_at,
          }))
        );
      } else {
        console.warn("Overnight fetch failed:", data);
      }
    } catch (e) {
      console.error("Overnight fetch error:", e);
    }
  }

  useEffect(() => {
    const validIds =
        typeof companyId === "number" &&
        typeof locationId === "number" &&
        !isNaN(companyId) && !isNaN(locationId);

    if (!validIds) return;

    // Aggiorna overnight sul server (idempotente) poi scarica la lista overnight
    (async () => {
        await triggerOvernightUpdate();
        await fetchOvernights();
    })();
  }, [companyId, locationId]);


  const payload = {
    location_id: locationId,
    company_id: companyId,
    ...(filterStatus !== "ALL" && { status: filterStatus }),
    search: searchQuery,
    timeRange: "today",
    sortField, 
    sortDir,    
  };

  fetch("https://api.italinks.com/valet/get_customers.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      setDbConnected(res.ok);
      return res.json();
    })
    .then((data) => {
      if (data.success && data.customers) {
        const prepared = data.customers.map((c) => ({
          ...c,
          touchedAt: c.touchedAt || c.created_at,
        }));

        // ❗️NON ordinare qui: è già ordinato dal server
        setCustomers(prepared);
      } else {
        console.error("❌ Failed fetching customers:", data.error || data);
      }
    })
    .catch((err) => {
      console.error("🔥 Fetch error:", err);
      setDbConnected(false);
    });


  const triggerOvernightUpdate = () => {
    if (!companyId || !locationId) {
      console.warn("⚠️ fetchCustomers aborted: missing locationId or companyId");
      return;
    }

    fetch("https://api.italinks.com/valet/update_overnight.php", {
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
        "https://api.italinks.com/valet/check_phone.php",
        {
          phone_number: customerData.phone_number,
          company_id,
        }
      );
  
      if (responseCheck.data.success && responseCheck.data.exists) {
        // ✅ Cliente già registrato: crea solo record e aggiorna tag
        const customer_id = responseCheck.data.customer.customer_id;
  
        const responseAdd = await axios.post(
          "https://api.italinks.com/valet/add_existing_customer.php",
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
  
        const responseNew = await fetch("https://api.italinks.com/valet/add_customers.php", {
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
      const response = await fetch("https://api.italinks.com/valet/check_tag.php", {
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

  // SORT BY default: Arrival ↓ (più recenti in alto)
  const [sortField, setSortField] = useState("arrival"); // "priority" | "number" | "arrival" | "urgency" | "name"
  const [sortDir, setSortDir] = useState("desc");        // "asc" | "desc"

  function toggleSort(field) {
    if (field === "priority") {
      setSortField("priority");      // sort custom client-side
      setSortDir("asc");             // irrilevante qui, ma lo teniamo
      return;
    }
    setSortField(field);
  }
  ////////// BOTTONE ORDINAMENTO //////////
  function SortButton({ field, label }) {
    const active = sortField === field;
    const arrow = active ? (sortDir === "asc" ? "↑" : "↓") : "";

    return (
      <button
        onClick={() => toggleSort(field)}
        className={`px-3 py-2 rounded-md text-sm transition
          ${active ? "bg-black text-white shadow" : "bg-gray-200 text-gray-900 hover:bg-gray-300"}
        `}
        title={active ? `Sorted ${label} ${sortDir}` : `Sort by ${label}`}
      >
        {label} {field !== "priority" && <span className="ml-1">{arrow}</span>}
      </button>
    );
  }

  const handleUseExistingCustomer = async () => {
    if (!customerData.tag_number) {
      setHighlightTag(true);
      showToast.error("Insert Tag Number!");
      setTimeout(() => setHighlightTag(false), 1500);
      return;
    }
  
    try {
      const location_id = locationId;

      const response = await axios.post("https://api.italinks.com/valet/add_existing_customer.php", {
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
      const response = await fetch("https://api.italinks.com/valet/update_customer_status.php", {
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
  

  const getElapsedTime = (createdAt) => {
    const startDate = parseMySQL(createdAt, /* assumeUTC? */ false);
    if (!startDate) return "00h 00m";

    const diffSec = Math.floor((currentTime - startDate.getTime()) / 1000);
    const safe = diffSec < 0 || !Number.isFinite(diffSec) ? 0 : diffSec;

    const h = String(Math.floor(safe / 3600)).padStart(2, "0");
    const m = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
    return `${h}h ${m}m`;
  };


  const todayCustomers = customers.filter(c => isToday(c.created_at));
  const inToday = todayCustomers.length;
  const nowCount = todayCustomers.filter(c => ["IN", "PENDING", "CARE"].includes(c.status)).length;
  const outCount = todayCustomers.filter(c => c.status === "OUT").length;
  const countOvernight = overnights.length;

  const filteredCustomers = sortByPriority(todayCustomers   
    .filter(c => !["OUT", "OVERNIGHT"].includes(c.status))
    .filter((c) => {
      const s = (searchQuery || "").trim().toLowerCase();

      // 1) match su testo libero: nome, cognome, veicolo, colore, tag
      const textHit =
        (c.first_name   && c.first_name.toLowerCase().includes(s)) ||
        (c.last_name    && c.last_name.toLowerCase().includes(s))  ||
        (c.vehicle_model&& c.vehicle_model.toLowerCase().includes(s)) ||
        (c.color        && c.color.toLowerCase().includes(s)) ||
        (c.tag_number   && String(c.tag_number).includes(s));

      // 2) match ultimi 4 del telefono (solo se l’utente digita >= 4 cifre)
      const digits = s.replace(/\D/g, "");
      const last4  = digits.length >= 4 ? digits.slice(-4) : null;
      const phoneDigits = (c.phone_number || "").replace(/\D/g, "");
      const phoneHit = last4 ? phoneDigits.endsWith(last4) : false;

      const matchesSearch = s === "" ? true : (textHit || phoneHit);

      const matchesStatus = filterStatus === "ALL" || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
  );

  const sortedCustomers = useMemo(() => {
    const list = filteredCustomers ?? customers;
    
    // per tutti gli altri casi ordina già il BACKEND, quindi restituiamo la lista così com’è
    return sortField === "priority" ? customSort(list) : list;
  }, [filteredCustomers, customers, sortField, sortDir]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-xl font-semibold text-gray-500">
        Loading dashboard...
      </div>
    );
  }
 //////////// !! START RETURN FINALE !! /////////////
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
                placeholder="Search name, vehicle, tag, or last 4 digits…"
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

            {/* SORT BY (variante compatta) */}
            <div className="flex items-center gap-2 basis-full md:basis-auto order-last md:order-none">
              <span className="text-sm font-medium">Sort:</span>

              <select
                value={sortField}
                onChange={(e) => toggleSort(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 bg-white text-sm shadow-sm"
              >
                <option value="priority">Priority</option>
                <option value="number">Number</option>
                <option value="arrival">Arrival</option>
                <option value="urgency">Urgency</option>
                <option value="name">Name</option>
              </select>

              {sortField !== "priority" && (
                <button
                  onClick={() => setSortDir(d => (d === "asc" ? "desc" : "asc"))}
                  className="px-3 py-2 rounded bg-gray-200 text-sm hover:bg-gray-300"
                  title={`Direction: ${sortDir}`}
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </button>
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
          {sortedCustomers.map((customer) => {
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

                {/* 🕒 Tempo dall'ingresso */}
                <div className="text-xs text-gray-300 mt-1">
                  🕒 Check-in: {getElapsedTime(customer.created_at)}
                </div>

                {/* ⏱ Tempo di attesa veicolo */}
                {(isPending || isCare) && customer.requested_at && (
                  <div className="text-xs text-yellow-300 font-semibold mt-1">
                    ⏱ Wait: {formatElapsedTime(customer.requested_at)}
                  </div>
                )}

                {/* ⚠️ Punto esclamativo se è pending */}
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
        {overnights.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-purple-700 mb-2">Overnight Vehicles</h3>
            <div className="grid grid-cols-4 gap-4">
            {overnights.map((customer) => {
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
                    <svg xmlns="https://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
                <svg xmlns="https://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
