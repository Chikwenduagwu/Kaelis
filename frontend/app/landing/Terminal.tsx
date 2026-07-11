'use client';

import { useEffect, useRef, useState } from 'react';
import { TERMINAL_LINES } from './terminalLines';

const TYPING_SPEED_MS = 28; // per character -- fast enough to feel "AI-thinking", not sluggish
const LINE_PAUSE_MS = 550; // pause after a line finishes before starting the next
const MAX_VISIBLE_LINES = 9; // older lines scroll off, matching the brief's "old lines disappear"

interface RenderedLine {
  text: string;
  complete: boolean;
}

export function Terminal() {
  const [renderedLines, setRenderedLines] = useState<RenderedLine[]>([]);
  const lineIndexRef = useRef(0);
  const charIndexRef = useRef(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    function typeNextChar() {
      const currentLine = TERMINAL_LINES[lineIndexRef.current % TERMINAL_LINES.length];
      charIndexRef.current += 1;

      setRenderedLines((prev) => {
        const next = [...prev];
        const partial = currentLine.slice(0, charIndexRef.current);
        const isComplete = charIndexRef.current >= currentLine.length;

        if (next.length > 0 && !next[next.length - 1].complete) {
          next[next.length - 1] = { text: partial, complete: isComplete };
        } else {
          next.push({ text: partial, complete: isComplete });
        }

        return next.slice(-MAX_VISIBLE_LINES);
      });

      if (charIndexRef.current >= currentLine.length) {
        lineIndexRef.current += 1;
        charIndexRef.current = 0;
        timeoutId = setTimeout(typeNextChar, LINE_PAUSE_MS);
      } else {
        timeoutId = setTimeout(typeNextChar, TYPING_SPEED_MS);
      }
    }

    timeoutId = setTimeout(typeNextChar, 400);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="kaelis-terminal">
      <div className="kaelis-terminal__chrome">
        <span className="kaelis-terminal__dot kaelis-terminal__dot--red" />
        <span className="kaelis-terminal__dot kaelis-terminal__dot--yellow" />
        <span className="kaelis-terminal__dot kaelis-terminal__dot--green" />
      </div>
      <div className="kaelis-terminal__body" role="log" aria-live="polite">
        {renderedLines.map((line, i) => (
          <div className="kaelis-terminal__line" key={i}>
            {line.text}
            {i === renderedLines.length - 1 && (
              <span className="kaelis-terminal__cursor" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
