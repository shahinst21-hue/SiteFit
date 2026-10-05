import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";

test("real PostGIS plugin supports isolated schema, CRS transform, geography metre distances and GiST", async () => {
  const db = new PGlite({ extensions: { postgis } });
  try {
    await db.exec("create schema gis; create extension postgis with schema gis;");
    const result = await db.query<{ version: string; metres: number; x: number; inside: boolean }>(`
      select gis.postgis_lib_version() as version,
      gis.st_distance(gis.st_setsrid(gis.st_makepoint(-0.1,51.5),4326)::gis.geography,
                      gis.st_setsrid(gis.st_makepoint(-0.1,51.501),4326)::gis.geography) as metres,
      gis.st_x(gis.st_transform(gis.st_setsrid(gis.st_makepoint(-0.1,51.5),4326),27700)) as x,
      gis.st_covers(gis.st_geomfromtext('POLYGON((-1 50,1 50,1 52,-1 52,-1 50))',4326),
                    gis.st_setsrid(gis.st_makepoint(-0.1,51.5),4326)) as inside`);
    assert.match(result.rows[0].version, /^3\./); assert.ok(result.rows[0].metres > 110 && result.rows[0].metres < 112);
    assert.ok(result.rows[0].x > 530000 && result.rows[0].x < 533000); assert.equal(result.rows[0].inside, true);
    await db.exec("create table geometry_test(g gis.geometry(MultiPolygon,4326)); create index geometry_test_gist on geometry_test using gist(g);");
  } finally { await db.close(); }
});
