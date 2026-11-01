create table if not exists public.farmer_profiles (
  id text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  village text not null,
  district text not null,
  farm_size_ha numeric not null check (farm_size_ha > 0),
  primary_crop text not null,
  active_season text,
  credit_risk text not null check (credit_risk in ('low', 'medium', 'high')),
  joined_date text not null,
  notes text,
  source_channel text not null default 'cloud-api',
  created_at text not null,
  updated_at text not null,
  primary key (id, owner_id)
);

create table if not exists public.farm_plots (
  id text not null,
  owner_id uuid not null,
  farmer_id text not null,
  name text not null,
  crop text not null,
  area_ha numeric not null check (area_ha > 0),
  soil_type text not null,
  season text not null,
  planted_date text not null,
  expected_yield_t numeric not null check (expected_yield_t >= 0),
  health text not null check (health in ('good', 'fair', 'poor')),
  primary key (id, owner_id),
  foreign key (farmer_id, owner_id)
    references public.farmer_profiles (id, owner_id) on delete cascade
);

create table if not exists public.farmer_visits (
  id text not null,
  owner_id uuid not null,
  farmer_id text not null,
  visit_date text not null,
  season text,
  purpose text not null,
  crop_stage text not null,
  health text not null check (health in ('good', 'fair', 'poor')),
  pests jsonb not null default '[]'::jsonb check (jsonb_typeof(pests) = 'array'),
  inputs_used jsonb not null default '[]'::jsonb check (jsonb_typeof(inputs_used) = 'array'),
  notes text not null default '',
  follow_up_date text,
  offline boolean not null default false,
  created_at text not null,
  primary key (id, owner_id),
  foreign key (farmer_id, owner_id)
    references public.farmer_profiles (id, owner_id) on delete cascade
);

create table if not exists public.cash_advances (
  id text not null,
  owner_id uuid not null,
  farmer_id text not null,
  season text,
  kind text not null check (kind in ('cash-advance', 'equipment', 'inputs-financing', 'grant')),
  label text not null,
  principal numeric not null check (principal > 0),
  disbursed_date text not null,
  due_date text not null default '',
  due_after_harvest boolean not null default false,
  status text not null check (status in ('active', 'repaid', 'overdue', 'defaulted')),
  created_at text not null,
  primary key (id, owner_id),
  foreign key (farmer_id, owner_id)
    references public.farmer_profiles (id, owner_id) on delete cascade
);

create table if not exists public.cash_advance_repayments (
  id text not null,
  owner_id uuid not null,
  cash_advance_id text not null,
  repayment_date text not null,
  amount numeric not null check (amount > 0),
  method text not null check (method in ('cash', 'mobile-money', 'auto-deduct', 'bank-transfer')),
  primary key (id, owner_id),
  foreign key (cash_advance_id, owner_id)
    references public.cash_advances (id, owner_id) on delete cascade
);

create table if not exists public.farmer_notes (
  id text not null,
  owner_id uuid not null,
  cash_advance_id text not null,
  note_date text not null,
  text text not null,
  primary key (id, owner_id),
  foreign key (cash_advance_id, owner_id)
    references public.cash_advances (id, owner_id) on delete cascade
);

create table if not exists public.cash_advance_emails (
  id text not null,
  owner_id uuid not null,
  cash_advance_id text not null,
  sent_date text not null,
  recipient text not null,
  subject text not null,
  body text not null,
  primary key (id, owner_id),
  foreign key (cash_advance_id, owner_id)
    references public.cash_advances (id, owner_id) on delete cascade
);

create table if not exists public.farm_expenses (
  id text not null,
  owner_id uuid not null,
  farmer_id text not null,
  expense_date text not null,
  season text not null,
  category text not null,
  amount numeric not null check (amount > 0),
  description text,
  created_at text not null,
  primary key (id, owner_id),
  foreign key (farmer_id, owner_id)
    references public.farmer_profiles (id, owner_id) on delete cascade
);

