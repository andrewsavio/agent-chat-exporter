(function () {
  "use strict";

  function visible(node) {
    if (!(node instanceof Element)) return false;
    const style = getComputedStyle(node);
    return style.display !== "none" && style.visibility !== "hidden" && node.getClientRects().length;
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

  function markdown(node) {
    if (!node) return "";
    if (node.nodeType === 3) return node.textContent.replace(/\\/g, "\\\\").replace(/([*_`])/g, "\\$1");
    if (node.nodeType !== 1) return "";
    if (/^(SCRIPT|STYLE|NAV|ASIDE|FOOTER|FORM|BUTTON|SVG|CANVAS)$/.test(node.tagName)) return "";
    if (node.matches("[role='alert'],[role='status'],[aria-live='polite'],[class*='toast' i]")) return "";
    const tag = node.tagName;
    const children = () => Array.from(node.childNodes).map(markdown).join("");
    if (tag === "BR") return "  \n";
    if (tag === "STRONG" || tag === "B") return `**${children().trim()}**`;
    if (tag === "EM" || tag === "I") return `*${children().trim()}*`;
    if (tag === "CODE") return node.parentElement?.tagName === "PRE" ? node.textContent : `\`${node.textContent.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
    if (tag === "PRE") {
      const code = node.querySelector("code") || node;
      const match = `${code.className || node.className || ""}`.match(/(?:language|lang)-([a-z0-9_+-]+)/i);
      return `\n\`\`\`${match ? match[1] : ""}\n${code.textContent.replace(/\n$/, "")}\n\`\`\`\n`;
    }
    if (tag === "A") {
      const href = node.getAttribute("href");
      return href ? `[${children().trim()}](${href})` : children();
    }
    if (/^H[1-6]$/.test(tag)) return `\n${"#".repeat(Number(tag[1]))} ${children().trim()}\n`;
    if (tag === "P" || tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") return `\n${children().trim()}\n`;
    if (tag === "BLOCKQUOTE") return "\n" + children().trim().split("\n").map((line) => `> ${line}`).join("\n") + "\n";
    if (tag === "UL" || tag === "OL") {
      const ordered = tag === "OL";
      return "\n" + Array.from(node.children).filter((li) => li.tagName === "LI")
        .map((li, i) => `${ordered ? `${i + 1}.` : "-"} ${Array.from(li.childNodes).map(markdown).join("").trim()}`)
        .join("\n") + "\n";
    }
    if (tag === "TABLE") {
      const rows = Array.from(node.querySelectorAll("tr"));
      if (!rows.length) return "";
      const out = rows.map((row) => "| " + Array.from(row.children).map((cell) =>
        Array.from(cell.childNodes).map(markdown).join("").trim().replace(/\\/g, "\\\\").replace(/\|/g, "\\|")
      ).join(" | ") + " |");
      const count = rows[0].children.length;
      if (count) out.splice(1, 0, "| " + Array(count).fill("---").join(" | ") + " |");
      return "\n" + out.join("\n") + "\n";
    }
    if (tag === "HR") return "\n---\n";
    return children();
  }

  function speaker(node) {
    const value = [
      node.getAttribute("aria-label"),
      node.getAttribute("data-role"),
      node.getAttribute("data-sender"),
      node.className,
      (node.innerText || "").slice(0, 500),
    ].join(" ").toLowerCase();
    if (/(\buser\b|human|\byou\b)/.test(value)) return "User";
    if (/(\bassistant\b|bot|copilot|model|chatgpt|claude|gemini)/.test(value)) return "Assistant";
    return "Unknown";
  }

  async function run() {
    const root = detectRoot();
    let height = -1;
    for (let i = 0; i < 12; i++) {
      root.scrollTo?.({ top: root.scrollHeight, behavior: "instant" });
      root.scrollTop = root.scrollHeight;
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (root.scrollHeight === height) break;
      height = root.scrollHeight;
    }

    const selector = "[role='article'],[data-message],[data-testid*='message' i],[data-role*='user' i],[data-role*='assistant' i],[class*='message' i],[class*='conversation' i],[class*='transcript' i],[class*='markdown' i],[class*='prose' i]";
    let found = Array.from(root.querySelectorAll(selector)).filter(visible);
    if (!found.length) found = Array.from(root.children).filter(visible);
    if (!found.length) found = [root];

    const foundSet = new Set(found);
    const nested = new Set();
    for (const node of found) {
      let parent = node.parentElement;
      while (parent && root.contains(parent)) {
        if (foundSet.has(parent)) nested.add(node);
        parent = parent.parentElement;
      }
    }
    const turns = found.filter((node) => !nested.has(node) && (node.innerText || node.textContent || "").trim());
    if (!turns.length) {
      alert("agent-chat-exporter: no conversation turns detected.");
      return;
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timestamp = now.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
    const lines = ["# Agent Chat Export", "", `Exported: ${timestamp}`, `Source: ${location.href}`, ""];
    turns.forEach((node, i) => {
      const body = markdown(node).replace(/\n{3,}/g, "\n\n").trim();
      lines.push(`### Turn ${i + 1} (${speaker(node)})`, "", body, "");
    });
    const output = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
    const blob = new Blob([output], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent_chat_export_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.md`;
    link.click();
  }

  run().catch((error) => alert(`agent-chat-exporter: ${error.message || error}`));
})();
