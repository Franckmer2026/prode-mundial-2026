const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../firebase-admin-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: firebase-admin-key.json no encontrado.');
  console.error('Por favor descarga la clave JSON desde Firebase Console:');
  console.error('1. Ve a Firebase Console -> Configuración del proyecto');
  console.error('2. Pestaña "Cuentas de servicio"');
  console.error('3. Click en "Generar nueva clave privada"');
  console.error('4. Guarda el archivo como firebase-admin-key.json en la raíz del proyecto');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const matchesPath = path.join(__dirname, '../src/utils/initialMatches.json');
const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));

async function loadMatches() {
  try {
    console.log(`📦 Cargando ${matches.length} partidos a Firestore...`);
    let successCount = 0;
    let errorCount = 0;

    for (const match of matches) {
      try {
        const matchDate = new Date(match.dateTimeStr);
        const matchData = {
          matchId: match.id,
          matchNumber: match.matchNumber,
          stage: match.stage,
          teamA: match.teamA,
          teamB: match.teamB,
          teamACode: match.teamACode,
          teamBCode: match.teamBCode,
          dateTime: Timestamp.fromDate(matchDate),
          goalsA: match.goalsA,
          goalsB: match.goalsB,
          status: match.status,
          createdAt: FieldValue.serverTimestamp(),
        };

        await db.collection('matches').doc(match.id).set(matchData, { merge: true });
        console.log(`✅ ${match.matchNumber}. ${match.teamA} vs ${match.teamB}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error cargando match ${match.id}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✨ Resultado:`);
    console.log(`   ✅ Cargados: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
}

loadMatches();
