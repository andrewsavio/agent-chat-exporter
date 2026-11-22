(function (root) {
  "use strict";

  const NOISE_SELECTOR =
    "button,svg,script,style,nav,aside,footer,form,[role='alert'],[aria-live='polite'],[role='status'],[data-testid*='toast' i]";

  function isVisible(node) {
    if (!(node instanceof Element)) return false;
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);
    return !!(
      style &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      node.getClientRects().length > 0
    );
  }

  function textDensity(node) {
    if (!node || node === document.body) return 0;
    const text = (node.textContent || "").trim();
    return text.length;
  }

  function detectTranscriptRoot(doc = document) {
    const explicit = doc.querySelector(
      "[role='log'], [role='main'], main, [aria-label*='chat' i], [aria-label*='conversation' i]"
    );
    if (explicit && isVisible(explicit)) return explicit;

    const candidates = Array.from(
      doc.querySelectorAll(
        "[role='article'], [data-testid*='message' i], [data-message], [data-role*='user' i], [data-role*='assistant' i]"
      )
    );
    if (candidates.length) {
      let container = candidates[0];
      while (container?.parentElement && container.parentElement !== doc.body) {
        container = container.parentElement;
        const rect = container.getBoundingClientRect();
        if (rect.height > 900) break;
      }
      if (isVisible(container)) return container;
    }

    const main = doc.querySelector("main");
    if (main) return main;

    let best = doc.body;
    let bestScore = textDensity(doc.body);
    for (const node of doc.querySelectorAll("div,section,article")) {
      if (!isVisible(node)) continue;
      if (node.querySelector(NOISE_SELECTOR) === node) continue;
      const score = textDensity(node);
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }
    return best;
  }

  function speakerFor(node) {
    const labels = [
      node.getAttribute?.("aria-label"),
      node.getAttribute?.("data-role"),
      node.getAttribute?.("data-sender"),
      node.getAttribute?.("data-author"),
      node.closest?.("[data-role], [data-sender], [data-author]")
        ? (
            node.closest("[data-role], [data-sender], [data-author]").getAttribute("data-role") ||
            node.closest("[data-role], [data-sender], [data-author]").getAttribute("data-sender") ||
            node.closest("[data-role], [data-sender], [data-author]").getAttribute("data-author")
          )
        : null,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const nearbyText = (node.innerText || node.textContent || "")
      .slice(0, 500)
      .toLowerCase();
    const combined = `${labels} ${nearbyText}`;
    if (/(\buser\b|human|\byou\b)/.test(combined)) return "User";
    if (/(\bassistant\b|bot|copilot|model|chatgpt|claude|gemini)/.test(combined)) return "Assistant";

    const className = `${node.className || ""}`.toLowerCase();
    if (/(^|[\s_-])(user|human)([\s_-]|$)/.test(className)) return "User";
    if (/assistant|bot|copilot/.test(className)) return "Assistant";
    return "Unknown";
  }

  function collectCandidates(root) {
    const selectors =
      "[role='article'], [role='log'] [role='article'], [data-message], [data-testid*='message' i], [data-role*='user' i], [data-role*='assistant' i], [class*='message' i], [class*='conversation' i], [class*='transcript' i], [class*='markdown' i], [class*='prose' i]";
    const found = Array.from(root.querySelectorAll(selectors)).filter(isVisible);

    if (!found.length) {
      const children = Array.from(root.children);
      if (children.length) found.push(...children.filter(isVisible));
      if (!found.length) found.push(root);
    }

    // Keep top-level candidates only. Build a set, then walk each node's
    // ancestors once rather than comparing every candidate pair.
    const foundSet = new Set(found);
    const nested = new Set();
    for (const node of found) {
      let parent = node.parentElement;
      while (parent && root.contains(parent)) {
        if (foundSet.has(parent)) nested.add(node);
        parent = parent.parentElement;
      }
    }
    const top = found.filter((node) => !nested.has(node));
    const seen = new Set();
    return top.filter((node) => {
      const text = (node.innerText || node.textContent || "").trim();
      if (!text || seen.has(node)) return false;
      seen.add(node);
      return text.length >= 2;
    });
  }

  function extractTurns(root = detectTranscriptRoot()) {
    if (!root) return [];
    const candidates = collectCandidates(root);
    return candidates.map((node, index) => ({
      index: index + 1,
      speaker: speakerFor(node),
      htmlNodeRef: node,
    }));
  }

  async function loadVirtualizedTurns(root, maxSteps = 12) {
    if (!root || !root.scrollHeight) return;
    let previousHeight = -1;
    for (let i = 0; i < maxSteps; i++) {
      root.scrollTo?.({ top: root.scrollHeight, behavior: "instant" });
      root.scrollTop = root.scrollHeight;
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (root.scrollHeight === previousHeight) break;
      previousHeight = root.scrollHeight;
    }
  }

  const api = {
    NOISE_SELECTOR,
    detectTranscriptRoot,
    extractTurns,
    collectCandidates,
    speakerFor,
    loadVirtualizedTurns,
  };
  root.ACEExtract = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
