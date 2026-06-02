import { useEffect, useMemo, useState } from "react";

const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[];:,.<>/?";

function randomChar(charset) {
  return charset[Math.floor(Math.random() * charset.length)];
}

export default function EncryptedText({
  text,
  className = "",
  revealDelayMs = 50,
  flipDelayMs = 50,
  charset = DEFAULT_CHARSET,
  encryptedClassName = "",
  revealedClassName = "",
}) {
  const characters = useMemo(() => Array.from(text), [text]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [scrambled, setScrambled] = useState(() =>
    characters.map((char) => (char === " " ? " " : randomChar(charset)))
  );

  useEffect(() => {
    setRevealedCount(0);
    setScrambled(characters.map((char) => (char === " " ? " " : randomChar(charset))));
  }, [characters, charset]);

  useEffect(() => {
    if (revealedCount >= characters.length) return undefined;

    const timeout = window.setTimeout(() => {
      setRevealedCount((count) => Math.min(count + 1, characters.length));
    }, revealDelayMs);

    return () => window.clearTimeout(timeout);
  }, [characters.length, revealDelayMs, revealedCount]);

  useEffect(() => {
    if (revealedCount >= characters.length) return undefined;

    const interval = window.setInterval(() => {
      setScrambled((current) =>
        current.map((char, index) => {
          if (index < revealedCount) return characters[index];
          if (characters[index] === " ") return " ";
          return randomChar(charset);
        })
      );
    }, flipDelayMs);

    return () => window.clearInterval(interval);
  }, [characters, charset, flipDelayMs, revealedCount]);

  return (
    <span className={className} aria-label={text}>
      {characters.map((char, index) => {
        const revealed = index < revealedCount;
        return (
          <span
            aria-hidden="true"
            className={revealed ? revealedClassName : encryptedClassName}
            key={`${char}-${index}`}
          >
            {revealed ? char : scrambled[index]}
          </span>
        );
      })}
    </span>
  );
}
