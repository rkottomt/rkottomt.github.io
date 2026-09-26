(() => {
  const API_URL = 'https://portfolio-contact-form-l1iq.onrender.com/submit-question';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const form = document.getElementById('askForm');
  if (!form) return;
  const status = document.getElementById('askStatus');
  const button = document.getElementById('askSubmit');
  const count = document.getElementById('askCount');
  const question = form.elements.question;

  const setStatus = (text, kind) => {
    status.textContent = text;
    status.className = 'ask-status' + (kind ? ' is-' + kind : '');
  };

  question.addEventListener('input', () => {
    count.textContent = `${question.value.length}/2000`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      question: question.value.trim(),
    };

    if (!payload.name || !payload.email || !payload.question) {
      return setStatus('Please fill in your name, email, and question.', 'error');
    }
    if (!EMAIL_RE.test(payload.email)) {
      return setStatus('That email address doesn’t look right.', 'error');
    }
    if (payload.question.length < 5) {
      return setStatus('Your question needs at least 5 characters.', 'error');
    }

    button.disabled = true;
    button.textContent = 'Sending…';
    // Render's free tier sleeps when idle; the first request can take ~30s.
    const slowHint = setTimeout(() => setStatus('Waking up the server — this can take up to a minute…'), 4000);
    setStatus('');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Server error (${res.status}).`);
      form.reset();
      count.textContent = '0/2000';
      setStatus('Thanks! Your question was sent — I’ll get back to you by email.', 'success');
    } catch (err) {
      const msg = err instanceof TypeError
        ? 'Couldn’t reach the server. Check your connection and try again.'
        : err.message;
      setStatus(msg, 'error');
    } finally {
      clearTimeout(slowHint);
      button.disabled = false;
      button.textContent = 'Send question';
    }
  });
})();
