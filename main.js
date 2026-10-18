"use strict";

const { app, BrowserWindow, Menu, ipcMain, powerSaveBlocker } = require("electron");
const path = require("path");
const fs = require("fs");

// `--dev` abre em janela (sem kiosk) para desenvolvimento/testes.
const isDevMode = process.argv.includes("--dev");

// Ordem: MUSTELA_CONFIG (testes/outro totem) → app-config.json ao lado do .exe portátil
// (permite ajustar o totem sem gerar outro build) → config embutida no app.
function resolveConfigPath() {
    if (process.env.MUSTELA_CONFIG) return path.resolve(process.env.MUSTELA_CONFIG);
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
    const besideExe = portableDir && path.join(portableDir, "app-config.json");
    if (besideExe && fs.existsSync(besideExe)) return besideExe;
    return path.join(__dirname, "config", "app-config.json");
}

const configPath = resolveConfigPath();

// Atalhos que permitiriam ao participante sair/recarregar/inspecionar a aplicação.
const BLOCKED_SHORTCUTS = [
    "f5", "f11", "f12",
    "control+r", "control+shift+r",
    "control+w", "control+q",
    "control+shift+i", "control+shift+j", "control+shift+c",
    "control+=", "control+-", "control+0", "control++"
];

let allowQuit = false;

function readConfig() {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return isDevMode ? { ...config, ...config.devOverrides } : config;
}

function describeInput(input) {
    const parts = [];
    if (input.control) parts.push("control");
    if (input.shift) parts.push("shift");
    if (input.alt) parts.push("alt");
    parts.push(input.key.toLowerCase());
    return parts.join("+");
}

function normalizeShortcut(shortcut) {
    return shortcut.split("+").map((part) => part.trim().toLowerCase()).join("+");
}

function quitForMaintenance() {
    allowQuit = true;
    app.quit();
}

// Mecanismo de manutenção: isolado aqui para não afetar o jogo.
// Novas ações (ex.: recarregar conteúdo, abrir painel) podem ser adicionadas neste mapa.
function buildMaintenanceActions(config) {
    const maintenance = config.maintenance || {};
    if (!maintenance.enabled || !maintenance.exitShortcut) return {};
    return { [normalizeShortcut(maintenance.exitShortcut)]: quitForMaintenance };
}

function installKeyboardGuards(win, config) {
    const maintenanceActions = buildMaintenanceActions(config);
    const blocked = new Set(BLOCKED_SHORTCUTS);

    win.webContents.on("before-input-event", (event, input) => {
        if (input.type !== "keyDown") return;
        const combo = describeInput(input);

        if (maintenanceActions[combo]) {
            event.preventDefault();
            maintenanceActions[combo]();
            return;
        }
        if (!isDevMode && blocked.has(combo)) event.preventDefault();
    });
}

function lockDownNavigation(win) {
    win.webContents.on("will-navigate", (event) => event.preventDefault());
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.setVisualZoomLevelLimits(1, 1);
}

function preventClosingInKiosk(win, config) {
    win.on("close", (event) => {
        if (config.kiosk && !allowQuit) event.preventDefault();
    });
}

function createWindow(config) {
    const isImmersive = Boolean(config.fullscreen || config.kiosk);

    const win = new BrowserWindow({
        width: config.width,
        height: config.height,
        fullscreen: Boolean(config.fullscreen),
        kiosk: Boolean(config.kiosk),
        frame: !isImmersive,
        autoHideMenuBar: true,
        backgroundColor: "#0b52a5",
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            spellcheck: false,
            devTools: isDevMode
        }
    });

    win.once("ready-to-show", () => {
        win.show();
        if (isDevMode && config.openDevTools) win.webContents.openDevTools({ mode: "detach" });
    });

    lockDownNavigation(win);
    installKeyboardGuards(win, config);
    preventClosingInKiosk(win, config);

    win.loadFile(path.join(__dirname, "src", "index.html"));
    return win;
}

function start() {
    if (!app.requestSingleInstanceLock()) {
        app.quit();
        return;
    }

    const config = readConfig();

    // Somente leitura: o renderer recebe a configuração, nada mais.
    ipcMain.handle("kiosk:get-config", () => config);
    // Saída confirmada pelo operador no modal (5 toques no logo).
    ipcMain.on("kiosk:quit", quitForMaintenance);

    app.on("before-quit", () => { allowQuit = true; });
    app.on("window-all-closed", () => app.quit());

    app.whenReady().then(() => {
        Menu.setApplicationMenu(null);
        if (config.preventDisplaySleep) powerSaveBlocker.start("prevent-display-sleep");
        createWindow(config);
    });
}

start();
