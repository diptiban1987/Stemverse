'use client';

import { useEffect, useState } from 'react';

const PHRASES = [
  'Build Robots',
  'Create AI Projects',
  'Learn Future Skills',
  'Simulate Hardware',
  'Invent Tomorrow',
];

export function TypingHero() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const phrase = PHRASES[phraseIndex];
    const timeout = setTimeout(
      () => {
        if (!deleting) {
          const next = phrase.slice(0, text.length + 1);
          setText(next);
          if (next === phrase) {
            setTimeout(() => setDeleting(true), 1800);
          }
        } else {
          const next = phrase.slice(0, text.length - 1);
          setText(next);
          if (next === '') {
            setDeleting(false);
            setPhraseIndex((i) => (i + 1) % PHRASES.length);
          }
        }
      },
      deleting ? 40 : 80,
    );
    return () => clearTimeout(timeout);
  }, [text, deleting, phraseIndex]);

  return (
    <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
      {text}
      <span className="animate-pulse">|</span>
    </span>
  );
}

export function ParticleBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary/30 animate-float"
          style={{
            left: `${(i * 17) % 100}%`,
            top: `${(i * 23) % 100}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${4 + (i % 5)}s`,
          }}
        />
      ))}
    </div>
  );
}
