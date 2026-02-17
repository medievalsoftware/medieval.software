import { createHmac, timingSafeEqual } from "crypto";
import { spawn } from "child_process";

const SECRET = process.env.WEBHOOK_SECRET;
if (!SECRET) {
  console.error("WEBHOOK_SECRET environment variable is required");
  process.exit(1);
}

const DEPLOY_SCRIPT = new URL("./deploy.sh", import.meta.url).pathname;
let deploying = false;

const server = Bun.serve({
  port: 9000,
  async fetch(req) {
    if (req.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }

    const signature = req.headers.get("x-hub-signature-256");
    if (!signature) {
      return new Response("missing signature", { status: 401 });
    }

    const body = await req.text();
    const expected =
      "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");

    if (
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return new Response("invalid signature", { status: 401 });
    }

    const payload = JSON.parse(body);
    if (payload.ref !== "refs/heads/main") {
      return new Response("ignored: not main", { status: 200 });
    }

    if (deploying) {
      return new Response("deploy already in progress", { status: 409 });
    }

    deploying = true;
    console.log(`[${new Date().toISOString()}] deploying...`);

    const proc = spawn("bash", [DEPLOY_SCRIPT], {
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      deploying = false;
      console.log(
        `[${new Date().toISOString()}] deploy ${code === 0 ? "succeeded" : `failed (exit ${code})`}`
      );
    });

    return new Response("deploying", { status: 200 });
  },
});

console.log(`webhook listening on :${server.port}`);
