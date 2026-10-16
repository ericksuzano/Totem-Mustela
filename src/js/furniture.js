/*
 * View do móvel/expositor.
 *
 * Camadas (de baixo para cima):
 *   1. arte  — placeholder desenhado a partir do layout OU imagem oficial (config.assets.furnitureImage)
 *   2. dim   — uma máscara escura por área; some quando a área é revelada
 *   3. hitboxes — .interactive-area transparentes com data-area-id (só no modo interativo)
 *
 * Nenhuma regra de jogo aqui: o móvel só sabe desenhar áreas e exibir estados.
 */
(function () {
    "use strict";

    const { createElement, restartAnimation } = window.Mustela.dom;

    // Alturas relativas das silhuetas placeholder (variação puramente visual).
    const PLACEHOLDER_HEIGHTS = [0.92, 0.7, 0.84, 0.6, 0.95, 0.76, 0.66];

    function flattenAreas(layout) {
        return layout.shelves.flatMap((shelf) =>
            shelf.areas.map((area) => ({ ...area, top: shelf.top, bottom: shelf.bottom }))
        );
    }

    function placeAtRect(element, area) {
        element.style.left = area.from + "%";
        element.style.width = (area.to - area.from) + "%";
        element.style.top = area.top + "%";
        element.style.height = (area.bottom - area.top) + "%";
    }

    function buildPlaceholderProducts(count) {
        const products = createElement("div", "shelf-area__products");
        for (let i = 0; i < count; i++) {
            const product = createElement("div", "product-placeholder");
            product.style.setProperty("--product-height", PLACEHOLDER_HEIGHTS[i % PLACEHOLDER_HEIGHTS.length]);
            products.appendChild(product);
        }
        return products;
    }

    function buildPlaceholderArea(area) {
        const element = createElement("div", "shelf-area", { "data-area-id": area.id });
        placeAtRect(element, area);
        element.appendChild(buildPlaceholderProducts(area.placeholderProducts || 0));

        const label = createElement("div", "shelf-area__label");
        label.textContent = area.label;
        label.style.backgroundColor = area.color;
        label.style.color = area.textColor;
        element.appendChild(label);
        return element;
    }

    function buildShelfBoards(layout) {
        return layout.shelves.map((shelf) => {
            const board = createElement("div", "shelf-board");
            board.style.top = shelf.bottom + "%";
            return board;
        });
    }

    function buildSideLabel(text, side) {
        const label = createElement("div", "furniture__side furniture__side--" + side);
        [...text].forEach((char) => {
            label.appendChild(createElement("span")).textContent = char === " " ? " " : char;
        });
        return label;
    }

    function buildPlaceholderArt(layout, areas, logoHost) {
        const art = createElement("div", "furniture__art", { "data-placeholder": "MÓVEL — placeholder" });
        art.appendChild(logoHost);
        art.appendChild(buildSideLabel(layout.sideLabels.left, "left"));
        art.appendChild(buildSideLabel(layout.sideLabels.right, "right"));
        art.appendChild(createElement("div", "furniture__niche"));
        buildShelfBoards(layout).forEach((board) => art.appendChild(board));
        areas.forEach((area) => art.appendChild(buildPlaceholderArea(area)));
        return art;
    }

    function buildImageArt(imagePath) {
        const art = createElement("div", "furniture__art furniture__art--image");
        art.appendChild(createElement("img", "furniture__image", { src: imagePath, alt: "" }));
        return art;
    }

    function buildLayer(className, areas, buildItem) {
        const layer = createElement("div", className);
        const items = {};
        areas.forEach((area) => {
            const item = buildItem(area);
            placeAtRect(item, area);
            layer.appendChild(item);
            items[area.id] = item;
        });
        return { layer, items };
    }

    function buildHitbox(area) {
        const hitbox = createElement("div", "interactive-area", {
            "data-area-id": area.id,
            "aria-label": area.label,
            role: "button"
        });
        hitbox.appendChild(createElement("span", "interactive-area__check", { "aria-hidden": "true" }));
        return hitbox;
    }

    function create(host, layout, options) {
        const areas = flattenAreas(layout);
        const root = createElement("div", "furniture");
        root.style.setProperty("--furniture-aspect", layout.aspectRatio);

        const logoHost = createElement("div", "furniture__logo", { "data-slot": "logo" });
        root.appendChild(options.imagePath ? buildImageArt(options.imagePath) : buildPlaceholderArt(layout, areas, logoHost));

        const dim = buildLayer("furniture__dim", areas, () => createElement("div", "dim-mask"));
        root.appendChild(dim.layer);

        const hitboxes = options.interactive ? buildLayer("furniture__hitboxes", areas, buildHitbox) : { items: {} };
        if (hitboxes.layer) root.appendChild(hitboxes.layer);

        host.appendChild(root);

        function setDimmed(isDimmed) {
            root.classList.toggle("is-dimmed", isDimmed);
        }

        function setRevealed(areaIds) {
            Object.entries(dim.items).forEach(([id, mask]) => mask.classList.toggle("is-revealed", areaIds.includes(id)));
        }

        function setCorrect(areaIds) {
            Object.entries(hitboxes.items).forEach(([id, hitbox]) => hitbox.classList.toggle("is-correct", areaIds.includes(id)));
        }

        function flashWrong(areaId) {
            const hitbox = hitboxes.items[areaId];
            if (hitbox) restartAnimation(hitbox, "is-wrong");
        }

        function clearWrong() {
            Object.values(hitboxes.items).forEach((hitbox) => hitbox.classList.remove("is-wrong"));
        }

        return { setDimmed, setRevealed, setCorrect, flashWrong, clearWrong };
    }

    window.Mustela.furniture = { create };
})();
