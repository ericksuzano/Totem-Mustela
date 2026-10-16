/*
 * Camada de apresentação.
 *
 * render(viewModel) reflete o estado do jogo no DOM e pode ser chamada quantas vezes
 * for necessário (idempotente). As telas não tomam decisões nem navegam: isso é do game.js.
 */
(function () {
    "use strict";

    const { setRichText, createElement, getByPath, renderLogo } = window.Mustela.dom;

    function collectRefs(root) {
        const refs = {};
        root.querySelectorAll("[data-ref]").forEach((element) => { refs[element.dataset.ref] = element; });
        return refs;
    }

    function fillStaticTexts(root, content) {
        root.querySelectorAll("[data-text]").forEach((element) => {
            setRichText(element, getByPath(content, element.dataset.text));
        });
    }

    function buildProgressDots(container, total) {
        return Array.from({ length: total }, () => container.appendChild(createElement("span", "progress__dot")));
    }

    function renderQrSlot(slot, qrConfig) {
        slot.textContent = "";
        if (qrConfig.imagePath) {
            slot.appendChild(createElement("img", "final__qr-image", { src: qrConfig.imagePath, alt: "QR Code" }));
            return;
        }
        // TODO(conteúdo): URL do QR Code ainda não definida no material → config.qrCode.
        slot.setAttribute("data-placeholder", "QR CODE — placeholder");
        const note = createElement("p", "final__qr-placeholder");
        note.textContent = qrConfig.url ? "QR Code: " + qrConfig.url : "QR Code\n(URL não definida)";
        slot.appendChild(note);
    }

    function formatProgress(template, current, total) {
        return template.replace("{current}", current).replace("{total}", total);
    }

    function createView({ root, content, questions, layout, config }) {
        const refs = collectRefs(root);
        const screens = [...root.querySelectorAll("[data-screen-id]")];

        fillStaticTexts(root, content);

        const furnitureImage = config.assets.furnitureImage;
        const quizFurniture = window.Mustela.furniture.create(refs.quizFurniture, layout, { interactive: true, imagePath: furnitureImage });
        const congratsFurniture = window.Mustela.furniture.create(refs.congratsFurniture, layout, { interactive: false, imagePath: furnitureImage });
        congratsFurniture.setDimmed(false);

        root.querySelectorAll('[data-slot="logo"]').forEach((host) => renderLogo(host, config.assets.logo));
        renderQrSlot(refs.qrSlot, config.qrCode);

        const dots = buildProgressDots(refs.progressDots, questions.length);
        refs.progressLabel.hidden = !config.gameplay.showProgressLabel;

        let lastWrongSequence = 0;

        function showScreen(screenId) {
            root.dataset.screen = screenId;
            document.documentElement.dataset.screen = screenId;
            screens.forEach((screen) => screen.classList.toggle("is-active", screen.dataset.screenId === screenId));
        }

        function renderQuestion(vm) {
            const { question } = vm;
            root.style.setProperty("--question-bg", question.theme.background);
            root.style.setProperty("--question-text", question.theme.text);
            setRichText(refs.questionText, question.question);
            setRichText(refs.errorTitle, question.errorTitle);
            setRichText(refs.errorMessage, question.errorMessage);
            root.dataset.questionId = question.id;
            root.dataset.questionIndex = String(vm.questionIndex);
        }

        function renderProgress(vm) {
            dots.forEach((dot, index) => dot.classList.toggle("is-complete", index < vm.completedCount));
            refs.progressLabel.textContent = formatProgress(content.question.progressLabel, vm.questionIndex + 1, vm.total);
        }

        function renderFeedback(vm) {
            root.dataset.feedback = vm.feedback || "none";
            quizFurniture.setDimmed(true);
            quizFurniture.setRevealed(vm.revealedAreas);
            quizFurniture.setCorrect(vm.feedback === "correct" ? vm.question.correctAreas : []);

            if (vm.wrongSequence !== lastWrongSequence) {
                lastWrongSequence = vm.wrongSequence;
                if (vm.wrongAreaId) quizFurniture.flashWrong(vm.wrongAreaId);
            }
            if (!vm.feedback) quizFurniture.clearWrong();
        }

        function render(vm) {
            showScreen(vm.screen);
            if (vm.question) {
                renderQuestion(vm);
                renderProgress(vm);
                renderFeedback(vm);
            } else {
                root.dataset.feedback = "none";
                quizFurniture.setRevealed([]);
                quizFurniture.setCorrect([]);
                quizFurniture.clearWrong();
            }
        }

        return { render };
    }

    window.Mustela.screens = { createView };
})();
