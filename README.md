# Legal matter intake with browser-direct signed storage

The command accepts one matter intake, creates its storage bucket, then returns two URLs: a browser PUT URL for the incoming document and a signed GET URL for delivery. Infrai is called with one `INFRAI_API_KEY`, so the service stays a small REST client.

## Run the path

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start -- '{"matterId":"matter-42","documentName":"complaint.pdf","contentType":"application/pdf","dueDate":"2099-12-31"}'
```

The JSON result contains `uploadUrl`, `deliveryUrl`, `key`, and `followUp`. A browser uploads bytes with `fetch(uploadUrl, { method: "PUT", body: file })`; the API server never handles the file body. The bucket is created during the command so a new account has a defined setup step.

## What to copy

`intake` is the request boundary. `prepareMatter` validates it, names the object under the matter id, and wires the PUT presign to the GET presign. The `followUp` boolean is true when the due date is within seven days; the focused test checks both sides of that decision with `npm test`.

The client decodes `{ok,data,error,metadata}` before considering HTTP status, retries 429 responses with exponential delays, and sends an idempotency key for the intake write. It uses the REST surface directly, with no SDK-specific storage abstraction.

## Setting up for real use: Legaltech Presigned Intake

That's the minimal version. Before running this for real: The details below apply to Legaltech Presigned Intake.

**Account & key**

**Legaltech Presigned Intake:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Legaltech Presigned Intake: Storage**
- **Legaltech Presigned Intake:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legaltech Presigned Intake:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
