(function (root) {
  "use strict";

  function timestampParts(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const iso = date.toISOString();
    return {
      exported: iso.replace("T", " ").replace(/\.\d{3}Z$/, " UTC"),
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      time: `${pad(date.getHours())}${pad(date.getMinutes())}`,
    };
  }

  function filenameFor(date = new Date()) {
    const parts = timestampParts(date);
    return `agent_chat_export_${parts.date}_${parts.time}.md`;
  }

  function buildMarkdown(turns, markdownApi, options = {}) {
    const date = options.date || new Date();
    const parts = timestampParts(date);
    const url = options.url || (typeof location !== "undefined" ? location.href : "");
    const lines = [
      "# Agent Chat Export",
      "",
      `Exported: ${parts.exported}`,
      `Source: ${url}`,
      "",
    ];
    for (const turn of turns) {
      const label = turn.speaker === "Unknown" ? "Unknown" : turn.speaker;
      const content = markdownApi.domToMarkdown(turn.htmlNodeRef);
      lines.push(`### Turn ${turn.index} (${label})`, "", content, "");
    }
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function downloadMarkdown(markdown, date) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    if (typeof chrome !== "undefined" && chrome.downloads?.download) {
      chrome.downloads.download({ url, filename: filenameFor(date), saveAs: true });
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFor(date);
      link.click();
    }
  }

  async function copyToClipboard(markdown) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(markdown);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = markdown;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Clipboard copy was blocked");
    return true;
  }

  function buildContextHandoff(markdown) {
    const stripped = markdown
      .replace(/^# Agent Chat Export[\s\S]*?Source:.*\n\n/i, "")
      .replace(/^### /gm, "")
      .replace(/```[\s\S]*?```/g, "[code block]")
      .replace(/\s+/g, " ")
      .trim();
    const excerpt = stripped.length > 5000 ? stripped.slice(-5000) : stripped;
    return [
      "# Context Handoff",
      "",
      "## Goals",
      "- Continue and complete the user's objectives from the conversation.",
      "",
      "## Constraints",
      "- Preserve existing decisions and avoid repeating completed work.",
      "",
      "## Current State",
      excerpt || "- No conversation content was detected.",
      "",
      "## Next Actions",
      "- Review the current state and continue from the latest turn.",
    ].join("\n");
  }

  const api = { timestampParts, filenameFor, buildMarkdown, downloadMarkdown, copyToClipboard, buildContextHandoff };
  root.ACEExport = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
