import React from 'react';

/**
 * Helper component to render formatted inline text with bold, code, headings, lists,
 * and clean typography without displaying raw markdown symbols or unrendered HTML tags.
 */
export const FormattedInline = ({ text, className = '' }) => {
  if (!text) return null;

  // Pre-clean any stray inline HTML tags like <b>, </b>, <strong>, </strong>, <em>, </em>, <code>, </code>
  let clean = text
    .replace(/<\/?(b|strong)>/gi, '**')
    .replace(/<\/?(i|em)>/gi, '*')
    .replace(/<\/?code>/gi, '`')
    .replace(/<br\s*\/?>/gi, ' ');

  // Split by bold (**text**), inline code (`code`), and italic (*text*)
  const tokens = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let match;
  let lastIndex = 0;
  let key = 0;

  while ((match = pattern.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(<span key={key++}>{clean.substring(lastIndex, match.index)}</span>);
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      const inner = token.slice(2, -2).trim();
      tokens.push(
        <strong key={key++} className="font-bold text-slate-900 dark:text-white px-1 py-0.5 rounded bg-blue-50/70 dark:bg-slate-800/80 border border-blue-200/50 dark:border-slate-700">
          {inner}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const inner = token.slice(1, -1).trim();
      tokens.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 mx-0.5 text-xs font-mono rounded-md bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-slate-700"
        >
          {inner}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const inner = token.slice(1, -1).trim();
      tokens.push(
        <em key={key++} className="italic text-slate-700 dark:text-slate-300">
          {inner}
        </em>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < clean.length) {
    tokens.push(<span key={key++}>{clean.substring(lastIndex)}</span>);
  }

  return <span className={className}>{tokens.length > 0 ? tokens : clean}</span>;
};

const MarkdownRenderer = ({ content = '', className = '' }) => {
  if (!content || typeof content !== 'string') return null;

  // Pre-process: Convert common HTML block tags into clean markdown representations
  let cleanContent = content
    // Clean trailing "Core Takeaways" or "Key Takeaways" duplicated at end of answer
    .replace(/(?:\r\n|\r|\n)(?:#{1,4}\s*)?(?:Core|Key)\s*Takeaways[\s\S]*$/i, '')
    // Normalize HTML Headings: <h1>Text</h1> -> # Text, <h2>Text</h2> -> ## Text, etc.
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
    // Normalize List Items: <li>Item</li> -> - Item
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1\n')
    // Strip container tags
    .replace(/<\/?(ul|ol|p|div|section|span)[^>]*>/gi, '\n')
    // Normalize line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    .trim();

  const lines = cleanContent.split(/\r?\n/);
  const elements = [];
  let currentList = null;
  let listType = null; // 'ul' | 'ol'
  let codeBlock = null;

  const flushList = () => {
    if (currentList && currentList.length > 0) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-3 space-y-2 pl-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0 mt-0.5 border border-blue-200 dark:border-blue-800">
                  {item.number || idx + 1}
                </span>
                <div className="flex-1">
                  <FormattedInline text={item.text} />
                </div>
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-3 space-y-2 pl-1">
            {currentList.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 mt-2 shadow-sm"></span>
                <div className="flex-1">
                  <FormattedInline text={item.text} />
                </div>
              </li>
            ))}
          </ul>
        );
      }
      currentList = null;
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code blocks
    if (trimmed.startsWith('```')) {
      if (codeBlock !== null) {
        elements.push(
          <div
            key={`code-${elements.length}`}
            className="my-3 p-4 rounded-2xl bg-slate-900 dark:bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner"
          >
            <pre>{codeBlock.join('\n')}</pre>
          </div>
        );
        codeBlock = null;
      } else {
        flushList();
        codeBlock = [];
      }
      continue;
    }

    if (codeBlock !== null) {
      codeBlock.push(rawLine);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings (# Heading, ## Heading, ### Heading) -> Render with Bordered Container
    if (trimmed.startsWith('#')) {
      flushList();
      const level = trimmed.match(/^#+/)[0].length;
      const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();

      elements.push(
        <div
          key={`h-${elements.length}`}
          className="my-3.5 pt-1 border-l-4 border-blue-600 dark:border-blue-500 pl-3.5 py-1.5 bg-blue-50/40 dark:bg-blue-950/30 rounded-r-2xl border-y border-r border-blue-100/60 dark:border-blue-900/40"
        >
          <h3 className={`${level <= 2 ? 'text-base sm:text-lg' : 'text-sm sm:text-base'} font-black text-slate-900 dark:text-white tracking-tight`}>
            {headingText}
          </h3>
        </div>
      );
      continue;
    }

    // Standalone bold heading e.g. **What is SQL?** or **Definition of SWM:** -> Render as bordered heading
    if (/^\*\*[^*]+\*\*[:]?$/.test(trimmed)) {
      flushList();
      const headingText = trimmed.replace(/^\*\*|\*\*[:]?$/g, '').replace(/:$/, '').trim();
      elements.push(
        <div
          key={`bold-h-${elements.length}`}
          className="my-3 border-l-4 border-indigo-600 dark:border-indigo-500 pl-3 py-1 bg-indigo-50/40 dark:bg-indigo-950/30 rounded-r-xl border-y border-r border-indigo-100/60 dark:border-indigo-900/40"
        >
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {headingText}
          </h4>
        </div>
      );
      continue;
    }

    // Numbered List: 1. Item or 1) Item
    const numMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
        currentList = [];
      }
      currentList.push({ number: numMatch[1], text: numMatch[2] });
      continue;
    }

    // Bullet List: - item, * item, • item, + item
    const bulletMatch = trimmed.match(/^[-*•+]\s+(.*)/);
    if (bulletMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
        currentList = [];
      }
      currentList.push({ text: bulletMatch[1] });
      continue;
    }

    // Regular paragraph text
    flushList();
    elements.push(
      <p
        key={`p-${elements.length}`}
        className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 my-2.5 first:mt-0 last:mb-0 font-normal"
      >
        <FormattedInline text={trimmed} />
      </p>
    );
  }

  flushList();

  return <div className={`space-y-2 ${className}`}>{elements}</div>;
};

export default MarkdownRenderer;
