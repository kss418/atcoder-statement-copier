(() => {
  const copier = globalThis.AtCoderCopier;
  const button = copier.createButton();
  if (!button || button.dataset.ascInitialized === "true") return;
  button.dataset.ascInitialized = "true";

  let resetTimer;
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    clearTimeout(resetTimer);
    button.disabled = true;
    button.textContent = "Copying…";
    button.removeAttribute("title");

    try {
      // Extract at click time so switching language is reflected immediately.
      const text = copier.extractStatement();
      await copier.copyText(text);
      button.textContent = "Copied!";
    } catch (error) {
      button.textContent = "Copy failed";
      button.title = error instanceof Error ? error.message : String(error);
    } finally {
      button.disabled = false;
      resetTimer = setTimeout(() => {
        button.textContent = "Copy statement";
        button.removeAttribute("title");
      }, 2000);
    }
  });
})();
