import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const defaultOptions = {
  position: "bottom-center",
  autoClose: 2500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const showToast = {
    success: (message) => toast.success(message, defaultOptions),
    error: (message) => toast.error(message, defaultOptions),
    info: (message) => toast.info(message, defaultOptions),
    warning: (message) => toast.warning(message, defaultOptions),
  };
