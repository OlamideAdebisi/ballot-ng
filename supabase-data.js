/* Loads live election data and submits ballots through Supabase. */
(function () {
  const client = window.ballotSupabase;
  if (!client) return;

  async function loadElections() {
    const { data: { user } } = await client.auth.getUser();
    state.current = user ? {
      name: user.user_metadata?.full_name || user.email,
      email: user.email
    } : null;
    const { data, error } = await client
      .from('elections')
      .select('id,title,description,election_type,location,status,starts_at,ends_at,candidates(id,name,party,manifesto,votes(voter_id))')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Could not load elections from Supabase:', error.message);
      return;
    }
    state.elections = (data || []).map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description || '',
      type: e.election_type,
      location: e.location || '',
      status: e.status,
      date: e.ends_at ? new Date(e.ends_at).toLocaleDateString('en-NG') : 'Date TBC',
      candidates: (e.candidates || []).map((c) => ({
        id: c.id,
        name: c.name,
        party: c.party || '',
        votes: (c.votes || []).length
      }))
    }));
    if (location.hash === '#home' || location.hash === '#elections' || location.hash === '') home();
    if (location.hash.startsWith('#vote/')) vote(location.hash.split('/')[1]);
  }

  async function submitVote(event) {
    const button = event.target.closest('#cast');
    if (!button) return;
    const election = state.elections.find((e) => e.id === location.hash.split('/')[1]);
    const selected = document.querySelector('.candidate-row.selected');
    if (!election || !selected) return;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const candidate = election.candidates[Number(selected.dataset.candidate)];
    const { error } = await client.from('votes').insert({
      election_id: election.id,
      candidate_id: candidate.id,
      voter_id: user.id
    });
    if (error) {
      window.toast(error.code === '23505' ? 'You have already voted in this election.' : error.message);
      return;
    }
    window.toast('Your vote has been recorded.');
    await loadElections();
  }

  document.addEventListener('click', submitVote, true);
  window.addEventListener('hashchange', loadElections);
  loadElections();
})();
