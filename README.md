# AI Chat to Markdown

An open-source browser tool for saving AI assistant and agent
conversations as Markdown.

> **Project status:** In development. Compatibility and features will
> be updated as the extension is tested.

## Why this project?

Useful conversations often contain code, explanations, and decisions
that are difficult to move between AI tools. This project aims to make
those conversations easier to save, review, and reuse.

## Planned features

- Export visible chat content to a `.md` file.
- Copy Markdown to the clipboard.
- Preserve common formatting such as paragraphs, links, and code blocks.
- Provide a reusable prompt for creating a context handoff.
- Add site-specific adapters as platforms are tested.
- Process exports locally in the browser.

## Compatibility

| Platform | Status |
|---|---|
| ChatGPT | Not yet tested |
| Claude | Not yet tested |
| Gemini | Not yet tested |
| Arena.ai | Tested |
| Other AI chat or agent pages | Not yet tested |

> Websites change their layouts. Some conversations may not export
> completely, particularly if older messages are not currently loaded.

## Privacy

Chat exports may contain personal, confidential, or sensitive
information. Review the exported file before sharing or committing
it to a public repository.

## Roadmap

- [ ] Build and test the browser extension.
- [ ] Add automated tests with sample chat fixtures.
- [ ] Test popular AI chat platforms and document results.
- [ ] Improve support for tables, mathematical notation, and agent output.
- [ ] Add contribution guidelines.

## Contributing

Suggestions, bug reports, and pull requests are welcome. Please avoid
sharing private conversations or sensitive information in issues.

## License

[MIT](LICENSE)
