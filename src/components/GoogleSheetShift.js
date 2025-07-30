import React, { useEffect, useState } from "react";
import { gapi } from "gapi-script";
import { showToast } from "../utils/ui/showToast";
import "react-toastify/dist/ReactToastify.css";
import { handleDownloadWeek, handleResetWeek } from "../gapi/WeeklyReportTools";
import { FaSpinner } from "react-icons/fa";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import { showConfirmPopup } from "../utils/ui/ConfirmPopup";

const CLIENT_ID = "669630153960-om8ojkoj2failsa0jvg823g70963v95c.apps.googleusercontent.com";
const API_KEY = "AIzaSyCkf61rUYZyIhdCO312ZbW49MFBYEOayPE";
const SPREADSHEET_ID = "1QtS4QQPxJk1-fJya38JH4PQH8Qp0GK430RXQCqNZamA";

function GoogleSheetShift() {
  const [data, setData] = useState([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState("MONDAY");
  const [modifiedCells, setModifiedCells] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    showToast.success("Test toast from GoogleSheetShift");
  }, []);
  

  useEffect(() => {
    function initClient() {
      gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        scope: "https://www.googleapis.com/auth/spreadsheets",
      }).then(() => {
        const authInstance = gapi.auth2.getAuthInstance();
        setIsSignedIn(authInstance.isSignedIn.get());

        authInstance.isSignedIn.listen((signedIn) => {
          setIsSignedIn(signedIn);
          if (signedIn) {
            loadData(selectedSheet);
          }
        });

        if (authInstance.isSignedIn.get()) {
          loadData(selectedSheet);
        }
      }).catch((error) => {
        console.error("OAuth Init Error:", error);
      });
    }

    gapi.load("client:auth2", initClient);
  }, [selectedSheet]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isSignedIn) {
        loadData(selectedSheet);
      }
    }, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [isSignedIn, selectedSheet]);

  const handleLogin = () => gapi.auth2.getAuthInstance().signIn();

  //Logout popup function
  const handleLogout = () => {
    showConfirmPopup({
      title: "Logout?",
      message: "Are you sure you want to log out?",
      confirmText: "Yes, Logout",
      confirmColor: "#c0392b",
      onConfirm: () => gapi.auth2.getAuthInstance().signOut()
    });
  };


  const loadData = (sheetName) => {
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:I20`,
    }).then((response) => {
      const sheetData = response.result.values;
      setData(sheetData || []);
      setModifiedCells(new Set());
    });
  };

  const saveData = async () => {
    setIsLoading(true);
    try {
      const safeData = data.map((row, i) =>
        row.map((cell, j) => {
          if (
            i === 0 ||
            (j === 0 && [1, 3, 5, 7, 9, 11, 13].includes(i)) ||
            (i === 11 && j === 1) ||
            (i === 13 && j === 1)
          ) {
            return undefined;
          }
          return cell || "";
        })
      );

      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${selectedSheet}!A1:I20`,
        valueInputOption: "RAW",
        resource: { values: safeData },
      });

      showToast.success("Shift successfully saved!", { position: "bottom-center", autoClose: 2000 });
    } catch (err) {
      showToast.error("Error while saving shift.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateCell = (rowIndex, colIndex, value) => {
    const newData = [...data];
    if (!newData[rowIndex]) {
      newData[rowIndex] = [];
    }
    newData[rowIndex][colIndex] = value;
    setData(newData);
    setModifiedCells((prev) => new Set(prev).add(`${rowIndex}-${colIndex}`));
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      await handleDownloadWeek(SPREADSHEET_ID, gapi);
      showToast.success("Weekly report downloaded!");
    } catch (err) {
      showToast.error("Download failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    showConfirmPopup({
      icon: "⚠️",
      title: "Reset Week?",
      message: "This will erase all weekly data. Are you sure?",
      confirmText: "Yes, Reset",
      confirmColor: "#c0392b",
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await handleResetWeek(SPREADSHEET_ID, gapi);
          showToast.success("Weekly reset completed!");
        } catch (err) {
          showToast.error("Error during reset.");
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };
    

  return (
    <div className="flex flex-col h-full">
      {!isSignedIn ? (
        <div className="p-4">
          <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded">
            Sign in with Google
          </button>
        </div>
      ) : (
        <>
          <div className="p-4 flex justify-between items-center border-b">
            <h2 className="text-xl font-semibold">Shift Tracker</h2>
            <div className="flex gap-4 items-center">
              <button
                onClick={handleDownload}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm flex items-center gap-2"
              >
                {isLoading && <FaSpinner className="animate-spin" />}
                Download Week
              </button>

              <button
                onClick={handleReset}
                disabled={isLoading}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-sm flex items-center gap-2"
              >
                {isLoading && <FaSpinner className="animate-spin" />}
                Reset Week
              </button>

              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {data.map((row, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="p-1 border border-gray-300">
                        {(i === 0 ||
                          (j === 0 && [1, 3, 5, 7, 9, 11, 13].includes(i)) ||
                          (i === 11 && j === 1) ||
                          (i === 13 && j === 1)) ? (
                          <input
                            type="text"
                            value={row[j] || ""}
                            disabled
                            className="w-full p-1 bg-gray-100 cursor-not-allowed"
                          />
                        ) : (
                          <input
                            type="text"
                            value={row[j] || ""}
                            onChange={(e) => updateCell(i, j, e.target.value)}
                            className={`w-full p-1 ${modifiedCells.has(`${i}-${j}`) ? "bg-yellow-100" : ""}`}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t flex justify-end gap-4">
            <button
              onClick={saveData}
              disabled={isLoading}
              className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2"
            >
              {isLoading && <FaSpinner className="animate-spin" />}
              Save
            </button>

            <select
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              disabled={isLoading}
              className="border px-2 py-1 rounded-md text-sm w-auto"
            >
              <option value="MONDAY">Monday</option>
              <option value="TUESDAY">Tuesday</option>
              <option value="WEDNESDAY">Wednesday</option>
              <option value="THURSDAY">Thursday</option>
              <option value="FRIDAY">Friday</option>
              <option value="SATURDAY">Saturday</option>
              <option value="SUNDAY">Sunday</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}

export default GoogleSheetShift;
