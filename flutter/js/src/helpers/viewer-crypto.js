export const ECDH_PARAMS = { name: "ECDH", namedCurve: "P-256" };
export const HKDF_INFO = "fort-rc-token-v1";

/**
 * Viewer ↔ parent postMessage crypto (token-only encryption).
 *
 * Protocol v1 (ECDH):
 *   Viewer → Parent: { type: "VIEWER_READY", version: 1,
 *                      publicKey: base64(SPKI DER) }  // ECDH P-256
 *   Parent → Viewer: { type: "REMOTE_SESSION_READY", version: 1,
 *                      remoteSessionId, clientId, server, key,
 *                      encryptedToken: base64(JWT) }
 *   Viewer → Parent: { type: "VIEWER_ERROR", title, message, msgboxType }
 *   JWT payload (unsigned, alg=none): {
 *     encryptedToken: base64(AES-GCM ciphertext),
 *     iv: base64(12-byte nonce),
 *     ephemeralPublicKey: base64(SPKI DER)
 *   }
 */

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64UrlToArrayBuffer(b64url) {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  if (pad === 2) b64 += "==";
  else if (pad === 3) b64 += "=";
  else if (pad === 1) b64 += "===";
  return base64ToArrayBuffer(b64);
}

function parseUnsignedJwtPayload(jwt) {
  const parts = jwt.split(".");
  if (parts.length < 2) {
    throw new Error("invalid JWT envelope");
  }
  const json = new TextDecoder().decode(base64UrlToArrayBuffer(parts[1]));
  return JSON.parse(json);
}

async function deriveAesKey(privateKey, ephemeralPublicKey) {
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: ephemeralPublicKey },
    privateKey,
    256,
  );
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveBits"],
  );
  const aesBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(HKDF_INFO),
    },
    hkdfKey,
    256,
  );
  return crypto.subtle.importKey("raw", aesBits, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
}

export async function decryptToken(privateKey, encryptedTokenB64) {
  const jwt = new TextDecoder().decode(base64ToArrayBuffer(encryptedTokenB64));
  const { encryptedToken, iv, ephemeralPublicKey } =
    parseUnsignedJwtPayload(jwt);
  if (!encryptedToken || !iv || !ephemeralPublicKey) {
    throw new Error("JWT envelope missing crypto fields");
  }

  const ephemeralPub = await crypto.subtle.importKey(
    "spki",
    base64ToArrayBuffer(ephemeralPublicKey),
    ECDH_PARAMS,
    false,
    [],
  );
  const aesKey = await deriveAesKey(privateKey, ephemeralPub);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(iv)) },
    aesKey,
    base64ToArrayBuffer(encryptedToken),
  );
  return new TextDecoder().decode(plaintext);
}
