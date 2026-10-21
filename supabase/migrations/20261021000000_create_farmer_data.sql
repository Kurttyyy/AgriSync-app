create table if not exists public.farmer_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{"farmers":[],"plots":[],"visits":[],"cashAdvances":[],"expenses":[]}'::jsonb
);

alter table public.farmer_data enable row level security;

drop policy if exists "Users can access their own farmer data" on public.farmer_data;
create policy "Users can access their own farmer data"
  on public.farmer_data
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.farmer_data to authenticated;
