<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include __DIR__ . '/../config.php';

$data = json_decode(file_get_contents("php://input"), true);

// ✅ Campi richiesti
$customer_id = $data['customer_id'] ?? null;
$status = $data['status'] ?? null;
$company_id = $data['company_id'] ?? null;
$location_id = $data['location_id'] ?? null;


if (!is_numeric($customer_id) || !is_string($status) || !is_numeric($company_id) || !is_numeric($location_id)) {
    echo json_encode(["success" => false, "error" => "Missing or invalid required fields"]);
    exit;
}

$valid_statuses = ['IN', 'PENDING', 'CARE', 'OUT', 'OVERNIGHT'];
if (!in_array($status, $valid_statuses)) {
    echo json_encode(["success" => false, "error" => "Invalid status"]);
    exit;
}

// ✅ Recupera l'ultimo record aperto per quel customer e company
$recordStmt = $conn->prepare("
    SELECT r.record_id, r.time_in
    FROM records r
    INNER JOIN customers c ON r.customer_id = c.customer_id
    WHERE r.customer_id = ? AND c.company_id = ? AND r.time_out IS NULL
    ORDER BY r.record_id DESC LIMIT 1
");
$recordStmt->bind_param("ii", $customer_id, $company_id);
$recordStmt->execute();
$recordResult = $recordStmt->get_result();

if ($recordResult->num_rows === 0) {
    echo json_encode(["success" => false, "error" => "No active record found for this company"]);
    $recordStmt->close();
    $conn->close();
    exit;
}

$record = $recordResult->fetch_assoc();
$record_id = $record['record_id'];
$time_in = strtotime($record['time_in']);
$recordStmt->close();

// ✅ Calcolo OVERNIGHT
$overnight_limit = strtotime("next day 4:59", $time_in);
$now = time();

if ($now > $overnight_limit && $status !== 'OUT') {
    $status = 'OVERNIGHT';
}

// ✅ Se status = OUT
if ($status === 'OUT') {
    $stmt = $conn->prepare("UPDATE records SET status = ?, time_out = NOW() WHERE record_id = ?");
    $stmt->bind_param("si", $status, $record_id);
    if (!$stmt->execute()) {
        echo json_encode(["success" => false, "error" => $stmt->error]);
        $stmt->close();
        $conn->close();
        exit;
    }
    $stmt->close();

//DEBUG
error_log("📥 location_id: " . $location_id);
error_log("📥 company_id: " . $company_id);

    // Libera il tag associato
    $updateTag = $conn->prepare("UPDATE tags SET status = 'AVAILABLE', customer_id = NULL WHERE customer_id = ? AND company_id = ?");
    $updateTag->bind_param("ii", $customer_id, $company_id);
    if (!$updateTag->execute()) {
        echo json_encode(["success" => false, "error" => "Tag release failed: " . $updateTag->error]);
        $updateTag->close();
        $conn->close();
        exit;
    }
    $updateTag->close();

    $conn->close();
    echo json_encode(["success" => true, "message" => "Checkout completed"]);
    exit;
}

// ✅ Altri status
if ($status === 'PENDING') {
    // Imposta requested_at solo se è ancora NULL
    $update = $conn->prepare("
        UPDATE records 
        SET status = ?, 
            requested_at = CASE WHEN requested_at IS NULL THEN NOW() ELSE requested_at END 
        WHERE record_id = ?
    ");
    $update->bind_param("si", $status, $record_id);
} elseif ($status === 'IN') {
    // ✅ Se status diventa IN da PENDING o CARE, azzera requested_at
    $update = $conn->prepare("UPDATE records SET status = ?, requested_at = NULL WHERE record_id = ?");
    $update->bind_param("si", $status, $record_id);
} else {
    // ✅ Per altri status (CARE, OVERNIGHT), non modificare requested_at
    $update = $conn->prepare("UPDATE records SET status = ? WHERE record_id = ?");
    $update->bind_param("si", $status, $record_id);
}

if (!$update->execute()) {
    echo json_encode(["success" => false, "error" => $update->error]);
    $update->close();
    $conn->close();
    exit;
}
$update->close();

// ✅ Aggiorna anche lo status del tag
$updateTag = $conn->prepare("UPDATE tags SET status = ? WHERE customer_id = ? AND company_id = ?");
$updateTag->bind_param("sii", $status, $customer_id, $company_id);
if (!$updateTag->execute()) {
    echo json_encode(["success" => false, "error" => "Tag status update failed: " . $updateTag->error]);
    $updateTag->close();
    $conn->close();
    exit;
}
$updateTag->close();

$conn->close();
echo json_encode(["success" => true, "message" => "Status updated to $status"]);
?>
