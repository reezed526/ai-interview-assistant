-- Reset all regular users to 10 free interviews and clear their usage.
-- Admin whitelist accounts are excluded and keep their current settings.

UPDATE users
SET
  interview_quota = 10,
  interview_used = 0
WHERE COALESCE(name, '') NOT IN ('lzj121218')
  AND COALESCE(username, '') NOT IN ('452740468@qq.com', 'lzj121218');
