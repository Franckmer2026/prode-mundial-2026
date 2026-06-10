import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  writeBatch, 
  Timestamp, 
  getDocs, 
  where,
  increment,
  addDoc
} from 'firebase/firestore';
import initialMatches from '../utils/initialMatches.json';
import { calculatePoints } from '../utils/scoring';

export default function AdminPanel({ currentUser, userProfile }) {
  const [matches, setMatches] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const [closingMatchId, setClosingMatchId] = useState(null);
  const [scores, setScores] = useState({}); // { [matchId]: { goalsA: '', goalsB: '' } }
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [newMatchForm, setNewMatchForm] = useState({
    teamA: '',
    teamB: '',
    teamACode: '',
    teamBCode: '',
    stage: '',
    dateTime: ''
  });

  const [newMatchesRows, setNewMatchesRows] = useState([
    { teamA: '', teamACode: '', teamB: '', teamBCode: '', stage: '', dateTime: '' }
  ]);

  // Restrict to admins
  const isAdmin = userProfile && userProfile.role === 'admin';

  useEffect(() => {
    if (!db || !isAdmin) return;

    // Fetch matches list for administration
    const qMatches = query(collection(db, "matches"));
    const unsubscribe = onSnapshot(qMatches, (snapshot) => {
      const matchData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const jsDate = data.dateTime?.seconds ? new Date(data.dateTime.seconds * 1000) : new Date();
        matchData.push({ id: doc.id, ...data, jsDate });
      });
      matchData.sort((a, b) => a.matchNumber - b.matchNumber);
      setMatches(matchData);

      // Pre-fill existing scores if already playing or finished
      const scoreMap = {};
      matchData.forEach((m) => {
        scoreMap[m.id] = {
          goalsA: m.goalsA !== null ? String(m.goalsA) : '',
          goalsB: m.goalsB !== null ? String(m.goalsB) : ''
        };
      });
      setScores(prev => ({ ...scoreMap, ...prev }));
    }, (error) => {
      console.error("Error loading matches for admin:", error);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleScoreChange = (matchId, team, value) => {
    const sanitizedVal = value.replace(/[^0-9]/g, '');
    setScores(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || { goalsA: '', goalsB: '' }),
        [team]: sanitizedVal
      }
    }));
  };

  // Seeding initial matches
  const handleSeedMatches = async () => {
    if (!window.confirm("¿Estás seguro de que querés precargar los partidos iniciales del Mundial 2026? Se combinarán con los existentes.")) return;
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      initialMatches.forEach((m) => {
        const matchRef = doc(db, "matches", m.id);
        const matchDate = new Date(m.dateTimeStr);
        
        // Destructure to remove dateTimeStr and write Firestore Timestamp instead
        const { dateTimeStr, ...matchData } = m;
        batch.set(matchRef, {
          ...matchData,
          dateTime: Timestamp.fromDate(matchDate)
        }, { merge: true });
      });

      await batch.commit();
      alert("Partidos del Mundial precargados exitosamente en Firestore.");
    } catch (err) {
      console.error("Error seeding matches:", err);
      alert("Error al cargar partidos: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  // Score match and process points in a single atomic batch write
  const handleCloseMatch = async (matchId) => {
    const score = scores[matchId];
    if (!score || score.goalsA === '' || score.goalsB === '') {
      alert("Por favor, ingresá los goles reales de ambos equipos para poder cerrar el partido.");
      return;
    }

    const realGoalsA = parseInt(score.goalsA, 10);
    const realGoalsB = parseInt(score.goalsB, 10);

    if (!window.confirm(`¿Cerrar el partido con resultado ${realGoalsA} - ${realGoalsB}? Esto calculará los puntos de todos los usuarios.`)) return;

    setClosingMatchId(matchId);

    try {
      // 1. Fetch predictions for this match
      const predQuery = query(collection(db, "predictions"), where("matchId", "==", matchId));
      const predSnapshot = await getDocs(predQuery);
      
      const batch = writeBatch(db);

      // 2. Update the match document to finished
      const matchRef = doc(db, "matches", matchId);
      batch.update(matchRef, {
        goalsA: realGoalsA,
        goalsB: realGoalsB,
        status: 'finished'
      });

      // 3. Process each prediction and build point totals for users
      const userPointsMap = {}; // { [userId]: pointsToIncrement }

      predSnapshot.forEach((predDoc) => {
        const predData = predDoc.data();
        
        // Calculate points based on prediction and real goals
        const points = calculatePoints(
          realGoalsA, 
          realGoalsB, 
          predData.predictedGoalsA, 
          predData.predictedGoalsB
        );

        // Update the prediction document with points earned
        const predRef = doc(db, "predictions", predDoc.id);
        batch.update(predRef, {
          pointsEarned: points
        });

        // Accumulate user points
        userPointsMap[predData.userId] = (userPointsMap[predData.userId] || 0) + points;
      });

      // 4. Update total points in user documents using increment()
      Object.keys(userPointsMap).forEach((userId) => {
        const pointsToAdd = userPointsMap[userId];
        const userRef = doc(db, "users", userId);
        batch.update(userRef, {
          totalPoints: increment(pointsToAdd)
        });
      });

      // 5. Commit atomic batch write
      await batch.commit();
      alert("Partido finalizado y puntos procesados correctamente.");

    } catch (err) {
      console.error("Error closing match:", err);
      alert("Error al procesar el cierre del partido: " + err.message);
    } finally {
      setClosingMatchId(null);
    }
  };

  const handleCreateMatch = async () => {
    const { teamA, teamB, teamACode, teamBCode, stage, dateTime } = newMatchForm;
    if (!teamA.trim() || !teamB.trim() || !stage.trim() || !dateTime) {
      alert("Por favor, completá todos los campos.");
      return;
    }

    if (!window.confirm(`¿Crear partido: ${teamA} vs ${teamB} (${stage})?`)) return;

    setCreatingMatch(true);
    try {
      const matchDateTime = new Date(dateTime);
      const matchId = `match_${Date.now()}`;

      await addDoc(collection(db, "matches"), {
        id: matchId,
        matchId: matchId,
        matchNumber: matches.length + 1,
        stage: stage,
        teamA: teamA.trim(),
        teamB: teamB.trim(),
        teamACode: teamACode.trim().toUpperCase() || '',
        teamBCode: teamBCode.trim().toUpperCase() || '',
        dateTime: Timestamp.fromDate(matchDateTime),
        goalsA: null,
        goalsB: null,
        status: 'pending',
        createdAt: Timestamp.now()
      });

      alert(`✅ Partido creado: ${teamA} vs ${teamB}`);
      setNewMatchForm({ teamA: '', teamB: '', teamACode: '', teamBCode: '', stage: '', dateTime: '' });
    } catch (err) {
      console.error("Error creating match:", err);
      alert("Error al crear partido: " + err.message);
    } finally {
      setCreatingMatch(false);
    }
  };

  const handleFormChange = (field, value) => {
    setNewMatchForm(prev => ({ ...prev, [field]: value }));
  };

  const addNewRow = () => {
    setNewMatchesRows(prev => ([...prev, { teamA: '', teamACode: '', teamB: '', teamBCode: '', stage: '', dateTime: '' }]));
  };

  const removeRow = (index) => {
    setNewMatchesRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index, field, value) => {
    setNewMatchesRows(prev => prev.map((r, i) => i === index ? ({ ...r, [field]: value }) : r));
  };

  const validateRows = (rows) => {
    for (const r of rows) {
      if (!r.teamA.trim() || !r.teamB.trim() || !r.stage.trim() || !r.dateTime) return false;
    }
    return true;
  };

  const handleCreateMany = async () => {
    if (!validateRows(newMatchesRows)) {
      alert('Por favor completá todos los campos de cada fila.');
      return;
    }
    if (!window.confirm(`¿Crear ${newMatchesRows.length} partidos?`)) return;
    setCreatingMatch(true);
    try {
      const batch = writeBatch(db);
      newMatchesRows.forEach((r, i) => {
        const matchDateTime = new Date(r.dateTime);
        const matchRef = doc(collection(db, 'matches'));
        const matchId = `match_${Date.now()}_${i}`;
        batch.set(matchRef, {
          id: matchId,
          matchId: matchId,
          matchNumber: matches.length + i + 1,
          stage: r.stage,
          teamA: r.teamA.trim(),
          teamB: r.teamB.trim(),
          teamACode: (r.teamACode || '').trim().toUpperCase(),
          teamBCode: (r.teamBCode || '').trim().toUpperCase(),
          dateTime: Timestamp.fromDate(matchDateTime),
          goalsA: null,
          goalsB: null,
          status: 'pending',
          createdAt: Timestamp.now()
        });
      });
      await batch.commit();
      alert(`✅ ${newMatchesRows.length} partidos creados correctamente.`);
      setNewMatchesRows([{ teamA: '', teamACode: '', teamB: '', teamBCode: '', stage: '', dateTime: '' }]);
    } catch (err) {
      console.error('Error creando partidos en batch:', err);
      alert('Error al crear partidos: ' + err.message);
    } finally {
      setCreatingMatch(false);
    }
  };

  // Helper to format Date
  const formatMatchDate = (date) => {
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-red-500/20 text-center max-w-md mx-auto mt-10">
        <h2 className="text-xl font-bold text-red-400">Acceso Denegado</h2>
        <p className="text-gray-400 mt-2 text-sm">
          No tenés los permisos necesarios para ver esta sección. Solo los administradores pueden ingresar resultados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-800/80 pb-6 text-left">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight my-0">
            Panel de Administración
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Ingresá los resultados reales para cerrar partidos y actualizar la tabla de posiciones en tiempo real.
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={handleSeedMatches}
            disabled={seeding}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
          >
            {seeding ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Precargando...
              </>
            ) : (
              "⚽ Precargar Partidos 2026"
            )}
          </button>
        </div>
      </div>

      {/* Crear Partidos (filas dinámicas) */}
      <div className="glass-panel rounded-2xl border border-gray-800/80 overflow-hidden shadow-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">➕ Crear Varios Partidos (filas)</h3>
        <div className="space-y-4">
          {newMatchesRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
              <input
                type="text"
                placeholder="Equipo A"
                value={row.teamA}
                onChange={(e) => handleRowChange(idx, 'teamA', e.target.value)}
                className="px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm col-span-2"
              />
              <input
                type="text"
                placeholder="Código A"
                value={row.teamACode}
                maxLength="2"
                onChange={(e) => handleRowChange(idx, 'teamACode', e.target.value.toUpperCase())}
                className="px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm uppercase"
              />
              <input
                type="text"
                placeholder="Equipo B"
                value={row.teamB}
                onChange={(e) => handleRowChange(idx, 'teamB', e.target.value)}
                className="px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm col-span-2"
              />
              <input
                type="datetime-local"
                value={row.dateTime}
                onChange={(e) => handleRowChange(idx, 'dateTime', e.target.value)}
                className="px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm"
              />
              <div className="col-span-6 flex gap-2 justify-end">
                <input
                  type="text"
                  placeholder="Etapa (ej. Octavos #1)"
                  value={row.stage}
                  onChange={(e) => handleRowChange(idx, 'stage', e.target.value)}
                  className="px-3 py-2 bg-gray-900/80 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm flex-1"
                />
                <button onClick={() => removeRow(idx)} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Quitar</button>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <button onClick={addNewRow} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Agregar fila</button>
            <button
              onClick={handleCreateMany}
              disabled={creatingMatch}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm"
            >
              {creatingMatch ? 'Creando...' : `Crear ${newMatchesRows.length} partidos`}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-gray-800/80 overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-gray-900/50 border-b border-gray-800 text-left">
          <h3 className="text-base font-bold text-white">Listado de Partidos</h3>
        </div>
        <div className="divide-y divide-gray-800/60">
          {matches.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No hay partidos cargados. Hacé click en "Precargar Partidos 2026" arriba.
            </div>
          ) : (
            matches.map((match) => {
              const isFinished = match.status === 'finished';
              const isClosing = closingMatchId === match.id;
              const score = scores[match.id] || { goalsA: '', goalsB: '' };

              return (
                <div key={match.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-gray-900/10">
                  {/* Left Side: Info & Match detail */}
                  <div className="flex flex-col text-left justify-center min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xxs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md font-semibold border border-gray-700">
                        Match #{match.matchNumber}
                      </span>
                      <span className={`text-xxs px-2 py-0.5 rounded-md font-bold ${
                        isFinished 
                          ? 'bg-gray-800 text-gray-400' 
                          : 'bg-green-950 text-green-400 border border-green-500/10'
                      }`}>
                        {isFinished ? "Finalizado" : "Pendiente"}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-white mt-1.5">
                      {match.teamA} vs {match.teamB}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">
                      {formatMatchDate(match.jsDate)} ({match.stage})
                    </span>
                  </div>

                  {/* Right Side: Score Input & Action */}
                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-gray-850 pt-3 md:pt-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        disabled={isFinished}
                        value={score.goalsA}
                        onChange={(e) => handleScoreChange(match.id, 'goalsA', e.target.value)}
                        placeholder="Goals"
                        className={`w-12 h-10 text-center text-base font-bold bg-gray-900/80 border rounded-lg focus:outline-none focus:border-blue-500 transition-all ${
                          isFinished ? 'border-gray-850 text-gray-500 cursor-not-allowed' : 'border-gray-750 text-white'
                        }`}
                      />
                      <span className="text-gray-500 font-bold">-</span>
                      <input
                        type="text"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        disabled={isFinished}
                        value={score.goalsB}
                        onChange={(e) => handleScoreChange(match.id, 'goalsB', e.target.value)}
                        placeholder="Goals"
                        className={`w-12 h-10 text-center text-base font-bold bg-gray-900/80 border rounded-lg focus:outline-none focus:border-blue-500 transition-all ${
                          isFinished ? 'border-gray-850 text-gray-500 cursor-not-allowed' : 'border-gray-750 text-white'
                        }`}
                      />
                    </div>

                    <div>
                      {!isFinished ? (
                        <button
                          onClick={() => handleCloseMatch(match.id)}
                          disabled={isClosing}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {isClosing ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Cerrando...
                            </>
                          ) : (
                            "Cerrar Partido"
                          )}
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-gray-850 border border-gray-800 text-gray-400 text-xxs font-bold rounded-lg uppercase tracking-wider block text-center min-w-[100px]">
                          Cerrado ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Admin Quick Instructions Alert Box */}
      <div className="p-5 bg-blue-950/20 border border-blue-500/25 rounded-2xl text-left flex gap-3.5">
        <span className="text-xl">💡</span>
        <div>
          <h4 className="text-sm font-bold text-blue-300">¿Cómo asignar el rol de Administrador?</h4>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Por seguridad, ningún usuario se puede registrar directamente como admin. 
            Para asignarle permisos de administrador a una cuenta, registrate normalmente, andá a la consola de Firebase, ingresá a la base de datos de **Firestore**, buscá el documento del usuario en la colección <code>users</code> y cambiá el campo <code>role</code> de <code>"user"</code> a <code>"admin"</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
