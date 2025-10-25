import { useState, useEffect } from 'react';

interface CodeTypingAnimationProps {
  code: string;
  speed?: number;
  onComplete?: () => void;
}

export function CodeTypingAnimation({ code, speed = 5, onComplete }: CodeTypingAnimationProps) {
  const [displayedCode, setDisplayedCode] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < code.length) {
      const timeout = setTimeout(() => {
        setDisplayedCode(prev => prev + code[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === code.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, code, speed, onComplete]);

  useEffect(() => {
    setDisplayedCode('');
    setCurrentIndex(0);
  }, [code]);

  return <>{displayedCode}</>;
}
