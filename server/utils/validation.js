function requiredText(value, field, maxLength = 500) {
  const text = String(value || "").trim();
  if (!text) {
    const error = new Error(`${field} is required`);
    error.status = 400;
    throw error;
  }
  if (text.length > maxLength) {
    const error = new Error(`${field} must be ${maxLength} characters or fewer`);
    error.status = 400;
    throw error;
  }
  return text;
}

function enumValue(value, field, allowed, fallback) {
  const normalized = value || fallback;
  if (!allowed.includes(normalized)) {
    const error = new Error(`${field} must be one of: ${allowed.join(", ")}`);
    error.status = 400;
    throw error;
  }
  return normalized;
}

function validEmail(value) {
  const email = requiredText(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("Enter a valid email address");
    error.status = 400;
    throw error;
  }
  return email;
}

module.exports = { requiredText, enumValue, validEmail };
