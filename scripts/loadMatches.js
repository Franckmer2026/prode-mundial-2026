import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Read matches from JSON
const matchesPath = path.join(__dirname, '../src/utils/initialMatches.json');
const matches = JSON.parse(fs.readFileSync(matchesPath, 'utf8'));

async function loadMatches() {
  try {
    console.log(`📦 Cargando ${matches.length} partidos a Firestore...`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const match of matches) {
      try {
        // Convertir dateTimeStr a timestamp
        const matchDate = new Date(match.dateTimeStr);
        
        const matchData = {
          matchId: match.id,
          matchNumber: match.matchNumber,
          stage: match.stage,
          teamA: match.teamA,
          teamB: match.teamB,
          teamACode: match.teamACode,
          teamBCode: match.teamBCode,
          date: admin.firestore.Timestamp.fromDate(matchDate),
          goalsA: match.goalsA,
          goalsB: match.goalsB,
          status: match.status,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('matches').doc(match.id).set(matchData);
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
    
    if (errorCount === 0) {
      console.log(`\n🎉 ¡Todos los partidos se cargaron correctamente!`);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await admin.app().delete();
    process.exit(0);
  }
}

loadMatches();
