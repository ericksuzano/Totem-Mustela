/*
 * Estado central e regras do jogo.
 *
 * Toda navegação passa por aqui: as ações alteram gameState e chamam render().
 * Nenhum outro arquivo guarda tela atual, pergunta atual ou respostas.
 */
(function () {
    "use strict";

    const SCREENS = Object.freeze({
        COVER: "cover",
        HOW_TO_PLAY: "how-to-play",
        QUESTION: "question",
        CONGRATS: "congrats",
        FINAL: "final"
    });

    function createInitialState() {
        return {
            currentScreen: SCREENS.COVER,
            currentQuestion: 0,
            completedQuestions: [],
            isFeedbackVisible: false,
            feedbackType: null, // "correct" | "wrong" | null
            feedbackShownAt: 0,
            wrongAreaId: null,
            wrongSequence: 0
        };
    }

    function createGame({ questions, view, config, sound }) {
        const timing = config.timing;
        const timers = {};
        let gameState = createInitialState();

        // ---------- timers ----------

        function schedule(name, delayMs, callback) {
            clearTimeout(timers[name]);
            if (delayMs > 0) timers[name] = setTimeout(callback, delayMs);
        }

        function cancel(name) {
            clearTimeout(timers[name]);
            delete timers[name];
        }

        function cancelAllTimers() {
            Object.keys(timers).forEach(cancel);
        }

        // ---------- view model ----------

        function getCurrentQuestion() {
            return questions[gameState.currentQuestion];
        }

        function getRevealedAreas(question) {
            const completed = questions.filter((q) => gameState.completedQuestions.includes(q.id));
            const kept = config.gameplay.keepPreviousAnswersRevealed ? completed.filter((q) => q !== question) : [];
            const current = gameState.feedbackType === "correct" ? [question] : [];
            return [...kept, ...current].flatMap((q) => q.correctAreas);
        }

        function getViewModel() {
            const isQuestion = gameState.currentScreen === SCREENS.QUESTION;
            const question = isQuestion ? getCurrentQuestion() : null;
            return {
                screen: gameState.currentScreen,
                question,
                questionIndex: gameState.currentQuestion,
                total: questions.length,
                completedCount: gameState.completedQuestions.length,
                feedback: gameState.feedbackType,
                revealedAreas: question ? getRevealedAreas(question) : [],
                wrongAreaId: gameState.wrongAreaId,
                wrongSequence: gameState.wrongSequence
            };
        }

        function render() {
            view.render(getViewModel());
        }

        // ---------- navegação ----------

        function goTo(screen) {
            gameState.currentScreen = screen;
            if (screen === SCREENS.FINAL) schedule("finalReset", timing.finalScreenResetMs, resetGame);
            render();
        }

        function showQuestion(index) {
            gameState.currentQuestion = index;
            clearFeedback();
            goTo(SCREENS.QUESTION);
        }

        function advanceAfterCorrect() {
            const next = gameState.currentQuestion + 1;
            if (next < questions.length) showQuestion(next);
            else {
                clearFeedback();
                goTo(SCREENS.CONGRATS);
            }
        }

        // ---------- feedback ----------

        function setFeedback(type) {
            gameState.isFeedbackVisible = true;
            gameState.feedbackType = type;
            gameState.feedbackShownAt = Date.now();
        }

        function clearFeedback() {
            gameState.isFeedbackVisible = false;
            gameState.feedbackType = null;
            gameState.wrongAreaId = null;
            cancel("feedback");
        }

        function handleCorrect(question) {
            gameState.completedQuestions.push(question.id);
            setFeedback("correct");
            sound.play("correct");
            schedule("feedback", timing.correctFeedbackMs, advanceAfterCorrect);
            render();
        }

        // Erro NÃO avança: o participante continua na mesma pergunta até acertar.
        function handleWrong(areaId) {
            setFeedback("wrong");
            gameState.wrongAreaId = areaId;
            gameState.wrongSequence += 1;
            sound.play("wrong");
            schedule("feedback", timing.errorFeedbackMs, dismissError);
            render();
        }

        // ---------- ações públicas ----------

        function goToHowToPlay() {
            if (gameState.currentScreen !== SCREENS.COVER) return;
            sound.play("tap");
            goTo(SCREENS.HOW_TO_PLAY);
        }

        function startQuiz() {
            if (gameState.currentScreen !== SCREENS.HOW_TO_PLAY) return;
            sound.play("tap");
            showQuestion(0);
        }

        function selectArea(areaId) {
            if (gameState.currentScreen !== SCREENS.QUESTION || gameState.isFeedbackVisible) return;
            const question = getCurrentQuestion();
            if (question.correctAreas.includes(areaId)) handleCorrect(question);
            else handleWrong(areaId);
        }

        function dismissError() {
            if (gameState.feedbackType !== "wrong") return;
            // Evita que o mesmo toque que errou feche a mensagem imediatamente.
            if (Date.now() - gameState.feedbackShownAt < timing.errorDismissGuardMs) return;
            clearFeedback();
            render();
        }

        function continueToFinal() {
            if (gameState.currentScreen !== SCREENS.CONGRATS) return;
            sound.play("tap");
            goTo(SCREENS.FINAL);
        }

        // Prepara a experiência para o próximo participante, sem reiniciar o aplicativo.
        function resetGame() {
            cancelAllTimers();
            gameState = createInitialState();
            render();
            notifyActivity();
        }

        // Volta à capa após inatividade (participante abandonou a experiência no meio).
        function notifyActivity() {
            schedule("idle", timing.idleResetMs, () => {
                if (gameState.currentScreen !== SCREENS.COVER) resetGame();
            });
        }

        function getState() {
            return JSON.parse(JSON.stringify(gameState));
        }

        render();

        return {
            goToHowToPlay,
            startQuiz,
            selectArea,
            dismissError,
            continueToFinal,
            resetGame,
            notifyActivity,
            getState
        };
    }

    window.Mustela.game = { createGame, SCREENS };
})();
