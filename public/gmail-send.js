/**
 * Aviso de registro de tiempo al enviar un correo en Gmail.
 *
 * - Detecta el envío (botón Enviar o Ctrl/Cmd+Enter) SIN bloquearlo.
 * - Solo muestra el aviso cuando Gmail confirma que el mensaje se ha enviado.
 * - Respeta los ajustes: activado/desactivado y "silenciar durante 1 hora".
 * - El formulario es una página de la propia extensión (iframe) que reutiliza el login.
 */
(() => {
  if (window.top !== window) return;

  const KEYS = {
    enabled: 'quicklog_enabled',
    snooze: 'quicklog_snooze_until',
    profile: 'segurnube_profile',
  };

  // Mensajes de confirmación / error de Gmail en los idiomas más habituales
  const SENT_TOAST = /mensaje enviado|message sent|missatge enviat|message envoyé|nachricht gesendet|messaggio inviato|mensagem enviada/i;
  const SEND_ERROR = /no se (ha )?pudo|couldn.t|can.t send|specify at least one|al menos un destinatario|error/i;
  const SEND_LABEL = /^(enviar|send|enviat|envoyer|senden|invia)\b/i;
  const NOT_SEND = /programar|schedule|más opciones|more send|opciones de env/i;

  const EDITABLE = 'div[role="textbox"][contenteditable="true"], div[g_editable="true"]';
  const MAX_SUGGESTED_MIN = 60;

  const starts = new WeakMap(); // raíz de redacción -> momento en que se empezó a escribir
  let pending = null;
  let modal = null;

  const safe = (fn) => {
    try { return fn(); } catch (e) { /* extensión recargada: contexto invalidado */ }
  };

  // ---------- Utilidades de DOM de Gmail ----------

  function findComposeRoot(node) {
    let el = node instanceof Element ? node : node && node.parentElement;
    for (let i = 0; el && i < 14; i++, el = el.parentElement) {
      if (
        el.querySelector(EDITABLE) &&
        (el.querySelector('input[name="subjectbox"]') || el.querySelector('.T-I.J-J5-Ji.aoO'))
      ) {
        return el;
      }
    }
    return null;
  }

  function sendButtonFrom(target) {
    const btn = target instanceof Element ? target.closest('[role="button"]') : null;
    if (!btn) return null;
    if (btn.classList.contains('aoO')) return btn;
    const label = (btn.getAttribute('data-tooltip') || btn.getAttribute('aria-label') || '').trim();
    if (SEND_LABEL.test(label) && !NOT_SEND.test(label)) return btn;
    return null;
  }

  function readContext(root) {
    const subjectInput = root.querySelector('input[name="subjectbox"]');
    const subject =
      (subjectInput && subjectInput.value) ||
      (document.querySelector('h2.hP') || {}).textContent ||
      '';
    const emails = new Set();
    root.querySelectorAll('[email], [data-hovercard-id]').forEach((n) => {
      const v = n.getAttribute('email') || n.getAttribute('data-hovercard-id');
      if (v && v.includes('@')) emails.add(v.toLowerCase());
    });
    const startedAt = starts.get(root);
    const elapsedMin = startedAt ? (Date.now() - startedAt) / 60000 : 0;
    // Redondeo hacia arriba a tramos de 5 min (mínimo 5, máximo 60)
    const mins = Math.min(MAX_SUGGESTED_MIN, Math.max(5, Math.ceil(elapsedMin / 5) * 5));
    return {
      subject: subject.trim().slice(0, 200),
      to: [...emails].slice(0, 5).join(', '),
      mins,
    };
  }

  // ---------- Detección del envío ----------

  function onSendAttempt(root) {
    if (pending || modal || !root) return;
    pending = { root, ctx: readContext(root), at: Date.now() };
    const timer = setInterval(() => {
      const p = pending;
      if (!p) return clearInterval(timer);
      const alerts = [...document.querySelectorAll('[role="alert"], .b8.UC, .bAq')]
        .map((n) => n.textContent || '')
        .join(' ');
      const age = Date.now() - p.at;
      const sentToast = SENT_TOAST.test(alerts);
      const composeGone = age > 1500 && !document.contains(p.root) && !SEND_ERROR.test(alerts);
      if (sentToast || composeGone) {
        clearInterval(timer);
        pending = null;
        maybeShow(p.ctx);
      } else if (age > 20000) {
        clearInterval(timer); // el envío no se completó (error, cancelado con "Deshacer"…)
        pending = null;
      }
    }, 400);
  }

  document.addEventListener(
    'click',
    (e) => {
      const btn = sendButtonFrom(e.target);
      if (!btn) return;
      const root = findComposeRoot(btn);
      if (root) onSendAttempt(root);
    },
    true
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' || !(e.ctrlKey || e.metaKey)) return;
      const root = findComposeRoot(e.target);
      if (root) onSendAttempt(root);
    },
    true
  );

  // Momento en que el usuario empieza a redactar (para sugerir la duración)
  document.addEventListener(
    'focusin',
    (e) => {
      const root = findComposeRoot(e.target);
      if (root && !starts.has(root)) starts.set(root, Date.now());
    },
    true
  );

  // ---------- Aviso ----------

  function maybeShow(ctx) {
    safe(() => {
      chrome.storage.local.get([KEYS.enabled, KEYS.snooze, KEYS.profile], (s) => {
        if (chrome.runtime.lastError) return;
        const enabled = s[KEYS.enabled] !== false; // activado por defecto
        const snoozed = Number(s[KEYS.snooze] || 0) > Date.now();
        const loggedIn = Boolean(s[KEYS.profile] && s[KEYS.profile].holdedUserId);
        if (enabled && !snoozed && loggedIn) showModal(ctx);
      });
    });
  }

  function closeModal() {
    if (modal) modal.remove();
    modal = null;
  }

  function showModal(ctx) {
    if (modal) return;
    const box = document.createElement('div');
    box.id = 'segurnube-quicklog';
    Object.assign(box.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      width: '400px',
      maxWidth: 'calc(100vw - 32px)',
      height: '560px',
      maxHeight: 'calc(100vh - 32px)',
      zIndex: '2147483647',
      borderRadius: '16px',
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 12px 40px rgba(10,28,58,.28), 0 0 0 1px rgba(0,87,255,.12)',
      transform: 'translateY(16px)',
      opacity: '0',
      transition: 'transform .18s ease, opacity .18s ease',
    });
    const frame = document.createElement('iframe');
    const params = new URLSearchParams({ subject: ctx.subject, to: ctx.to, mins: String(ctx.mins) });
    frame.src = chrome.runtime.getURL('index.html') + '#quicklog?' + params.toString();
    Object.assign(frame.style, { width: '100%', height: '100%', border: '0', display: 'block' });
    box.appendChild(frame);
    document.body.appendChild(box);
    requestAnimationFrame(() => {
      box.style.transform = 'translateY(0)';
      box.style.opacity = '1';
    });
    modal = box;

    const onMessage = (event) => {
      if (event.source !== frame.contentWindow) return;
      if (event.origin !== new URL(chrome.runtime.getURL('/')).origin) return;
      if (event.data && event.data.action === 'quicklogClose') {
        window.removeEventListener('message', onMessage);
        closeModal();
      }
    };
    window.addEventListener('message', onMessage);
  }
})();
