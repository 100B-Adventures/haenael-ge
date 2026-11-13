-- 위생 마이그레이션 되돌리기(staging·운영 공통). 적용 전 상태: 트리거 함수 3개 anon·authenticated EXECUTE, 두 뷰 anon·authenticated 전체 권한, 함수 3개 search_path 미설정.
begin;
grant execute on function public.grant_welcome_clover() to public, anon, authenticated;
grant execute on function public.reverse_welcome_clover_on_goal_delete() to public, anon, authenticated;
grant execute on function public.sync_clover_balance() to public, anon, authenticated;
grant insert, update, delete, truncate, references, trigger, maintain on public.goal_public  to anon, authenticated;
grant insert, update, delete, truncate, references, trigger, maintain on public.cheer_public to anon, authenticated;
alter function public.welcome_clover_amount() reset search_path;
alter function public.min_cashout_clover() reset search_path;
alter function public.generate_goal_slug() reset search_path;
commit;
