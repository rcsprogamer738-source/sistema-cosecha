import { useState } from "react";
import type { FormEvent } from "react";
import { Coffee, Lock, User, Eye, EyeOff, Plus, ArrowLeft } from "lucide-react";
import "../index.css"; 

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const API_URL = "http://localhost:3000";

  // Estados para el Login
  const [usuario, setUsuario] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");

  // Estados para el Registro
  const [regNombre, setRegNombre] = useState<string>("");
  const [regUsuario, setRegUsuario] = useState<string>("");
  const [regPassword, setRegPassword] = useState<string>("");
  const [regMensaje, setRegMensaje] = useState<string>("");

  // Estado para la animación de girar la tarjeta
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // --- 1. LOGIN CONECTADO A NODE.JS (Puerto 3000) ---
  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Guardamos el token de seguridad en el navegador
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("nombreUser", data.nombre);
        onLogin(); // Entramos al sistema
      } else {
        setLoginError(data.detail || "Error al iniciar sesión");
      }
    } catch (error) {
      setLoginError("Error de conexión con el servidor");
    }
  };

  // --- 2. REGISTRO CONECTADO A NODE.JS (Puerto 3000) ---
  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRegMensaje("");

    try {
      const response = await fetch(`${API_URL}/api/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nombre: regNombre, 
          usuario: regUsuario, 
          password: regPassword 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setRegMensaje("¡Cuenta creada! Ya puedes iniciar sesión.");
        setRegNombre(""); setRegUsuario(""); setRegPassword("");
        setTimeout(() => setIsFlipped(false), 2000); // Voltea la tarjeta tras 2 seg
      } else {
        setRegMensaje(data.detail || "Error al crear cuenta");
      }
    } catch (error) {
      setRegMensaje("Error de conexión con el servidor");
    }
  };

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
    setLoginError(""); 
    setRegMensaje(""); 
  };

  return (
    <div className="neumorphism-body">
      {/* Círculos flotantes del fondo ocultos por CSS, pero estructura mantenida */}
      <div className="bg-circle bg1"></div>
      <div className="bg-circle bg2"></div>
      <div className="bg-circle bg3"></div>

      <div className="auth-wrapper">
        <div className={`auth-card ${isFlipped ? "flipped" : ""}`}>
          
          {/* ----- PANEL DE LOGIN (Frente) ----- */}
          <div className="form-panel login-panel">
            <div className="logo">
              <Coffee size={36} />
            </div>
            <h1>Gestión de Cosecha</h1>
            <p className="subtitle">Inicia sesión para continuar</p>

            <form onSubmit={handleLoginSubmit}>
              <div className="input-group">
                <div className="electric-glow"></div>
                <div className="electric-border"></div>
                <input 
                  type="text" 
                  id="loginUser" 
                  placeholder=" " 
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required 
                />
                <label htmlFor="loginUser">Usuario</label>
              </div>

              <div className="input-group">
                <div className="electric-glow"></div>
                <div className="electric-border"></div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="loginPassword" 
                  placeholder=" " 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <label htmlFor="loginPassword">Contraseña</label>
                <button 
                  type="button" 
                  className="password-toggle" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {loginError && <div className="error-text">{loginError}</div>}

              <div className="options">
                <label className="checkbox">
                  <input type="checkbox" /> Recordarme
                </label>
                <a href="#">¿Olvidaste tu contraseña?</a>
              </div>
              <button type="submit" className="main-btn">Iniciar Sesión</button>
            </form>

            <div className="switch-area">
              <span>¿No tienes una cuenta?</span>
              <button type="button" className="switch-circle" onClick={toggleFlip}>
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* ----- PANEL DE REGISTRO (Atrás) ----- */}
          <div className="form-panel signup-panel">
            <div className="logo">
              <User size={36} />
            </div>
            <h1>Crear Cuenta</h1>
            <p className="subtitle">Registra un nuevo trabajador o admin</p>

            <form onSubmit={handleRegisterSubmit}>
              <div className="input-group">
                <div className="electric-glow"></div>
                <div className="electric-border"></div>
                <input 
                  type="text" 
                  id="signupName" 
                  placeholder=" " 
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  required 
                />
                <label htmlFor="signupName">Nombre Completo</label>
              </div>

              <div className="input-group">
                <div className="electric-glow"></div>
                <div className="electric-border"></div>
                <input 
                  type="text" 
                  id="signupUser" 
                  placeholder=" " 
                  value={regUsuario}
                  onChange={(e) => setRegUsuario(e.target.value)}
                  required 
                />
                <label htmlFor="signupUser">Nuevo Usuario</label>
              </div>

              <div className="input-group">
                <div className="electric-glow"></div>
                <div className="electric-border"></div>
                <input 
                  type="password" 
                  id="signupPassword" 
                  placeholder=" " 
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required 
                />
                <label htmlFor="signupPassword">Contraseña</label>
              </div>

              {regMensaje && (
                <div className="error-text" style={{color: regMensaje.includes("creada") ? '#4ade80' : '#ef4444'}}>
                  {regMensaje}
                </div>
              )}

              <button type="submit" className="main-btn">Crear Cuenta</button>
            </form>

            <div className="switch-area">
              <span>¿Ya tienes cuenta?</span>
              <button type="button" className="switch-circle" onClick={toggleFlip}>
                <ArrowLeft size={20} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}