-- Preserve community provenance separately from official, commercial and modelled data.
begin;
alter type public.evidence_classification add value if not exists 'community_open_data';
commit;
