import { add } from "./calculator.js";

const actual = add(2, 2);
if (actual !== 4) {
  console.error(`Expected add(2, 2) to equal 4, got ${actual}`);
  process.exitCode = 1;
}
