-- Offline PostgreSQL regression for canonical source-only JSON transfer.
begin;
set local timezone='UTC';
create temporary table reuse_source(id integer primary key,observed_at timestamptz,geometry gis.geometry,records bytea,metadata jsonb);
create temporary table reuse_target(like reuse_source including all);
insert into reuse_source values(1,'2021-03-21T00:00:00+00:00',gis.st_setsrid(gis.st_point(-0.3,51.4),4326),decode('0000ffab','hex'),'{"unit":"persons","universe":"usual_residents","missing":null}');
do $$
declare payload jsonb; verified integer;
begin
 select jsonb_agg(to_jsonb(s)||jsonb_build_object('geometry',s.geometry::text) order by id) into payload from reuse_source s;
 with inserted as (
  insert into reuse_target select * from jsonb_populate_recordset(null::reuse_target,payload) returning *
 ) select 1/(case when (select jsonb_agg(to_jsonb(t)||jsonb_build_object('geometry',t.geometry::text) order by id) from inserted t)=payload then 1 else 0 end) into verified;
 if verified<>1 or not exists(select 1 from reuse_target t join reuse_source s using(id) where gis.st_asewkb(t.geometry)=gis.st_asewkb(s.geometry) and t.records=s.records and t.metadata=s.metadata and t.observed_at=s.observed_at) then raise exception 'source_reuse_roundtrip_failed'; end if;
 -- Reproduce a noncanonical serializer date: equal instants are not equal
 -- original JSON strings. A failed comparison must roll back the whole insert.
 payload:=jsonb_set(jsonb_set(payload,'{0,id}','2'),'{0,observed_at}','"2021-03-21T00:00:00Z"');
 begin
  with inserted as (
   insert into reuse_target select * from jsonb_populate_recordset(null::reuse_target,payload) returning *
  ) select 1/(case when (select jsonb_agg(to_jsonb(t)||jsonb_build_object('geometry',t.geometry::text) order by id) from inserted t)=payload then 1 else 0 end) into verified;
  raise exception 'noncanonical_reuse_accepted';
 exception when division_by_zero then null;
 end;
 if exists(select 1 from reuse_target where id=2) then raise exception 'failed_reuse_not_atomic'; end if;
 begin
  insert into reuse_target select * from reuse_source;
  raise exception 'duplicate_reuse_accepted';
 exception when unique_violation then null;
 end;
 if (select count(*) from reuse_target)<>1 then raise exception 'duplicate_reuse_changed_rows'; end if;
end $$;
rollback;
