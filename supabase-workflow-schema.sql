-- Simple Ballot.ng workflow migration.
-- Run after supabase-voting-schema.sql.

drop policy if exists "Admins can create elections" on public.elections;
drop policy if exists "Admins can update elections" on public.elections;
drop policy if exists "Admins can create candidates" on public.candidates;
drop policy if exists "Admins can update candidates" on public.candidates;

create policy "Authenticated users can create elections"
  on public.elections for insert to authenticated
  with check (created_by = auth.uid());

create policy "Owners can update their elections"
  on public.elections for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Owners can create candidates"
  on public.candidates for insert to authenticated
  with check (
    exists (
      select 1 from public.elections
      where elections.id = election_id
      and elections.created_by = auth.uid()
    )
  );

create policy "Owners can update candidates"
  on public.candidates for update to authenticated
  using (
    exists (
      select 1 from public.elections
      where elections.id = election_id
      and elections.created_by = auth.uid()
    )
  );
