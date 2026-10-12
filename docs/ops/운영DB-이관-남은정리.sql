-- 적재 부작용 제거. 최근 2시간 안에 웰컴 클로버 트리거가 만든 행만 지운다.
-- 1) 확인 (15 / 15 / 2 가 나와야 한다)
select
  (select count(*) from public.cheer where is_welcome and created_at > now() - interval '2 hours') as cheer_welcome,
  (select count(*) from public.clover_ledger where created_at > now() - interval '2 hours') as ledger,
  (select count(*) from public.clover_balance where updated_at > now() - interval '2 hours') as balance;

-- 2) 위 숫자가 맞으면 아래를 실행
begin;
set local session_replication_role = replica;
delete from public.clover_ledger where created_at > now() - interval '2 hours';
delete from public.clover_balance where updated_at > now() - interval '2 hours';
delete from public.cheer where is_welcome and created_at > now() - interval '2 hours';
commit;

-- 3) 결과 (셋 다 0)
select
  (select count(*) from public.cheer) as cheer,
  (select count(*) from public.clover_ledger) as ledger,
  (select count(*) from public.clover_balance) as balance;
