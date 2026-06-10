import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Auth({ onAuthSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!db || !auth) {
      setError("Firebase no está configurado. Completá las credenciales en firebase.js o el archivo .env.");
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        if (!name.trim()) throw new Error("Por favor, ingresá tu nombre.");
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user document in Firestore
        await setDoc(doc(db, "users", user.uid), {
          id: user.uid,
          name: name.trim(),
          email: email.trim(),
          role: "user",
          totalPoints: 0
        });
      } else {
        // Sign in
        await signInWithEmailAndPassword(auth, email, password);
      }
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      console.error(err);
      let errMsg = err.message;
      if (err.code === 'auth/email-already-in-use') errMsg = "El correo electrónico ya está registrado.";
      else if (err.code === 'auth/weak-password') errMsg = "La contraseña debe tener al menos 6 caracteres.";
      else if (err.code === 'auth/invalid-credential') errMsg = "Credenciales incorrectas. Verificá tu correo y contraseña.";
      else if (err.code === 'auth/invalid-email') errMsg = "Formato de correo inválido.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-green-500 rounded-full blur-[80px] opacity-25"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-yellow-500 rounded-full blur-[80px] opacity-20"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="inline-block px-3 py-1 bg-green-500/10 text-green-400 text-xs font-semibold tracking-wider rounded-full mb-3 uppercase">
            🏆 Prode Mundial 2026
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {isRegistering ? "Creá tu cuenta" : "Iniciá sesión"}
          </h2>
          <p className="text-gray-400 mt-2 text-sm">
            {isRegistering ? "Sumate a la competencia con el grupo" : "¡Ingresá tus pronósticos y sumá puntos!"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-500/30 text-red-300 rounded-lg text-sm flex items-center gap-2 relative z-10">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {isRegistering && (
            <div>
              <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">Nombre Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Leo Messi"
                className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-900/60 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              isRegistering ? "Registrarse" : "Entrar"
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-800/80 pt-6 relative z-10">
          <p className="text-gray-400 text-sm">
            {isRegistering ? "¿Ya tenés una cuenta?" : "¿No estás registrado?"}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-green-400 font-semibold hover:text-green-300 ml-1.5 focus:outline-none transition-colors"
            >
              {isRegistering ? "Iniciá sesión" : "Creá tu cuenta acá"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
