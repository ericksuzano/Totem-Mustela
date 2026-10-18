/*
 * Perguntas do quiz — fonte: material de referência (PDF "Jogo_Mustela").
 *
 * - question / errorTitle / errorMessage aceitam **negrito**.
 * - correctAreas: IDs definidos em furniture-layout.js. Tocar em QUALQUER uma delas é acerto,
 *   e todas são reveladas no feedback de acerto.
 * - theme: cores do cabeçalho e do card de erro. No material, a cor de cada pergunta é a mesma
 *   da etiqueta da categoria correta ("As cores podem ajudar você...").
 * - A ordem do array é a ordem do jogo; o total de perguntas é derivado do tamanho do array.
 */
window.MustelaQuestions = [
    {
        id: "question-1",
        question: "Qual é o principal produto Mustela recomendado para o cuidado da **PELE NA GESTAÇÃO E PÓS PARTO?**",
        correctAreas: ["area-09", "area-06"], // Gestantes e Autocuidado Feminino, Proteção Solar
        errorTitle: "Tente novamente!",
        errorMessage: "**As cores podem\najudar você**\na encontrar a\nresposta.",
        theme: { background: "#e8303f", text: "#ffffff" }
    },
    {
        id: "question-2",
        // Texto mantido exatamente como no material ("principal o produto").
        question: "Qual é o principal produto Mustela recomendado para o cuidado da **PELE NORMAL?**",
        // Pele Normal (as duas prateleiras), Proteção Solar, Reparação, Prevenção de Assaduras, Troca
        correctAreas: ["area-01", "area-03", "area-06", "area-05", "area-11", "area-12"],
        errorTitle: "Tente novamente!",
        errorMessage: "**As cores podem\najudar você**\na encontrar a\nresposta.",
        theme: { background: "#5ccbec", text: "#ffffff" }
    },
    {
        id: "question-3",
        question: "Qual é o principal produto Mustela recomendado para o cuidado da **PELE MUITO SENSÍVEL?**",
        // Pele Muito Sensível, Reparação, Proteção Solar, Prevenção de Assaduras, Troca
        correctAreas: ["area-04", "area-05", "area-06", "area-11", "area-12"],
        errorTitle: "Tente novamente!",
        errorMessage: "**As cores podem\najudar você**\na encontrar a\nresposta.",
        theme: { background: "#f0475b", text: "#ffffff" }
    },
    {
        id: "question-4",
        question: "Qual é o principal produto Mustela recomendado para o cuidado da **PELE MUITO SECA E ATÓPICA?**",
        // Dermatite Atópica, Proteção Solar, Prevenção de Assaduras, Troca
        correctAreas: ["area-02", "area-06", "area-11", "area-12"],
        errorTitle: "Tente novamente!",
        errorMessage: "**As cores podem\najudar você**\na encontrar a\nresposta.",
        theme: { background: "#e0eedb", text: "#0b4ea2" }
    }
];
