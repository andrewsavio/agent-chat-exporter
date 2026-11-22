(function (root) {
  "use strict";

  const BLOCK_TAGS = new Set([
    "P","DIV","SECTION","ARTICLE","H1","H2","H3","H4","H5","H6",
    "UL","OL","LI","BLOCKQUOTE","PRE","TABLE","TR","THEAD","TBODY","HR"
  ]);
  const NOISE_TAGS = new Set([
    "SCRIPT","STYLE","NAV","ASIDE","FOOTER","FORM","BUTTON","SVG","CANVAS"
  ]);

  function escapeInline(text) {
    return text.replace(/\\/g, "\\\\").replace(/([*_`<>\[\]])/g, "\\$1");
  }

  function detectLanguage(node) {
    const code = node.querySelector("code") || node;
    const classes = `${code.className || node.className || ""}`;
    const match = classes.match(/(?:language|lang)-([a-z0-9_+-]+)/i);
    if (match) return match[1];
    const data = code.getAttribute?.("data-language") || node.getAttribute?.("data-language");
    return data || "";
  }

  function isNoise(node) {
    if (!node) return true;
    if (node.nodeType === 1) {
      if (NOISE_TAGS.has(node.tagName)) return true;
      if (node.matches?.("[role='alert'], [role='status'], [aria-live='polite'], [data-testid*='toast' i], [class*='toast' i]")) return true;
    }
    return false;
  }

  function serializeChildren(node, context) {
    let output = "";
    for (const child of Array.from(node.childNodes)) {
      output += serializeNode(child, context);
    }
    return output;
  }

  function serializeNode(node, context) {
    if (isNoise(node)) return "";
    if (node.nodeType === 3) return escapeInline(node.textContent);
    if (node.nodeType !== 1) return "";

    const tag = node.tagName;
    const text = serializeChildren(node, context);
    switch (tag) {
      case "BR": return "  \n";
      case "B":
      case "STRONG": return text ? `**${text.trim()}**` : "";
      case "I":
      case "EM": return text ? `*${text.trim()}*` : "";
      case "CODE": {
        if (node.parentElement?.tagName === "PRE") return text;
        return text ? `\`${text.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\`` : "";
      }
      case "PRE": {
        const code = node.querySelector("code")?.textContent || node.textContent || "";
        const language = detectLanguage(node);
        return `\n\`\`\`${language}\n${code.replace(/\n$/, "")}\n\`\`\`\n`;
      }
      case "A": {
        const href = node.getAttribute("href");
        return href ? `[${text.trim()}](${href})` : text;
      }
      case "H1":
      case "H2":
      case "H3":
      case "H4":
      case "H5":
      case "H6": {
        const level = Number(tag.slice(1));
        return `\n${"#".repeat(level)} ${text.trim()}\n`;
      }
      case "P": return `\n${text.trim()}\n`;
      case "BLOCKQUOTE": return `\n${text.trim().split("\n").map((line) => `> ${line}`).join("\n")}\n`;
      case "UL":
      case "OL": {
        const ordered = tag === "OL";
        const items = Array.from(node.children).filter((child) => child.tagName === "LI");
        return "\n" + items.map((li, i) => `${ordered ? `${i + 1}.` : "-"} ${serializeChildren(li, context).trim()}`).join("\n") + "\n";
      }
      case "TABLE": return serializeTable(node);
      case "HR": return "\n---\n";
      case "DIV":
      case "SECTION":
      case "ARTICLE": return text + (node.getAttribute("role") ? "\n" : "");
      default: return BLOCK_TAGS.has(tag) ? `\n${text}\n` : text;
    }
  }

  function serializeTable(table) {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (!rows.length) return "";
    const markdown = rows.map((row) =>
      "| " + Array.from(row.children)
        .filter((cell) => ["TH", "TD"].includes(cell.tagName))
        .map((cell) => serializeChildren(cell, {}).trim().replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " "))
        .join(" | ") + " |"
    );
    const first = rows[0];
    const columns = first.querySelectorAll("th,td").length;
    if (columns) markdown.splice(1, 0, "| " + Array(columns).fill("---").join(" | ") + " |");
    return "\n" + markdown.join("\n") + "\n";
  }

  function collapseBlankLines(markdown) {
    return markdown
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\n+|\n+$/g, "")
      .trim();
  }

  function domToMarkdown(node) {
    if (!node) return "";
    return collapseBlankLines(serializeNode(node, {}));
  }

  const api = { domToMarkdown, escapeInline, detectLanguage, collapseBlankLines };
  root.ACEMarkdown = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
