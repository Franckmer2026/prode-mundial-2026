import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import AdminPanel from './components/AdminPanel';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('predictions'); // 'predictions' | 'leaderboard' | 'admin'
  const [authChecking, setAuthChecking] = useState(true);
  const [firebaseUnconfigured, setFirebaseUnconfigured] = useState(false);

  useEffect(() => {
    if (!auth || !db) {
      setFirebaseUnconfigured(true);
      setAuthChecking(false);
      return;
    }

    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            console.warn("User profile document not found in Firestore.");
          }
          setAuthChecking(false);
        }, (err) => {
          console.error("Error listening to user profile:", err);
          setAuthChecking(false);
        });
      } else {
        setUserProfile(null);
        setAuthChecking(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    if (window.confirm("¿Querés cerrar sesión?")) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Error signing out:", err);
      }
    }
  };

  if (firebaseUnconfigured) {
    return (
      <div className="min-h-screen bg-[#0f111a] text-white flex items-center justify-center p-6">
        <div className="glass-panel max-w-lg p-8 rounded-2xl border border-yellow-500/20 shadow-2xl text-center">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-2xl font-bold text-yellow-400 mt-4">Falta configurar Firebase</h2>
          <p className="text-gray-400 mt-3 text-sm leading-relaxed">
            La aplicación necesita las credenciales de Firebase para funcionar. 
            Copiá tus claves de Firebase Console y colocalas en el archivo:
          </p>
          <code className="block bg-gray-900 border border-gray-800 p-3 rounded-lg text-green-400 text-xs font-mono my-4 select-all">
            C:\Users\Frank\.gemini\antigravity\scratch\prode-mundial-2026\src\firebase.js
          </code>
          <p className="text-gray-500 text-xs mt-2">
            Podés configurar la base de datos Firestore, Firebase Auth (Email/Password) y pegar la configuración allí.
          </p>
        </div>
      </div>
    );
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0f111a] flex justify-center items-center">
        <svg className="animate-spin h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // If user is not logged in, show Auth Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f111a] py-10">
        <Auth />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f111a] text-[#e2e8f0]">
      {/* Navbar Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-gray-800/80 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <span className="text-lg font-black tracking-tight text-white block">PRODE MUNDIAL</span>
              <span className="text-xxs text-green-400 font-bold tracking-widest uppercase">Mundial 2026</span>
            </div>
          </div>

          {/* User profile Summary & Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-sm font-bold text-white">
                {userProfile?.name || currentUser.email}
              </span>
              <span className="text-xs text-green-400 font-semibold">
                {userProfile?.totalPoints !== undefined ? `${userProfile.totalPoints} pts` : "Cargando..."}
                {userProfile?.role === 'admin' && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xxs font-bold rounded-md uppercase">
                    Admin
                  </span>
                )}
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2.5 bg-gray-900 border border-gray-800 hover:border-red-500/30 hover:bg-red-950/20 text-gray-400 hover:text-red-400 rounded-xl transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800/80 mb-8 gap-2">
          <button
            onClick={() => setActiveTab('predictions')}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'predictions'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            ⚽ Mis Pronósticos
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            📊 Posiciones
          </button>
          
          {userProfile?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`py-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'admin'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              ⚙️ Administrar
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="transition-all duration-300">
          {activeTab === 'predictions' && (
            <Dashboard currentUser={currentUser} />
          )}

          {activeTab === 'leaderboard' && (
            <Leaderboard currentUser={currentUser} />
          )}

          {activeTab === 'admin' && userProfile?.role === 'admin' && (
            <AdminPanel currentUser={currentUser} userProfile={userProfile} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800/50 mt-16 text-center text-xs text-gray-500">
        <p>Prode Mundial 2026 © Grupo Cerrado. Desarrollado con React & Firebase.</p>
      </footer>
    </div>
  );
}

export default App;
