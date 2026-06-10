import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp, where } from 'firebase/firestore';

export default function Dashboard({ currentUser }) {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [inputs, setInputs] = useState({}); // Stores local form edits: { [matchId]: { goalsA: '', goalsB: '' } }
  const [savingStatus, setSavingStatus] = useState({}); // { [matchId]: 'idle' | 'saving' | 'saved' | 'error' }
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Keep track of current time for live lock checks
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000); // update every 10s
    return () => clearInterval(timer);
  }, []);

  // Fetch matches and user's predictions in real-time
  useEffect(() => {
    if (!db || !currentUser) return;

    // Listen to matches
    const qMatches = query(collection(db, "matches"));
    const unsubscribeMatches = onSnapshot(qMatches, (snapshot) => {
      const matchData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Handle firestore Timestamp conversion
        const jsDate = data.dateTime?.seconds ? new Date(data.dateTime.seconds * 1000) : new Date();
        matchData.push({ id: doc.id, ...data, jsDate });
      });
      // Sort matches by matchNumber
      matchData.sort((a, b) => a.matchNumber - b.matchNumber);
      setMatches(matchData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching matches:", error);
    });

    // Listen to user's predictions
    const qPredictions = query(collection(db, "predictions"), where("userId", "==", currentUser.uid));
    const unsubscribePredictions = onSnapshot(qPredictions, (snapshot) => {
      const predMap = {};
      const inputMap = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId === currentUser.uid) {
          predMap[data.matchId] = data;
          // Pre-populate input states from saved predictions
          inputMap[data.matchId] = {
            goalsA: data.predictedGoalsA !== null ? String(data.predictedGoalsA) : '',
            goalsB: data.predictedGoalsB !== null ? String(data.predictedGoalsB) : ''
          };
        }
      });
      setPredictions(predMap);
      setInputs(prev => ({ ...inputMap, ...prev })); // Merge so we don't wipe active typing
    }, (error) => {
      console.error("Error fetching predictions:", error);
    });

    return () => {
      unsubscribeMatches();
      unsubscribePredictions();
    };
  }, [currentUser]);

  const handleInputChange = (matchId, team, value) => {
    // Only allow positive integers
    const sanitizedVal = value.replace(/[^0-9]/g, '');
    setInputs(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || { goalsA: '', goalsB: '' }),
        [team]: sanitizedVal
      }
    }));
    
    // Reset saved status to idle when user starts editing
    if (savingStatus[matchId] === 'saved' || savingStatus[matchId] === 'error') {
      setSavingStatus(prev => ({ ...prev, [matchId]: 'idle' }));
    }
  };

  const savePrediction = async (matchId, matchDate) => {
    // Lock check
    if (currentTime >= matchDate) {
      alert("El partido ya comenzó. Las predicciones están bloqueadas.");
      return;
    }

    const matchInput = inputs[matchId];
    if (!matchInput || matchInput.goalsA === '' || matchInput.goalsB === '') {
      alert("Por favor, ingresá los goles de ambos equipos.");
      return;
    }

    setSavingStatus(prev => ({ ...prev, [matchId]: 'saving' }));

    try {
      const predId = `${currentUser.uid}_${matchId}`;
      const predRef = doc(db, "predictions", predId);

      await setDoc(predRef, {
        id: predId,
        userId: currentUser.uid,
        matchId: matchId,
        predictedGoalsA: parseInt(matchInput.goalsA, 10),
        predictedGoalsB: parseInt(matchInput.goalsB, 10),
        pointsEarned: null, // Scored by admin later
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSavingStatus(prev => ({ ...prev, [matchId]: 'saved' }));
      
      // Auto-clear saved state visual after 3 seconds
      setTimeout(() => {
        setSavingStatus(prev => {
          if (prev[matchId] === 'saved') {
            return { ...prev, [matchId]: 'idle' };
          }
          return prev;
        });
      }, 3000);

    } catch (err) {
      console.error("Error saving prediction:", err);
      setSavingStatus(prev => ({ ...prev, [matchId]: 'error' }));
      alert("Error al guardar: " + err.message);
    }
  };

  // Helper to format Date
  const formatMatchDate = (date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  // Helper to render flags
  const getFlagUrl = (code) => {
    if (!code) return '';
    return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-800/80 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight text-left my-0">
            Pronósticos del Mundial
          </h1>
          <p className="text-gray-400 mt-2 text-left text-sm">
            Ingresá tus predicciones. Se bloquean automáticamente al inicio de cada partido.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <span className="inline-flex items-center px-3 py-1 bg-green-950/40 text-green-400 border border-green-500/20 text-xs font-semibold rounded-full">
            ● En Vivo
          </span>
          <span className="inline-flex items-center px-3 py-1 bg-gray-800 text-gray-300 text-xs font-semibold rounded-full">
            Hora Local: {currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {matches.map((match) => {
          const isLocked = currentTime >= match.jsDate;
          const isFinished = match.status === 'finished';
          const prediction = predictions[match.id];
          const input = inputs[match.id] || { goalsA: '', goalsB: '' };
          const status = savingStatus[match.id] || 'idle';
          
          // Detect changes between local inputs and saved predictions
          const savedGoalsA = prediction?.predictedGoalsA !== undefined ? String(prediction.predictedGoalsA) : '';
          const savedGoalsB = prediction?.predictedGoalsB !== undefined ? String(prediction.predictedGoalsB) : '';
          const isChanged = input.goalsA !== savedGoalsA || input.goalsB !== savedGoalsB;

          return (
            <div 
              key={match.id} 
              className={`glass-panel p-6 rounded-2xl border transition-all flex flex-col md:flex-row items-center justify-between gap-6 relative ${
                isFinished 
                  ? 'border-gray-800 bg-gray-950/30' 
                  : isLocked 
                    ? 'border-red-950/30 bg-red-950/5' 
                    : 'border-gray-800/80 hover:border-gray-700/80'
              }`}
            >
              {/* Top Banner for Match Details */}
              <div className="absolute top-0 left-6 -translate-y-1/2 flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-gray-900 border border-gray-800 text-gray-400 text-xxs uppercase tracking-wider rounded-md font-semibold">
                  # {match.matchNumber} | {match.stage}
                </span>
                {isFinished ? (
                  <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-300 text-xxs uppercase tracking-wider rounded-md font-bold">
                    Finalizado
                  </span>
                ) : isLocked ? (
                  <span className="px-2 py-0.5 bg-red-950 border border-red-500/20 text-red-400 text-xxs uppercase tracking-wider rounded-md font-bold">
                    🔒 Bloqueado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-green-950 border border-green-500/20 text-green-400 text-xxs uppercase tracking-wider rounded-md font-bold animate-pulse">
                    🔓 Abierto
                  </span>
                )}
              </div>

              {/* Left Side: Teams & Real Scores */}
              <div className="flex-1 w-full flex flex-col md:flex-row md:items-center gap-6 justify-between">
                {/* Team A */}
                <div className="flex items-center gap-3 flex-1 justify-end md:justify-end text-right order-1">
                  <span className="text-base font-bold text-white order-1 md:order-1">{match.teamA}</span>
                  <img 
                    src={getFlagUrl(match.teamACode)} 
                    alt={match.teamA} 
                    className="w-8 h-6 object-cover rounded shadow-md border border-gray-800 order-2 md:order-2"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>

                {/* Score / VS Display */}
                <div className="flex flex-col items-center justify-center min-w-[80px] order-2 py-2 md:py-0">
                  {isFinished ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-white bg-gray-900 border border-gray-800 px-3 py-1 rounded-lg">
                        {match.goalsA}
                      </span>
                      <span className="text-gray-500 font-bold">:</span>
                      <span className="text-2xl font-black text-white bg-gray-900 border border-gray-800 px-3 py-1 rounded-lg">
                        {match.goalsB}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-gray-900/50 border border-gray-850 px-3 py-1.5 rounded-full">
                      VS
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500 mt-2 font-medium">
                    {formatMatchDate(match.jsDate)}
                  </span>
                </div>

                {/* Team B */}
                <div className="flex items-center gap-3 flex-1 justify-start md:justify-start text-left order-3">
                  <img 
                    src={getFlagUrl(match.teamBCode)} 
                    alt={match.teamB} 
                    className="w-8 h-6 object-cover rounded shadow-md border border-gray-800"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-base font-bold text-white">{match.teamB}</span>
                </div>
              </div>

              {/* Right Side: Prediction Inputs */}
              <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-3 justify-center border-t md:border-t-0 border-gray-850 pt-4 md:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium mr-2">Tu Pronóstico:</span>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    disabled={isLocked || isFinished}
                    value={input.goalsA}
                    onChange={(e) => handleInputChange(match.id, 'goalsA', e.target.value)}
                    placeholder="-"
                    className={`w-12 h-12 text-center text-lg font-bold bg-gray-900/80 border rounded-xl focus:outline-none focus:border-green-500 transition-all ${
                      isLocked || isFinished 
                        ? 'border-gray-800 text-gray-500 cursor-not-allowed bg-gray-950/20' 
                        : 'border-gray-700 text-white'
                    }`}
                  />
                  <span className="text-gray-500 font-bold">-</span>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    disabled={isLocked || isFinished}
                    value={input.goalsB}
                    onChange={(e) => handleInputChange(match.id, 'goalsB', e.target.value)}
                    placeholder="-"
                    className={`w-12 h-12 text-center text-lg font-bold bg-gray-900/80 border rounded-xl focus:outline-none focus:border-green-500 transition-all ${
                      isLocked || isFinished 
                        ? 'border-gray-800 text-gray-500 cursor-not-allowed bg-gray-950/20' 
                        : 'border-gray-700 text-white'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-3 w-full justify-between md:justify-end">
                  {/* Points Earned display */}
                  {isFinished && prediction && (
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        prediction.pointsEarned === 3
                          ? 'bg-green-950/50 text-green-400 border-green-500/30'
                          : prediction.pointsEarned === 1
                            ? 'bg-yellow-950/40 text-yellow-400 border-yellow-500/20'
                            : 'bg-red-950/40 text-red-400 border-red-500/20'
                      }`}>
                        {prediction.pointsEarned === 3 ? "⭐ Exacto (+3)" : prediction.pointsEarned === 1 ? "✓ Tendencia (+1)" : "❌ Error (+0)"}
                      </span>
                    </div>
                  )}

                  {/* Save prediction button */}
                  {!isLocked && !isFinished && (
                    <button
                      onClick={() => savePrediction(match.id, match.jsDate)}
                      disabled={status === 'saving' || !isChanged}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        !isChanged
                          ? 'bg-gray-800/40 border border-gray-800 text-gray-500 cursor-default'
                          : status === 'saving'
                            ? 'bg-green-600/40 border border-green-500/20 text-white'
                            : status === 'saved'
                              ? 'bg-emerald-600 border border-emerald-500 text-white'
                              : 'bg-green-500 border border-green-400/20 hover:bg-green-600 hover:scale-102 text-black cursor-pointer shadow-md'
                      }`}
                    >
                      {status === 'saving' ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Guardando
                        </>
                      ) : status === 'saved' ? (
                        "¡Guardado! ✓"
                      ) : (
                        "Guardar"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
