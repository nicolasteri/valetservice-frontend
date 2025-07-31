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

$data = json_decode(file_get_contents('php://input'), true);

// Pulizia e normalizzazione input
$rawCompanyCode = $data['company_code'] ?? null;
$locationCode = $data['location_code'] ?? null;
$managerCode = $data['manager_code'] ?? null;

if (!$rawCompanyCode) {
    echo json_encode(['success' => false, 'error' => 'Missing company_code']);
    exit;
}

$cleanCompanyCode = str_replace("-", "", $rawCompanyCode);

// 1. Verifica che esista la compagnia
$stmt = $conn->prepare("
    SELECT company_id, manager_code 
    FROM companies 
    WHERE REPLACE(company_code, '-', '') = ?
");
$stmt->bind_param("s", $cleanCompanyCode);
$stmt->execute();
$result = $stmt->get_result();

if ($company = $result->fetch_assoc()) {
    $companyId = $company['company_id'];

    // 2. Login Manager
    if ($managerCode) {
        $cleanManagerCode = str_replace("-", "", $managerCode);
        $stmtM = $conn->prepare("
            SELECT company_id 
            FROM companies 
            WHERE company_id = ? AND REPLACE(manager_code, '-', '') = ?
        ");
        $stmtM->bind_param("is", $companyId, $cleanManagerCode);
        $stmtM->execute();
        $resultM = $stmtM->get_result();

        if ($resultM->num_rows === 1) {
            echo json_encode([
                'success' => true,
                'access_level' => 'MANAGER',
                'company_id' => $companyId
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid manager code']);
        }

        $stmtM->close();
        exit;
    }

    // 3. Login Operator
    if ($locationCode) {
        $stmt2 = $conn->prepare("
            SELECT location_id 
            FROM locations 
            WHERE company_id = ? AND location_code = ?
        ");
        $stmt2->bind_param("is", $companyId, $locationCode);
        $stmt2->execute();
        $res2 = $stmt2->get_result();

        if ($location = $res2->fetch_assoc()) {
            echo json_encode([
                'success' => true,
                'access_level' => 'OPERATOR',
                'company_id' => $companyId,
                'location_id' => $location['location_id']
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid location code']);
        }

        $stmt2->close();
        exit;
    }

    // 4. Accesso solo company
    echo json_encode([
        'success' => true,
        'access_level' => 'COMPANY_ONLY',
        'company_id' => $companyId
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Company not found']);
}

$stmt->close();
$conn->close();
