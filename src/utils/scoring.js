/**
 * Calculates the score for a match prediction.
 * - 3 Points: Exact match (correct winner/draw and exact scores of both teams).
 * - 1 Point: Correct tendency (correct winner or correct draw, but different scores).
 * - 0 Points: Wrong outcome.
 * 
 * @param {number|string} realA Goals scored by Team A (real)
 * @param {number|string} realB Goals scored by Team B (real)
 * @param {number|string} predA Goals predicted for Team A
 * @param {number|string} predB Goals predicted for Team B
 * @returns {number} Score (0, 1, or 3)
 */
export function calculatePoints(realA, realB, predA, predB) {
  if (realA === null || realB === null || predA === null || predB === null ||
      realA === undefined || realB === undefined || predA === undefined || predB === undefined) {
    return 0;
  }
  
  const rA = Number(realA);
  const rB = Number(realB);
  const pA = Number(predA);
  const pB = Number(predB);
  
  if (isNaN(rA) || isNaN(rB) || isNaN(pA) || isNaN(pB)) {
    return 0;
  }

  // Exact match: scores are identical
  if (rA === pA && rB === pB) {
    return 3;
  }

  // Tendency match: correct winner/draw, but wrong scores
  const realDiff = rA - rB;
  const predDiff = pA - pB;
  
  const realWinner = Math.sign(realDiff); // 1, -1, or 0
  const predWinner = Math.sign(predDiff); // 1, -1, or 0
  
  if (realWinner === predWinner) {
    return 1;
  }
  
  return 0;
}
