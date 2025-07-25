<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST");

include __DIR__ . '/../config.php';

$data = json_decode(file_get_contents("php://input"), true);
$location_code = $data["location_code"] ?? '';
$company_code = $data["company_code"] ?? '';

// Controllo input
if (empty($location_code) || empty($company_code)) {
    echo json_encode(["success" => false, "error" => "Missing location or company code"]);
    exit;
}

// Query con rimozione trattini dal codice compagnia
$stmt = $conn->prepare("
    SELECT l.location_id, l.location_name, l.company_id, c.company_name
    FROM locations l
    JOIN companies c ON l.company_id = c.company_id
    WHERE l.location_code = ? AND REPLACE(c.company_code, '-', '') = ?
");
$stmt->bind_param("ss", $location_code, $company_code);
$stmt->execute();
$result = $stmt->get_result();

// Esito
if ($row = $result->fetch_assoc()) {
    echo json_encode([
        "success" => true,
        "location_id" => $row["location_id"],
        "company_id" => $row["company_id"],
        "location_name" => $row["location_name"],
        "company_name" => $row["company_name"]
    ]);
} else {
    echo json_encode(["success" => false, "error" => "Invalid location or company code"]);
}
