/* Loads live election data and submits ballots through Supabase. */
(function () {
  const client = window.ballotSupabase;
  if (!client) return;
  const state = window.ballotState;

  async function refreshVoteAccess() {
    if (!location.hash.startsWith('#vote/')) return;
    const election = state.elections.find((item) => item.id === location.hash.split('/')[1]);
    const button = document.querySelector('#cast');
    if (election && election.status !== 'live' && button) {
      button.textContent = 'Voting not open';
      button.disabled = true;
      return;
    }
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;
    if (!election || election.status !== 'live') return;
    if (button) button.textContent = 'Cast my vote →';
    document.querySelectorAll('.candidate-row[data-candidate]').forEach((row) => {
      row.onclick = () => {
        document.querySelectorAll('.candidate-row[data-candidate]').forEach((item) => item.classList.remove('selected'));
        row.classList.add('selected');
      };
    });
  }

  client.auth.onAuthStateChange((_event, session) => {
    state.current = session?.user ? {
      name: session.user.user_metadata?.full_name || session.user.email,
      email: session.user.email
    } : null;
    window.ballotUpdateHeader?.();
    if (location.hash.startsWith('#vote/')) { window.ballotRoute?.(); setTimeout(refreshVoteAccess, 0); }
  });

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
    // Keep the prototype's starter content until the first real election exists.
    // This prevents the landing page from rendering against an empty collection.
    if (!data || data.length === 0) {
      if (location.hash.startsWith('#vote/')) { window.ballotRoute?.(); setTimeout(refreshVoteAccess, 0); }
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
    if (location.hash === '#home' || location.hash === '#elections' || location.hash === '') window.ballotRoute();
    if (location.hash.startsWith('#vote/')) { window.ballotRoute(); setTimeout(refreshVoteAccess, 0); }
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
