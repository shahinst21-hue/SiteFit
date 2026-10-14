# Operator-only reuse of already admitted, immutable London releases. No provider calls.
# Load the private fixed-target Development and Production SQL helpers first;
# dot-source this script so their fixed-target script scope is preserved.
param([switch]$Apply, [switch]$ContinueEmptyStaging, [switch]$ResumeVerified)
$ErrorActionPreference = 'Stop'
foreach ($name in @('Invoke-SiteFitDevelopmentSql','Invoke-SiteFitProductionSql','Assert-SiteFitProductionTarget')) {
 if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw 'Fixed-target private SQL helpers must be loaded first.' }
}
$target = Assert-SiteFitProductionTarget
if ($target.id -ne 'vsfkkroxgntoumoqcfcy' -or $target.name -ne 'sitefit-prod') { throw 'Wrong Production target.' }
$releases = @(Invoke-SiteFitDevelopmentSql "select to_jsonb(r) as record from source_data.dataset_releases r where state='ready' order by imported_at,id" @())
$allowed = @('ons','os','tfl','overture','planning-data')
foreach ($entry in $releases) {
 $r = $entry.record
 if ($r.provider_id -notin $allowed -or $r.subset_id -ne 'london' -or $r.licence_metadata.normalised.allowed -ne $true -or $r.licence_metadata.raw.allowed -ne $false -or $r.sha256 -notmatch '^[0-9a-f]{64}$' -or $r.id -notmatch '^[0-9a-f-]{36}$') { throw 'Release permission/identity requires review.' }
 if ($r.supersedes_release_id -and $r.supersedes_release_id -notin $releases.record.id) { throw 'Unselected parent release.' }
}
if ($releases.Count -ne 14) { throw 'Reviewed inventory changed; do not import implicitly.' }
$ids = ($releases.record.id | ForEach-Object { "'$_'::uuid" }) -join ','
$existing = (Invoke-SiteFitProductionSql 'select count(*)::integer as n from source_data.dataset_releases' @())[0].n
if ($existing -ne 0 -and -not ($ContinueEmptyStaging -or $ResumeVerified)) { throw 'Target is not empty. Review any interrupted import; no automatic restart.' }
if ($ContinueEmptyStaging -and $ResumeVerified) { throw 'Choose one explicit continuation mode.' }
$sourceSize = (Invoke-SiteFitDevelopmentSql "select sum(pg_total_relation_size(c.oid))::bigint as bytes from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='source_data' and relkind='r'" @())[0].bytes
$targetSize = (Invoke-SiteFitProductionSql 'select pg_database_size(current_database()) as bytes' @())[0].bytes
# Includes indexes/toast and 15% transfer margin; every write separately checks actual size.
$remainingSize=[double]$sourceSize
if ($ResumeVerified) {
 $alreadyStored=(Invoke-SiteFitProductionSql "select coalesce(sum(pg_total_relation_size(c.oid)),0)::bigint as bytes from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='source_data' and relkind='r'" @())[0].bytes
 $remainingSize=[Math]::Max(0,[double]$sourceSize-[double]$alreadyStored)
}
if ([double]$targetSize + $remainingSize * 1.15 -ge 450000000) { throw 'Capacity review required before reuse.' }
$tables = @(
 @{name='geography_features';key='release_id,geography_type,geography_code';batch=200;geometry='geometry';datasets=@('london-geography')},
 @{name='area_statistics';key='release_id,geography_type,geography_code,measure_code';batch=3000;datasets=@('TS001')},
 @{name='census_profiles';key='release_id,geography_type,geography_code';batch=3000;datasets=@('TS007A','TS003','TS045','TS066')},
 @{name='os_uprn_chunks';key='release_id,ordinal';batch=5;datasets=@('open-uprn')},
 @{name='native_memberships';key='release_id,oa_code';batch=3000;datasets=@('london-native-geography')},
 @{name='native_statistics';key='release_id,geography_type,geography_code';batch=3000;datasets=@('income-AHC-FYE2023','BRES2024')},
 @{name='station_activity';key='release_id,day_type,station_asc,measure';batch=1000;datasets=@('NUMBAT2025')},
 @{name='place_tiles';key='release_id,ordinal';batch=10;geometry='boundary';datasets=@('places')},
 @{name='constraint_features';key='release_id,entity';batch=200;geometry='geometry';datasets=@('conservation-area','article-4-direction-area')},
 @{name='native_area_operands';key='release_id';batch=1}
)
foreach ($table in $tables) {
 $table.rows = (Invoke-SiteFitDevelopmentSql "select count(*)::integer as rows from source_data.$($table.name) where release_id in ($ids)" @())[0].rows
 Write-Output "$($table.name): $($table.rows) permitted stored rows."
 if ($ContinueEmptyStaging -and (Invoke-SiteFitProductionSql "select count(*)::integer as rows from source_data.$($table.name)" @())[0].rows -ne 0) { throw 'Continuation requires empty source tables; manual review required.' }
}
Write-Output "Reviewed releases: $($releases.Count); current Production bytes: $targetSize; source relation bytes: $sourceSize; apply: $Apply"
if (-not $Apply) { return }
# Staged metadata retains original identity, source vintage, checksum and licence.
# Ready is restored only after exact row checks, with existing triggers enabled.
$metadata = (Invoke-SiteFitDevelopmentSql "select jsonb_agg(to_jsonb(r)||jsonb_build_object('state','loading','row_count',0) order by imported_at,id)::text as payload from source_data.dataset_releases r where id in ($ids)" @())[0].payload
$gate = 'with gate as materialized (select pg_advisory_xact_lock(17,107),1/(case when pg_database_size(current_database())<442000000 then 1 else 0 end) as safe), '
if ($ResumeVerified) {
 $original = (Invoke-SiteFitDevelopmentSql "select jsonb_agg(to_jsonb(r) order by imported_at,id)::text as payload from source_data.dataset_releases r where id in ($ids)" @())[0].payload
 $null = Invoke-SiteFitProductionSql 'select 1/(case when (select count(*) from source_data.dataset_releases)=14 and (select count(*) from source_data.dataset_releases d join jsonb_populate_recordset(null::source_data.dataset_releases,$1::jsonb) s using(id) where (to_jsonb(d)-''state''-''row_count'')=(to_jsonb(s)-''state''-''row_count'') and ((d.state=''loading'' and d.row_count=0) or (d.state=''ready'' and d.row_count=s.row_count)))=14 then 1 else 0 end) as identical' @($original)
} elseif ($ContinueEmptyStaging) {
 $null = Invoke-SiteFitProductionSql 'select 1/(case when (select jsonb_agg(to_jsonb(t) order by imported_at,id) from source_data.dataset_releases t)=$1::jsonb then 1 else 0 end) as identical' @($metadata)
} else {
 $null = Invoke-SiteFitProductionSql ($gate + 'inserted as (insert into source_data.dataset_releases select s.* from jsonb_populate_recordset(null::source_data.dataset_releases,$1::jsonb) s cross join gate where gate.safe=1 returning *) select 1/(case when (select jsonb_agg(to_jsonb(t) order by imported_at,id) from inserted t)=$1::jsonb then 1 else 0 end) as identical') @($metadata)
}
foreach ($table in $tables) {
 $expression = 'to_jsonb(t)'
 if ($table.geometry) { $expression += " || jsonb_build_object('$($table.geometry)',t.$($table.geometry)::text)" }
 $start=0
 if ($ResumeVerified) {
  $start=(Invoke-SiteFitProductionSql "select count(*)::integer as rows from source_data.$($table.name)" @())[0].rows
  if ($start -gt $table.rows) { throw 'Target has excess rows; manual review required.' }
  if ($start -gt 0) {
   # Exact cryptographic comparison of the entire stored prefix, not just counts
   # or the last acknowledged batch. This reconciles an ambiguous SQL dispatch.
   $prefix="select $expression as row,row_number() over(order by $($table.key)) as n from source_data.$($table.name) t where release_id in ($ids) order by $($table.key) limit $start"
   $fingerprint="select encode(sha256(convert_to(string_agg(encode(sha256(convert_to(row::text,'UTF8')),'hex'),'' order by n),'UTF8')),'hex') as sha from ($prefix) prefix_rows"
   $sourceHash=(Invoke-SiteFitDevelopmentSql $fingerprint @())[0].sha
   $targetHash=(Invoke-SiteFitProductionSql $fingerprint @())[0].sha
   if ($sourceHash -ne $targetHash -or $sourceHash -notmatch '^[0-9a-f]{64}$') { throw 'Stored prefix differs; do not resume.' }
  }
  Write-Output "$($table.name): reconciled exact prefix $start/$($table.rows)."
 }
 for ($offset=$start; $offset -lt $table.rows; $offset += $table.batch) {
  $select = "select $expression as row from source_data.$($table.name) t where release_id in ($ids) order by $($table.key) limit $($table.batch) offset $offset"
  $payload = (Invoke-SiteFitDevelopmentSql "select jsonb_agg(row)::text as payload from ($select) ordered_rows" @())[0].payload
  if ([Text.Encoding]::UTF8.GetByteCount($payload) -gt 8000000) { throw 'Unexpected batch size; stop for review.' }
  # Parameterised JSON, no interpolated data/secret; verify reconstructed PostgreSQL
  # values against the source in the same transaction, including EWKB/bytea values.
  $query = $gate + 'inserted as (insert into source_data.' + $table.name + ' select s.* from jsonb_populate_recordset(null::source_data.' + $table.name + ',$1::jsonb) s cross join gate where gate.safe=1 returning *) select 1/(case when (select jsonb_agg(' + $expression + ' order by ' + $table.key + ') from inserted t)=$1::jsonb then 1 else 0 end) as identical'
  $null = Invoke-SiteFitProductionSql $query @($payload)
  Write-Output "$($table.name): verified $([Math]::Min($offset+$table.batch,$table.rows))/$($table.rows)."
 }
foreach ($entry in ($releases | Where-Object {$_.record.dataset_id -in $table.datasets})) {
 # Reload original ready metadata; immutable source records have not changed.
 $r = (Invoke-SiteFitDevelopmentSql 'select to_jsonb(r)::text as payload from source_data.dataset_releases r where id=$1::uuid and state=''ready''' @($entry.record.id))[0].payload
 $ready=(Invoke-SiteFitProductionSql 'select state from source_data.dataset_releases where id=$1::uuid' @($entry.record.id))[0].state
 if ($ready -eq 'ready') {
  if ($start -ne $table.rows) { throw 'Ready release has incomplete rows; stop.' }
  $null=Invoke-SiteFitProductionSql 'select 1/(case when (select to_jsonb(d) from source_data.dataset_releases d where id=($1::jsonb->>''id'')::uuid)=$1::jsonb then 1 else 0 end) as identical' @($r)
 } else {
  $null = Invoke-SiteFitProductionSql ($gate + 'updated as (update source_data.dataset_releases d set state=s.state,row_count=s.row_count from jsonb_populate_record(null::source_data.dataset_releases,$1::jsonb) s cross join gate where d.id=s.id and d.state=''loading'' and gate.safe=1 returning d.*) select 1/(case when (select to_jsonb(d) from updated d)=$1::jsonb then 1 else 0 end) as identical') @($r)
 }
 Write-Output "Ready with existing integrity triggers: $($entry.record.dataset_id)."
}
}
Write-Output 'Source-only reuse complete. No users, analyses, snapshots, payments or reports copied; execution remains disabled.'
