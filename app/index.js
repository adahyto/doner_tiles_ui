import Doner, { DonerError } from "./doner.js";

try {
  const file = new Doner().init();
  console.log(`✅ ${file}`);
} catch (err) {
  if (!(err instanceof DonerError)) throw err;
  console.error(`❌ ${err.message}`);
  process.exitCode = 1;
}
