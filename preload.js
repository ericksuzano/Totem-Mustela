"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// API exposta ao renderer: leitura da configuração e saída confirmada pelo operador.
contextBridge.exposeInMainWorld("kiosk", {
    getConfig: () => ipcRenderer.invoke("kiosk:get-config"),
    quit: () => ipcRenderer.send("kiosk:quit")
});
