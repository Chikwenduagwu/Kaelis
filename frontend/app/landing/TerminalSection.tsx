'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TERMINAL_LINES } from './terminalLines';

const TYPING_SPEED_MS = 28;
const LINE_PAUSE_MS = 550;
const MAX_VISIBLE_LINES = 9;

interface RenderedLine {
  text: string;
  complete: boolean;
}

export function TerminalSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [renderedLines, setRenderedLines] = useState<RenderedLine[]>([]);
  const lineIndexRef = useRef(0);
  const charIndexRef = useRef(0);

  // Start the typing loop only once the section actually scrolls into view, rather
  // than tying animation progress to scroll position -- this is what makes the
  // section behave consistently across viewport heights instead of the previous
  // scroll-fraction-linked pin, which broke on short mobile screens.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
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

    timeoutId = setTimeout(typeNextChar, 300);
    return () => clearTimeout(timeoutId);
  }, [hasStarted]);

  return (
    <section className="kaelis-terminal-section" ref={sectionRef}>
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
      <Link href="/app" className="kaelis-btn kaelis-btn--primary kaelis-btn--large">
        Launch App
      </Link>
    </section>
  );
  }
        
