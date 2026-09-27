// Al tocar el ícono se abre el panel al costado de la página.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
chrome.action.onClicked.addListener(() => {
  chrome.runtime.sendMessage({ tipo: 'wayfinder-activado' }).catch(() => {});
});
