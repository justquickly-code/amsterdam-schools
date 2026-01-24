create policy "public read schools"
on public.schools
for select
to anon
using (true);
