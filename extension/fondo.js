// Al tocar el ícono se abre el panel al costado de la página y se le avisa que
// ya tiene permiso (activeTab) sobre esa pestaña. No se usa
// openPanelOnActionClick: con esa opción Chrome no dispara onClicked y un
// segundo toque CIERRA el panel en vez de habilitar la pestaña nueva.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
chrome.action.onClicked.addListener(tab => {
  // open() tiene que llamarse dentro del gesto del usuario: sin await antes.
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
  chrome.runtime.sendMessage({ tipo: 'wayfinder-activado' }).catch(() => {});
});
