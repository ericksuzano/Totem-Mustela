"use strict";

/*
 * Testes ponta a ponta no Electron real (playwright-core).
 * Rodar: npm test
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { _electron: electron } = require("playwright-core");

const ROOT = path.join(__dirname, "..");
const TEST_CONFIG = path.join(__dirname, "test-config.json");

// Respostas conforme o material de referência.
const CORRECT = { 0: ["area-09"], 1: ["area-01", "area-03"], 2: ["area-04"], 3: ["area-02"] };
const WRONG = { 0: "area-01", 1: "area-04", 2: "area-06", 3: "area-12" };

const childProcesses = new WeakMap();

async function launch({ configPath, dev = true } = {}) {
    const env = { ...process.env };
    if (configPath) env.MUSTELA_CONFIG = configPath;
    const app = await electron.launch({ args: dev ? [ROOT, "--dev"] : [ROOT], cwd: ROOT, env });
    childProcesses.set(app, app.process());
    const page = await app.firstWindow();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.waitForSelector(".stage.is-ready");
    return { app, page, errors };
}

// Espera o processo sair de fato (o app usa trava de instância única).
async function closeApp(app) {
    const child = childProcesses.get(app);
    if (child.exitCode !== null) return;
    const exited = new Promise((resolve) => child.once("exit", resolve));
    await app.close().catch(() => {});
    await exited;
}

function stageAttr(page, name) {
    return page.evaluate((key) => document.getElementById("stage").dataset[key], name);
}

async function center(page, selector) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box, `elemento não encontrado: ${selector}`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// Toque real via CDP: o Chromium gera Pointer Events com pointerType "touch".
async function createTouch(page) {
    const cdp = await page.context().newCDPSession(page);
    return async (x, y) => {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
}

async function createInput(page, mode) {
    const touch = mode === "touch" ? await createTouch(page) : null;
    return async function tap(selector) {
        const { x, y } = await center(page, selector);
        if (touch) await touch(x, y);
        else await page.mouse.click(x, y);
    };
}

async function recordPointerTypes(page) {
    await page.evaluate(() => {
        window.__pointerTypes = new Set();
        document.addEventListener("pointerup", (event) => window.__pointerTypes.add(event.pointerType), true);
    });
    return () => page.evaluate(() => [...window.__pointerTypes].sort());
}

const areaSelector = (id) => `.interactive-area[data-area-id="${id}"]`;

async function waitFor(page, name, value, timeout = 4000) {
    await page.waitForFunction(
        ([attr, expected]) => document.getElementById("stage").dataset[attr] === expected,
        [name, value],
        { timeout }
    );
}

async function playQuestion(page, tap, index, cycle) {
    await waitFor(page, "screen", "question");
    await waitFor(page, "questionIndex", String(index));
    assert.equal(await stageAttr(page, "feedback"), "none");
    assert.equal(await page.locator(".progress__label").textContent(), `PERGUNTA ${index + 1} DE 4`);
    assert.equal(await page.locator(".progress__dot.is-complete").count(), index);

    // Erro: mostra card, NÃO avança.
    await tap(areaSelector(WRONG[index]));
    await waitFor(page, "feedback", "wrong");
    assert.equal(await page.locator(".error-modal").isVisible(), true);
    assert.equal(await stageAttr(page, "questionIndex"), String(index));

    // Fecha o erro tocando no card (após a proteção contra toque duplo).
    await page.waitForTimeout(400);
    await tap(".error-modal__card");
    await waitFor(page, "feedback", "none");
    assert.equal(await stageAttr(page, "questionIndex"), String(index));

    // Segundo erro: some sozinho após errorFeedbackMs.
    await tap(areaSelector(WRONG[index]));
    await waitFor(page, "feedback", "wrong");
    await waitFor(page, "feedback", "none", 3000);
    assert.equal(await stageAttr(page, "questionIndex"), String(index));

    // Acerto (alterna entre as áreas corretas quando há mais de uma).
    const answers = CORRECT[index];
    const answer = answers[cycle % answers.length];
    await tap(areaSelector(answer));
    await waitFor(page, "feedback", "correct");
    for (const id of answers) {
        assert.equal(await page.locator(`${areaSelector(id)}.is-correct`).count(), 1);
    }
    assert.equal(await page.locator(".progress__dot.is-complete").count(), index + 1);

    // Toques durante o feedback de acerto são ignorados.
    await tap(areaSelector(WRONG[index]));
    assert.equal(await stageAttr(page, "feedback"), "correct");
}

async function playFullCycle(page, mode, cycle) {
    const tap = await createInput(page, mode);
    await waitFor(page, "screen", "cover");

    await tap('[data-action="go-how-to-play"]');
    await waitFor(page, "screen", "how-to-play");

    await tap('[data-action="start-quiz"]');
    for (let index = 0; index < 4; index++) await playQuestion(page, tap, index, cycle);

    await waitFor(page, "screen", "congrats");
    await tap('[data-action="continue"]');
    await waitFor(page, "screen", "final");

    // resetGame() automático na tela final → pronto para o próximo participante.
    await waitFor(page, "screen", "cover", 4000);
    assert.equal(await page.locator(".interactive-area.is-correct, .interactive-area.is-wrong, .dim-mask.is-revealed").count(), 0);
    assert.equal(await stageAttr(page, "feedback"), "none");
}

test("kiosk: fullscreen, sem menu, renderer isolado e fechamento bloqueado", async () => {
    const { app, page, errors } = await launch({ dev: false });
    try {
        const info = await app.evaluate(({ BrowserWindow, Menu }) => {
            const win = BrowserWindow.getAllWindows()[0];
            win.close(); // deve ser bloqueado em kiosk
            return {
                kiosk: win.isKiosk(),
                fullscreen: win.isFullScreen(),
                menu: Menu.getApplicationMenu(),
                stillOpen: !win.isDestroyed()
            };
        });
        assert.equal(info.kiosk, true);
        assert.equal(info.fullscreen, true);
        assert.equal(info.menu, null);
        assert.equal(info.stillOpen, true);

        const exposed = await page.evaluate(() => ({
            require: typeof window.require,
            process: typeof window.process,
            kioskKeys: Object.keys(window.kiosk)
        }));
        assert.deepEqual(exposed, { require: "undefined", process: "undefined", kioskKeys: ["getConfig", "quit"] });

        const overflow = await page.evaluate(() => document.scrollingElement.scrollHeight <= window.innerHeight);
        assert.equal(overflow, true);
        assert.deepEqual(errors, []);
    } finally {
        await closeApp(app);
    }
});

test("fluxo completo: 3 ciclos seguidos (mouse, toque, mouse) com erros e reset", async () => {
    const { app, page, errors } = await launch({ configPath: TEST_CONFIG });
    try {
        const pointerTypes = await recordPointerTypes(page);
        await playFullCycle(page, "mouse", 0);
        await playFullCycle(page, "touch", 1);
        await playFullCycle(page, "mouse", 2);
        assert.deepEqual(await pointerTypes(), ["mouse", "touch"]);
        assert.deepEqual(errors, []);
    } finally {
        await closeApp(app);
    }
});

test("toque fora das áreas e na capa fora do botão não navega", async () => {
    const { app, page } = await launch({ configPath: TEST_CONFIG });
    try {
        await page.mouse.click(20, 20);
        assert.equal(await stageAttr(page, "screen"), "cover");
        await page.click('[data-action="go-how-to-play"]');
        await page.click('[data-action="start-quiz"]');
        await waitFor(page, "screen", "question");
        await page.click(".question-header", { force: true });
        await page.click(".furniture__logo", { force: true });
        assert.equal(await stageAttr(page, "feedback"), "none");
        assert.equal(await stageAttr(page, "questionIndex"), "0");
    } finally {
        await closeApp(app);
    }
});

test("arrastar o dedo para fora não conta como toque", async () => {
    const { app, page } = await launch({ configPath: TEST_CONFIG });
    try {
        const { x, y } = await center(page, '[data-action="go-how-to-play"]');
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x, y - 200, { steps: 5 });
        await page.mouse.up();
        assert.equal(await stageAttr(page, "screen"), "cover");
    } finally {
        await closeApp(app);
    }
});

test("inatividade no meio do jogo volta para a capa", async () => {
    const { app, page } = await launch({ configPath: TEST_CONFIG });
    try {
        await page.click('[data-action="go-how-to-play"]');
        await page.click('[data-action="start-quiz"]');
        await waitFor(page, "screen", "question");
        await waitFor(page, "screen", "cover", 9000);
    } finally {
        await closeApp(app);
    }
});

// Telas testadas: TV 43" (9:16, mesma proporção de 1080×1920), celular, tablet, paisagem, tela muito alta.
const SCREEN_SIZES = [
    { name: "TV 9:16", width: 540, height: 960 },
    { name: "celular", width: 390, height: 844 },
    { name: "tablet 3:4", width: 600, height: 800 },
    { name: "paisagem 16:9", width: 960, height: 540 },
    { name: "muito alta", width: 400, height: 1000 }
];

function getRects(page, selectors) {
    return page.evaluate((list) => Object.fromEntries(list.map((selector) => {
        const element = document.querySelector(selector);
        const rect = element.getBoundingClientRect();
        return [selector, { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }];
    })), selectors);
}

// Verifica que cada elemento está dentro do palco e que os pares [acima, abaixo] não se sobrepõem.
async function assertLayout(page, label, { inside, stacked = [] }) {
    const selectors = [...new Set(["#stage", ...inside, ...stacked.flat()])];
    const rects = await getRects(page, selectors);
    const stage = rects["#stage"];
    const tolerance = 1;
    for (const selector of inside) {
        const r = rects[selector];
        assert.ok(
            r.top >= stage.top - tolerance && r.bottom <= stage.bottom + tolerance &&
            r.left >= stage.left - tolerance && r.right <= stage.right + tolerance,
            `${label}: ${selector} sai do palco`
        );
    }
    for (const [upper, lower] of stacked) {
        assert.ok(rects[upper].bottom <= rects[lower].top + tolerance, `${label}: ${upper} sobrepõe ${lower}`);
    }
}

async function resizeWindow(app, page, width, height) {
    await app.evaluate(({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setContentSize(size[0], size[1]), [width, height]);
    await page.waitForFunction(([w, h]) => window.innerWidth === w && window.innerHeight === h, [width, height]);
    await page.waitForTimeout(150);
}

test("responsivo: em cada formato de tela o layout cabe, não se sobrepõe e as áreas funcionam", async () => {
    const { app, page, errors } = await launch({ configPath: TEST_CONFIG });
    try {
        for (const { name, width, height } of SCREEN_SIZES) {
            await resizeWindow(app, page, width, height);
            const tap = await createInput(page, "mouse");

            // Palco dentro da janela; na proporção 9:16 ocupa a janela inteira (sem faixas).
            const stage = await page.locator("#stage").boundingBox();
            assert.ok(stage.x >= -1 && stage.y >= -1 && stage.x + stage.width <= width + 1 && stage.y + stage.height <= height + 1, `${name}: palco cortado`);
            if (name === "TV 9:16") {
                assert.ok(Math.abs(stage.width - width) < 1 && Math.abs(stage.height - height) < 1, "TV: palco deve ocupar a tela inteira");
                assert.equal(await page.evaluate(() => document.getElementById("stage").style.height), "1920px");
            }

            await waitFor(page, "screen", "cover");
            await assertLayout(page, `${name}/capa`, { inside: [".cover__logo", ".btn--cover"], stacked: [[".cover__logo", ".btn--cover"]] });

            await tap('[data-action="go-how-to-play"]');
            await waitFor(page, "screen", "how-to-play");
            await assertLayout(page, `${name}/como jogar`, {
                inside: [".how-to-play__title", ".how-to-play__panel", ".how-to-play__button"],
                stacked: [[".how-to-play__title", ".how-to-play__panel"], [".how-to-play__body", ".how-to-play__star"], [".how-to-play__star", ".how-to-play__hint"], [".how-to-play__hint", ".how-to-play__button"]]
            });

            await tap('[data-action="start-quiz"]');
            await waitFor(page, "screen", "question");
            await assertLayout(page, `${name}/pergunta`, {
                inside: [".question-header", ".screen--question .furniture", ".progress"],
                stacked: [[".question-header", ".screen--question .furniture"], [".screen--question .furniture", ".progress"]]
            });

            await tap(areaSelector("area-01"));
            await waitFor(page, "feedback", "wrong");
            await page.waitForTimeout(500);
            await assertLayout(page, `${name}/erro`, {
                inside: [".error-modal__card"],
                stacked: [[".question-header", ".error-modal__card"], [".error-modal__title", ".error-modal__wand"], [".error-modal__wand", ".error-modal__message"]]
            });
            await waitFor(page, "feedback", "none", 3000);

            for (let index = 0; index < 4; index++) {
                await waitFor(page, "questionIndex", String(index));
                await tap(areaSelector(CORRECT[index][0]));
                await waitFor(page, "feedback", "correct");
            }

            await waitFor(page, "screen", "congrats");
            await assertLayout(page, `${name}/parabéns`, {
                inside: [".congrats__title", ".congrats__subtitle", ".screen--congrats .furniture", ".congrats__button"],
                stacked: [[".congrats__title", ".congrats__subtitle"], [".congrats__subtitle", ".screen--congrats .furniture"], [".screen--congrats .furniture", ".congrats__button"]]
            });

            await tap('[data-action="continue"]');
            await waitFor(page, "screen", "final");
            await assertLayout(page, `${name}/final`, {
                inside: [".final__logo", ".final__message", ".final__qr", ".final__qr-title", ".final__qr-subtitle"],
                stacked: [[".final__logo", ".final__message"], [".final__message", ".final__qr"], [".final__qr", ".final__qr-title"], [".final__qr-title", ".final__qr-subtitle"]]
            });
            await waitFor(page, "screen", "cover", 4000);
        }
        assert.deepEqual(errors, []);
    } finally {
        await closeApp(app);
    }
});

// Teclas via webContents.sendInputEvent (input nativo): é o que dispara before-input-event.
function sendKey(app, keyCode, modifiers) {
    return app.evaluate(({ BrowserWindow }, [code, mods]) => {
        BrowserWindow.getAllWindows()[0].webContents.sendInputEvent({ type: "keyDown", keyCode: code, modifiers: mods });
    }, [keyCode, modifiers]);
}

test("kiosk/manutenção: Ctrl+R, F5, Ctrl+W bloqueados; atalho configurado encerra o app", async () => {
    const { app, page } = await launch({ dev: false });
    const closed = new Promise((resolve) => childProcesses.get(app).once("exit", resolve));
    try {
        await page.evaluate(() => { window.__notReloaded = true; });
        await sendKey(app, "R", ["control"]);
        await sendKey(app, "F5", []);
        await sendKey(app, "W", ["control"]);
        await page.waitForTimeout(700);
        assert.equal(await page.evaluate(() => window.__notReloaded), true, "a página foi recarregada");
        assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);

        await sendKey(app, "Q", ["control", "shift", "alt"]);
        const result = await Promise.race([closed, new Promise((resolve) => setTimeout(() => resolve("timeout"), 5000))]);
        assert.notEqual(result, "timeout", "o atalho de manutenção não encerrou o app");
    } finally {
        await closeApp(app);
    }
});
