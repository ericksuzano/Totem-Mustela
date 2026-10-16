/*
 * Textos das telas — fonte: material de referência (PDF "Jogo_Mustela").
 * Aceitam **negrito**. Quebras de linha com "\n".
 */
window.MustelaContent = {
    cover: {
        buttonLabel: "COMEÇAR"
    },

    howToPlay: {
        title: "COMO JOGAR",
        body: "**Responda às 4 perguntas**\ne escolha os produtos\nMustela mais **indicados\npara cada necessidade\nda pele.**",
        hint: "A cada acerto, a solução\naparece no display!",
        buttonLabel: "VAMOS COMEÇAR?"
    },

    question: {
        correctTitle: "Uauu!\nArrasou!",
        // {current} e {total} são substituídos automaticamente.
        progressLabel: "PERGUNTA {current} DE {total}"
    },

    congrats: {
        title: "PARABÉNS,",
        subtitle: "você já é um\nespecialista do\nuniverso da Mustela!",
        buttonLabel: "CONTINUAR"
    },

    final: {
        message: "Cuidado natural e eficaz\npara todas as idades, **todos\nos tipos de pele** e com\n**respeito ao planeta.**",
        qrTitle: "Acesse o QR Code",
        qrSubtitle: "Para ter ainda mais informações sobre\no cuidado ideal para cada tipo de pele"
    },

    // Modal de saída (aberto com 5 toques no logo).
    exitDialog: {
        title: "Deseja fechar\no jogo?",
        confirmLabel: "SIM",
        cancelLabel: "NÃO"
    }
};
