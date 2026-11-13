importScripts('config.js');

const GATEWAY = () => self.SEGURNUBE_CONFIG.GATEWAY_URL.replace(/\/+$/, '');

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
});

function getToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || 'Sin token de Google'));
      } else {
        resolve(typeof token === 'string' ? token : token.token);
      }
    });
  });
}

function dropToken(token) {
  return new Promise((resolve) => chrome.identity.removeCachedAuthToken({ token }, resolve));
}

// Llama al gateway con el token de Google; si caduca, lo renueva una vez.
async function gatewayRequest(path, options = {}, interactive = false) {
  let token = await getToken(interactive);
  const doFetch = (t) =>
    fetch(`${GATEWAY()}${path}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${t}`,
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body,
    });
  let response = await doFetch(token);
  if (response.status === 401) {
    await dropToken(token);
    token = await getToken(interactive);
    response = await doFetch(token);
  }
  const text = await response.text();
  return { ok: response.ok, status: response.status, statusText: response.statusText, text };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Solo aceptamos mensajes de esta propia extensión
  if (sender.id !== chrome.runtime.id) return;

  if (request.action === 'openFullApp') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    return;
  }

  if (request.action === 'signIn') {
    gatewayRequest('/api/me', {}, true)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, status: 0, text: '', error: e.message || String(e) }));
    return true;
  }

  if (request.action === 'signOut') {
    getToken(false)
      .then(async (token) => {
        await dropToken(token);
        // Revoca el permiso concedido para que la próxima vez se vuelva a elegir cuenta
        await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).catch(() => {});
      })
      .catch(() => {})
      .finally(() => sendResponse({ ok: true }));
    return true;
  }

  if (request.action === 'gatewayFetch') {
    // Solo rutas relativas del gateway
    if (typeof request.path !== 'string' || !request.path.startsWith('/api/')) {
      sendResponse({ ok: false, status: 400, text: '', error: 'Ruta no válida' });
      return;
    }
    gatewayRequest(request.path, request.options || {}, false)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, status: 401, text: '', error: e.message || String(e) }));
    return true;
  }
});
