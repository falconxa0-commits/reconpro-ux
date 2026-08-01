import nacl from 'tweetnacl';
import { sha256 } from '@noble/hashes/sha2.js';

// ═══════════════════════════════════════════════════════════════════════
// Genesis Stamp — Cryptographic Attestation Utilities
// Ed25519 signing + SHA-256 hashing via tweetnacl + @noble/hashes
// ═══════════════════════════════════════════════════════════════════════

// ── Types ───────────────────────────────────────────────────────────

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface AttestationPayload {
  stampId: string;
  domain: string;
  tier: string;
  score: number;
  grade: string;
  issuedAt: string;
  expiresAt: string;
  frameworks: string[];
  complianceScores: Record<string, number>;
  findingsSummary: Record<string, number>;
}

// ── Cached master keypair ───────────────────────────────────────────

let cachedKeyPair: KeyPair | null = null;

/**
 * Returns the master Ed25519 keypair, generating and caching it once.
 * In production, this would load from env vars or a KMS.
 */
export function getMasterKeyPair(): KeyPair {
  if (cachedKeyPair) return cachedKeyPair;
  cachedKeyPair = nacl.sign.keyPair();
  return cachedKeyPair;
}

/**
 * Generate a human-readable stamp ID in GS-XXXX-XXXX-XXXX format.
 * Each segment is 4 random hex characters (16 bits of entropy each).
 */
export function generateStampId(): string {
  const seg = (): string =>
    Array.from(crypto.getRandomValues(new Uint8Array(2)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  return `GS-${seg()}-${seg()}-${seg()}`;
}

/**
 * Create a canonical JSON string from a payload object.
 * Keys are sorted lexicographically to ensure deterministic serialization.
 */
function canonicalJson(payload: AttestationPayload): string {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

/**
 * Compute SHA-256 hash of a string, returned as hex.
 */
export function hashPayload(payload: AttestationPayload): string {
  const encoded = new TextEncoder().encode(canonicalJson(payload));
  const hash = sha256(encoded);
  return Array.from(hash)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Sign an attestation payload with Ed25519.
 * Returns { signature (base64), publicKey (hex), payloadHash (hex) }.
 */
export function signAttestation(
  payload: AttestationPayload,
  keyPair?: KeyPair
): { signature: string; publicKey: string; payloadHash: string } {
  const kp = keyPair ?? getMasterKeyPair();
  const message = new TextEncoder().encode(canonicalJson(payload));
  const signature = nacl.sign.detached(message, kp.secretKey);

  return {
    signature: Buffer.from(signature).toString('base64'),
    publicKey: Buffer.from(kp.publicKey).toString('hex'),
    payloadHash: hashPayload(payload),
  };
}

/**
 * Verify an attestation payload's Ed25519 signature.
 * Returns true if the signature is valid for the given payload and public key.
 */
export function verifyAttestation(
  payload: AttestationPayload,
  signatureBase64: string,
  publicKeyHex: string
): boolean {
  try {
    const message = new TextEncoder().encode(canonicalJson(payload));
    const signature = Uint8Array.from(Buffer.from(signatureBase64, 'base64'));
    const publicKey = Uint8Array.from(Buffer.from(publicKeyHex, 'hex'));
    return nacl.sign.detached.verify(message, signature, publicKey);
  } catch {
    return false;
  }
}
