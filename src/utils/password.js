const crypto = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(crypto.scrypt);
const PASSWORD_PREFIX = "scrypt";

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${PASSWORD_PREFIX}:${salt}:${Buffer.from(derivedKey).toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return false;
  }

  const [scheme, salt, expectedHex] = String(storedHash).split(":");
  if (scheme !== PASSWORD_PREFIX || !salt || !expectedHex) {
    return false;
  }

  const derivedKey = await scryptAsync(password, salt, 64);
  const actual = Buffer.from(derivedKey);
  const expected = Buffer.from(expectedHex, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPassword, verifyPassword };
