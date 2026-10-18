/*
 * Inicialização: carrega a configuração, escala o palco, liga a entrada por toque
 * às ações do jogo. Não contém regras de jogo.
 */
(function () {
    "use strict";

    // Tela principal: TV 43" retrato 1080×1920 (9:16) → palco 1080×1920, escala 1.
    // Em outras telas a largura lógica continua 1080 e a altura acompanha a proporção
    // dentro destes limites; fora deles sobram faixas (letterbox/pillarbox) na cor da marca.
    const STAGE_WIDTH = 1080;
    const MIN_STAGE_HEIGHT = 1600; // ~3:4.4 — telas mais "largas" (tablets, paisagem) ficam com faixas laterais
    const MAX_STAGE_HEIGHT = 2340; // ~9:19.5 — celulares altos; acima disso, faixas em cima/embaixo

    // Movimento máximo (px de tela) entre pointerdown e pointerup para contar como toque.
    const TAP_MOVE_TOLERANCE = 60;

    // Saída do operador: N toques no logo, cada um até X ms depois do anterior.
    const EXIT_TAP_COUNT = 5;
    const EXIT_TAP_INTERVAL_MS = 1500;
    // Fecha o modal sozinho se ninguém responder (ex.: participante achou por acaso).
    const EXIT_DIALOG_TIMEOUT_MS = 15000;

    // Usado quando a aplicação roda fora do Electron (ex.: abrir index.html no navegador).
    const DEFAULT_CONFIG = {
        hideCursor: false,
        timing: { correctFeedbackMs: 3000, errorFeedbackMs: 3500, errorDismissGuardMs: 500, idleResetMs: 90000, finalScreenResetMs: 15000 },
        gameplay: { keepPreviousAnswersRevealed: false, showProgressLabel: true },
        qrCode: { url: null, imagePath: null },
        assets: { logo: null, furnitureImage: null, background: null },
        sounds: { volume: 0.8, tap: null, correct: null, wrong: null },
        debug: { showPlaceholderLabels: true, showHitboxes: false }
    };

    async function loadConfig() {
        const loaded = window.kiosk ? await window.kiosk.getConfig() : {};
        const config = { ...DEFAULT_CONFIG, ...loaded };
        Object.keys(DEFAULT_CONFIG).forEach((key) => {
            if (typeof DEFAULT_CONFIG[key] === "object") config[key] = { ...DEFAULT_CONFIG[key], ...loaded[key] };
        });
        return config;
    }

    function fitStage(stage) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const idealHeight = viewportHeight * (STAGE_WIDTH / viewportWidth);
        const stageHeight = Math.min(MAX_STAGE_HEIGHT, Math.max(MIN_STAGE_HEIGHT, idealHeight));

        const scale = Math.min(viewportWidth / STAGE_WIDTH, viewportHeight / stageHeight);
        const offsetX = (viewportWidth - STAGE_WIDTH * scale) / 2;
        const offsetY = (viewportHeight - stageHeight * scale) / 2;

        stage.style.height = `${stageHeight}px`;
        stage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    // Sons opcionais: só tocam quando o arquivo estiver definido em config.sounds.
    function createSoundPlayer(soundsConfig) {
        const clips = {};
        ["tap", "correct", "wrong"].forEach((name) => {
            if (!soundsConfig[name]) return;
            const audio = new Audio(soundsConfig[name]);
            audio.volume = soundsConfig.volume;
            clips[name] = audio;
        });
        return {
            play(name) {
                const clip = clips[name];
                if (!clip) return;
                clip.currentTime = 0;
                clip.play().catch(() => {});
            }
        };
    }

    function applyRootFlags(config) {
        const root = document.documentElement;
        root.classList.toggle("hide-cursor", config.hideCursor);
        root.classList.toggle("show-placeholder-labels", config.debug.showPlaceholderLabels);
        root.classList.toggle("show-hitboxes", config.debug.showHitboxes);
        if (config.assets.background) {
            root.classList.add("has-custom-background");
            root.style.setProperty("--custom-background", `url("${config.assets.background}")`);
        }
    }

    function quitApp() {
        if (window.kiosk) window.kiosk.quit();
        else window.close();
    }

    // Modal "Deseja fechar o jogo?" — fora do estado do jogo, que segue intacto por baixo.
    function createExitDialog(stage) {
        let taps = 0;
        let lastTapAt = 0;
        let autoCloseTimer = null;

        function isOpen() {
            return stage.classList.contains("is-exit-open");
        }

        function close() {
            clearTimeout(autoCloseTimer);
            stage.classList.remove("is-exit-open");
        }

        function open() {
            stage.classList.add("is-exit-open");
            clearTimeout(autoCloseTimer);
            autoCloseTimer = setTimeout(close, EXIT_DIALOG_TIMEOUT_MS);
        }

        function registerLogoTap() {
            const now = Date.now();
            taps = now - lastTapAt <= EXIT_TAP_INTERVAL_MS ? taps + 1 : 1;
            lastTapAt = now;
            if (taps < EXIT_TAP_COUNT) return;
            taps = 0;
            open();
        }

        return { isOpen, close, registerLogoTap };
    }

    function dispatchTap(target, game, exitDialog) {
        if (exitDialog.isOpen()) {
            if (target.dataset.action === "confirm-exit") quitApp();
            else if (target.dataset.action === "cancel-exit") exitDialog.close();
            return;
        }
        if (target.matches(".interactive-area")) {
            game.selectArea(target.dataset.areaId);
            return;
        }
        const actions = {
            "go-how-to-play": game.goToHowToPlay,
            "start-quiz": game.startQuiz,
            "dismiss-error": game.dismissError,
            "continue": game.continueToFinal
        };
        const action = actions[target.dataset.action];
        if (action) action();
    }

    // Um único ponto de entrada para toque/mouse/caneta via Pointer Events.
    function bindPointerInput(stage, game, exitDialog) {
        let pending = null;

        stage.addEventListener("pointerdown", (event) => {
            game.notifyActivity();
            if (!event.isPrimary) return;
            if (!exitDialog.isOpen() && event.target.closest('[data-slot="logo"]')) exitDialog.registerLogoTap();
            const target = event.target.closest(".interactive-area, [data-action]");
            if (!target) return;
            pending = { target, x: event.clientX, y: event.clientY, pointerId: event.pointerId };
            target.classList.add("is-pressed");
        });

        stage.addEventListener("pointerup", (event) => {
            if (!pending || event.pointerId !== pending.pointerId) return;
            const { target, x, y } = pending;
            pending = null;
            target.classList.remove("is-pressed");
            if (Math.hypot(event.clientX - x, event.clientY - y) <= TAP_MOVE_TOLERANCE) dispatchTap(target, game, exitDialog);
        });

        stage.addEventListener("pointercancel", () => {
            if (pending) pending.target.classList.remove("is-pressed");
            pending = null;
        });
    }

    function preventDefaultGestures() {
        ["contextmenu", "selectstart", "dragstart", "gesturestart"].forEach((type) =>
            document.addEventListener(type, (event) => event.preventDefault())
        );
        document.addEventListener("wheel", (event) => { if (event.ctrlKey) event.preventDefault(); }, { passive: false });
    }

    async function boot() {
        const config = await loadConfig();
        const stage = document.getElementById("stage");

        applyRootFlags(config);
        preventDefaultGestures();
        fitStage(stage);
        window.addEventListener("resize", () => fitStage(stage));

        const view = window.Mustela.screens.createView({
            root: stage,
            content: window.MustelaContent,
            questions: window.MustelaQuestions,
            layout: window.MustelaFurnitureLayout,
            config
        });

        const game = window.Mustela.game.createGame({
            questions: window.MustelaQuestions,
            view,
            config,
            sound: createSoundPlayer(config.sounds)
        });

        bindPointerInput(stage, game, createExitDialog(stage));
        stage.classList.add("is-ready");
    }

    boot();
})();
