-- Align approval schema with the immutable confirmation renderer; no approvals are granted.
alter table public.sale_policies add constraint sale_policy_text_complete check(not approved or (
 jsonb_typeof(snapshot->'sellerName')='string' and length(btrim(snapshot->>'sellerName'))>0 and
 jsonb_typeof(snapshot->'sellerAddress')='string' and length(btrim(snapshot->>'sellerAddress'))>0 and
 jsonb_typeof(snapshot->'privacyContact')='string' and length(btrim(snapshot->>'privacyContact'))>0 and
 jsonb_typeof(snapshot->'supportContact')='string' and length(btrim(snapshot->>'supportContact'))>0 and
 jsonb_typeof(snapshot->'taxTreatment')='string' and length(btrim(snapshot->>'taxTreatment'))>0 and
 jsonb_typeof(snapshot->'termsText')='string' and length(snapshot->>'termsText') between 21 and 20000 and
 jsonb_typeof(snapshot->'privacyText')='string' and length(snapshot->>'privacyText') between 21 and 20000 and
 jsonb_typeof(snapshot->'retentionText')='string' and length(snapshot->>'retentionText') between 21 and 20000
));
