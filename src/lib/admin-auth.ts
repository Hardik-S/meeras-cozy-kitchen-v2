import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_ADMIN_PIN = "149149";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24;

function signingSecret() {
  return process.env.ADMIN_SESSION_SECRET
    || process.env.GOOGLE_APPS_SCRIPT_SECRET
    || process.env.ADMIN_PIN
    || DEFAULT_ADMIN_PIN;
}

function sign(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest("hex");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAdminPin() {
  return process.env.ADMIN_PIN || DEFAULT_ADMIN_PIN;
}

export function verifyAdminPin(pin: string) {
  return constantTimeEqual(pin.trim(), getAdminPin());
}

export function createAdminSessionToken(now = Date.now()) {
  const issuedAt = String(now);

  return `${issuedAt}.${sign(issuedAt)}`;
}

export function verifyAdminSessionToken(token: string | undefined, now = Date.now()) {
  if (!token) {
    return false;
  }

  const [issuedAt, signature] = token.split(".");
  const timestamp = Number(issuedAt);

  if (!issuedAt || !signature || !Number.isFinite(timestamp)) {
    return false;
  }

  if (now - timestamp > SESSION_TTL_MS || timestamp > now + 60_000) {
    return false;
  }

  return constantTimeEqual(signature, sign(issuedAt));
}
