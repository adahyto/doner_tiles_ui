import Doner, { DonerError } from "./doner.js";

try {
  const doner = new Doner();
  const file = doner.init();
  for (const warning of doner.warnings) console.warn(`⚠️  ${warning}`);
  console.log(`✅ ${file}`);
} catch (err) {
  if (!(err instanceof DonerError)) throw err;
  console.error(`❌ ${err.message}`);
  process.exitCode = 1;
}
