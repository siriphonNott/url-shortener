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

  // Render the GIS button into `el`. `onCredential(idToken)` receives the Google ID token.
  // No-ops (and never throws) when disabled, the element is missing, or GIS fails to load.
  async function renderButton(el, onCredential) {
    if (!enabled || !el) return;
    try {
      await loadGis();
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredential(response.credential),
      });
      window.google.accounts.id.renderButton(el, {
        theme: 'outline', size: 'large', width: 320, text: 'continue_with',
      });
    } catch {
      /* GIS blocked/unavailable — email/password flows still work. */
    }
  }

  return { enabled, renderButton };
}
