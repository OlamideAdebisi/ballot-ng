/* Supabase Auth adapter for the existing prototype UI. */
(function () {
  const client = window.ballotSupabase;
  if (!client) return;
  const state = window.ballotState;
  window.ballotSupabase = client;

  async function handleAuth(event) {
    const form = event.target;
    if (!form || form.id !== 'auth-form') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const data = new FormData(form);
    const email = String(data.get('email')).trim().toLowerCase();
    const password = String(data.get('password'));
    const isRegister = location.hash === '#register';
    let result;

    if (isRegister) {
      result = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: String(data.get('name') || '').trim() },
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`
        }
      });
    } else {
      result = await client.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
      window.toast(result.error.message);
      return;
    }

    if (!result.data.session) {
      window.toast(isRegister ? 'Account created. Check your email to confirm your account.' : 'Please confirm your email before signing in.');
      return;
    }

    state.current = {
      name: result.data.user.user_metadata?.full_name || result.data.user.email,
      email: result.data.user.email
    };
    window.ballotSave();
    window.ballotUpdateHeader();
    window.toast(isRegister ? 'Account created and signed in.' : 'Signed in successfully.');
    location.hash = 'elections';
    window.ballotRoute();
  }

  document.addEventListener('submit', handleAuth, true);
})();
