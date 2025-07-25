import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Errore 404</h2>
      <p>Pagina non trovata.</p>
      <Link to="/">Torna alla Home</Link>
    </div>
  );
}

export default NotFoundPage;
