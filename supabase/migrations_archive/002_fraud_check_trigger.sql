-- Calls the fraud-check Edge Function automatically whenever a new listing
-- is inserted. Requires the pg_net extension (enabled by default on Supabase).
--
-- Replace <PROJECT_REF> with your actual Supabase project reference, and set
-- the service role key as a Postgres setting via the Supabase dashboard
-- (Database > Extensions > pg_net) rather than hardcoding it here.

create extension if not exists pg_net;

create or replace function trigger_fraud_check()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/fraud-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('listing_id', new.id)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_listing_created on listings;

create trigger on_listing_created
  after insert on listings
  for each row
  execute function trigger_fraud_check();
