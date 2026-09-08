import { createFileRoute } from "@tanstack/react-router";
import {
  fsAllFcmTokens,
  fsArray,
  fsGetDoc,
  fsString,
  getAccessToken,
  readServiceAccount,
  sendToTokens,
} from "@/lib/google-auth.server";
import { verifyFirebaseIdToken } from "@/lib/firebase-id-token.server";

const MASTER_ADMINS = ["adminutama", "syarief"];

interface BroadcastBody {
  mode?: "manual" | "test";
  title?: string;
  body?: string;
  targetUsername?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function findUsernameByUid(
  projectId: string,
  token: string,
  uid: string,
): Promise<string | null> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "usernames" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "uid" },
              op: "EQUAL",
              value: { stringValue: uid },
            },
          },
          limit: 1,
        },
      }),
    },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as { document?: { name: string } }[];
  const name = rows[0]?.document?.name;
  if (!name) return null;
  const parts = name.split("/");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

export const Route = createFileRoute("/api/public/broadcast")({
  server: {
    handlers: {
      // Dipanggil penjadwal harian (jam 20:00 WIB) memakai kunci rahasia.
      GET: async ({ request }) => {
        try {
          const secret = process.env["BROADCAST_SECRET"];
          const url = new URL(request.url);
          if (!secret || url.searchParams.get("secret") !== secret) {
            return json({ error: "Akses ditolak." }, 401);
          }

          const sa = readServiceAccount();
          const accessToken = await getAccessToken(sa);

          const settings = await fsGetDoc(sa, accessToken, "app_config/settings");
          const title =
            fsString(settings?.["auto_notif_title"]) ?? "Waktunya rekap keuangan";
          const body =
            fsString(settings?.["auto_notif_content"]) ??
            "Catat pemasukan dan pengeluaran hari ini di FinoCatat.";

          const tokens = await fsAllFcmTokens(sa, accessToken);
          if (tokens.length === 0) {
            return json({ success: true, mode: "cron", sent: 0, message: "Belum ada perangkat terdaftar." });
          }
          const result = await sendToTokens(sa, accessToken, tokens, title, body);
          return json({ success: true, mode: "cron", ...result, total: tokens.length });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Broadcast cron gagal:", message);
          return json({ error: message }, 500);
        }
      },

      // Dipanggil panel admin. Wajib bawa Firebase ID token milik admin.
      POST: async ({ request }) => {
        try {
          const sa = readServiceAccount();
          const idToken = (request.headers.get("Authorization") ?? "").replace(
            /^Bearer\s+/i,
            "",
          );
          if (!idToken) return json({ error: "Masuk dulu sebagai admin." }, 401);

          const verified = await verifyFirebaseIdToken(idToken, sa.projectId);
          const accessToken = await getAccessToken(sa);

          const username = await findUsernameByUid(sa.projectId, accessToken, verified.uid);
          const settings = await fsGetDoc(sa, accessToken, "app_config/settings");
          const coAdmins = fsArray(settings?.["co_admins"])
            .map((v) => (fsString(v) ?? "").toLowerCase())
            .filter(Boolean);
          const isAdmin =
            !!username &&
            (MASTER_ADMINS.includes(username) || coAdmins.includes(username));
          if (!isAdmin) return json({ error: "Hanya admin yang boleh mengirim." }, 403);

          const payload = (await request.json()) as BroadcastBody;
          const title = (payload.title ?? "").trim();
          const body = (payload.body ?? "").trim();
          if (!title || !body) return json({ error: "Judul dan isi pesan wajib diisi." }, 400);

          if (payload.mode === "test") {
            const target = (payload.targetUsername ?? "").trim().toLowerCase();
            if (!target) return json({ error: "Username tujuan belum diisi." }, 400);
            const userDoc = await fsGetDoc(sa, accessToken, `usernames/${target}`);
            const uid = fsString(userDoc?.["uid"]);
            if (!uid) return json({ error: "Username tidak ditemukan." }, 404);
            const tokenDoc = await fsGetDoc(sa, accessToken, `users/${uid}/fcm/token`);
            const deviceToken = fsString(tokenDoc?.["token"]);
            if (!deviceToken) {
              return json(
                { error: "User itu belum mengaktifkan notifikasi di perangkatnya." },
                404,
              );
            }
            const result = await sendToTokens(
              sa,
              accessToken,
              [{ token: deviceToken, docPath: `projects/${sa.projectId}/databases/(default)/documents/users/${uid}/fcm/token` }],
              title,
              body,
            );
            return json({ success: result.sent > 0, mode: "test", ...result });
          }

          const tokens = await fsAllFcmTokens(sa, accessToken);
          if (tokens.length === 0) {
            return json({ error: "Belum ada perangkat user yang terdaftar." }, 404);
          }
          const result = await sendToTokens(sa, accessToken, tokens, title, body);
          return json({ success: true, mode: "manual", ...result, total: tokens.length });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Broadcast manual gagal:", message);
          return json({ error: message }, 500);
        }
      },
    },
  },
});
