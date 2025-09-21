import React, { useState, useEffect, useMemo, useCallback, startTransition, useDeferredValue } from "react";
import { FaWifi, FaDatabase, FaCog, FaTimesCircle } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import { showToast } from "../utils/ui/showToast";
import axios from "axios";
// import ShiftTracker from "../components/shifttracker";
import GoogleSheetShift from "../components/GoogleSheetShift";
import { confirmAndUpdatePopup } from "../utils/ui/ConfirmPopup";
import "react-confirm-alert/src/react-confirm-alert.css";
import { useNavigate } from "react-router-dom";
// Ordine di visualizzazione: più basso = più in alto nella dashboard
import { useCountersAirbag } from "../utils/dashboard_airbags";
import TinySpinner from "../components/TinySpinner";
import { DEBUG } from "../utils/debug";

export const statusPriority = { PENDING: 0, CARE: 1, IN: 2, OVERNIGHT: 3, OUT: 4 };   // più basso = più importante



const isBrowser = typeof window !== "undefined" && typeof navigator !== "undefined";

// --- debounce hook (minimo) ---
function useDebounced(value, delay = 200) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function Dashboard() {

  const navigate = useNavigate();

  // useState /////////////////////////

  const [isOnline, setIsOnline] = useState(() => (isBrowser ? navigator.onLine : true));
  const [dbConnected, setDbConnected] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  // rende la ricerca più fluida
  const debouncedSearch = useDebounced(searchQuery, 200);
  const deferredSearch  = useDeferredValue(debouncedSearch);
  const [filterStatus, setFilterStatus] = useState("ALL");
  // Overnight list (separata dalla lista "today")
  const [overnights, setOvernights] = React.useState([]);
  const [customerData, setCustomerData] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    vehicle_model: "",
    color: "",
    tag_number: "",
  });
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [locationName, setLocationName] = useState("");
  const [customers, setCustomers] = useState([]);
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [highlightTag, setHighlightTag] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState(null);
  // Blocco per login e controllo dati
  // const [isLoading, setIsLoading] = useState(true); // stato isLoading per bloccare il render finché non ha verificato i dati x accesso
  const [tagStatus, setTagStatus] = useState(null); // 'available' | 'unavailable' | null
  const [checkingTag, setCheckingTag] = useState(false); // per gestire eventuale spinner
  // SORT BY default: Arrival ↓ (più recenti in alto)
  const [sortField, setSortField] = useState("arrival"); // "priority" | "number" | "arrival" | "urgency" | "name"
  const [sortDir, setSortDir] = useState("desc");        // "asc" | "desc"


  const {
    setCountersLive,
    getCountersSafe,
    applyCountersFromResponse
  } = useCountersAirbag(React);

  const [isDataLoading, setIsDataLoading] = React.useState(false);

  // ✅ sempre numeri, mai null
  const counters = getCountersSafe();

  const [activeTags, setActiveTags] = React.useState([]);

  const prevActiveTagsRef = React.useRef([]);
  React.useEffect(() => { prevActiveTagsRef.current = activeTags; }, [activeTags]);

  // (facoltativo se non l’hai) sequencer per ignorare risposte vecchie
  const refreshSeqRef = React.useRef(0);

  const prevCustomersRef = React.useRef([]);
  const prevOvernightsRef = React.useRef([]);

  React.useEffect(() => { prevCustomersRef.current = customers; }, [customers]);
  React.useEffect(() => { prevOvernightsRef.current = overnights; }, [overnights]);

  const abortRef = React.useRef(null);

  // Subito dopo aver letto da localStorage:

  const [companyId, setCompanyId] = useState(() => {
    const v = localStorage.getItem("company_id");
    return v ? Number(v) : null;
  });
  const [locationId, setLocationId] = useState(() => {
    const v = localStorage.getItem("location_id");
    return v ? Number(v) : null;
  });

  const companyIdNum  = companyId  ?? null;
  const locationIdNum = locationId ?? null;

  useEffect(() => {
    if (companyId  != null) localStorage.setItem("company_id",  String(companyId));
  }, [companyId]);
  useEffect(() => {
    if (locationId != null) localStorage.setItem("location_id", String(locationId));
  }, [locationId]);

  // callback & helpers /////////////////////////

  /* funzione di ordinamento custom per "priority"
   - Gruppi: PENDING -> CARE -> IN -> OVERNIGHT -> OUT
   - Dentro al gruppo: FIFO (asc) oppure invertito (desc) in base a sortDir*/
  const customSort = useCallback(
    (list) => {
      const dir = sortDir === "asc" ? 1 : -1;

      const toNum = (ts) => {
        const d = parseMySQL(ts, /* assumeUTC? */ false);
        return d ? d.getTime() : Number.POSITIVE_INFINITY;
      };

      const refTs = (c) =>
        c.status === "IN" ? c.created_at : (c.requested_at ?? c.touchedAt);

      return [...(list ?? [])].sort((a, b) => {
        // 1) Ordine per gruppo (NON invertito da sortDir)
        const pa = statusPriority[a.status] ?? 99;
        const pb = statusPriority[b.status] ?? 99;
        if (pa !== pb) return pa - pb;

        // 2) Ordine interno al gruppo (invertibile con sortDir)
        const ta = toNum(refTs(a));
        const tb = toNum(refTs(b));
        if (ta !== tb) return dir * (ta - tb);

        // 3) Tie-breakers stabili per evitare flicker
        const tna = (a.tag_number ?? 0) - (b.tag_number ?? 0);
        if (tna !== 0) return tna;
        return (a.customer_id ?? 0) - (b.customer_id ?? 0);
      });
    },
    [sortDir]
  );

  const refreshData = React.useCallback(async () => {
    // Guard su ID
    if (!Number.isFinite(companyIdNum) || !Number.isFinite(locationIdNum)) {
      console.warn("refreshData aborted: missing companyIdNum/locationIdNum");
      return;
    }

    // Sequencer anti-race: solo l’ultimo refresh può scrivere
    const mySeq = (refreshSeqRef.current = (refreshSeqRef.current || 0) + 1);

    // Cancella eventuali fetch in corso e prepara un nuovo AbortController
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setIsDataLoading(true);

    try {
      // 0) Soft update OVERNIGHT (se fallisce, non blocca; niente signal)
      try {
        await axios.post(
          "https://api.italinks.com/valet/update_overnight.php",
          { company_id: companyIdNum, location_id: locationIdNum },
          { timeout: 10000 }
        );
      } catch (_) {}

      // 1) Fetch paralleli principali (SENZA counters) — con cancellazione (signal)
      const [resActive, resOver] = await Promise.all([
        axios.post(
          "https://api.italinks.com/valet/get_customers.php",
          { company_id: companyIdNum, location_id: locationIdNum, timeRange: "today", status: "ACTIVE_ONLY" },
          { timeout: 10000, signal }
        ),
        axios.post(
          "https://api.italinks.com/valet/get_customers.php",
          { company_id: companyIdNum, location_id: locationIdNum, timeRange: "overnight" },
          { timeout: 10000, signal }
        ),
      ]);

      // 2) Estrazione inline
      const activeTodayRaw = Array.isArray(resActive?.data?.customers)
        ? resActive.data.customers
        : Array.isArray(resActive?.data?.data)
        ? resActive.data.data
        : [];

      const overnightAll = Array.isArray(resOver?.data?.customers)
        ? resOver.data.customers
        : Array.isArray(resOver?.data?.data)
        ? resOver.data.data
        : [];

      // 3) ATTIVI: fallback se ACTIVE_ONLY è vuoto → IN/PENDING/CARE
      let activeToday = activeTodayRaw;
      if (!Array.isArray(activeToday) || activeToday.length === 0) {
        const [rIn, rPend, rCare] = await Promise.all([
          axios.post(
            "https://api.italinks.com/valet/get_customers.php",
            { company_id: companyIdNum, location_id: locationIdNum, timeRange: "today", status: "IN" },
            { timeout: 10000, signal }
          ),
          axios.post(
            "https://api.italinks.com/valet/get_customers.php",
            { company_id: companyIdNum, location_id: locationIdNum, timeRange: "today", status: "PENDING" },
            { timeout: 10000, signal }
          ),
          axios.post(
            "https://api.italinks.com/valet/get_customers.php",
            { company_id: companyIdNum, location_id: locationIdNum, timeRange: "today", status: "CARE" },
            { timeout: 10000, signal }
          ),
        ]);

        const getArr = (res) =>
          Array.isArray(res?.data?.customers) ? res.data.customers :
          Array.isArray(res?.data?.data)      ? res.data.data      : [];

        activeToday = [...getArr(rIn), ...getArr(rPend), ...getArr(rCare)];

        // dedup per sicurezza
        const seen = new Set();
        activeToday = activeToday.filter((c) => {
          const k = c?.customer_id;
          if (!k || seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      }

      // 4) Normalizza overnight (status/tag)
      const normalizedOvernights = Array.isArray(overnightAll)
        ? overnightAll.map((c) => ({
            ...c,
            status: c?.status ?? "OVERNIGHT",
            tag_number: c?.tag_number ?? c?.tag ?? null,
          }))
        : [];

      // Se è partito un altro refresh nel frattempo, non scrivere
      if (mySeq !== refreshSeqRef.current) return;

      // 5) Scritture ATOMICHE delle liste (prima liste, poi counters)
      const nextActive     = Array.isArray(activeToday)  ? activeToday  : (prevCustomersRef.current   ?? []);
      const nextOvernights = normalizedOvernights.length > 0
        ? normalizedOvernights
        : (prevOvernightsRef.current ?? []);

      setCustomers(nextActive);
      setOvernights(nextOvernights);

      // 6) Deriva TAG ATTIVI dagli attivi (IN/PENDING/CARE)
      const isNow = (s) => s === "IN" || s === "PENDING" || s === "CARE";
      const nextActiveTags = nextActive
        .filter((c) => c && c.tag_number && isNow(c.status))
        .map((c) => ({
          customer_id: c.customer_id,
          tag_number:  c.tag_number,
          status:      c.status,
          name:        c.customer_name || c.name || "",
          requested_at:c.requested_at || null,
          created_at:  c.created_at   || null,
        }));
      setActiveTags(nextActiveTags);

      // 7) Counters: fetch SEPARATA e tollerante (NO signal: non la abortiamo)
      let resCounters = null;
      try {
        resCounters = await axios.post(
          "https://api.italinks.com/valet/get_counters.php",
          { company_id: companyIdNum, location_id: locationIdNum },
          { timeout: 10000 }
        ).catch(() => null);
      } catch (err) {
        if (DEBUG) console.warn("[counters] fetch failed:", err?.message || err);
      }

      if (mySeq !== refreshSeqRef.current) return;

      // aggiorna i contatori SOLO se payload valido (mai azzerare)
      const ok = applyCountersFromResponse(resCounters);
      if (!ok) {
       if (DEBUG) console.warn("[counters] non aggiornati (success=false / 500 / payload incompleto)");
      }

    } catch (e) {
      // Ignora i refresh abortiti da un nuovo giro (è voluto)
      const isCanceled =
        e?.code === "ERR_CANCELED" ||               // Axios >= v1
        (typeof axios !== "undefined" && axios.isCancel?.(e)); // fallback

      if (isCanceled) {
        // opzionale: log silenzioso in debug
        if (typeof DEBUG !== "undefined" && DEBUG) {
          console.log("refreshData aborted by a newer request");
        }
      } else {
        console.error("refreshData error:", e);
        showToast?.error?.("Refresh failed");
      }
    } finally {
      // cleanup AbortController di questo giro
      abortRef.current = null;
      setIsDataLoading(false);
    }
  }, [companyIdNum, locationIdNum, applyCountersFromResponse]);

  useEffect(() => {
    if (DEBUG) console.log("[RD] start");
    refreshData();
  }, [refreshData]);
  // fine debug

  const refreshDebounceRef = React.useRef(null);
  const refreshSoon = React.useCallback((delay = 300) => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(() => {
      refreshData();
    }, delay);
  }, [refreshData]);

  // todayCustomers + counters  ➜ PRIMA di filteredCustomers / sortedCustomers
  const todayCustomers = useMemo(() => {
    const list = customers ?? [];
    return list.filter((c) => isToday(c.created_at));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const list = todayCustomers
      .filter(c => !["OUT", "OVERNIGHT"].includes(c.status))
      .filter((c) => {
        const s = (deferredSearch || "").trim().toLowerCase();

        // 1) testo libero
        const textHit =
          (c.first_name    && c.first_name.toLowerCase().includes(s)) ||
          (c.last_name     && c.last_name.toLowerCase().includes(s))  ||
          (c.vehicle_model && c.vehicle_model.toLowerCase().includes(s)) ||
          (c.color         && c.color.toLowerCase().includes(s)) ||
          (c.tag_number    && String(c.tag_number).includes(s));

        // 2) ultimi 4 telefono
        const digits = s.replace(/\D/g, "");
        const last4  = digits.length >= 4 ? digits.slice(-4) : null;
        const phoneDigits = (c.phone_number || "").replace(/\D/g, "");
        const phoneHit = last4 ? phoneDigits.endsWith(last4) : false;

        const matchesSearch = s === "" ? true : (textHit || phoneHit);
        const matchesStatus = filterStatus === "ALL" || c.status === filterStatus;
        return matchesSearch && matchesStatus;
      });

    return list;
  }, [todayCustomers, deferredSearch, filterStatus]);


  const sortedCustomers = useMemo(() => {
    const list = filteredCustomers ?? customers;    
    // per tutti gli altri casi ordina già il BACKEND, quindi restituiamo la lista così com’è
    return sortField === "priority" ? customSort(list) : list;
  }, [filteredCustomers, customers, sortField, customSort]);

  function parseMySQL(ts, assumeUTC = false) { // --- TIME HELPERS ---
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

  // handler per cambiare il tipo di sort
  function toggleSort(field) {
    if (field === "priority") {
      if (sortField === "priority") {
        // se clicchi di nuovo su "priority", inverte l'ordine dentro ai gruppi
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        // primo passaggio a "priority": default asc (FIFO)
        setSortField("priority");
        setSortDir("asc");
      }
      return;
    }
    // altri campi (ordinati dal backend o da altre logiche)
    setSortField(field);
  }
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
  
  const hasMountedRef = React.useRef(false); // per saltare la prima esecuzione del useEffect dei filtri

  const fetchCustomers = useCallback(async () => {
    if (!companyIdNum || !locationIdNum) {
      console.warn("⚠️ fetchCustomers aborted: missing locationId or companyId");
      return;
    }

    const payload = {
      location_id: locationIdNum,
      company_id:  companyIdNum,
      ...(filterStatus !== "ALL" && { status: filterStatus }),
      search:    searchQuery,
      timeRange: "today",
      sortField,
      sortDir,
    };

    try {
      const res = await fetch("get_customers.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setDbConnected(res.ok);

      const data = await res.json();
      const customersList = Array.isArray(data?.customers) ? data.customers
                          : Array.isArray(data?.data)      ? data.data
                          : [];

      if (Array.isArray(customersList)) {
        const prepared = customersList.map((c) => ({
          ...c,
          touchedAt: c.touchedAt || c.created_at,
        }));
        setCustomers(prepared);

        // Deriva TAG ATTIVI dalla lista corrente (IN/PENDING/CARE)
        setActiveTags(
          prepared
            .filter((c) => c && c.tag_number && ["IN","PENDING","CARE"].includes(c.status))
            .map((c) => ({
              customer_id: c.customer_id,
              tag_number:  c.tag_number,
              status:      c.status,
              name:        c.customer_name || c.name || "",
              requested_at:c.requested_at || null,
              created_at:  c.created_at   || null,
            }))
        );
      } else {
        console.error("❌ Failed fetching customers:", data?.error || data);
      }
    } catch (err) {
      console.error("🔥 Fetch error:", err);
      setDbConnected(false);
    }
  }, [companyIdNum, locationIdNum, filterStatus, searchQuery, sortField, sortDir]);

  // useEffect /////////////////////////
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(Date.now()), 1000); // ogni 1s
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const companyIdRaw = localStorage.getItem("company_id");
    const locationIdRaw = localStorage.getItem("location_id");
    const storedLocationName = localStorage.getItem("location_name");

    if (DEBUG) console.log("🚨 DASHBOARD localStorage check:");
    if (DEBUG) console.log("company_id (raw):", companyIdRaw);
    if (DEBUG) console.log("location_id (raw):", locationIdRaw);

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
    // Salta la primissima esecuzione (al mount ci pensa refreshData)
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    let cancelled = false;
    setIsDataLoading(true); // questo è il loader “UI/filtri”, non quello dati globali

    (async () => {
      try {
        await fetchCustomers();
      } finally {
        if (!cancelled) setIsDataLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [fetchCustomers]);



 
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
        company_id: companyIdNum,
      });

      if (response.data.success && response.data.exists) {
        setExistingCustomer(response.data.customer);
        setShowExistingModal(true);
      }
    } catch (error) {
      showToast.error("Error in number control!");
    }
  };

  useEffect(() => {
    refreshData();
  }, [refreshData]);
  

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
      const company_id = companyIdNum;
      const location_id = locationIdNum;

      // 🔍 Check se il cliente esiste già per questa company
      const responseCheck = await axios.post(
        "https://api.italinks.com/valet/check_phone.php",
        {
          phone_number: customerData.phone_number,
          company_id,
        }
      );

      if (responseCheck.data.success && responseCheck.data.exists) {
        // ✅ Cliente già registrato: crea record odierno e aggiorna tag
        const customer_id = responseCheck.data.customer.customer_id;

        const responseAdd = await axios.post(
          "https://api.italinks.com/valet/add_existing_customer.php",
          {
            customer_id,
            tag_number: parseInt(customerData.tag_number, 10),
            location_id,
            company_id,
          }
        );

        if (responseAdd.data.success) {
          // Proviamo a prendere il record creato dal backend; altrimenti sintetizziamo
          const created =
            responseAdd.data.customer ??
            {
              customer_id:
                responseAdd.data.customer_id ??
                customer_id ??
                Date.now(), // fallback id locale
              tag_number: Number(customerData.tag_number),
              status: "IN", // di solito all'ingresso è IN
              first_name: responseCheck.data.customer.first_name || "",
              last_name: responseCheck.data.customer.last_name || "",
              phone_number: customerData.phone_number,
              vehicle_model: responseCheck.data.customer.vehicle_model || "",
              color: responseCheck.data.customer.color || "",
              created_at: new Date().toISOString(),
            };

          // 🔵 Ottimistico: subito su lista + contatori
          onNewCustomerCreated(created);

          showToast.success("Customer added successfully!");
          setShowFormModal(false);
          resetCustomerForm();

          // 🔄 Riallinea con il DB (contatori inclusi)
          await refreshData();
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

        const responseNew = await fetch(
          "https://api.italinks.com/valet/add_customers.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const dataNew = await responseNew.json();

        if (dataNew.success) {
          const created =
            dataNew.customer ??
            {
              customer_id: dataNew.customer_id ?? Date.now(),
              tag_number: Number(customerData.tag_number),
              status: "IN", // tipicamente all'ingresso
              first_name: customerData.first_name || "",
              last_name: customerData.last_name || "",
              phone_number: customerData.phone_number,
              vehicle_model: customerData.vehicle_model || "",
              color: customerData.color || "",
              created_at: new Date().toISOString(),
            };

          // 🔵 Ottimistico
          onNewCustomerCreated(created);

          showToast.success("Customer added successfully!");
          setShowFormModal(false);
          resetCustomerForm();

          // 🔄 Riallinea con il DB
          await refreshData();
        } else {
          showToast.error("Error: " + dataNew.error);
        }
      }
    } catch (error) {
      console.error("handleSubmit error:", error);
      showToast.error("Connection error");
    }
  };




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
          location_id: locationIdNum,
          company_id: companyIdNum,
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
      const response = await axios.post(
        "https://api.italinks.com/valet/add_existing_customer.php",
        {
          customer_id: existingCustomer.customer_id,
          tag_number: parseInt(customerData.tag_number, 10),
          location_id: locationIdNum,
          company_id: companyIdNum,
        }
      );

      if (response.data.success) {
        const created =
          response.data.customer ??
          {
            customer_id:
              response.data.customer_id ??
              existingCustomer.customer_id ??
              Date.now(),
            tag_number: Number(customerData.tag_number),
            status: "IN",
            first_name: existingCustomer.first_name || "",
            last_name: existingCustomer.last_name || "",
            phone_number: existingCustomer.phone_number || "",
            vehicle_model: existingCustomer.vehicle_model || "",
            color: existingCustomer.color || "",
            created_at: new Date().toISOString(),
          };

        // 🔵 Ottimistico
        onNewCustomerCreated(created);

        showToast.success("Existing customer added successfully!");
        setShowExistingModal(false);
        setShowFormModal(false);
        resetCustomerForm();

        // 🔄 Riallinea col DB
        await refreshData();
      } else {
        showToast.error("Error: " + response.data.error);
      }
    } catch (error) {
      console.error("handleUseExistingCustomer error:", error);
      showToast.error("Server Error.");
    }
  };
  
  const getRecordById = React.useCallback(
    (id) =>
      (customers ?? []).find((c) => c.customer_id === id) ||
      (overnights ?? []).find((c) => c.customer_id === id) ||
      null,
    [customers, overnights]
  );

  const isInTodayList = (id) => (customers ?? []).some(c => c.customer_id === id);

  // ⬇️ versione nuova: mai modificare totalToday qui
  // ⬇️ versione sicura: non toccare mai totalToday qui
  const bumpCountersOptimistic = (prevStatus, nextStatus, fromToday) => {
    setCountersLive((prev) => {
      // usa un "base" sicuro: se prev è nullo/rotto, ripiega su getCountersSafe()
      const base = (prev && Number.isFinite(prev.nowCount)) ? prev : getCountersSafe();

      let {
        nowCount       = 0,
        outCount       = 0,
        totalToday     = 0, // NON si modifica qui
        overnightCount = 0,
      } = base;

      const wasNow = (s) => s === "IN" || s === "PENDING" || s === "CARE";
      const isNow  = (s) => s === "IN" || s === "PENDING" || s === "CARE";

      if (nextStatus === "OUT") {
        if (fromToday && wasNow(prevStatus)) {
          nowCount = Math.max(0, nowCount - 1);
        }
        outCount += 1; // OUT oggi sale
        // totalToday invariato
        if (prevStatus === "OVERNIGHT") {
          overnightCount = Math.max(0, overnightCount - 1);
        }
      } else if (nextStatus === "OVERNIGHT") {
        if (fromToday && wasNow(prevStatus)) {
          nowCount = Math.max(0, nowCount - 1);
        }
        overnightCount += 1;
        // totalToday invariato
      } else if (isNow(nextStatus)) {
        // es. OUT→IN (oggi)
        if (fromToday && !wasNow(prevStatus)) {
          nowCount += 1;
        }
        // totalToday invariato
      }

      return { nowCount, outCount, totalToday, overnightCount };
    });
  };

  const onNewCustomerCreated = React.useCallback((newCustomer) => {
    if (!newCustomer) return;

    // UI: aggiungi alla lista di oggi
    setCustomers((prev) => [newCustomer, ...(prev ?? [])]);

    // Se nasce già overnight, aggiungilo anche lì
    if (newCustomer.status === "OVERNIGHT") {
      setOvernights((prev) => [newCustomer, ...(prev ?? [])]);
    }

    // Contatori ottimistici: parti SEMPRE da un oggetto "safe"
    setCountersLive((prev) => {
      const base = (prev && Number.isFinite(prev.nowCount)) ? prev : getCountersSafe();

      const isNow = (s) => s === "IN" || s === "PENDING" || s === "CARE";

      const next = {
        nowCount:       base.nowCount + (isNow(newCustomer.status) ? 1 : 0),
        outCount:       base.outCount,
        totalToday:     base.totalToday, // non tocchiamo TOT qui
        overnightCount: base.overnightCount + (newCustomer.status === "OVERNIGHT" ? 1 : 0),
      };

      if (DEBUG) console.log("📊 Contatori PRIMA (safe):", base);
      if (DEBUG) console.log("📊 Contatori DOPO (optimistic):", next);
      return next;
    });
  }, [setCustomers, setOvernights, setCountersLive, getCountersSafe]);

  const updateStatus = async (customer_id, status, opts = {}) => {
    // read counters safely (never null)
    //const cSafe = getCountersSafe();

    // snapshot per rollback
    const snapshotCustomers = customers;
    const snapshotOvernights = overnights;

    // trova il record in customers OPPURE in overnights
    const current = getRecordById(customer_id);

    // tag_number necessario per l'API: passa quello dal caller, oppure quello nel record, oppure quello del selected
    const tag_number = opts.tag_number ?? current?.tag_number ?? selectedCustomer?.tag_number ?? null;
    if (!tag_number) {
      // possiamo comunque tentare, ma avvisa che manca il tag (dipende dalle esigenze del backend)
      console.warn("updateStatus: missing tag_number, proceeding anyway");
    }
  

    // ⚡️ 1) UPDATE OTTIMISTICO per OVERNIGHT e OUT (UI subito reattiva)
    if (status === "OVERNIGHT") {
      // toglilo dalle liste del giorno (i tuoi filtri escludono OVERNIGHT) e mettilo subito tra gli overnights
      setCustomers((prev) =>
        customSort(
          prev.map((c) =>
            c.customer_id === customer_id
              ? { ...c, status: "OVERNIGHT", touchedAt: Date.now() }
              : c
          )
        )
      );
      setOvernights((prev) => {
        const base = current ?? { customer_id, tag_number };
        const updated = { ...base, status: "OVERNIGHT", touchedAt: Date.now() };        const exists = prev.some((c) => c.customer_id === customer_id);
        return exists
          ? prev.map((c) => (c.customer_id === customer_id ? updated : c))
          : [updated, ...prev];
      });
      bumpCountersOptimistic(current?.status ?? "IN", "OVERNIGHT", isInTodayList(customer_id));
    } else if (status === "OUT") {
      // segna OUT subito e rimuovilo dagli overnights se c’era
      setCustomers((prev) =>
        customSort(
          prev.map((c) => {
            if (c.customer_id !== customer_id) return c;
            return {
              ...c,
              status: "OUT",
              touchedAt: Date.now(),
              // conserva requested_at per analisi
              requested_at: c.requested_at || null,
            };
          })
        )
      );
      setOvernights((prev) => prev.filter((c) => c.customer_id !== customer_id));
      bumpCountersOptimistic(current?.status ?? "IN", "OUT", isInTodayList(customer_id));
    } else {
      bumpCountersOptimistic(current?.status ?? "IN", status, isInTodayList(customer_id));
    }
    try {
      // 🛰 2) CHIAMATA API (stesso endpoint che usi già)
      const res = await fetch("https://api.italinks.com/valet/update_customer_status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id,
          status,
          company_id: companyIdNum,
          location_id: locationIdNum,
          tag_number,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // ✅ 3) Allinea lo stato locale per tutti i casi (PENDING, CARE, IN inclusi)
        setCustomers((prev) =>
          customSort(
            prev.map((c) => {
              if (c.customer_id !== customer_id) return c;

              const updated = {
                ...c,
                status,
                touchedAt: Date.now(),
              };

              // regole timer/fields come prima
              if (status === "PENDING") {
                updated.requested_at = new Date().toISOString();
              } else if (status === "CARE") {
                updated.requested_at = c.requested_at || null;
              } else if (status === "IN") {
                updated.requested_at = null;
              } else if (status === "OUT") {
                updated.requested_at = c.requested_at || null;
              } else if (status === "OVERNIGHT") {
                // di solito manteniamo requested_at (se esiste) o created_at guida il sort nella sezione overnight
                updated.requested_at = (c.requested_at ?? c.created_at) ?? null;
              }

              return updated;
            })
          )
        );

        // se è OVERNIGHT e non era già stato trattato in ottimistico (es. se in futuro togli l’ottimistico), aggiungilo
        if (status === "OVERNIGHT") {
          setOvernights((prev) => {
            const updated = (customers ?? []).find((x) => x.customer_id === customer_id) || current || { customer_id, tag_number };            
            const exists = prev.some((c) => c.customer_id === customer_id);
            return exists
              ? prev.map((c) => (c.customer_id === customer_id ? { ...updated, status: "OVERNIGHT" } : c))
              : [{ ...updated, status: "OVERNIGHT" }, ...prev];
          });
        }

        showToast.success(
          status === "OVERNIGHT"
            ? "Marked OVERNIGHT"
            : status === "OUT"
            ? "Checkout completed"
            : `Status updated to ${status}`
        );
        
        // chiudi eventuale popup
        setSelectedCustomer(null);
        refreshSoon(300);
      } else {
        // ❌ rollback
        showToast.error("Status update failed: " + (data.error || "Unknown error"));
        setCustomers(snapshotCustomers);
        setOvernights(snapshotOvernights);
        refreshSoon(300);
      }
    } catch (error) {
      console.error("🔥 Error updating status:", error);
      showToast.error("An error occurred while updating status.");
      // ❌ rollback
      setCustomers(snapshotCustomers);
      setOvernights(snapshotOvernights);
      refreshSoon(300);
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
          <div className="flex items-center justify-between">
            <div className="flex gap-6 items-center text-sm font-semibold bg-gray-100 p-2 rounded-md">
              <div className="text-black-600">TOT: {counters.totalToday}</div>
              <div className="text-black-600">NOW: {counters.nowCount}</div>
              <div className="text-black-600">OUT: {counters.outCount}</div>
              {counters.overnightCount > 0 && (
                <div className="text-black-600">OVN: {counters.overnightCount}</div>
              )}
            </div>

            {/* Indicatore non bloccante durante il refresh */}
            {isDataLoading && <TinySpinner title="Updating Counters…" />}
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
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => setSearchQuery(val)); // update non-urgente
                }}
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
        <section className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            Active Tags <span className="text-xs text-gray-500">({sortedCustomers.length})</span>
            {isDataLoading && <TinySpinner title="Aggiornamento attivi…" />}
          </h3>

          <div className="grid grid-cols-4 gap-4" aria-busy={isDataLoading ? "true" : "false"}>
            {sortedCustomers.map((customer) => {
              const isSelected = selectedCustomer?.customer_id === customer.customer_id;
              const isPending = customer.status === "PENDING";
              const isCare = customer.status === "CARE";

              let bgColor = "bg-gray-800"; // IN (default)
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
        </section>


        {/* OVERNIGHT CUSTOMERS (render only if there are items) */}
        {Array.isArray(overnights) && overnights.length > 0 && (
          <section className="mt-6">
            <h3 className="text-lg font-semibold text-purple-700 mb-2 flex items-center gap-2">
              Overnight Vehicles <span className="text-xs text-gray-500">({overnights.length})</span>
              {isDataLoading && <TinySpinner title="Aggiornamento overnight…" />}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" aria-busy={isDataLoading ? "true" : "false"}>
              {overnights.map((customer) => {
                const id  = customer?.customer_id ?? customer?.id ?? `${customer?.tag_number || "tag"}-${customer?.created_at || Date.now()}`;
                const tag = customer?.tag_number ?? customer?.tag ?? "—";
                const name = customer?.customer_name || customer?.name || "";
                const ts = customer?.overnight_at || customer?.requested_at || customer?.created_at;
                const elapsed = ts ? getElapsedTime(ts) : "—";
                const isSelected = selectedCustomer?.customer_id === customer?.customer_id;

                return (
                  <div
                    key={id}
                    className={`relative bg-purple-900 text-white p-4 rounded cursor-pointer border-2 transition-all duration-200 
                      ${isSelected ? "border-yellow-400 shadow-lg" : "border-transparent"}`}
                    onClick={() => handleCustomerClick?.(customer)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCustomerClick?.(customer)}
                  >
                    <div className="font-semibold">TAG #{tag}</div>
                    {name && <div className="text-xs opacity-90">{name}</div>}
                    <div className="text-xs mt-1">{elapsed} (Overnight)</div>
                    <div className="absolute top-1 right-2 text-yellow-200 text-xl">🌙</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}




     {/* CUSTOMER INFO BAR */}
      {selectedCustomer && (
        <div className="fixed bottom-0 left-0 right-0 bg-white px-6 py-4 shadow-inner border-t z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-left w-full sm:w-1/2">
            <div className="font-semibold text-lg">{selectedCustomer.first_name}{" "}{selectedCustomer.last_name}</div>
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
                    tag_number: selectedCustomer.tag_number,
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
                      tag_number: selectedCustomer.tag_number,
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
                      tag_number: selectedCustomer.tag_number,
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
                      tag_number: selectedCustomer.tag_number,
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
                      tag_number: selectedCustomer.tag_number,
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
                      tag_number: selectedCustomer.tag_number,
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
