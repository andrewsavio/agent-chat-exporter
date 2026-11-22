# agent-chat-exporter

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-blue.svg)](extension/manifest.json)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg)](#)
[![CI](https://github.com/andrewsavio/agent-chat-exporter/actions/workflows/ci.yml/badge.svg)](https://github.com/andrewsavio/agent-chat-exporter/actions/workflows/ci.yml)

Zero-dependency Chrome Extension (Manifest V3) + bookmarklet that exports conversations from web-based AI agent and chat UIs into clean Markdown.

It works on most agent/chat UIs by combining repeated-message heuristics, semantic selectors, and a main/body fallback. It preserves headings, links, lists, tables, inline code, and fenced code blocks, while removing navigation and other interface noise.

## Demo

![Demo GIF placeholder](demo-placeholder.gif)

## Quickstart

### Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this repository's `extension` directory.
4. Open a chat UI and click the extension toolbar action.
5. Download Markdown, copy Markdown, or copy a structured context handoff.

### Bookmarklet

1. Open `bookmarklet/bookmarklet.js` and copy its contents.
2. Create a browser bookmark and set its URL to `javascript:` followed by the copied code.
3. Open a chat UI and activate the bookmark. The Markdown file is downloaded automatically.

The bookmarklet is console/browser JavaScript and does not require an extension or third-party library.

## Supported pages

`agent-chat-exporter` is UI-agnostic and works on most chat surfaces, including ChatGPT-like, Claude-like, Copilot-like, internal agents, and custom agent UIs. It does not promise exact extraction for every page and virtualized lists are loaded on a best-effort basis.

No conversation data is sent anywhere. Extraction, formatting, clipboard operations, and downloads happen locally in the browser.

## Add a new site selector

Site-specific hints belong in `src/extract.js`:

1. Add semantic or test-id selectors to `detectTranscriptRoot()` or `collectCandidates()`.
2. If a product uses a stable speaker attribute, add it to `speakerFor()`.
3. Keep selectors additive; prefer `[data-role]`, `[role]`, `aria-*`, or stable test IDs over deeply coupled layout classes.
4. Return the smallest repeated turn container, not the entire page.
5. Run `node --test` and add a test for filename or export formatting when relevant.

Example:

```js
const CUSTOM_TURN_SELECTOR = "[data-example-chat-turn]";
```

Then include that selector in the existing candidate selector list. The top-level-candidate pass removes nested duplicates and keeps extraction linear in normal chat trees.

## Security

The exporter runs locally in the page and browser. It makes no network requests, stores no chat data, and sends no transcript content to a server. Download and clipboard behavior are initiated only by an explicit button or bookmarklet action.

## Development

No build step or package installation is required.

```sh
node --check src/extract.js
node --check src/domToMarkdown.js
node --check src/export.js
node --test
```

The CI workflow validates `extension/manifest.json`, checks JavaScript syntax, and runs the lightweight tests.

## Contributing

Contributions are welcome. Please keep the implementation zero-dependency and avoid site-only parsing that would break generic extraction.
