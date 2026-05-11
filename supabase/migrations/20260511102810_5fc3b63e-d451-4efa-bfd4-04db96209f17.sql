
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- get_chart_by_share_token must remain executable by anon so share links work without login
