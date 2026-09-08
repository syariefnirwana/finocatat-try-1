// Verifikasi Firebase ID token (RS256) memakai kunci publik Google.

interface Certs {
  keys: Record<string, CryptoKey>;
  fetchedAt: number;
}

let certCache: Certs | null = null;

function b64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const raw = atob(b64 + pad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function loadCerts(): Promise<Record<string, CryptoKey>> {
  if (certCache && Date.now() - certCache.fetchedAt < 60 * 60 * 1000) {
    return certCache.keys;
  }
  const res = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  );
  if (!res.ok) throw new Error(`Gagal ambil kunci publik Google [${res.status}]`);
  const jwks = (await res.json()) as { keys: (JsonWebKey & { kid: string })[] };
  const keys: Record<string, CryptoKey> = {};
  for (const jwk of jwks.keys) {
    keys[jwk.kid] = await crypto.subtle.importKey(
      "jwk",
      { ...jwk, ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
  }
  certCache = { keys, fetchedAt: Date.now() };
  return keys;
}

export interface VerifiedToken {
  uid: string;
  email?: string;
}

export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string,
): Promise<VerifiedToken> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Token tidak valid.");
  const [rawHeader, rawPayload, rawSignature] = parts as [string, string, string];

  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(rawHeader))) as {
    kid?: string;
    alg?: string;
  };
  if (header.alg !== "RS256" || !header.kid) throw new Error("Token tidak valid.");

  const keys = await loadCerts();
  const key = keys[header.kid];
  if (!key) throw new Error("Token tidak valid (kunci tidak dikenal).");

  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(rawSignature) as unknown as ArrayBuffer,
    new TextEncoder().encode(`${rawHeader}.${rawPayload}`) as unknown as ArrayBuffer,
  );
  if (!ok) throw new Error("Tanda tangan token tidak cocok.");

  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(rawPayload))) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    email?: string;
  };
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error("Token bukan untuk aplikasi ini.");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Penerbit token salah.");
  }
  if (!payload.sub || !payload.exp || payload.exp < now) {
    throw new Error("Sesi kedaluwarsa. Masuk ulang.");
  }
  return { uid: payload.sub, email: payload.email };
}
