(function () {
  "use strict";

  const noiseSelector =
    "button,svg,script,style,nav,aside,footer,form,[role='alert'],[role='status'],[aria-live='polite'],[data-testid*='toast' i],[class*='toast' i]";

  function visible(node) {
    if (!(node instanceof Element)) return false;
    const style = getComputedStyle(node);
    return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length > 0;
  }

  function detectRoot() {
    const explicit = document.querySelector(
      "[role='log'],[role='main'],main,[aria-label*='chat' i],[aria-label*='conversation' i]"
    );
    if (explicit && visible(explicit)) return explicit;
    const candidates = Array.from(document.querySelectorAll(
      "[role='article'],[data-message],[data-testid*='message' i],[data-role*='user' i],[data-role*='assistant' i]"
    ));
    if (candidates.length) {
      let node = candidates[0];
      while (node.parentElement && node.parentElement !== document.body) {
        node = node.parentElement;
        if (node.getBoundingClientRect().height > 900) break;
      }
      if (visible(node)) return node;
    }
    return document.querySelector("main") || document.body;
  }

  function escapeInline(text) {
    return text.replace(/\\/g, "\\\\").replace(/([*_`<>\[\]])/g, "\\$1");
  }

  function noise(node) {
    if (!node || node.nodeType !== 1) return false;
    return ["SCRIPT","STYLE","NAV","ASIDE","FOOTER","FORM","BUTTON","SVG","CANVAS"].includes(node.tagName) ||
      node.matches(noiseSelector);
  }

  function markdownFor(node) {
    if (noise(node)) return "";
    if (node.nodeType === 3) return escapeInline(node.textContent);
    if (node.nodeType !== 1) return "";
    const tag = node.tagName;
    const children = () => Array.from(node.childNodes).map(markdownFor).join("");
    if (tag === "BR") return "  \n";
    if (tag === "B" || tag === "STRONG") return `**${children().trim()}**`;
    if (tag === "I" || tag === "EM") return `*${children().trim()}*`;
    if (tag === "CODE") {
      if (node.parentElement?.tagName === "PRE") return node.textContent;
      return `\`${node.textContent.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
    }
    if (tag === "PRE") {
      const code = node.querySelector("code") || node;
      const classes = `${code.className || node.className || ""}`;
      const language = (classes.match(/(?:language|lang)-([a-z0-9_+-]+)/i) || ["",""])[1];
      return `\n\`\`\`${language}\n${code.textContent.replace(/\n$/, "")}\n\`\`\`\n`;
    }
    if (tag === "A") {
      const href = node.getAttribute("href");
      return href ? `[${children().trim()}](${href})` : children();
    }
    if (/^H[1-6]$/.test(tag)) return `\n${"#".repeat(Number(tag[1]))} ${children().trim()}\n`;
    if (tag === "P" || tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") return `\n${children().trim()}\n`;
    if (tag === "BLOCKQUOTE") return "\n" + children().trim().split("\n").map((line) => `> ${line}`).join("\n") + "\n";
    if (tag === "UL" || tag === "OL") {
      const items = Array.from(node.children).filter((item) => item.tagName === "LI");
      const ordered = tag === "OL";
      return "\n" + items.map((item, i) => `${ordered ? `${i + 1}.` : "-"} ${Array.from(item.childNodes).map(markdownFor).join("").trim()}`).join("\n") + "\n";
    }
    if (tag === "TABLE") {
      const rows = Array.from(node.querySelectorAll("tr"));
      if (!rows.length) return "";
      const result = rows.map((row) => "| " + Array.from(row.children).filter((cell) => /^(TH|TD)$/.test(cell.tagName)).map((cell) => Array.from(cell.childNodes).map(markdownFor).join("").trim().replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ") + " |");
      const columns = rows[0].querySelectorAll("th,td").length;
      if (columns) result.splice(1, 0, "| " + Array(columns).fill("---").join(" | ") + " |");
      return "\n" + result.join("\n") + "\n";
    }
    if (tag === "HR") return "\n---\n";
    return children();
  }

  function speaker(node) {
    const attributes = [
      node.getAttribute("aria-label"),
      node.getAttribute("data-role"),
      node.getAttribute("data-sender"),
      node.getAttribute("data-author"),
    ].filter(Boolean).join(" ").toLowerCase();
    const text = (node.innerText || node.textContent || "").slice(0, 500).toLowerCase();
    const value = `${attributes} ${text} ${node.className || ""}`.toLowerCase();
    if (/(\buser\b|human|\byou\b)/.test(value)) return "User";
    if (/(\bassistant\b|bot|copilot|model|chatgpt|claude|gemini)/.test(value)) return "Assistant";
    return "Unknown";
  }

  function turnsFor(root) {
    const selector =
      "[role='article'],[role='log'] [role='article'],[data-message],[data-testid*='message' i],[data-role*='user' i],[data-role*='assistant' i],[class*='message' i],[class*='conversation' i],[class*='transcript' i],[class*='markdown' i],[class*='prose' i]";
    let found = Array.from(root.querySelectorAll(selector)).filter(visible);
    if (!found.length) found = Array.from(root.children).filter(visible);
    if (!found.length) found = [root];

    const set = new Set(found);
    const nested = new Set();
    for (const node of found) {
      let parent = node.parentElement;
      while (parent && root.contains(parent)) {
        if (set.has(parent)) nested.add(node);
        parent = parent.parentElement;
      }
    }
    return found
      .filter((node) => !nested.has(node))
      .map((node, index) => ({ index: index + 1, speaker: speaker(node), node }))
      .filter((turn) => (turn.node.innerText || turn.node.textContent || "").trim());
  }

  async function loadTurns(root) {
    let height = -1;
    for (let i = 0; i < 12; i++) {
      root.scrollTo?.({ top: root.scrollHeight, behavior: "instant" });
      root.scrollTop = root.scrollHeight;
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (root.scrollHeight === height) break;
      height = root.scrollHeight;
    }
  }

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function buildMarkdown(turns) {
    const now = new Date();
    const timestamp = now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
    const lines = ["# Agent Chat Export", "", `Exported: ${timestamp}`, `Source: ${location.href}`, ""];
    for (const turn of turns) {
      const body = markdownFor(turn.node)
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      lines.push(`### Turn ${turn.index} (${turn.speaker})`, "", body, "");
    }
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function filename() {
    const date = new Date();
    return `agent_chat_export_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.md`;
  }

  function download(markdown) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: filename(), saveAs: true });
  }

  async function copy(text) {
    await navigator.clipboard.writeText(text);
  }

  function handoff(markdown) {
    const state = markdown
      .replace(/^# Agent Chat Export[\s\S]*?Source:.*\n\n/i, "")
      .replace(/^### /gm, "")
      .replace(/```[\s\S]*?```/g, "[code block]")
      .replace(/\s+/g, " ")
      .trim()
      .slice(-5000);
    return [
      "# Context Handoff", "",
      "## Goals", "- Continue and complete the user's objectives from the conversation.", "",
      "## Constraints", "- Preserve existing decisions and avoid repeating completed work.", "",
      "## Current State", state || "- No conversation content was detected.", "",
      "## Next Actions", "- Review the current state and continue from the latest turn.",
    ].join("\n");
  }

  async function createExport() {
    const root = detectRoot();
    await loadTurns(root);
    const turns = turnsFor(root);
    if (!turns.length) throw new Error("No conversation turns detected");
    return buildMarkdown(turns);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      try {
        const markdown = await createExport();
        if (message.action === "download") {
          download(markdown);
          sendResponse({ ok: true, message: "Markdown downloaded" });
        } else if (message.action === "copy") {
          await copy(markdown);
          sendResponse({ ok: true, message: "Markdown copied" });
        } else if (message.action === "handoff") {
          await copy(handoff(markdown));
          sendResponse({ ok: true, message: "Context handoff copied" });
        } else {
          sendResponse({ ok: false, error: "Unknown action" });
        }
      } catch (error) {
        sendResponse({ ok: false, error: error.message || "Export failed" });
      }
    })();
    return true;
  });
})();
