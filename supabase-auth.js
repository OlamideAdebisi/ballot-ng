/* Supabase Auth adapter for the existing prototype UI. */
(function () {
  const config = window.SUPABASE_CONFIG || {};
  const hasConfig = config.url && !config.url.includes('PASTE_') && config.publishableKey && !config.publishableKey.includes('PASTE_');
  if (!hasConfig || !window.supabase) return;

  const client = window.supabase.createClient(config.url, config.publishableKey);
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
        options: { data: { full_name: String(data.get('name') || '').trim() } }
      });
    } else {
      result = await client.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
      window.toast(result.error.message);
      return;
    }

    if (isRegister && !result.data.session) {
      window.toast('Account created. Check your email to confirm your account.');
      return;
    }

    window.toast(isRegister ? 'Account created and signed in.' : 'Signed in successfully.');
    location.hash = 'elections';
  }

  document.addEventListener('submit', handleAuth, true);
})();
