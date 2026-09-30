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
    button.textContent = "복사 중…";
    button.removeAttribute("title");

    try {
      // Extract at click time so switching language is reflected immediately.
      const text = copier.extractStatement();
      await copier.copyText(text);
      button.textContent = "복사 완료!";
    } catch (error) {
      button.textContent = "복사 실패";
      button.title = error instanceof Error ? error.message : String(error);
    } finally {
      button.disabled = false;
      resetTimer = setTimeout(() => {
        button.textContent = "지문 복사";
        button.removeAttribute("title");
      }, 2000);
    }
  });
})();
