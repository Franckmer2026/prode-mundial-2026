import { calculatePoints } from './scoring.js';

const testCases = [
  // 1. Exact Matches (3 Points)
  { real: [2, 1], pred: [2, 1], expected: 3, name: "Exact win (2-1)" },
  { real: [0, 0], pred: [0, 0], expected: 3, name: "Exact draw (0-0)" },
  { real: [3, 3], pred: [3, 3], expected: 3, name: "Exact high-scoring draw (3-3)" },

  // 2. Tendency Matches (1 Point)
  { real: [2, 1], pred: [1, 0], expected: 1, name: "Correct winner, wrong score (Real: 2-1, Pred: 1-0)" },
  { real: [3, 1], pred: [2, 0], expected: 1, name: "Correct winner, wrong score (Real: 3-1, Pred: 2-0)" },
  { real: [1, 1], pred: [2, 2], expected: 1, name: "Correct draw, wrong score (Real: 1-1, Pred: 2-2)" },
  { real: [0, 2], pred: [1, 3], expected: 1, name: "Correct away winner, wrong score (Real: 0-2, Pred: 1-3)" },

  // 3. Incorrect Outcomes (0 Points)
  { real: [2, 1], pred: [1, 2], expected: 0, name: "Opposite winner (Real: 2-1, Pred: 1-2)" },
  { real: [1, 0], pred: [1, 1], expected: 0, name: "Predicted draw but team A won (Real: 1-0, Pred: 1-1)" },
  { real: [1, 1], pred: [1, 0], expected: 0, name: "Predicted team A win but was draw (Real: 1-1, Pred: 1-0)" },
  
  // 4. Boundary cases (Invalid / empty data)
  { real: [null, 1], pred: [2, 1], expected: 0, name: "Null in real goals" },
  { real: [2, 1], pred: [undefined, 1], expected: 0, name: "Undefined in predicted goals" },
];

let passed = 0;
let failed = 0;

console.log("=== RUNNING SCORING TESTS ===");
testCases.forEach((tc, idx) => {
  const result = calculatePoints(tc.real[0], tc.real[1], tc.pred[0], tc.pred[1]);
  if (result === tc.expected) {
    console.log(`✅ [PASS] Test #${idx + 1}: ${tc.name}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] Test #${idx + 1}: ${tc.name}`);
    console.error(`   Expected: ${tc.expected}, Got: ${result}`);
    failed++;
  }
});

console.log("\n=== SUMMARY ===");
console.log(`Passed: ${passed}/${testCases.length}`);
if (failed > 0) {
  console.error(`Failed: ${failed}`);
  process.exit(1);
} else {
  console.log("All tests passed successfully!");
}
