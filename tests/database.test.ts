import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import {launchPolicySnapshot,policyVersions} from '../lib/legal/policy-text.ts';
test("migrations rebuild PostgreSQL; real policies enforce owners and Blog visibility", async () => {
  const db = new PGlite({ extensions: { postgis } });
  try {
    // Minimal platform objects only; all application SQL is the actual migration history.
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text,aud text,role text,
        is_anonymous boolean not null default false,email_confirmed_at timestamptz,last_sign_in_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
    // Storage metadata/RLS shim only; actual object API and bytes require hosted verification.
    await db.exec(`create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated;grant select,insert,update,delete on storage.objects to anon,authenticated;
      create policy synthetic_broad_access on storage.objects for all to anon,authenticated using(true) with check(true);`);
    const dir = new URL("../supabase/migrations/", import.meta.url);
    const files = (await readdir(dir))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    assert.ok(files.length);
    assert.equal(
      new Set(files.map((file) => file.split("_")[0])).size,
      files.length,
    );
    for (const file of files)
      await db.exec(await readFile(new URL(file, dir), "utf8"));
    const review=(await db.query<{approved:boolean;classification:string;confirmation_channel:string;snapshot:unknown}>(
      'select approved,classification,confirmation_channel,snapshot from public.sale_policies where version=$1',[policyVersions.sale])).rows[0];
    assert.equal(review.approved,false);assert.equal(review.classification,'digital_content');assert.equal(review.confirmation_channel,'manual_zoho_pdf');
    assert.deepEqual(review.snapshot,launchPolicySnapshot());
    assert.equal((await db.query<{count:number}>('select count(*)::int as count from public.sale_policies where approved')).rows[0].count,0);
    assert.equal((await db.query<{disabled:boolean}>("select not exists(select 1 from public.commercial_release_control where mode<>'test' or checkout_enabled or execution_enabled) as disabled")).rows[0].disabled,true);
    await db.exec(await readFile(new URL('../supabase/tests/controlled-proof.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/tests/proof-successor.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/tests/snapshot-continuation.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/tests/snapshot-advisor.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/tests/controlled-trial.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL("../supabase/tests/source-reuse.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/commercial-release.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/verification/contract-confirmation-queue.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/document-access.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/economics.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/assessments.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/full-intelligence.sql", import.meta.url), "utf8"));
    await db.exec(
      await readFile(
        new URL("../supabase/tests/ownership.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL("../supabase/tests/property-identity.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(await readFile(new URL("../supabase/tests/data-framework.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/spatial.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/boundary-normalisation.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/free-snapshot.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/account-claims.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/payments.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/purchase-history.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/enrichment-polygon.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/census-profiles.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/compact-os.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/native-statistics.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/station-activity.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/place-tiles.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/planning-constraints.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/enriched-input.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/planning-snapshots.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/walking-snapshots.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/catchment-snapshots.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/enrichment-releases.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/required-evidence-parent.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/non-domestic-fallback.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/population-operands.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/premises-history.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/tests/web-discovery.sql", import.meta.url), "utf8"));
    for (const table of ["public.analyses", "public.properties", "auth.users"])
      assert.equal(
        (
          await db.query<{ count: number }>(
            `select count(*)::int as count from ${table}`,
          )
        ).rows[0].count,
        0,
      );
    // Isolated recovery proof using synthetic data, never a hosted dump or credential export.
    const recoveryFixture = await readFile(new URL("../supabase/tests/full-intelligence.sql", import.meta.url), "utf8");
    await db.exec(recoveryFixture.replace(/rollback;\s*$/i, "commit;"));
    const fingerprintSql = "select md5(string_agg(id::text||coalesce(full_projection::text,free_projection::text),'|' order by id)) as digest from public.reports where status='ready'";
    const before = (await db.query<{digest:string}>(fingerprintSql)).rows[0].digest;
    assert.ok(before);
    await db.exec(await readFile(new URL("../supabase/tests/campaign-measurement.sql", import.meta.url), "utf8"));
    const backup = await db.dumpDataDir();
    const restored = new PGlite({loadDataDir:backup,extensions:{postgis}});
    try {
      assert.equal((await restored.query<{digest:string}>(fingerprintSql)).rows[0].digest,before);
      const check=(await restored.query<{denied:boolean;frozen:boolean}>("select not has_table_privilege('authenticated','public.sale_contracts','SELECT') as denied, exists(select 1 from pg_trigger where tgname='sale_contracts_frozen' and not tgisinternal) as frozen")).rows[0];
      assert.equal(check.denied,true);assert.equal(check.frozen,true);
      assert.equal((await restored.query<{count:number}>("select count(*)::int as count from public.sale_contracts")).rows[0].count,1);
    } finally {await restored.close();}
  } finally {
    await db.close();
  }
});
