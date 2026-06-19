let holdedIframeContainer = null;
let isResizing = false;
let mode = 'bottom';
let panelHeight = 400;
let panelWidth = 400;

function applyStyles(container, resizer, handle) {
  if (mode === 'bottom') {
    container.style.bottom = '0';
    container.style.right = '0';
    container.style.left = '0';
    container.style.top = 'auto';
    container.style.width = '100%';
    container.style.height = panelHeight + 'px';
    container.style.borderRadius = '12px 12px 0 0';

    resizer.style.width = '100%';
    resizer.style.height = '12px';
    resizer.style.top = '0';
    resizer.style.left = '0';
    resizer.style.bottom = 'auto';
    resizer.style.right = 'auto';
    resizer.style.cursor = 'ns-resize';

    handle.style.width = '40px';
    handle.style.height = '4px';
  } else {
    container.style.top = '0';
    container.style.right = '0';
    container.style.bottom = '0';
    container.style.left = 'auto';
    container.style.height = '100%';
    container.style.width = panelWidth + 'px';
    container.style.borderRadius = '12px 0 0 12px';

    resizer.style.height = '100%';
    resizer.style.width = '12px';
    resizer.style.left = '0';
    resizer.style.top = '0';
    resizer.style.right = 'auto';
    resizer.style.bottom = 'auto';
    resizer.style.cursor = 'ew-resize';

    handle.style.height = '40px';
    handle.style.width = '4px';
  }
}

function createIframe() {
  const container = document.createElement('div');
  container.id = 'holded-sync-panel-container';
  container.style.position = 'fixed';
  container.style.zIndex = '2147483647';
  container.style.boxShadow = '0 -4px 16px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.3)';
  container.style.overflow = 'hidden';
  container.style.display = 'none';
  container.style.backgroundColor = '#ffffff';

  const resizer = document.createElement('div');
  resizer.style.position = 'absolute';
  resizer.style.zIndex = '10';
  resizer.style.display = 'flex';
  resizer.style.justifyContent = 'center';
  resizer.style.alignItems = 'center';
  resizer.style.backgroundColor = '#f8f9fa';
  
  const handle = document.createElement('div');
  handle.style.backgroundColor = '#dadce0';
  handle.style.borderRadius = '2px';
  resizer.appendChild(handle);

  applyStyles(container, resizer, handle);

  const doResize = (e) => {
    if (!isResizing) return;
    if (mode === 'bottom') {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 200 && newHeight <= window.innerHeight - 20) {
        panelHeight = newHeight;
        container.style.height = `${newHeight}px`;
      }
    } else {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= window.innerWidth - 20) {
        panelWidth = newWidth;
        container.style.width = `${newWidth}px`;
      }
    }
  };

  const iframe = document.createElement('iframe');
  
  resizer.addEventListener('mousedown', () => {
    isResizing = true;
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', () => {
      isResizing = false;
      document.removeEventListener('mousemove', doResize);
    }, { once: true });
    // Prevent iframe from swallowing mouse events during resize
    if (iframe) iframe.style.pointerEvents = 'none';
  });

  document.addEventListener('mouseup', () => {
    if(iframe) iframe.style.pointerEvents = 'auto';
  });

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="#5f6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  `;
  closeBtn.style.position = 'absolute';
  closeBtn.style.right = '12px';
  closeBtn.style.top = '16px';
  closeBtn.style.zIndex = '11';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.padding = '4px';
  closeBtn.style.display = 'flex';
  closeBtn.style.alignItems = 'center';
  closeBtn.style.justifyContent = 'center';
  closeBtn.style.borderRadius = '4px';
  closeBtn.style.transition = 'background 0.2s';
  closeBtn.onmouseover = () => closeBtn.style.backgroundColor = '#f1f3f4';
  closeBtn.onmouseleave = () => closeBtn.style.backgroundColor = 'transparent';
  closeBtn.onclick = () => {
    container.style.display = 'none';
  };

  iframe.src = chrome.runtime.getURL('index.html');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.display = 'block';

  container.appendChild(resizer);
  // Do not append closeBtn to prevent UI overlapping in extension header
  container.appendChild(iframe);
  document.body.appendChild(container);

  // Listen for messages from iframe to change mode or close
  window.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'setPanelMode') {
      mode = event.data.mode; // 'bottom' or 'right'
      applyStyles(container, resizer, handle);
    }
    if (event.data && event.data.action === 'closePanel') {
      container.style.display = 'none';
    }
  });

  return container;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'togglePanel') {
    if (!holdedIframeContainer) {
      holdedIframeContainer = createIframe();
    }
    if (holdedIframeContainer.style.display === 'none') {
      holdedIframeContainer.style.display = 'block';
    } else {
      holdedIframeContainer.style.display = 'none';
    }
  }
});

