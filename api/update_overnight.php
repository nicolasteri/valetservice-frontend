<?php
//DEBUG 
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
//
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include __DIR__ . '/config.php';
date_default_timezone_set('America/Chicago');

// Ricezione dati dal frontend
$input = json_decode(file_get_contents("php://input"), true);
$location_id = isset($input["location_id"]) ? (int)$input["location_id"] : null;
$company_id = isset($input["company_id"]) ? (int)$input["company_id"] : null;

if (!$location_id || !$company_id) {
    echo json_encode(["success" => false, "error" => "Missing location_id or company_id"]);
    exit;
}

// Calcola il cutoff overnight
$now = new DateTime();
$cutoff = clone $now;
if ((int)$now->format('H') < 5) {
    $cutoff->modify('-1 day');
}
$overnightCutoff = $cutoff->setTime(4, 59, 59)->format('Y-m-d H:i:s');

// DEBUG: Mostra i parametri ricevuti
echo json_encode(["status" => "ok", "test" => true]);
exit;

// Trova tutti i record aperti prima del cutoff per la location e company
$sql = "SELECT r.record_id, r.customer_id
        FROM records r
        INNER JOIN customers c ON r.customer_id = c.customer_id
        WHERE r.status IN ('IN', 'PENDING', 'CARE')
        AND r.time_in < ?
        AND r.time_out IS NULL
        AND r.location_id = ?
        AND c.company_id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("sii", $overnightCutoff, $location_id, $company_id);
$stmt->execute();
$result = $stmt->get_result();

$updated = 0;

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $record_id = $row['record_id'];
        $customer_id = $row['customer_id'];

        // Aggiorna il record a OVERNIGHT
        $updateRecord = $conn->prepare("UPDATE records SET status = 'OVERNIGHT' WHERE record_id = ?");
        $updateRecord->bind_param("i", $record_id);
        $updateRecord->execute();
        $updateRecord->close();

        // Aggiorna il tag associato a OVERNIGHT
        $updateTag = $conn->prepare("UPDATE tags SET status = 'OVERNIGHT' WHERE customer_id = ? AND company_id = ?");
        $updateTag->bind_param("ii", $customer_id, $company_id);
        $updateTag->execute();
        $updateTag->close();

        $updated++;
    }
}

$stmt->close();
$conn->close();

echo json_encode([
    "success" => true,
    "message" => "Overnight status updated.",
    "count" => $updated
]);
