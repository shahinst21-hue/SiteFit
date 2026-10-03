// Explicit development-only integration probe. Never imported by the application or run in CI.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { readPublicSupabaseConfig } from "../lib/supabase/config.ts";
import { completeAuthCallback } from "../lib/auth/flow.ts";
import type { Database } from "../lib/supabase/database.types.ts";
nextEnv.loadEnvConfig(process.cwd(), true);
const cli = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
);
function command(args: string[]): unknown {
  try {
    return JSON.parse(
      execFileSync(process.execPath, [cli, ...args], {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 30000,
        maxBuffer: 2_000_000,
      }).toString(),
    );
  } catch {
    throw new Error(
      "Development CLI verification failed. Check local CLI authentication; no credentials are printed.",
    );
  }
}
type Project = { id: string; name: string };
type Key = { name: string; type: string; api_key: string };
let stage = "configuration";
async function verify() {
  const config = readPublicSupabaseConfig(process.env);
  assert.ok(config, "Configure development Supabase in ignored .env.local.");
  const ref = new URL(config.url).hostname.split(".")[0];
  stage = "development project identity";
  const projects = command([
    "projects",
    "list",
    "--output",
    "json",
  ]) as Project[];
  assert.ok(
    Array.isArray(projects) &&
      projects.some(
        (project) => project.id === ref && project.name === "sitefit-dev",
      ),
    "This probe only runs against the CLI-verified sitefit-dev project.",
  );
  stage = "ephemeral verification credential";
  const keys = command([
    "projects",
    "api-keys",
    "--project-ref",
    ref,
    "--output",
    "json",
  ]) as Key[];
  const privileged = keys.find(
    (key) => key.name === "service_role" && key.type === "legacy",
  )?.api_key;
  assert.ok(
    privileged &&
      JSON.parse(Buffer.from(privileged.split(".")[1], "base64url").toString())
        .role === "service_role",
    "A server-only test credential is unavailable; no value is printed.",
  );
  // Retrieved into process memory only, never stored, logged, returned or used by application code.
  const admin = createClient(config.url, privileged, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const users: string[] = [];
  const client = () =>
    createClient<Database>(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  try {
    const clients = [client(), client()];
    for (const signedIn of clients) {
      const email = `sitefit-phase3-${crypto.randomUUID()}@example.invalid`;
      stage = "hosted test link generation";
      const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: "http://localhost:3000/auth/callback" },
      });
      if (error)
        stage += ` (HTTP ${error.status ?? 0}; code ${/^[a-z_]+$/.test(error.code ?? "") ? error.code : "redacted"})`;
      assert.ok(
        !error && data.user?.id && data.properties?.hashed_token,
        "Hosted test link generation failed (provider details redacted).",
      );
      users.push(data.user.id);
      stage = "hosted email token verification";
      assert.equal(
        await completeAuthCallback(
          { kind: "email", value: data.properties.hashed_token },
          signedIn.auth,
        ),
        true,
        "Hosted one-time email token verification failed.",
      );
      const identity = await signedIn.auth.getUser();
      assert.ok(
        !identity.error && identity.data.user?.id === data.user.id,
        "Hosted verified identity failed.",
      );
      stage = "owner profile read";
      const profile = await signedIn
        .from("profiles")
        .select("id")
        .eq("id", data.user.id);
      assert.ok(
        !profile.error && profile.data?.length === 1,
        "Owner profile is inaccessible.",
      );
      stage = "token replay rejection";
      assert.equal(
        await completeAuthCallback(
          { kind: "email", value: data.properties.hashed_token },
          client().auth,
        ),
        false,
        "Used token was accepted twice.",
      );
    }
    stage = "cross-user profile access";
    for (let n = 0; n < 2; n++) {
      const other = await clients[n]
        .from("profiles")
        .select("id")
        .eq("id", users[1 - n]);
      assert.ok(
        !other.error && other.data?.length === 0,
        "Cross-user profile read accepted.",
      );
      const mutation = await clients[n]
        .from("profiles")
        .update({ display_name: "forged" })
        .eq("id", users[1 - n])
        .select("id");
      assert.ok(
        !mutation.error && mutation.data?.length === 0,
        "Cross-user profile update accepted.",
      );
    }
    stage = "anonymous access and sign-out";
    const anonymous = await client().from("profiles").select("id");
    assert.ok(anonymous.error, "Anonymous private profile read accepted.");
    for (const signedIn of clients) {
      assert.equal(
        (await signedIn.auth.signOut({ scope: "local" })).error,
        null,
      );
      assert.equal((await signedIn.auth.getUser()).data.user, null);
    }
    // Exercise real application cookie establishment, protected rendering and Server Action sign-out.
    // A generated test token proves these boundaries, not inbox delivery or browser PKCE.
    stage = "application session test link";
    const email = `sitefit-phase3-${crypto.randomUUID()}@example.invalid`;
    const link = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    assert.ok(
      !link.error && link.data.user?.id && link.data.properties?.hashed_token,
    );
    users.push(link.data.user.id);
    const token = link.data.properties.hashed_token;
    const origin = "http://127.0.0.1:3000";
    const jar = new Map<string, string>();
    const form = (fields: Record<string, string>) => {
      const data = new FormData();
      for (const [name, value] of Object.entries(fields)) data.set(name, value);
      return data;
    };
    async function page(path: string, init: RequestInit = {}) {
      const response = await fetch(new URL(path, origin), {
        ...init,
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
        headers: {
          Origin: origin,
          Cookie: [...jar]
            .map(([name, value]) => `${name}=${value}`)
            .join("; "),
          ...init.headers,
        },
      });
      for (const line of response.headers.getSetCookie()) {
        const pair = line.split(";", 1)[0];
        const delimiter = pair.indexOf("=");
        const name = pair.slice(0, delimiter);
        const value = pair.slice(delimiter + 1);
        if (!value || /max-age=0/i.test(line)) jar.delete(name);
        else jar.set(name, value);
      }
      return response;
    }
    stage = "application email confirmation POST";
    const confirmation = await page(
      `/auth/confirm?token_hash=${token}&type=email`,
    );
    const action = (await confirmation.text()).match(
      /name="(\$ACTION_ID_[^"]+)"/,
    )?.[1];
    assert.ok(action, "Confirmation action is missing.");
    const confirmed = await page("/auth/confirm", {
      method: "POST",
      body: form({ [action]: "", token_hash: token, next: "/account" }),
    });
    stage += ` (HTTP ${confirmed.status}; destination ${new URL(confirmed.headers.get("location") ?? "/none", origin).pathname}; cookies ${jar.size})`;
    assert.equal(confirmed.status, 303);
    assert.equal(
      new URL(confirmed.headers.get("location")!, origin).pathname,
      "/account",
    );
    assert.ok(jar.size > 0, "Application did not establish session cookies.");
    stage = "protected application account";
    const account = await page("/account");
    assert.equal(account.status, 200);
    assert.match(account.headers.get("cache-control") ?? "", /no-store/);
    const html = await account.text();
    assert.ok(
      html.includes(email),
      "Application did not verify the signed-in user.",
    );
    const signout = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
    assert.ok(signout);
    stage = "application sign-out";
    const out = await page("/account", {
      method: "POST",
      body: form({ [signout]: "" }),
    });
    assert.equal(out.status, 303);
    assert.equal(
      new URL(out.headers.get("location")!, origin).pathname +
        new URL(out.headers.get("location")!, origin).search,
      "/login?signed_out=1",
    );
    assert.equal(
      (await page("/account")).status,
      307,
      "Account remained accessible after sign-out.",
    );
    stage = "application replayed-link rejection";
    const replay = await page("/auth/confirm", {
      method: "POST",
      body: form({
        [action]: "",
        token_hash: token,
        next: "https://example.invalid",
      }),
    });
    assert.equal(replay.status, 303);
    assert.equal(
      new URL(replay.headers.get("location")!, origin).pathname +
        new URL(replay.headers.get("location")!, origin).search,
      "/login?error=invalid-link",
    );
  } finally {
    for (const id of users) {
      const result = await admin.auth.admin.deleteUser(id);
      if (result.error) stage = "synthetic account cleanup";
      assert.equal(
        result.error,
        null,
        "Synthetic test account cleanup failed; investigate without exposing credentials.",
      );
    }
  }
  console.log(
    "PASS: hosted one-time tokens, verified identities, profile isolation, replay rejection, application session cookies/protected account/sign-out; synthetic accounts removed. Inbox delivery/browser PKCE require a separate end-to-end check.",
  );
}
verify().catch(() => {
  console.error(
    `FAIL: hosted development Auth verification at ${stage}. No provider payloads, emails or credentials are printed.`,
  );
  process.exitCode = 1;
});
