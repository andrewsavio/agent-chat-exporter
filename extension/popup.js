(function () {
  "use strict";

  const status = document.getElementById("status");

  function setStatus(message, error = false) {
    status.textContent = message;
    status.style.color = error ? "#ff8b8b" : "#aeb8c7";
  }

  async function request(action) {
    setStatus("Working...");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab");
      const response = await chrome.tabs.sendMessage(tab.id, { action });
      if (!response?.ok) throw new Error(response?.error || "Export failed");
      setStatus(response.message || "Done");
    } catch (error) {
      setStatus(error.message || "Export failed", true);
    }
  }

  document.getElementById("download").addEventListener("click", () => request("download"));
  document.getElementById("copy").addEventListener("click", () => request("copy"));
  document.getElementById("handoff").addEventListener("click", () => request("handoff"));
})();
