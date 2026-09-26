(() => {
  const client = window.ballotSupabase;

  document.addEventListener('submit', async (event) => {
    if (event.target.id !== 'new-election' || !client) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = event.target;
    const values = new FormData(form);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return window.toast('Please sign in before creating an election.');
    const candidates = String(values.get('candidates')).split(',').map((value) => ({
      name: value.split('—')[0].trim(),
      party: (value.split('—')[1] || '').trim()
    })).filter((candidate) => candidate.name);
    if (!candidates.length) return window.toast('Add at least one candidate.');
    const { data: election, error } = await client.from('elections').insert({
      title: values.get('title'),
      election_type: values.get('type'),
      location: values.get('location'),
      ends_at: values.get('date') ? new Date(values.get('date')).toISOString() : null,
      created_by: user.id,
      description: 'A new election managed on Ballot.ng.'
    }).select().single();
    if (error) return window.toast(error.message);
    const { error: candidateError } = await client.from('candidates').insert(candidates.map((candidate) => ({ ...candidate, election_id: election.id })));
    if (candidateError) return window.toast(candidateError.message);
    await client.from('profiles').update({ role: 'admin' }).eq('id', user.id);
    window.toast('Election created.');
    window.ballotRoute();
  }, true);

  function enhance() {
    if (location.hash !== '#admin') return;
    const rows = document.querySelectorAll('.admin-grid > .panel .candidate-row');
    rows.forEach((row, index) => {
      if (row.querySelector('.admin-controls')) return;
      const election = window.ballotState?.elections?.[index];
      if (!election) return;
      const controls = document.createElement('span');
      controls.className = 'admin-controls';
      controls.innerHTML = `<button class="btn btn-quiet" data-status="${election.status === 'live' ? 'closed' : 'live'}">${election.status === 'live' ? 'Close' : 'Publish'}</button>`;
      row.appendChild(controls);
      controls.querySelector('button').addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!client) return window.toast('Supabase is not configured.');
        const { data: { user } } = await client.auth.getUser();
        if (!user) return window.toast('Please sign in first.');
        const { error } = await client.from('elections').update({ status: event.currentTarget.dataset.status }).eq('id', election.id).eq('created_by', user.id);
        if (error) return window.toast(error.message);
        window.toast(`Election ${event.currentTarget.dataset.status === 'live' ? 'published' : 'closed'}.`);
        window.ballotRoute();
      });
    });
  }

  window.addEventListener('hashchange', () => setTimeout(enhance, 50));
  setTimeout(enhance, 100);
})();
