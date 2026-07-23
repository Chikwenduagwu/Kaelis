'use client';

import { useEffect, useRef, useState } from 'react';

const FAQS = [
  {
    question: 'What makes a distribution "confidential"?',
    answer:
      'Recipient allocations, vesting amounts, and claimed totals are encrypted end-to-end using iExec Nox. Only the recipient -- or someone they explicitly grant view access to -- can ever see the real number. Everyone else sees a handle, not an amount.',
  },
  {
    question: 'Can anyone verify a distribution actually happened?',
    answer:
      'Yes. Every campaign, recipient, and claim is a real on-chain transaction on Ethereum Sepolia. What is hidden is the amount, not the fact that a transfer occurred -- Nox provides confidentiality, not anonymity.',
  },
  {
    question: 'What token can I distribute right now?',
    answer:
      'KaelisToken (kUSD), a native confidential ERC-7984 token. Claim some from the Faucet page to try creating a distribution. Wrapped confidential USDT, USDC, and BTC are planned but not live yet.',
  },
  {
    question: 'How is this different from a normal airdrop or payroll tool?',
    answer:
      'Normal tools store every allocation in plaintext on-chain, visible to anyone. Kaelis keeps amounts encrypted throughout the entire lifecycle -- funding, allocation, vesting, and claim -- while remaining fully auditable by the people who are supposed to see it.',
  },
  {
    question: 'Do I need to trust Kaelis with my funds?',
    answer:
      'No custodial step exists beyond what you explicitly approve in your own wallet. Campaign pools are funded by a direct on-chain transfer you sign yourself, and claims are paid out by the smart contract, not by Kaelis as an intermediary.',
  },
];

const TYPING_SPEED_MS = 14;

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="kaelis-faq" id="faq">
      <h2 className="kaelis-faq__title">Frequently asked</h2>
      <div className="kaelis-faq__list">
        {FAQS.map((item, i) => (
          <FAQItem
            key={item.question}
            question={item.question}
            answer={item.answer}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex((prev) => (prev === i ? null : i))}
          />
        ))}
      </div>
    </section>
  );
}

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [typedText, setTypedText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const charIndexRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      // Reset so re-opening later re-types from scratch, matching the terminal's
      // "AI thinking" feel each time rather than instantly showing cached text.
      setTypedText('');
      setIsDone(false);
      charIndexRef.current = 0;
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    function typeNextChar() {
      if (cancelled) return;
      charIndexRef.current += 1;
      setTypedText(answer.slice(0, charIndexRef.current));

      if (charIndexRef.current >= answer.length) {
        setIsDone(true);
        return;
      }
      timeoutId = setTimeout(typeNextChar, TYPING_SPEED_MS);
    }

    typeNextChar();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [isOpen, answer]);

  return (
    <div className={`kaelis-faq-item${isOpen ? ' kaelis-faq-item--open' : ''}`}>
      <button
        type="button"
        className="kaelis-faq-item__question"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <PlusIcon isOpen={isOpen} />
      </button>

      <div className="kaelis-faq-item__answer-wrap" aria-hidden={!isOpen}>
        <p className="kaelis-faq-item__answer">
          <span className="kaelis-faq-item__prompt">AI &gt; </span>
          {typedText}
          {isOpen && !isDone && <span className="kaelis-faq-item__cursor" aria-hidden />}
        </p>
      </div>
    </div>
  );
}

function PlusIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className={`kaelis-faq-item__icon${isOpen ? ' kaelis-faq-item__icon--open' : ''}`}
    >
      <path d="M9 3v12M3 9h12" stroke="var(--kaelis-gold)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
      }
