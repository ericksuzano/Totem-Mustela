/*
 * Layout do móvel/expositor — fonte: material de referência (PDF "Jogo_Mustela").
 *
 * Todas as coordenadas são PORCENTAGENS da caixa do móvel (0–100), então escalam
 * com qualquer resolução. As mesmas coordenadas definem:
 *   1. o desenho placeholder da prateleira (produtos + etiqueta colorida);
 *   2. a máscara de escurecimento de cada área;
 *   3. a hitbox de toque (.interactive-area).
 *
 * Quando a arte oficial do móvel chegar (config.assets.furnitureImage), basta ajustar
 * top/bottom das prateleiras e from/to das áreas para coincidir com a imagem.
 *
 * As áreas de cada prateleira devem se encostar (sem vãos), para que todo toque
 * dentro da prateleira caia em alguma área — evita toques "perdidos".
 *
 * placeholderProducts: quantidade de silhuetas genéricas desenhadas no placeholder.
 */
window.MustelaFurnitureLayout = {
    aspectRatio: 890 / 1295, // largura / altura do móvel no material

    sideLabels: {
        left: "BEBÊ E CRIANÇA",
        right: "FAMÍLIA"
    },

    shelves: [
        {
            top: 18.9,
            bottom: 39.8,
            areas: [
                { id: "area-01", label: "Pele Normal", color: "#5ccbec", textColor: "#ffffff", from: 7.3, to: 59.3, placeholderProducts: 7 },
                { id: "area-02", label: "Dermatite Atópica", color: "#e0eedb", textColor: "#0b4ea2", from: 59.3, to: 92.6, placeholderProducts: 3 }
            ]
        },
        {
            top: 39.8,
            bottom: 59.1,
            areas: [
                { id: "area-03", label: "Pele Normal", color: "#5ccbec", textColor: "#ffffff", from: 7.3, to: 32.0, placeholderProducts: 3 },
                { id: "area-04", label: "Pele Muito Sensível", color: "#f0475b", textColor: "#ffffff", from: 32.0, to: 47.0, placeholderProducts: 2 },
                { id: "area-05", label: "Reparação", color: "#f47e6f", textColor: "#ffffff", from: 47.0, to: 59.3, placeholderProducts: 1 },
                { id: "area-06", label: "Proteção Solar", color: "#fdd440", textColor: "#0b4ea2", from: 59.3, to: 92.6, placeholderProducts: 4 }
            ]
        },
        {
            top: 59.1,
            bottom: 78.6,
            areas: [
                { id: "area-07", label: "Cuidado Capilar", color: "#fadcd2", textColor: "#0b4ea2", from: 7.3, to: 41.2, placeholderProducts: 4 },
                { id: "area-08", label: "Cachos Desembaraçados", color: "#fadcd2", textColor: "#0b4ea2", from: 41.2, to: 59.3, placeholderProducts: 2 },
                { id: "area-09", label: "Gestantes e Autocuidado Feminino", color: "#e8303f", textColor: "#ffffff", from: 59.3, to: 83.0, placeholderProducts: 3 },
                { id: "area-10", label: "Essencial para a Família", color: "#d7ebcf", textColor: "#0b4ea2", from: 83.0, to: 92.6, placeholderProducts: 1 }
            ]
        },
        {
            top: 78.6,
            bottom: 98.1,
            areas: [
                { id: "area-11", label: "Prevenção de Assaduras", color: "#8a62ad", textColor: "#ffffff", from: 7.3, to: 59.3, placeholderProducts: 4 },
                { id: "area-12", label: "Troca", color: "#4d5fb3", textColor: "#ffffff", from: 59.3, to: 92.6, placeholderProducts: 2 }
            ]
        }
    ]
};
