<?php
// Abilitazione CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include __DIR__ . '/../config.php';

// Ricevi dati
$data = json_decode(file_get_contents("php://input"), true);

// Verifica presenza campi obbligatori
if (
    !isset($data['first_name']) ||
    !isset($data['phone_number']) ||
    !isset($data['tag_number']) ||
    !isset($data['company_id']) ||
    !isset($data['location_id'])
) {
    die(json_encode(["success" => false, "error" => "Missing required fields"]));
}

$company_id = (int) $data['company_id'];
$location_id = (int) $data['location_id'];
$tag_number = (int) $data['tag_number'];

// ✅ Validazione tag_number
if ($tag_number <= 0) {
    die(json_encode(["success" => false, "error" => "Invalid tag number"]));
}

// ✅ 1. Verifica che il tag esista e appartenga a questa location e company
$tagCheckStmt = $conn->prepare("SELECT status FROM tags WHERE tag_number = ? AND location_id = ? AND company_id = ?");
$tagCheckStmt->bind_param("iii", $tag_number, $location_id, $company_id);
$tagCheckStmt->execute();
$tagResult = $tagCheckStmt->get_result();

if ($tagResult->num_rows === 0) {
    die(json_encode(["success" => false, "error" => "Errore: Tag non esistente o non associato a questa location/company"]));
}
$tagRow = $tagResult->fetch_assoc();
if ($tagRow['status'] !== 'AVAILABLE') {
    die(json_encode(["success" => false, "error" => "Errore: Tag già in uso"]));
}

// ✅ 2. Inserimento cliente
$stmt = $conn->prepare("INSERT INTO customers (first_name, last_name, phone_number, vehicle_model, color, company_id) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sssssi", $data['first_name'], $data['last_name'], $data['phone_number'], $data['vehicle_model'], $data['color'], $company_id);

if ($stmt->execute()) {
    $customer_id = $stmt->insert_id;

    // ✅ 3. Inserimento record
    $recordStmt = $conn->prepare("INSERT INTO records (customer_id, location_id, company_id, status, tag_number, time_in) VALUES (?, ?, ?, 'IN', ?, NOW())");
    $recordStmt->bind_param("iiii", $customer_id, $location_id, $company_id, $tag_number);

    if (!$recordStmt->execute()) {
        $conn->query("DELETE FROM customers WHERE customer_id = $customer_id");
        die(json_encode(["success" => false, "error" => "Errore inserimento record: " . $recordStmt->error]));
    }

    // ✅ 4. Aggiornamento tag
    $updateTagStmt = $conn->prepare("UPDATE tags SET status = 'IN', customer_id = ? WHERE tag_number = ? AND location_id = ? AND company_id = ?");
    $updateTagStmt->bind_param("iiii", $customer_id, $tag_number, $location_id, $company_id);

    if (!$updateTagStmt->execute()) {
        $conn->query("DELETE FROM records WHERE customer_id = $customer_id");
        $conn->query("DELETE FROM customers WHERE customer_id = $customer_id");
        die(json_encode(["success" => false, "error" => "Errore aggiornamento tag: " . $updateTagStmt->error]));
    }

    // ✅ 5. Recupera time_in
    $created_result = $conn->query("SELECT time_in FROM records WHERE customer_id = $customer_id ORDER BY record_id DESC LIMIT 1");
    $created_row = $created_result->fetch_assoc();
    $created_at = $created_row['time_in'];

    // ✅ 6. Risposta finale
    $response = [
        "success" => true,
        "customer" => [
            "customer_id" => $customer_id,
            "first_name" => $data['first_name'],
            "last_name" => $data['last_name'],
            "phone_number" => $data['phone_number'],
            "vehicle_model" => $data['vehicle_model'],
            "color" => $data['color'],
            "tag_number" => $tag_number,
            "status" => 'IN',
            "created_at" => $created_at
        ]
    ];

    $recordStmt->close();
    $updateTagStmt->close();
} else {
    $response = ["success" => false, "error" => "Errore inserimento cliente: " . $stmt->error];
}

$stmt->close();
$tagCheckStmt->close();
$conn->close();

echo json_encode($response);
?>
