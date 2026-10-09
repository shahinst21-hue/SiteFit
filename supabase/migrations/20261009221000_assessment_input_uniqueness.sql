-- An input is already immutable. Alternate equivalent JSON encodings must not
-- create another assessment under the same method/configuration.
create unique index assessment_frozen_input_method on public.analysis_assessments(analysis_id,input_id,method_version,config_digest);
