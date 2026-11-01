-- The normal pipeline writes a zero-usage deterministic unavailable section
-- when a group lacks evidence. Match real dispatches without inventing AI calls.
begin;
do $$declare s text;head text;tail text;cut integer;anchor text;begin
 s:=pg_get_functiondef('source_data.ready_paid_full_case(uuid,uuid)'::regprocedure);
 cut:=position('or exists(select 1 from public.owner_full_credit_uses v' in s);
 if cut=0 then raise exception 'credit_ready_branch_missing';end if;
 head:=left(s,cut-1);tail:=substr(s,cut);
 anchor:='and (select count(*) from public.proof_dispatches where case_id=c.id and stage=''full'' and kind=''ai'')=3';
 if position(anchor in tail)=0 then raise exception 'credit_dispatch_count_anchor_missing';end if;
 tail:=replace(tail,anchor,$replacement$
 and (select count(*) from public.proof_dispatches where case_id=c.id and stage='full' and kind='ai')=
 (select count(*) from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d#>>'{receipt,model}' is distinct from 'none')
 and (select count(*) from public.proof_dispatches where case_id=c.id and stage='full' and kind='ai') between 1 and 3
 and not exists(select 1 from jsonb_array_elements(r.provenance#>'{checkpoint,dispatches}') d where d#>>'{receipt,model}'='none' and (
 d->>'group' not in('context','premises') or d#>>'{receipt,promptVersion}' is distinct from 'deterministic-unavailable-v1'
 or d#>>'{receipt,inputTokens}' is distinct from '0' or d#>>'{receipt,outputTokens}' is distinct from '0'
 or d#>>'{receipt,estimatedMicros}' is distinct from '0'))
 $replacement$);
 execute head||tail;
end$$;
commit;
