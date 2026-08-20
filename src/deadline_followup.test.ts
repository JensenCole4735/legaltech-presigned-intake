import { strict as assert } from "node:assert";
import { followUpNeeded } from "./legal_asset_service.js";

const today = new Date("2026-08-20T00:00:00Z");
assert.equal(followUpNeeded("2026-08-26", today), true);
assert.equal(followUpNeeded("2026-09-01", today), false);
console.log("deadline follow-up decision: pass");
