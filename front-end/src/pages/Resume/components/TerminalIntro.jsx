import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './TerminalIntro.css';

const LINES = [
  '> connecting to archive.local ...',
  '> locating record: DENIS_PERESUNKO.cv',
  '> integrity check ......... OK',
  '> decrypting ancient scroll ...',
];

export default function TerminalIntro({ onComplete }) {
  const containerRef = useRef(null);
  const lineRefs = useRef([]);
  const cursorRef = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(containerRef.current, {
          opacity: 0,
          filter: 'blur(6px)',
          duration: 0.7,
          ease: 'power2.inOut',
          onComplete,
        });
      },
    });

    lineRefs.current.forEach((el, i) => {
      if (!el) return;
      const fullText = LINES[i];
      const chars = fullText.split('');
      el.textContent = '';
      tl.to(
        {},
        {
          duration: chars.length * 0.02,
          onUpdate: function () {
            const progress = this.progress();
            const count = Math.floor(progress * chars.length);
            el.textContent = chars.slice(0, count).join('');
          },
        },
        i === 0 ? 0 : '+=0.15'
      );
    });

    tl.to({}, { duration: 0.5 }); // hold before fade-out

    gsap.to(cursorRef.current, {
      opacity: 0,
      repeat: -1,
      yoyo: true,
      duration: 0.5,
      ease: 'steps(1)',
    });

    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="terminal-intro" ref={containerRef} role="status" aria-live="polite">
      <div className="terminal-intro__box">
        {LINES.map((line, i) => (
          <p
            key={line}
            className="terminal-intro__line"
            ref={(el) => (lineRefs.current[i] = el)}
          />
        ))}
        <span className="terminal-intro__cursor" ref={cursorRef}>▮</span>
      </div>
    </div>
  );
}
