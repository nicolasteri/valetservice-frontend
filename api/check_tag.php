<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');
include __DIR__ . '/config.php';

$data = json_decode(file_get_contents("php://input"), true);

$tag_number = $data['tag_number'] ?? null;
$location_id = $data['location_id'] ?? null;
$company_id = $data['company_id'] ?? null;

if (!is_numeric($tag_number) || !is_numeric($location_id) || !is_numeric($company_id)) {
    echo json_encode(["success" => false, "error" => "Missing or invalid data"]);
    exit;
}

$stmt = $conn->prepare("
    SELECT tag_number, status 
    FROM tags 
    WHERE tag_number = ? AND location_id = ? AND company_id = ?
");
$stmt->bind_param("iii", $tag_number, $location_id, $company_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    if ($row['status'] === 'AVAILABLE') {
        echo json_encode(["success" => true, "available" => true]);
    } else {
        echo json_encode(["success" => true, "available" => false, "status" => $row['status']]);
    }
} else {
    echo json_encode(["success" => false, "error" => "Tag not found in this location and company"]);
}

$stmt->close();
$conn->close();
