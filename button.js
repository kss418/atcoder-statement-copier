(() => {
  const copier = (globalThis.AtCoderCopier ??= {});

  copier.createButton = () => {
    const statement = document.getElementById("task-statement");
    if (!statement) return null;

    const existing = document.getElementById("asc-copy-button");
    if (existing) return existing;

    const button = document.createElement("button");
    button.id = "asc-copy-button";
    button.className = "btn btn-default btn-sm asc-copy-button";
    button.type = "button";
    button.textContent = "Copy statement";

    const title = statement.parentElement?.querySelector(".h2, h2");
    const editorial = title?.querySelector('a[href$="/editorial"]');

    if (editorial) {
      // Keep both actions together when the task title wraps on narrow screens.
      const actions = document.createElement("span");
      actions.className = "asc-title-actions";
      editorial.before(actions);
      actions.append(editorial, button);
    } else if (title) {
      title.append(" ", button);
    } else {
      statement.before(button);
    }
    return button;
  };
})();
