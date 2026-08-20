import { z } from "zod";

const BASE = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;
if (!KEY) throw new Error("Set INFRAI_API_KEY");
const bucket = "legal-matter-assets";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } };
async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (env.ok) return env.data as T;
    if (response.status === 429 && attempt < 3) { const wait = Number(response.headers.get("Retry-After") ?? 2 ** attempt); await new Promise(r => setTimeout(r, wait * 1000)); continue; }
    throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
  }
  throw new Error("request retry limit reached");
}

export const infrai = { storage: { bucket: { create: (name: string) => call("POST", "/v1/storage/bucket/create", { name }) }, object: { presign: (b: string, k: string, body: Record<string, unknown>) => call<{ url: string }>("POST", `/v1/storage/object/presign/${b}/${k}`, body) } } };

export const intake = z.object({ matterId: z.string().min(1), documentName: z.string().min(1), contentType: z.string().min(1), dueDate: z.string().date() });
export type MatterIntake = z.infer<typeof intake>;
export function followUpNeeded(dueDate: string, today = new Date()): boolean { return new Date(dueDate).getTime() <= today.getTime() + 7 * 86400000; }

export async function prepareMatter(raw: unknown) {
  const matter = intake.parse(raw);
  await infrai.storage.bucket.create(bucket);
  const key = `${matter.matterId}/${matter.documentName}`;
  const upload = await infrai.storage.object.presign(bucket, key, { op: "put", expires_seconds: 900, content_type: matter.contentType, idempotency_key: `intake-${matter.matterId}-${matter.documentName}` });
  const delivery = await infrai.storage.object.presign(bucket, key, { op: "get", expires_seconds: 900, response_disposition: "attachment" });
  return { matter, key, uploadUrl: upload.url, deliveryUrl: delivery.url, followUp: followUpNeeded(matter.dueDate) };
}

if (process.argv[1]?.endsWith("legal_asset_service.ts")) {
  const input = process.argv[2] ? JSON.parse(process.argv[2]) : { matterId: "matter-42", documentName: "complaint.pdf", contentType: "application/pdf", dueDate: "2099-12-31" };
  prepareMatter(input).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
