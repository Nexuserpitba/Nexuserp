
SELECT cron.schedule(
  'atualizar-ncm-web-semanal',
  '0 3 * * 1',
  $$
  SELECT extensions.http_post(
    url := 'https://hgkpnfynwpitqkdbmxvo.supabase.co/functions/v1/fetch-ncm-web',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhna3BuZnlud3BpdHFrZGJteHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjAxNjMsImV4cCI6MjA4ODk5NjE2M30.CAaUnA4XuueeeTk5GxNs9CSAr3-EGfuNcGe6HsWu9w0"}'::jsonb,
    body := '{"bulk": true, "salvar": true}'::jsonb
  ) AS request_id;
  $$
);
