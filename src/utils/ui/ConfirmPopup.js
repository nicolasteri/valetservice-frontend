import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../../styles/confirmStyles.css";

// per USO GENERICO
export const showConfirmPopup = ({ icon = "", title, message, onConfirm, confirmText = "Yes", cancelText = "Cancel", confirmColor = "#2563eb" }) => {
  confirmAlert({
    customUI: ({ onClose }) => (
      <div className="react-confirm-alert custom-confirm-overlay">
        <div className="react-confirm-alert-body">
        <h1>{icon} {title}</h1>
          <h3 className="confirm-message">{message}</h3>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
            marginTop: "20px"
          }}>
            <button
              onClick={async () => {
                await onConfirm();
                onClose();
              }}
              style={{
                backgroundColor: confirmColor,
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "15px",
                border: "none",
                cursor: "pointer",
                flex: 1
              }}
            >
              {confirmText}
            </button>

            <button
              onClick={onClose}
              style={{
                backgroundColor: "#6b7280",
                color: "#fff",
                padding: "12px 24px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "15px",
                border: "none",
                cursor: "pointer",
                flex: 1
              }}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    )
  });
};
  // per STATUS CLIENTI
export const confirmAndUpdatePopup = ({ customerId, status, label, updateStatus }) => {
  showConfirmPopup({
    icon: "🚗",
    title: `Change to "${label}"?`,
    message: "Confirm status update for this customer.",
    confirmText: "Yes, Update",
    confirmColor: "#2563eb",
    onConfirm: () => updateStatus(customerId, status),
  });
};