create table if not exists public.farm_harvests (
  id text not null,
  owner_id uuid not null,
  farmer_id text not null,
  harvest_date text not null,
  season text not null,
  quantity_kg numeric not null check (quantity_kg > 0),
  price_per_kg numeric not null check (price_per_kg >= 0),
  created_at text not null,
  primary key (id, owner_id),
  foreign key (farmer_id, owner_id)
    references public.farmer_profiles (id, owner_id) on delete cascade
);

create table if not exists public.season_budgets (
  id text not null,
  owner_id uuid not null,
  farmer_id text not null,
  season text not null,
  amount numeric not null check (amount > 0),
  updated_at text not null,
  primary key (id, owner_id),
  foreign key (farmer_id, owner_id)
    references public.farmer_profiles (id, owner_id) on delete cascade
);

create index if not exists farmer_profiles_owner_idx on public.farmer_profiles (owner_id);
create index if not exists farm_plots_farmer_idx on public.farm_plots (owner_id, farmer_id);
create index if not exists farmer_visits_farmer_date_idx on public.farmer_visits (owner_id, farmer_id, visit_date);
create index if not exists cash_advances_farmer_idx on public.cash_advances (owner_id, farmer_id);
create index if not exists cash_advance_repayments_advance_idx on public.cash_advance_repayments (owner_id, cash_advance_id);
create index if not exists farmer_notes_advance_idx on public.farmer_notes (owner_id, cash_advance_id);
create index if not exists cash_advance_emails_advance_idx on public.cash_advance_emails (owner_id, cash_advance_id);
create index if not exists farm_expenses_farmer_season_idx on public.farm_expenses (owner_id, farmer_id, season);
create index if not exists farm_harvests_farmer_season_idx on public.farm_harvests (owner_id, farmer_id, season);
create index if not exists season_budgets_farmer_idx on public.season_budgets (owner_id, farmer_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'farmer_profiles',
    'farm_plots',
    'farmer_visits',
    'cash_advances',
    'cash_advance_repayments',
    'farmer_notes',
    'cash_advance_emails',
    'farm_expenses',
    'farm_harvests',
    'season_budgets'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Account owner access" on public.%I', table_name);
    execute format(
      'create policy "Account owner access" on public.%I for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)',
      table_name
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end
$$;

create schema if not exists private;

create or replace function private.sync_farmer_account_records(p_user_id uuid, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_user_id is null or jsonb_typeof(p_data) is distinct from 'object' then
    raise exception 'A valid account and record document are required.';
  end if;

  insert into public.farmer_data (user_id, data)
  values (p_user_id, p_data)
  on conflict (user_id) do nothing;

  insert into public.farmer_profiles (
    id, owner_id, name, phone, email, village, district, farm_size_ha,
    primary_crop, active_season, credit_risk, joined_date, notes,
    source_channel, created_at, updated_at
  )
  select x.id, p_user_id, x.name, x.phone, x.email, x.village, x.district,
    x."farmSizeHa", x."primaryCrop", x."activeSeason",
    coalesce(x."creditRisk", 'medium'),
    coalesce(x."joinedDate", x."createdAt", now()::text), x.notes,
    coalesce(x."sourceChannel", 'cloud-api'),
    coalesce(x."createdAt", x."joinedDate", now()::text),
    coalesce(x."updatedAt", x."createdAt", x."joinedDate", now()::text)
  from jsonb_to_recordset(coalesce(p_data->'farmers', '[]'::jsonb)) as x(
    id text, name text, phone text, email text, village text, district text,
    "farmSizeHa" numeric, "primaryCrop" text, "activeSeason" text,
    "creditRisk" text, "joinedDate" text, notes text, "sourceChannel" text,
    "createdAt" text, "updatedAt" text
  )
  on conflict (id, owner_id) do update set
    name = excluded.name, phone = excluded.phone, email = excluded.email,
    village = excluded.village, district = excluded.district,
    farm_size_ha = excluded.farm_size_ha, primary_crop = excluded.primary_crop,
    active_season = excluded.active_season, credit_risk = excluded.credit_risk,
    joined_date = excluded.joined_date, notes = excluded.notes,
    source_channel = excluded.source_channel, created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  insert into public.farm_plots (
    id, owner_id, farmer_id, name, crop, area_ha, soil_type, season,
    planted_date, expected_yield_t, health
  )
  select x.id, p_user_id, x."farmerId", x.name, x.crop, x."areaHa",
    x."soilType", coalesce(x.season, ''), x."plantedDate", x."expectedYieldT", x.health
  from jsonb_to_recordset(coalesce(p_data->'plots', '[]'::jsonb)) as x(
    id text, "farmerId" text, name text, crop text, "areaHa" numeric,
    "soilType" text, season text, "plantedDate" text,
    "expectedYieldT" numeric, health text
  )
  on conflict (id, owner_id) do update set
    farmer_id = excluded.farmer_id, name = excluded.name, crop = excluded.crop,
    area_ha = excluded.area_ha, soil_type = excluded.soil_type,
    season = excluded.season, planted_date = excluded.planted_date,
    expected_yield_t = excluded.expected_yield_t, health = excluded.health;

  insert into public.farmer_visits (
    id, owner_id, farmer_id, visit_date, season, purpose, crop_stage,
    health, pests, inputs_used, notes, follow_up_date, offline, created_at
  )
  select x.id, p_user_id, x."farmerId", x.date, x.season, x.purpose,
    x."cropStage", x.health, coalesce(x.pests, '[]'::jsonb),
    coalesce(x."inputsUsed", '[]'::jsonb), coalesce(x.notes, ''),
    x."followUpDate", coalesce(x.offline, false), x."createdAt"
  from jsonb_to_recordset(coalesce(p_data->'visits', '[]'::jsonb)) as x(
    id text, "farmerId" text, date text, season text, purpose text,
    "cropStage" text, health text, pests jsonb, "inputsUsed" jsonb,
    notes text, "followUpDate" text, offline boolean, "createdAt" text
  )
  on conflict (id, owner_id) do update set
    farmer_id = excluded.farmer_id, visit_date = excluded.visit_date,
    season = excluded.season, purpose = excluded.purpose,
    crop_stage = excluded.crop_stage, health = excluded.health,
    pests = excluded.pests, inputs_used = excluded.inputs_used,
    notes = excluded.notes, follow_up_date = excluded.follow_up_date,
    offline = excluded.offline, created_at = excluded.created_at;

  insert into public.cash_advances (
    id, owner_id, farmer_id, season, kind, label, principal,
    disbursed_date, due_date, due_after_harvest, status, created_at
  )
  select x.id, p_user_id, x."farmerId", x.season,
    case when x.kind = 'microloan' then 'cash-advance' else x.kind end, x.label,
    x.principal, x."disbursedDate", coalesce(x."dueDate", ''),
    coalesce(x."dueAfterHarvest", false), coalesce(x.status, 'active'),
    coalesce(x."createdAt", x."disbursedDate", now()::text)
  from jsonb_to_recordset(coalesce(p_data->'cashAdvances', '[]'::jsonb)) as x(
    id text, "farmerId" text, season text, kind text, label text,
    principal numeric, "disbursedDate" text, "dueDate" text,
    "dueAfterHarvest" boolean, status text, "createdAt" text
  )
  on conflict (id, owner_id) do update set
    farmer_id = excluded.farmer_id, season = excluded.season,
    kind = excluded.kind, label = excluded.label, principal = excluded.principal,
    disbursed_date = excluded.disbursed_date, due_date = excluded.due_date,
    due_after_harvest = excluded.due_after_harvest,
    status = excluded.status, created_at = excluded.created_at;

  insert into public.cash_advance_repayments (
    id, owner_id, cash_advance_id, repayment_date, amount, method
  )
  select r.id, p_user_id, coalesce(r."cashAdvanceId", r."investmentId", a.value->>'id'),
    r.date, r.amount, r.method
  from jsonb_array_elements(coalesce(p_data->'cashAdvances', '[]'::jsonb)) a(value)
  cross join lateral jsonb_to_recordset(coalesce(a.value->'repayments', '[]'::jsonb)) as r(
    id text, "cashAdvanceId" text, "investmentId" text,
    date text, amount numeric, method text
  )
  on conflict (id, owner_id) do update set
    cash_advance_id = excluded.cash_advance_id,
    repayment_date = excluded.repayment_date,
    amount = excluded.amount, method = excluded.method;

  insert into public.farmer_notes (id, owner_id, cash_advance_id, note_date, text)
  select n.id, p_user_id, a.value->>'id', n.date, n.text
  from jsonb_array_elements(coalesce(p_data->'cashAdvances', '[]'::jsonb)) a(value)
  cross join lateral jsonb_to_recordset(coalesce(a.value->'farmerMessages', '[]'::jsonb)) as n(
    id text, date text, text text
  )
  on conflict (id, owner_id) do update set
    cash_advance_id = excluded.cash_advance_id,
    note_date = excluded.note_date, text = excluded.text;

  insert into public.cash_advance_emails (
    id, owner_id, cash_advance_id, sent_date, recipient, subject, body
  )
  select e.id, p_user_id, a.value->>'id', e.date, e."to", e.subject, e.body
  from jsonb_array_elements(coalesce(p_data->'cashAdvances', '[]'::jsonb)) a(value)
  cross join lateral jsonb_to_recordset(coalesce(a.value->'emails', '[]'::jsonb)) as e(
    id text, date text, "to" text, subject text, body text
  )
  on conflict (id, owner_id) do update set
    cash_advance_id = excluded.cash_advance_id,
    sent_date = excluded.sent_date, recipient = excluded.recipient,
    subject = excluded.subject, body = excluded.body;

  insert into public.farm_expenses (
    id, owner_id, farmer_id, expense_date, season, category, amount,
    description, created_at
  )
  select x.id, p_user_id, x."farmerId", x.date,
    coalesce(nullif(btrim(x.season), ''), 'Main season ' || extract(year from x.date::timestamptz)::integer::text),
    x.category, x.amount, x.description, coalesce(x."createdAt", x.date, now()::text)
  from jsonb_to_recordset(coalesce(p_data->'expenses', '[]'::jsonb)) as x(
    id text, "farmerId" text, date text, season text, category text,
    amount numeric, description text, "createdAt" text
  )
  on conflict (id, owner_id) do update set
    farmer_id = excluded.farmer_id, expense_date = excluded.expense_date,
    season = excluded.season, category = excluded.category,
    amount = excluded.amount, description = excluded.description,
    created_at = excluded.created_at;

  insert into public.farm_harvests (
    id, owner_id, farmer_id, harvest_date, season, quantity_kg,
    price_per_kg, created_at
  )
  select x.id, p_user_id, x."farmerId", x.date,
    coalesce(nullif(btrim(x.season), ''), 'Main season ' || extract(year from x.date::timestamptz)::integer::text),
    x."quantityKg", x."pricePerKg", coalesce(x."createdAt", x.date, now()::text)
  from jsonb_to_recordset(coalesce(p_data->'harvests', '[]'::jsonb)) as x(
    id text, "farmerId" text, date text, season text,
    "quantityKg" numeric, "pricePerKg" numeric, "createdAt" text
  )
  on conflict (id, owner_id) do update set
    farmer_id = excluded.farmer_id, harvest_date = excluded.harvest_date,
    season = excluded.season, quantity_kg = excluded.quantity_kg,
    price_per_kg = excluded.price_per_kg, created_at = excluded.created_at;

  insert into public.season_budgets (
    id, owner_id, farmer_id, season, amount, updated_at
  )
  select x.id, p_user_id, x."farmerId",
    coalesce(nullif(btrim(x.season), ''), 'Main season ' || extract(year from coalesce(x."updatedAt", now()::text)::timestamptz)::integer::text),
    x.amount, coalesce(x."updatedAt", now()::text)
  from jsonb_to_recordset(coalesce(p_data->'budgets', '[]'::jsonb)) as x(
    id text, "farmerId" text, season text, amount numeric, "updatedAt" text
  )
  on conflict (id, owner_id) do update set
    farmer_id = excluded.farmer_id, season = excluded.season,
    amount = excluded.amount, updated_at = excluded.updated_at;

  if p_data ? 'plots' then
    delete from public.farm_plots t where t.owner_id = p_user_id
      and not exists (select 1 from jsonb_to_recordset(p_data->'plots') as x(id text) where x.id = t.id);
  end if;
  if p_data ? 'visits' then
    delete from public.farmer_visits t where t.owner_id = p_user_id
      and not exists (select 1 from jsonb_to_recordset(p_data->'visits') as x(id text) where x.id = t.id);
  end if;
  if p_data ? 'expenses' then
    delete from public.farm_expenses t where t.owner_id = p_user_id
      and not exists (select 1 from jsonb_to_recordset(p_data->'expenses') as x(id text) where x.id = t.id);
  end if;
  if p_data ? 'harvests' then
    delete from public.farm_harvests t where t.owner_id = p_user_id
      and not exists (select 1 from jsonb_to_recordset(p_data->'harvests') as x(id text) where x.id = t.id);
  end if;
  if p_data ? 'budgets' then
    delete from public.season_budgets t where t.owner_id = p_user_id
      and not exists (select 1 from jsonb_to_recordset(p_data->'budgets') as x(id text) where x.id = t.id);
  end if;
  if p_data ? 'cashAdvances' then
    delete from public.cash_advance_repayments t where t.owner_id = p_user_id
      and not exists (
        select 1
        from jsonb_array_elements(p_data->'cashAdvances') a(value)
        cross join lateral jsonb_to_recordset(coalesce(a.value->'repayments', '[]'::jsonb)) as r(id text)
        where r.id = t.id
      );
    delete from public.farmer_notes t where t.owner_id = p_user_id
      and not exists (
        select 1
        from jsonb_array_elements(p_data->'cashAdvances') a(value)
        cross join lateral jsonb_to_recordset(coalesce(a.value->'farmerMessages', '[]'::jsonb)) as n(id text)
        where n.id = t.id
      );
    delete from public.cash_advance_emails t where t.owner_id = p_user_id
      and not exists (
        select 1
        from jsonb_array_elements(p_data->'cashAdvances') a(value)
        cross join lateral jsonb_to_recordset(coalesce(a.value->'emails', '[]'::jsonb)) as e(id text)
        where e.id = t.id
      );
    delete from public.cash_advances t where t.owner_id = p_user_id
      and not exists (select 1 from jsonb_to_recordset(p_data->'cashAdvances') as x(id text) where x.id = t.id);
  end if;
  if p_data ? 'farmers' then
    delete from public.farmer_profiles t where t.owner_id = p_user_id
      and not exists (select 1 from jsonb_to_recordset(p_data->'farmers') as x(id text) where x.id = t.id);
  end if;
end;
$$;

create or replace function public.save_farmer_account_data(p_data jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  collection_name text;
begin
  if current_user_id is null then
    raise exception 'Sign in before saving farmer records.';
  end if;
  if jsonb_typeof(p_data) is distinct from 'object' then
    raise exception 'The farmer account data must be a JSON object.';
  end if;
  foreach collection_name in array array[
    'farmers', 'plots', 'visits', 'cashAdvances', 'expenses', 'harvests', 'budgets'
  ]
  loop
    if jsonb_typeof(p_data->collection_name) is distinct from 'array' then
      raise exception 'The farmer account data is missing the % record collection.', collection_name;
    end if;
  end loop;
  perform private.sync_farmer_account_records(current_user_id, p_data);
end;
$$;

create or replace function public.load_farmer_account_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in before loading farmer records.';
  end if;
  if not exists (select 1 from public.farmer_data where user_id = current_user_id) then
    return null;
  end if;

  return jsonb_build_object(
    'farmers', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', f.id, 'name', f.name, 'phone', f.phone, 'email', f.email,
        'village', f.village, 'district', f.district, 'farmSizeHa', f.farm_size_ha,
        'primaryCrop', f.primary_crop, 'activeSeason', f.active_season,
        'creditRisk', f.credit_risk, 'joinedDate', f.joined_date, 'notes', f.notes,
        'sourceChannel', f.source_channel, 'createdAt', f.created_at, 'updatedAt', f.updated_at
      )))
      from public.farmer_profiles f where f.owner_id = current_user_id
    ), '[]'::jsonb),
    'plots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'farmerId', p.farmer_id, 'name', p.name, 'crop', p.crop,
        'areaHa', p.area_ha, 'soilType', p.soil_type, 'season', p.season,
        'plantedDate', p.planted_date, 'expectedYieldT', p.expected_yield_t, 'health', p.health
      ))
      from public.farm_plots p where p.owner_id = current_user_id
    ), '[]'::jsonb),
    'visits', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', v.id, 'farmerId', v.farmer_id, 'date', v.visit_date, 'season', v.season,
        'purpose', v.purpose, 'cropStage', v.crop_stage, 'health', v.health,
        'pests', v.pests, 'inputsUsed', v.inputs_used, 'notes', v.notes,
        'followUpDate', v.follow_up_date, 'offline', v.offline, 'createdAt', v.created_at
      )))
      from public.farmer_visits v where v.owner_id = current_user_id
    ), '[]'::jsonb),
    'cashAdvances', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'farmerId', a.farmer_id, 'season', a.season, 'kind', a.kind,
        'label', a.label, 'principal', a.principal, 'disbursedDate', a.disbursed_date,
        'dueDate', a.due_date, 'dueAfterHarvest', a.due_after_harvest,
        'status', a.status, 'createdAt', a.created_at,
        'repayments', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', r.id, 'cashAdvanceId', r.cash_advance_id, 'date', r.repayment_date,
            'amount', r.amount, 'method', r.method
          ))
          from public.cash_advance_repayments r
          where r.owner_id = current_user_id and r.cash_advance_id = a.id
        ), '[]'::jsonb),
        'farmerMessages', coalesce((
          select jsonb_agg(jsonb_build_object('id', n.id, 'date', n.note_date, 'text', n.text))
          from public.farmer_notes n
          where n.owner_id = current_user_id and n.cash_advance_id = a.id
        ), '[]'::jsonb),
        'emails', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', e.id, 'date', e.sent_date, 'to', e.recipient, 'subject', e.subject, 'body', e.body
          ))
          from public.cash_advance_emails e
          where e.owner_id = current_user_id and e.cash_advance_id = a.id
        ), '[]'::jsonb)
      ))
      from public.cash_advances a where a.owner_id = current_user_id
    ), '[]'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', e.id, 'farmerId', e.farmer_id, 'date', e.expense_date,
        'season', e.season, 'category', e.category, 'amount', e.amount,
        'description', e.description, 'createdAt', e.created_at
      )))
      from public.farm_expenses e where e.owner_id = current_user_id
    ), '[]'::jsonb),
    'harvests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id, 'farmerId', h.farmer_id, 'date', h.harvest_date,
        'season', h.season, 'quantityKg', h.quantity_kg,
        'pricePerKg', h.price_per_kg, 'createdAt', h.created_at
      ))
      from public.farm_harvests h where h.owner_id = current_user_id
    ), '[]'::jsonb),
    'budgets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'farmerId', b.farmer_id, 'season', b.season,
        'amount', b.amount, 'updatedAt', b.updated_at
      ))
      from public.season_budgets b where b.owner_id = current_user_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.sync_farmer_account_records(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.save_farmer_account_data(jsonb) from public, anon;
revoke all on function public.load_farmer_account_data() from public, anon;
grant execute on function public.save_farmer_account_data(jsonb) to authenticated;
grant execute on function public.load_farmer_account_data() to authenticated;

do $$
declare
  account_row record;
begin
  for account_row in select user_id, data from public.farmer_data
  loop
    if jsonb_typeof(account_row.data) is distinct from 'object' then
      raise exception 'Cannot migrate farmer_data for account %: data must be a JSON object.', account_row.user_id;
    end if;
    perform private.sync_farmer_account_records(account_row.user_id, account_row.data);
  end loop;
end
$$;
