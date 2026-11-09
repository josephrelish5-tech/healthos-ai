-- Append-only telemedicine consent, remote observation and follow-up history.
create or replace function public.prevent_telemedicine_clinical_history_mutation()
returns trigger language plpgsql set search_path=''
as $function$ begin raise exception 'Telemedicine consent, observation and follow-up history is append-only.' using errcode='55000'; end;$function$;
do $block$ declare t text; begin
 foreach t in array array['healthos_telemedicine_consents','healthos_remote_observations','healthos_telemedicine_messages'] loop
  execute format('drop trigger if exists %I on public.%I',t||'_immutable',t);
  execute format('create trigger %I before update or delete on public.%I for each row execute function public.prevent_telemedicine_clinical_history_mutation()',t||'_immutable',t);
  execute format('drop trigger if exists %I on public.%I',t||'_no_truncate',t);
  execute format('create trigger %I before truncate on public.%I for each statement execute function public.prevent_telemedicine_clinical_history_mutation()',t||'_no_truncate',t);
 end loop;
end;$block$;
revoke all on function public.prevent_telemedicine_clinical_history_mutation() from public,anon,authenticated,service_role;
