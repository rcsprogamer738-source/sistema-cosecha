import { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Fondo from "./components/Fondo";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  return (
    <Fondo>
      {isAuthenticated ? <Dashboard /> : <Login onLogin={() => setIsAuthenticated(true)} />}
    </Fondo>
  );
}
