// "Continue with Google" via Google Identity Services (GIS) ID-token flow.
// Loads the GIS script once, renders the official button into an element, and hands the
// returned ID token (JWT credential) to a callback. The backend POST /auth/google verifies
// it and signs-in / links-by-email / creates the account, so the same button works on both
// the Login and Signup pages. Callers hide their button container when `enabled` is false.

let gisPromise = null;
function loadGis() {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gisPromise;
}

export function useGoogleSignin() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const enabled = !!clientId;

  // Render (or re-render) the GIS button into `el`. `onCredential(idToken)` receives the
  // Google ID token. Pass `{ dark }` to match the app's light/dark theme — GIS can't restyle
  // an already-rendered button, so we clear `el` and redraw; call this again from a watch on
  // the app theme to switch (light → 'outline' white button, dark → 'filled_black').
  // No-ops (and never throws) when disabled, the element is missing, or GIS fails to load.
  async function renderButton(el, onCredential, { dark = false } = {}) {
    if (!enabled || !el) return;
    try {
      await loadGis();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
      });
      el.innerHTML = '';
      window.google.accounts.id.renderButton(el, {
        theme: dark ? 'filled_black' : 'outline',
        size: 'large', width: 320, text: 'continue_with',
      });
    } catch {
      /* GIS blocked/unavailable — email/password flows still work. */
    }
  }

  return { enabled, renderButton };
}
