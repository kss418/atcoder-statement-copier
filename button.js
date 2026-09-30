(() => {
  const copier = (globalThis.AtCoderCopier ??= {});

  copier.createButton = () => {
    const statement = document.getElementById("task-statement");
    if (!statement) return null;

    const existing = document.getElementById("asc-copy-button");
    if (existing) return existing;

    const button = document.createElement("button");
    button.id = "asc-copy-button";
    button.className = "asc-copy-button";
    button.type = "button";
    button.textContent = "지문 복사";

    // Keep the button outside the statement so it is never copied.
    statement.before(button);
    return button;
  };
})();
