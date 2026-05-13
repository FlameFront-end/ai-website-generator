import { useEffect, useRef } from "react";
import hljs from "highlight.js/lib/core";
import langCss from "highlight.js/lib/languages/css";
import langHtml from "highlight.js/lib/languages/xml";
import langJs from "highlight.js/lib/languages/javascript";
import langJson from "highlight.js/lib/languages/json";
import langMarkdown from "highlight.js/lib/languages/markdown";
import langTs from "highlight.js/lib/languages/typescript";
import type { CodeViewerProps } from "../types";

hljs.registerLanguage("javascript", langJs);
hljs.registerLanguage("typescript", langTs);
hljs.registerLanguage("json", langJson);
hljs.registerLanguage("html", langHtml);
hljs.registerLanguage("xml", langHtml);
hljs.registerLanguage("css", langCss);
hljs.registerLanguage("scss", langCss);
hljs.registerLanguage("markdown", langMarkdown);

export function CodeViewer({ content, language, styles }: CodeViewerProps) {
  const codeRef = useRef<HTMLElement>(null);
  const normalizedLanguage = hljs.getLanguage(language) ? language : "plaintext";

  useEffect(() => {
    if (!codeRef.current) return;
    codeRef.current.removeAttribute("data-highlighted");
    codeRef.current.textContent = content;
    if (normalizedLanguage !== "plaintext") {
      hljs.highlightElement(codeRef.current);
    }
  }, [content, normalizedLanguage]);

  const lines = content.split("\n");

  return (
    <div className={styles.codeWrapper}>
      <div className={styles.lineNumbers} aria-hidden="true">
        {lines.map((_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
      <pre className={styles.codeBlock}>
        <code ref={codeRef} className={`language-${normalizedLanguage}`} />
      </pre>
    </div>
  );
}
