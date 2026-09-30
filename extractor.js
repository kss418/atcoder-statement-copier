(() => {
  const copier = (globalThis.AtCoderCopier ??= {});
  const blockTags = /^(P|DIV|SECTION|H[1-6]|UL|OL|TABLE|TR|BLOCKQUOTE)$/;

  function readText(node, preformatted, preserveWhitespace = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue ?? "";
      return preserveWhitespace ? text : text.replace(/\s+/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    if (node.matches("script, style, noscript, button")) return "";

    const style = getComputedStyle(node);
    if (node.hidden || style.display === "none" || style.visibility === "hidden") return "";

    // KaTeX contains both accessible MathML and visual HTML. Read the
    // original formula once instead of copying both rendered versions.
    if (node.matches(".katex")) {
      const formula = node.querySelector('annotation[encoding="application/x-tex"]');
      if (formula) return formula.textContent;
    }
    if (node.tagName === "BR") return "\n";
    if (node.tagName === "IMG") return node.getAttribute("alt") ?? "";

    const isPre = node.tagName === "PRE";
    const text = Array.from(node.childNodes, (child) =>
      readText(child, preformatted, preserveWhitespace || isPre)
    ).join("");

    // Protect samples from paragraph trimming and newline cleanup.
    if (isPre) {
      const index = preformatted.push(text) - 1;
      return `\n\n\u0000${index}\u0000\n\n`;
    }
    if (node.tagName === "LI") return `\n- ${text.trim()}\n`;
    if (node.tagName === "TD" || node.tagName === "TH") return `${text.trim()}\t`;
    if (blockTags.test(node.tagName)) return `\n\n${text.trim()}\n\n`;
    return text;
  }

  copier.extractStatement = () => {
    const statement = document.getElementById("task-statement");
    if (!statement) throw new Error("문제 지문을 찾을 수 없습니다.");

    const languages = Array.from(statement.querySelectorAll(".lang-en, .lang-ja"));
    const source = languages.length
      ? languages.find((element) => element.getClientRects().length > 0)
      : statement;
    if (!source) throw new Error("현재 표시 중인 지문을 찾을 수 없습니다.");

    const preformatted = [];
    let text = readText(source, preformatted)
      .replace(/\r\n?/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/\n[ \t]+\n/g, "\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    text = text.replace(/(\n*)\u0000(\d+)\u0000(\n*)/g, (_, before, index, after) => {
      const original = preformatted[Number(index)];
      const leadingNewlines = original.match(/^\n*/)[0].length;
      const trailingNewlines = original.match(/\n*$/)[0].length;
      // Original sample newlines already provide part of the separator.
      return before.slice(Math.min(before.length, leadingNewlines))
        + original
        + after.slice(Math.min(after.length, trailingNewlines));
    });
    if (!text) throw new Error("복사할 지문이 없습니다.");
    return text;
  };
})();
