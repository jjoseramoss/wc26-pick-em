-- Hosted setup only, after review and after deploying sync-football-data.
-- Prerequisites:
--   1. Enable Supabase Cron (pg_cron) and pg_net in the Dashboard.
--   2. Store the project URL in Vault as football_sync_project_url.
--   3. Store the project's Supabase secret API key in Vault as
--      football_sync_secret_key. Never put the key in this file.
--   4. Set FOOTBALL_DATA_API_KEY in Edge Function Secrets.
-- All schedules use UTC. One competition runs at a time, every two hours.

select cron.schedule('sync-premier-league-2026', '5 */2 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'football_sync_project_url') || '/functions/v1/sync-football-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets
                 where name = 'football_sync_secret_key')
    ),
    body := jsonb_build_object('code', 'PL'),
    timeout_milliseconds := 30000
  );
$$);

select cron.schedule('sync-la-liga-2026', '17 */2 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'football_sync_project_url') || '/functions/v1/sync-football-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets
                 where name = 'football_sync_secret_key')
    ),
    body := jsonb_build_object('code', 'PD'),
    timeout_milliseconds := 30000
  );
$$);

select cron.schedule('sync-bundesliga-2026', '29 */2 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'football_sync_project_url') || '/functions/v1/sync-football-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets
                 where name = 'football_sync_secret_key')
    ),
    body := jsonb_build_object('code', 'BL1'),
    timeout_milliseconds := 30000
  );
$$);

select cron.schedule('sync-serie-a-2026', '41 */2 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'football_sync_project_url') || '/functions/v1/sync-football-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets
                 where name = 'football_sync_secret_key')
    ),
    body := jsonb_build_object('code', 'SA'),
    timeout_milliseconds := 30000
  );
$$);

select cron.schedule('sync-ligue-1-2026', '53 */2 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'football_sync_project_url') || '/functions/v1/sync-football-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets
                 where name = 'football_sync_secret_key')
    ),
    body := jsonb_build_object('code', 'FL1'),
    timeout_milliseconds := 30000
  );
$$);
