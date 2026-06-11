// license.js — Offline RSA license verification (no server needed)
// CommonJS — used by main process

const crypto = require('crypto');
const path   = require('path');
const os     = require('os');

// Public key for license signature verification
// In production: replace with your actual RSA public key (PEM)
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a3q5y8B/DJGmQk4ArcV
EiL0local+devpublickey/placeholder+only+replace+before+shipping==
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
-----END PUBLIC KEY-----`;

const DEV_MODE = !process.env.ARCVEIL_PRODUCTION;

/**
 * License payload structure:
 * {
 *   edition: "pro" | "free",
 *   email: "user@example.com",
 *   expires: null | "2025-12-31",   // null = lifetime
 *   features: ["companion","overlays","cloud-ai"],
 *   issued: "2024-01-01",
 *   sig: "<base64 RSA signature of JSON without sig field>"
 * }
 */

function verifyLicense(licenseJson) {
  if (DEV_MODE) {
    return { valid: true, edition: 'pro', email: 'dev@arcveil.local', features: ['all'], expires: null, dev: true };
  }

  let payload;
  try {
    payload = JSON.parse(licenseJson);
  } catch {
    return { valid: false, reason: 'Invalid license format' };
  }

  const { sig, ...data } = payload;
  if (!sig) return { valid: false, reason: 'Missing signature' };

  // Verify expiry
  if (data.expires) {
    if (new Date(data.expires) < new Date()) {
      return { valid: false, reason: 'License expired on ' + data.expires };
    }
  }

  // Verify RSA signature
  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(JSON.stringify(data));
    const ok = verifier.verify(PUBLIC_KEY, sig, 'base64');
    if (!ok) return { valid: false, reason: 'Invalid signature' };
  } catch (e) {
    return { valid: false, reason: 'Signature verification failed: ' + e.message };
  }

  return {
    valid:    true,
    edition:  data.edition || 'free',
    email:    data.email,
    features: data.features || [],
    expires:  data.expires,
  };
}

function hasFeature(licenseResult, feature) {
  if (!licenseResult?.valid) return false;
  if (licenseResult.features?.includes('all')) return true;
  return licenseResult.features?.includes(feature) ?? false;
}

function getMachineId() {
  const parts = [os.hostname(), os.platform(), os.arch()];
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}

module.exports = { verifyLicense, hasFeature, getMachineId };
