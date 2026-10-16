# Mustela — experiência interativa para totem

Electron + HTML/CSS/JS, offline, modo kiosk.
**Tela principal: TV 43" em retrato, 9:16, 1080×1920** (o layout foi desenhado nessa medida, escala 1:1).

## Responsividade

A largura lógica é sempre 1080px; a altura acompanha a proporção da tela (`src/js/app.js`, `fitStage`):

| Tela | Comportamento |
|---|---|
| 1080×1920 (TV 43") ou qualquer 9:16 | palco 1080×1920, ocupa a tela inteira |
| Mais alta (celular até ~9:19.5) | palco fica mais alto; móvel e conteúdo se redistribuem |
| Mais larga (tablet 3:4, monitor paisagem) | palco com altura mínima de 1600px e faixas laterais na cor da tela |

Se a TV estiver em paisagem no Windows, gire a tela em *Configurações → Vídeo → Orientação: Retrato*.
A escala do Windows (100%, 150%…) não afeta o layout.

Fluxo: Capa → Como Jogar → Perguntas 1–4 → Parabéns → Tela Final → (reset automático) Capa.

## Rodar

```bash
npm install
npm start        # kiosk/fullscreen (produção)
npm run dev      # janela 540×960, sem kiosk, atalhos liberados
npm test         # testes ponta a ponta no Electron real
```

**Sair do kiosk (manutenção):** `Ctrl+Shift+Alt+Q` (configurável em `maintenance.exitShortcut`).
Ctrl+R, F5, F11, F12, Ctrl+W, zoom e fechar a janela (Alt+F4) ficam bloqueados no kiosk.

## Onde alterar cada coisa

| O quê | Arquivo |
|---|---|
| Perguntas, áreas corretas, mensagem de erro, cores, ordem | `src/data/questions.js` |
| Textos das telas | `src/data/content.js` |
| Áreas do móvel (IDs, etiquetas, cores, posição em %) | `src/data/furniture-layout.js` |
| Kiosk, tempos, QR Code, assets, sons, debug | `config/app-config.json` |

Textos aceitam `**negrito**` e `\n` para quebrar linha.

### Áreas do móvel → respostas (conforme o material)

| Pergunta | Área(s) correta(s) |
|---|---|
| 1 — Gestação e pós-parto | `area-09` Gestantes e Autocuidado Feminino |
| 2 — Pele normal | `area-01` e `area-03` Pele Normal (as duas prateleiras) |
| 3 — Pele muito sensível | `area-04` Pele Muito Sensível |
| 4 — Pele muito seca e atópica | `area-02` Dermatite Atópica |

### `config/app-config.json`

- `fullscreen`, `kiosk`, `width`, `height`, `hideCursor`, `preventDisplaySleep`
- `devOverrides`: valores usados com `npm run dev`
- `timing.correctFeedbackMs`: tempo do "Uauu! Arrasou!" antes de avançar
- `timing.errorFeedbackMs`: o card de erro some sozinho após esse tempo (ou ao tocar nele)
- `timing.errorDismissGuardMs`: evita que o mesmo toque que errou feche o card
- `timing.idleResetMs`: sem toques por esse tempo → `resetGame()` (volta à capa)
- `timing.finalScreenResetMs`: tempo na tela final antes do `resetGame()`
- `gameplay.keepPreviousAnswersRevealed`: manter acesas as respostas já acertadas
- `gameplay.showProgressLabel`: texto "PERGUNTA X DE 4" sob as bolinhas
- `qrCode.url` / `qrCode.imagePath`: **pendente** — URL não definida no material
- `assets.logo` / `assets.furnitureImage` / `assets.background`: caminhos relativos a `src/`
- `sounds.*`: arquivos opcionais; `null` = sem som
- `debug.showPlaceholderLabels`: etiquetas rosa marcando placeholders (desligar na entrega)
- `debug.showHitboxes`: mostra as áreas de toque (útil ao encaixar a arte oficial)
- Variável de ambiente `MUSTELA_CONFIG` aponta para outro arquivo de config.

## Arquitetura

```
main.js        processo principal: janela kiosk, bloqueios, atalho de manutenção
preload.js     expõe só window.kiosk.getConfig() (contextIsolation, sem Node no renderer)
src/js/app.js        boot: config, escala do palco, Pointer Events → ações do jogo
src/js/game.js       ESTADO CENTRAL (gameState) e todas as transições; resetGame()
src/js/screens.js    view: render(viewModel) idempotente, sem regras de jogo
src/js/furniture.js  móvel: arte/placeholder + máscaras de escurecimento + hitboxes
src/js/dom.js        utilitários (negrito, logo placeholder, animações)
```

O móvel tem três camadas com as mesmas coordenadas: arte (placeholder ou imagem oficial),
máscara escura por área (some ao acertar) e hitbox transparente `.interactive-area[data-area-id]`.
Trocar a arte não exige mexer na lógica — só ajustar as porcentagens em `furniture-layout.js`.

## Pendências (TODO)

- Assets oficiais: logo, móvel, produtos, fundo, fontes, sons (ver README de cada pasta em `src/assets/`).
- URL do QR Code.
- Desligar `debug.showPlaceholderLabels` quando os assets finais entrarem.
