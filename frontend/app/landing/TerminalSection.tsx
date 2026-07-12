'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TERMINAL_LINES } from './terminalLines';

const TICK_MS = 26; // ms per character tick
const LINE_PAUSE_TICKS = Math.round(500 / TICK_MS); // idle ticks between completed lines

interface TypewriterState {
  lines: string[]; // completed lines, kept permanently
  currentLine: string; // the line currently being typed
  lineIndex: number; // index into TERMINAL_LINES for the line being typed
  charIndex: number; // how many characters of the current line are shown
  pauseTicksLeft: number; // idle ticks remaining after a line just completed
}

const INITIAL_STATE: TypewriterState = {
  lines: [],
  currentLine: '',
  lineIndex: 0,
  charIndex: 0,
  pauseTicksLeft: 0,
};

/**
 * Single reducer-style tick function -- one state object, one setState call per
 * interval tick, no nested setState-inside-setState. This replaces an earlier
 * implementation that split progress across several refs/states updated inside each
 * other's functional updaters, which was fragile: any interruption to that chain
 * (re-render, remount) silently killed the animation after whatever line was
 * mid-flight -- the exact "stuck after one line" bug that was reported. A plain
 * `setInterval` reading and writing a single state value has nothing long-lived to
 * go stale, and trivially restarts from scratch if the component remounts.
 */
function advance(state: TypewriterState): TypewriterState {
  if (state.pauseTicksLeft > 0) {
    return { ...state, pauseTicksLeft: state.pauseTicksLeft - 1 };
  }

  const fullLine = TERMINAL_LINES[state.lineIndex % TERMINAL_LINES.length];
  const nextCharIndex = state.charIndex + 1;
  const partial = fullLine.slice(0, nextCharIndex);

  if (nextCharIndex >= fullLine.length) {
    // Line just completed: move it into the permanent `lines` array, reset for the
    // next line, and hold for a beat before starting the next one.
    return {
      lines: [...state.lines, fullLine],
      currentLine: '',
      lineIndex: state.lineIndex + 1,
      charIndex: 0,
      pauseTicksLeft: LINE_PAUSE_TICKS,
    };
  }

  return { ...state, currentLine: partial, charIndex: nextCharIndex };
}

export function TerminalSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<TypewriterState>(INITIAL_STATE);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const intervalId = setInterval(() => {
      setState((prev) => advance(prev));
    }, TICK_MS);
    return () => clearInterval(intervalId);
  }, [isVisible]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) {
      body.scrollTop = body.scrollHeight;
    }
  }, [state.lines, state.currentLine]);

  const allLines = state.currentLine ? [...state.lines, state.currentLine] : state.lines;

  return (
    <section className="kaelis-terminal-section" ref={sectionRef}>
      <div className="kaelis-terminal">
        <div className="kaelis-terminal__chrome">
          <span className="kaelis-terminal__dot kaelis-terminal__dot--red" />
          <span className="kaelis-terminal__dot kaelis-terminal__dot--yellow" />
          <span className="kaelis-terminal__dot kaelis-terminal__dot--green" />
        </div>
        <div className="kaelis-terminal__body" role="log" aria-live="polite" ref={bodyRef}>
          {allLines.map((line, i) => (
            <div className="kaelis-terminal__line kaelis-terminal__line--prompt" key={i}>
              {line}
              {i === allLines.length - 1 && <span className="kaelis-terminal__cursor" aria-hidden />}
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
