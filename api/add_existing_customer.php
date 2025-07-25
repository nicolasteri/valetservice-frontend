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

// Validazione dati
$customer_id = $data['customer_id'] ?? null;
$tag_number = $data['tag_number'] ?? null;
$location_id = $data['location_id'] ?? null;
$company_id = $data['company_id'] ?? null;

if (
    !is_numeric($customer_id) ||
    !is_numeric($tag_number) ||
    !is_numeric($location_id) ||
    !is_numeric($company_id)
) {
    echo json_encode(['success' => false, 'error' => 'Invalid or missing customer_id, tag_number, location_id, or company_id']);
    exit;
}

// ✅ 1. Verifica che il tag esista, sia associato alla location e company, e sia disponibile
$checkTag = $conn->prepare("SELECT status FROM tags WHERE tag_number = ? AND company_id = ? AND location_id = ?");
$checkTag->bind_param("iii", $tag_number, $company_id, $location_id);
$checkTag->execute();
$tagResult = $checkTag->get_result();
$checkTag->close();

if ($tagResult->num_rows === 0) {
    echo json_encode(['success' => false, 'error' => 'Tag not found for this company/location']);
    exit;
}
$tagRow = $tagResult->fetch_assoc();
if ($tagRow['status'] !== 'AVAILABLE') {
    echo json_encode(['success' => false, 'error' => 'Tag is not available']);
    exit;
}

// ✅ 2. Inserimento nuovo record
$stmt = $conn->prepare("
    INSERT INTO records (customer_id, location_id, company_id, status, time_in, tag_number)
    VALUES (?, ?, ?, 'IN', NOW(), ?)
");
$stmt->bind_param("iiii", $customer_id, $location_id, $company_id, $tag_number);

if ($stmt->execute()) {
    // ✅ 3. Aggiorna il tag assegnandolo al customer
    $updateTag = $conn->prepare("
        UPDATE tags SET status = 'IN', customer_id = ?
        WHERE tag_number = ? AND company_id = ? AND location_id = ?
    ");
    $updateTag->bind_param("iiii", $customer_id, $tag_number, $company_id, $location_id);
    if (!$updateTag->execute()) {
        echo json_encode(['success' => false, 'error' => 'Tag update failed: ' . $updateTag->error]);
        $updateTag->close();
        $stmt->close();
        $conn->close();
        exit;
    }
    $updateTag->close();
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to insert record: ' . $stmt->error]);
}

$stmt->close();
$conn->close();
