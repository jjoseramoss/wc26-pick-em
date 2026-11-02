-- Hosted setup after the sync-liga-mx function is deployed and verified.
-- Uses the same Vault project URL and secret key as the football-data.org jobs.
-- Runs at 59 minutes past every second UTC hour, once per two hours.

select cron.schedule('sync-liga-mx-apertura-2026', '59 */2 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'football_sync_project_url') || '/functions/v1/sync-liga-mx',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets
                 where name = 'football_sync_secret_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$$);
