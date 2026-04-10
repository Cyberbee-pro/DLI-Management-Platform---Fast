import { Fragment, type ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      tokens.push(
        <a
          key={`${keyPrefix}-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="text-lime-400 underline decoration-lime-400/40 underline-offset-4 transition hover:text-lime-300"
        >
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      tokens.push(
        <code
          key={`${keyPrefix}-${match.index}`}
          className="rounded-sm bg-black px-1.5 py-0.5 font-mono text-[0.92em] text-lime-300"
        >
          {match[4]}
        </code>,
      );
    } else if (match[5]) {
      tokens.push(
        <strong key={`${keyPrefix}-${match.index}`} className="font-semibold text-zinc-100">
          {match[5]}
        </strong>,
      );
    } else if (match[6] || match[7]) {
      tokens.push(
        <em key={`${keyPrefix}-${match.index}`} className="text-zinc-200">
          {match[6] ?? match[7]}
        </em>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens.length > 0 ? tokens : [text];
}

export function TaskMarkdown({ content }: { content: string }) {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index]?.trimEnd() ?? "";

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      index += 1;
      blocks.push(
        <pre
          key={`code-${index}`}
          className="overflow-x-auto rounded-sm border border-neutral-800 bg-black px-4 py-3 font-mono text-sm text-lime-300"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingContent = renderInline(headingMatch[2], `heading-${index}`);

      if (level === 1) {
        blocks.push(
          <h3 key={`heading-${index}`} className="text-xl font-semibold text-zinc-50">
            {headingContent}
          </h3>,
        );
      } else if (level === 2) {
        blocks.push(
          <h4 key={`heading-${index}`} className="text-lg font-semibold text-zinc-100">
            {headingContent}
          </h4>,
        );
      } else {
        blocks.push(
          <h5 key={`heading-${index}`} className="text-sm font-semibold uppercase text-zinc-200">
            {headingContent}
          </h5>,
        );
      }

      index += 1;
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      const items: string[] = [];

      while (index < lines.length) {
        const currentLine = lines[index]?.trim() ?? "";
        const currentMatch = currentLine.match(/^[-*]\s+(.*)$/);

        if (!currentMatch) {
          break;
        }

        items.push(currentMatch[1]);
        index += 1;
      }

      blocks.push(
        <ul key={`list-${index}`} className="space-y-2 pl-5 text-sm leading-6 text-neutral-300">
          {items.map((item, itemIndex) => (
            <li key={`list-item-${index}-${itemIndex}`} className="list-disc">
              {renderInline(item, `list-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      const items: string[] = [];

      while (index < lines.length) {
        const currentLine = lines[index]?.trim() ?? "";
        const currentMatch = currentLine.match(/^\d+\.\s+(.*)$/);

        if (!currentMatch) {
          break;
        }

        items.push(currentMatch[1]);
        index += 1;
      }

      blocks.push(
        <ol key={`ordered-${index}`} className="space-y-2 pl-5 text-sm leading-6 text-neutral-300">
          {items.map((item, itemIndex) => (
            <li key={`ordered-item-${index}-${itemIndex}`} className="list-decimal">
              {renderInline(item, `ordered-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }

      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l border-lime-400/30 pl-4 text-sm leading-6 text-neutral-300"
        >
          {quoteLines.map((quoteLine, quoteIndex) => (
            <Fragment key={`quote-line-${index}-${quoteIndex}`}>
              {renderInline(quoteLine, `quote-${index}-${quoteIndex}`)}
              {quoteIndex < quoteLines.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </blockquote>,
      );
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const currentLine = lines[index]?.trim() ?? "";

      if (
        !currentLine ||
        currentLine.startsWith("```") ||
        /^#{1,3}\s+/.test(currentLine) ||
        /^[-*]\s+/.test(currentLine) ||
        /^\d+\.\s+/.test(currentLine) ||
        currentLine.startsWith(">")
      ) {
        break;
      }

      paragraphLines.push(currentLine);
      index += 1;
    }

    blocks.push(
      <p key={`paragraph-${index}`} className="text-sm leading-7 text-neutral-300">
        {renderInline(paragraphLines.join(" "), `paragraph-${index}`)}
      </p>,
    );
  }

  return <div className="space-y-4">{blocks}</div>;
}
