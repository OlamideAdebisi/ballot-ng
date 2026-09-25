-- Ballot.ng voting tables migration
-- Run this after supabase-schema.sql has completed successfully.

-- Elections created by administrators.
create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  election_type text not null,
  location text,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Candidates belong to one election.
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  name text not null,
  party text,
  manifesto text,
  created_at timestamptz not null default now()
);

-- A ballot records the voter and selected candidate.
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint one_vote_per_election unique (election_id, voter_id)
);

alter table public.elections enable row level security;
alter table public.candidates enable row level security;
alter table public.votes enable row level security;

-- Anyone signed in can view elections, candidates, and public vote totals.
create policy "Authenticated users can view elections"
  on public.elections for select to authenticated using (true);

create policy "Authenticated users can view candidates"
  on public.candidates for select to authenticated using (true);

create policy "Authenticated users can view votes"
  on public.votes for select to authenticated using (true);

-- Admins can manage elections and candidates.
create policy "Admins can create elections"
  on public.elections for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update elections"
  on public.elections for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can create candidates"
  on public.candidates for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update candidates"
  on public.candidates for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Voters can submit a ballot only for a live election, and only for a candidate
-- belonging to that election. The unique constraint prevents a second vote.
create policy "Voters can submit one vote"
  on public.votes for insert to authenticated
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.elections e
      where e.id = election_id and e.status = 'live'
    )
    and exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.election_id = election_id
    )
  );

-- Votes cannot be edited or deleted through the client.
create policy "Votes cannot be updated"
  on public.votes for update to authenticated using (false);

create policy "Votes cannot be deleted"
  on public.votes for delete to authenticated using (false);

