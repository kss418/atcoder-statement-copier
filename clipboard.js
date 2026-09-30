(() => {
  const copier = (globalThis.AtCoderCopier ??= {});

  copier.copyText = async (text) => {
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("복사할 지문이 없습니다.");
    }
    if (!navigator.clipboard?.writeText) {
      throw new Error("이 브라우저에서 클립보드 복사를 사용할 수 없습니다.");
    }
    await navigator.clipboard.writeText(text);
  };
})();
