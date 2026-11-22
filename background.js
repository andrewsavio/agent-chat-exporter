chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // Runs the exact Markdown extractor function from Step 1
      const main = document.querySelector("main") || document.body;
      const md = `# Arena.ai Chat Export\n*URL: ${location.href}*\n\n` + main.innerText;
      const blob = new Blob([md], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `arena_chat_${new Date().toISOString().slice(0,10)}.md`;
      a.click();
    }
  });
});
