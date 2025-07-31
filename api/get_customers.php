<?php
// DEBUG
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

// ✅ Supporto CORS e Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    exit(0);
}
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");

include __DIR__ . '/config.php';

$data = json_decode(file_get_contents("php://input"), true);

// DEBUG: Salva i dati ricevuti in un file per debugging
file_put_contents(__DIR__ . "/debug_get_customers.txt", print_r($data, true), FILE_APPEND);


$location_id = $data['location_id'] ?? null;
$company_id = $data['company_id'] ?? null;
$search = $data['search'] ?? "";
$status = $data['status'] ?? "";
$timeRange = $data['timeRange'] ?? "today";

if (!$location_id || !$company_id) {
    echo json_encode(["success" => false, "error" => "Missing location_id or company_id"]);
    exit;
}

date_default_timezone_set("America/Chicago");
$startOfDay = new DateTime("today 05:00");
$endOfDay = (clone $startOfDay)->modify('+1 day')->modify('-1 second');

// DEBUG: Mostra i parametri ricevuti
echo json_encode(["status" => "ok", "test" => true]);
exit;


$query = "
    SELECT 
    c.customer_id,
    c.first_name,
    c.last_name,
    c.phone_number,
    c.vehicle_model,
    c.color,
    r.status,
    r.time_in AS created_at,
    r.tag_number,
    r.requested_at
    FROM records r
    JOIN customers c ON r.customer_id = c.customer_id
    WHERE r.location_id = ? AND r.company_id = ?
    AND r.time_out IS NULL
";


$params = [$location_id, $company_id];
$types = "ii";

// 🔍 Ricerca testuale
if (!empty($search)) {
    $query .= " AND (
        c.first_name LIKE ? OR
        c.last_name LIKE ? OR
        c.phone_number LIKE ? OR
        r.tag_number LIKE ?
    )";
    $searchParam = "%$search%";
    array_push($params, $searchParam, $searchParam, $searchParam, $searchParam);
    $types .= "ssss";
}

// 📌 Filtro status
if (!empty($status) && $status !== "ALL") {
    $query .= " AND r.status = ?";
    $params[] = $status;
    $types .= "s";

    if ($status === "OUT") {
        $query .= " AND r.time_out BETWEEN ? AND ?";
        $params[] = $startOfDay->format("Y-m-d H:i:s");
        $params[] = $endOfDay->format("Y-m-d H:i:s");
        $types .= "ss";
    } elseif ($status === "OVERNIGHT") {
        // Mostra clienti rimasti overnight da ieri e oggi
        $yesterdayStart = (clone $startOfDay)->modify('-1 day');
        $query .= " AND r.time_in BETWEEN ? AND ?";
        $params[] = $yesterdayStart->format("Y-m-d H:i:s");
        $params[] = $endOfDay->format("Y-m-d H:i:s");
        $types .= "ss";
    } else {
        $query .= " AND r.time_in BETWEEN ? AND ?";
        $params[] = $startOfDay->format("Y-m-d H:i:s");
        $params[] = $endOfDay->format("Y-m-d H:i:s");
        $types .= "ss";
    }
}


$query .= " ORDER BY r.time_in DESC";

// 🔎 Debug se serve
// error_log("QUERY: $query");
// error_log("PARAMS: " . json_encode($params));

$stmt = $conn->prepare($query);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$customers = [];
while ($row = $result->fetch_assoc()) {
    $customers[] = $row;
}

echo json_encode([
    "success" => true,
    "customers" => $customers
]);
exit;
