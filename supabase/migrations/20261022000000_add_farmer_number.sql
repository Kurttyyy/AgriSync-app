create sequence if not exists public.farmer_number_seq;

alter table public.farmer_data
  add column if not exists farmer_number bigint;

update public.farmer_data
set farmer_number = nextval('public.farmer_number_seq')
where farmer_number is null;

alter table public.farmer_data
  alter column farmer_number set default nextval('public.farmer_number_seq'),
  alter column farmer_number set not null;

create unique index if not exists farmer_data_farmer_number_key
  on public.farmer_data (farmer_number);

grant select, insert, update, delete on public.farmer_data to authenticated;
grant usage, select on sequence public.farmer_number_seq to authenticated;
