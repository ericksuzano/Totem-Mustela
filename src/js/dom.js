/*
 * Utilitários de DOM compartilhados pelas views.
 */
(function () {
    "use strict";

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // Converte "**negrito**" e "\n" em HTML seguro.
    function richText(text) {
        return escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>")
            .replace(/\n/g, "<br>");
    }

    function setRichText(element, text) {
        element.innerHTML = richText(text || "");
    }

    function createElement(tag, className, attributes) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        Object.entries(attributes || {}).forEach(([name, value]) => element.setAttribute(name, value));
        return element;
    }

    function getByPath(source, path) {
        return path.split(".").reduce((value, key) => (value == null ? value : value[key]), source);
    }

    // Reinicia uma animação CSS mesmo que a classe já esteja aplicada.
    function restartAnimation(element, className) {
        element.classList.remove(className);
        void element.offsetWidth;
        element.classList.add(className);
    }

    // Placeholder do logo: wordmark em texto até a arte oficial ser definida em config.assets.logo.
    function renderLogo(host, logoPath) {
        host.textContent = "";
        if (logoPath) {
            host.appendChild(createElement("img", "logo-image", { src: logoPath, alt: "Mustela" }));
            return;
        }
        host.setAttribute("data-placeholder", "LOGO — placeholder");
        const wordmark = createElement("div", "logo-placeholder");
        wordmark.appendChild(createElement("span", "logo-placeholder__text")).textContent = "mustela";
        wordmark.appendChild(createElement("span", "logo-placeholder__smile"));
        host.appendChild(wordmark);
    }

    window.Mustela = window.Mustela || {};
    window.Mustela.dom = { richText, setRichText, createElement, getByPath, restartAnimation, renderLogo };
})();
