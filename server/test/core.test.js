const test = require("node:test");
const assert = require("node:assert/strict");
const { paginationFromQuery, paginationMeta } = require("../utils/pagination");
const { requiredText, enumValue, validEmail } = require("../utils/validation");
const { normalizeDestination } = require("../services/notificationProvider");
const { sanitize } = require("../middleware/auditMiddleware");

test("pagination bounds input and calculates metadata", () => {
  assert.deepEqual(paginationFromQuery({ page: "2", pageSize: "25" }), { page: 2, pageSize: 25, offset: 25 });
  assert.equal(paginationFromQuery({ pageSize: "9999" }).pageSize, 500);
  assert.deepEqual(paginationMeta(51, 2, 25), { page: 2, pageSize: 25, totalItems: 51, totalPages: 3 });
});

test("validation accepts valid values and rejects malformed input", () => {
  assert.equal(requiredText("  WP/1/2026 ", "Case"), "WP/1/2026");
  assert.equal(enumValue("Active", "Status", ["Active", "Disposed"]), "Active");
  assert.equal(validEmail("USER@EXAMPLE.COM"), "user@example.com");
  assert.throws(() => validEmail("not-an-email"), /valid email/);
});

test("audit sanitizer redacts secrets", () => {
  assert.deepEqual(sanitize({ email: "a@b.com", password: "secret", nested: { token: "jwt" } }), {
    email: "a@b.com", password: "[redacted]", nested: { token: "[redacted]" },
  });
});

test("WhatsApp destinations use Twilio channel prefix", () => {
  assert.equal(normalizeDestination("+919999999999", true), "whatsapp:+919999999999");
  assert.equal(normalizeDestination("whatsapp:+919999999999", true), "whatsapp:+919999999999");
});
