(() => {
  const client = window.ballotSupabase;

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
