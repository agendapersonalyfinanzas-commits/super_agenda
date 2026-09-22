// src/components/Assistants/TypewriterText.jsx
import React, { useState, useEffect } from 'react';

export default function TypewriterText({ text, speed = 30, className = "" }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText(''); // Reiniciar cada vez que el texto cambie
    if (!text) return;

    let index = 0;
    const intervalId = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed]);

  return (
    <span className={className}>
      {displayedText}
      {/* Cursor parpadeante opcional estilo consola */}
      <span className="animate-pulse font-black text-amber-600">|</span>
    </span>
  );
}