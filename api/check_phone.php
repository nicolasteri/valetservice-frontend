<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');
include __DIR__ . '/../config.php';

$data = json_decode(file_get_contents('php://input'), true);
$phone_number = $data['phone_number'] ?? '';
$company_id = $data['company_id'] ?? null;

if (strlen($phone_number) !== 10 || !$company_id) {
    echo json_encode(['success' => false, 'error' => 'Invalid or missing phone number or company_id']);
    exit;
}

// Cerca il cliente per phone_number + company_id
$stmt = $conn->prepare("
    SELECT customer_id, first_name, last_name, phone_number, vehicle_model, color 
    FROM customers 
    WHERE phone_number = ? AND company_id = ?
");
$stmt->bind_param("si", $phone_number, $company_id);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        'success' => true,
        'exists' => true,
        'customer' => $row
    ]);
} else {
    echo json_encode([
        'success' => true,
        'exists' => false
    ]);
}

$stmt->close();
$conn->close();
?>
