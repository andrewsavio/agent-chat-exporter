"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const markdown = require("../src/domToMarkdown.js");
const exporter = require("../src/export.js");

test("filename follows agent_chat_export pattern", () => {
  const date = new Date(2026, 0, 2, 3, 4, 5);
  assert.equal(exporter.filenameFor(date), "agent_chat_export_2026-01-02_0304.md");
});

test("collapseBlankLines trims and normalizes whitespace", () => {
  assert.equal(
    markdown.collapseBlankLines("\n\nHello\r\n\r\n\r\nWorld\n\n"),
    "Hello\n\nWorld"
  );
});

test("context handoff has required structured sections", () => {
  const handoff = exporter.buildContextHandoff(
    "# Agent Chat Export\n\nSource: https://example.com\n\n### Turn 1 (User)\n\nBuild a tool"
  );
  for (const heading of ["# Context Handoff", "## Goals", "## Constraints", "## Current State", "## Next Actions"]) {
    assert.ok(handoff.includes(heading));
  }
});
