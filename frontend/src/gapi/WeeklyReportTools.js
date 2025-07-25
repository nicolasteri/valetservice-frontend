import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const SHEETS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export async function handleDownloadWeek(spreadsheetId, gapi) {
  try {
    const allSheets = [...SHEETS, "Recap Week"];
    const workbook = XLSX.utils.book_new();

    // 🔹 1. Leggi il nome location da cella file
    const locationRes = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `MONDAY!B2`,
    });
    const locationRaw = locationRes.result.values?.[0]?.[0] || "Location";
    const locationName = locationRaw.replace(/\s+/g, ""); // rimuove spazi es. EvelynSteakhouse

    // 🔹 2. Data odierna
    const today = new Date().toISOString().split("T")[0]; // formato YYYY-MM-DD

    // 🔹 3. Prepara nome file finale
    const filename = `${locationName}_shift-report_${today}.xlsx`;

    // 🔹 4. Inserisci i fogli nel workbook
    for (const sheetName of allSheets) {
      const res = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:I30`,
      });
      const rows = res.result.values || [];
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    // 🔹 5. Genera e salva file
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);

  } catch (error) {
    alert("Download failed. Please check your connection.");
    console.error(error);
  }
}


export async function handleResetWeek(spreadsheetId, gapi) {
  const requests = [];

  for (const sheetName of SHEETS) {
    const sheetId = await getSheetId(spreadsheetId, sheetName, gapi);

    // Clear C2:I30
    requests.push({
      updateCells: {
        range: {
          sheetId: sheetId,
          startRowIndex: 1,
          endRowIndex: 30,
          startColumnIndex: 2,
          endColumnIndex: 9,
        },
        fields: "userEnteredValue",
      },
    });

    // Clear B6, B8 (rowIndex 5 and 7, colIndex 1)
    [5, 7].forEach((row) => {
      requests.push({
        updateCells: {
          rows: [{ values: [{ userEnteredValue: { stringValue: "" } }] }],
          fields: "userEnteredValue",
          start: {
            sheetId: sheetId,
            rowIndex: row,
            columnIndex: 1,
          },
        },
      });
    });

    // Set formula in B12 (=B8*B10)
    requests.push({
      updateCells: {
        rows: [{ values: [{ userEnteredValue: { formulaValue: "=B8*B10" } }] }],
        fields: "userEnteredValue",
        start: {
          sheetId: sheetId,
          rowIndex: 11,
          columnIndex: 1,
        },
      },
    });

    // Set formula in B14 (=SUM(H:H))
    requests.push({
      updateCells: {
        rows: [{ values: [{ userEnteredValue: { formulaValue: "=SUM(H:H)" } }] }],
        fields: "userEnteredValue",
        start: {
          sheetId: sheetId,
          rowIndex: 13,
          columnIndex: 1,
        },
      },
    });
  }

  await gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests },
  });

  alert("Week data reset successfully.");
}

async function getSheetId(spreadsheetId, sheetName, gapi) {
  const response = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
  const sheet = response.result.sheets.find((s) => s.properties.title === sheetName);
  return sheet?.properties.sheetId;
}
