import test from "node:test";
import assert from "node:assert/strict";
import { canAccessPage, isReadOnlyRole } from "./permissions.js";

test("navigation follows the role policy", () => {
  assert.equal(canAccessPage("DCP", "hcmcReports"), true);
  assert.equal(canAccessPage("DCP", "settings"), false);
  assert.equal(canAccessPage("IO", "master-zones"), true);
  assert.equal(canAccessPage("JCP", "automation"), true);
  assert.equal(isReadOnlyRole("SPP"), true);
});
