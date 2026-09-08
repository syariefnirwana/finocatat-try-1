// Membuat access token Google dari service account tanpa firebase-admin
// (firebase-admin tidak jalan di runtime edge). Semua pakai Web Crypto.

const enc = new TextEncoder();

function b64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string" ? enc.encode(input) : new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

export interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function readServiceAccount(): ServiceAccount {
  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const clientEmail = process.env["FIREBASE_SA_EMAIL"];
  const privateKey = process.env["FIREBASE_SA_PRIVATE_KEY"];
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Kunci Firebase Admin belum lengkap (FIREBASE_PROJECT_ID, FIREBASE_SA_EMAIL, FIREBASE_SA_PRIVATE_KEY).",
    );
  }
  return { projectId, clientEmail, privateKey };
}

let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 60 > now) return cached.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: sa.clientEmail,
      scope: [
        "https://www.googleapis.com/auth/datastore",
        "https://www.googleapis.com/auth/firebase.messaging",
      ].join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    enc.encode(`${header}.${payload}`),
  );
  const jwt = `${header}.${payload}.${b64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Gagal ambil access token Google [${res.status}]: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

// ---------- Firestore REST ----------

const FS = "https://firestore.googleapis.com/v1";

type FsValue = Record<string, unknown>;

export function fsString(value: FsValue | undefined): string | null {
  if (!value) return null;
  if (typeof value["stringValue"] === "string") return value["stringValue"] as string;
  return null;
}

export function fsArray(value: FsValue | undefined): FsValue[] {
  const av = value?.["arrayValue"] as { values?: FsValue[] } | undefined;
  return av?.values ?? [];
}

export async function fsGetDoc(
  sa: ServiceAccount,
  token: string,
  path: string,
): Promise<Record<string, FsValue> | null> {
  const res = await fetch(
    `${FS}/projects/${sa.projectId}/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore error [${res.status}]: ${await res.text()}`);
  const doc = (await res.json()) as { fields?: Record<string, FsValue> };
  return doc.fields ?? {};
}

/** Ambil semua token FCM dari subcollection "fcm" di seluruh user. */
export async function fsAllFcmTokens(
  sa: ServiceAccount,
  token: string,
): Promise<{ token: string; docPath: string }[]> {
  const res = await fetch(
    `${FS}/projects/${sa.projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "fcm", allDescendants: true }],
          limit: 2000,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Firestore query error [${res.status}]: ${await res.text()}`);
  const rows = (await res.json()) as {
    document?: { name: string; fields?: Record<string, FsValue> };
  }[];
  const out: { token: string; docPath: string }[] = [];
  for (const row of rows) {
    const value = fsString(row.document?.fields?.["token"]);
    if (value && row.document) {
      out.push({ token: value, docPath: row.document.name });
    }
  }
  return out;
}

export async function fsDeleteDocByName(token: string, name: string): Promise<void> {
  await fetch(`${FS}/${name}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}

// ---------- FCM HTTP v1 ----------

export interface SendResult {
  sent: number;
  failed: number;
  removed: number;
}

export async function sendToTokens(
  sa: ServiceAccount,
  accessToken: string,
  tokens: { token: string; docPath?: string }[],
  title: string,
  body: string,
): Promise<SendResult> {
  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const item of tokens) {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${sa.projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: item.token,
            notification: { title, body },
            webpush: {
              notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
              fcm_options: { link: "/dashboard/" },
            },
          },
        }),
      },
    );

    if (res.ok) {
      sent++;
      continue;
    }

    failed++;
    const text = await res.text();
    console.error(`FCM gagal [${res.status}]: ${text}`);
    // Token mati: bersihkan dari database supaya tidak dipakai lagi.
    if ((res.status === 404 || res.status === 400) && item.docPath) {
      await fsDeleteDocByName(accessToken, item.docPath);
      removed++;
    }
  }

  return { sent, failed, removed };
}
