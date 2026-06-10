import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';

export default function Leaderboard({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    // Listen to user points in real-time
    const qUsers = query(collection(db, "users"));
    const unsubscribe = onSnapshot(qUsers, (snapshot) => {
      const usersList = [];
      snapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() });
      });
      // Sort users by totalPoints descending. If points are equal, sort alphabetically by name
      usersList.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return a.name.localeCompare(b.name);
      });
      setUsers(usersList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching leaderboard:", error);
    });

    return () => unsubscribe();
  }, []);

  const getRankBadge = (index) => {
    if (index === 0) return <span className="text-xl">🥇</span>;
    if (index === 1) return <span className="text-xl">🥈</span>;
    if (index === 2) return <span className="text-xl">🥉</span>;
    return <span className="text-gray-500 font-semibold text-sm w-6 text-center">{index + 1}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <svg className="animate-spin h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="border-b border-gray-800/80 pb-5 text-left">
        <h1 className="text-4xl font-extrabold text-white tracking-tight my-0">
          Tabla de Posiciones
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Seguí el ranking de puntos del grupo en tiempo real. ¡El ganador se lleva la gloria!
        </p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-gray-800/80">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16 text-center">Puesto</th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Participante</th>
              <th className="py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right w-28">Puntos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {users.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-8 text-center text-gray-500 text-sm">
                  No hay participantes registrados todavía.
                </td>
              </tr>
            ) : (
              users.map((user, index) => {
                const isCurrentUser = currentUser && user.id === currentUser.uid;
                return (
                  <tr 
                    key={user.id} 
                    className={`transition-colors ${
                      isCurrentUser 
                        ? 'bg-green-500/5 hover:bg-green-500/10' 
                        : 'hover:bg-gray-800/20'
                    }`}
                  >
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center items-center">
                        {getRankBadge(index)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className={`text-base font-medium ${isCurrentUser ? 'text-green-400 font-bold' : 'text-white'}`}>
                          {user.name}
                        </span>
                        {isCurrentUser && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xxs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                            Vos
                          </span>
                        )}
                        {user.role === 'admin' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xxs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className={`text-lg font-bold ${isCurrentUser ? 'text-green-400 font-black' : 'text-gray-200'}`}>
                        {user.totalPoints} pts
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="glass-panel p-5 rounded-xl border border-gray-800/80 text-left">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Participantes</div>
          <div className="text-3xl font-black text-white mt-1">{users.length}</div>
        </div>
        <div className="glass-panel p-5 rounded-xl border border-gray-800/80 text-left">
          <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Puntero Actual</div>
          <div className="text-lg font-bold text-green-400 truncate mt-1">
            {users.length > 0 ? `${users[0].name} (${users[0].totalPoints} pts)` : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
