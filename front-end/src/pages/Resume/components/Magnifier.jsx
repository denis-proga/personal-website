import { useEffect, useRef, useState, useCallback } from 'react';
import './Magnifier.css';

const LENS_SIZE = 190;   // diameter of the glass, px
const ZOOM = 2.1;        // magnification factor

/**
 * A draggable magnifying glass that genuinely magnifies whatever is under it.
 *
 * How it works: the element passed in `sourceRef` is deep-cloned into the lens
 * and scaled up. Because the clone is real DOM, everything magnifies — text,
 * buttons, the paper texture, the avatar video — rather than a blurry bitmap
 * of it. The clone is inert (pointer-events off, aria-hidden) and is refreshed
 * whenever the content could have changed.
 *
 * Только для устройств с настоящим курсором. На тач-экранах лупа не
 * показывается: она построена на клонировании всего листа и пересчёте позиции
 * по координатам указателя — на телефоне это и тормозило (клон резюме целиком
 * при каждом обновлении), и промахивалось мимо точки наведения из-за
 * расхождения визуального и layout viewport.
 */
export default function Magnifier({ sourceRef }) {
  const lensRef = useRef(null);
  const innerRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [pos, setPos] = useState({ x: 90, y: 220 }); // where it starts: left side
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);

  const isCoarsePointer =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(pointer: coarse)').matches ?? false);

  // Rebuild the magnified copy of the page
  const syncClone = useCallback(() => {
    if (isCoarsePointer) return;
    const source = sourceRef.current;
    const inner = innerRef.current;
    if (!source || !inner) return;

    const rect = source.getBoundingClientRect();
    const clone = source.cloneNode(true);

    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    clone.style.pointerEvents = 'none';
    clone.style.margin = '0';

    // Kill CSS animations and transitions inside the clone. A fresh clone
    // restarts them from frame zero — so the nav, which fades in with a 0.5s
    // delay, would blink out and back in every time the clone was rebuilt.
    // Inline styles that GSAP already applied are copied as-is and unaffected.
    clone.style.animation = 'none';
    clone.style.transition = 'none';
    clone.querySelectorAll('*').forEach((el) => {
      el.style.animation = 'none';
      el.style.transition = 'none';
    });

    inner.replaceChildren(clone);
    inner.style.width = `${rect.width}px`;
    inner.style.height = `${rect.height}px`;

    setReady(true);
  }, [sourceRef, isCoarsePointer]);

  // Keep the magnified view aligned with the lens position
  const positionClone = useCallback(() => {
    if (isCoarsePointer) return;
    const source = sourceRef.current;
    const inner = innerRef.current;
    const lens = lensRef.current;
    if (!source || !inner || !lens) return;

    const sourceRect = source.getBoundingClientRect();
    const lensRect = lens.getBoundingClientRect();

    // Point of the source currently sitting under the middle of the glass
    const focusX = lensRect.left + lensRect.width / 2 - sourceRect.left;
    const focusY = lensRect.top + lensRect.height / 2 - sourceRect.top;

    const offsetX = -focusX * ZOOM + lensRect.width / 2;
    const offsetY = -focusY * ZOOM + lensRect.height / 2;

    inner.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${ZOOM})`;
  }, [sourceRef, isCoarsePointer]);

  // The lens has to be live the moment the page opens, not once the paper has
  // finished unrolling. So: clone straight away, then keep re-cloning while the
  // unroll is running (the sheet changes every frame), and stop once it settles.
  // After that the clone is refreshed only on demand — on pick-up and on resize.
  useEffect(() => {
    if (isCoarsePointer) return;

    syncClone();
    positionClone();

    const REFRESH_MS = 120;
    const ANIMATION_WINDOW_MS = 4000;

    const interval = setInterval(() => {
      syncClone();
      positionClone();
    }, REFRESH_MS);

    const stop = setTimeout(() => clearInterval(interval), ANIMATION_WINDOW_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [syncClone, positionClone, isCoarsePointer]);

  useEffect(() => {
    if (ready) positionClone();
  }, [pos, ready, positionClone]);

  useEffect(() => {
    if (isCoarsePointer) return;

    function onResize() {
      syncClone();
      positionClone();
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncClone, positionClone, isCoarsePointer]);

  // ---- dragging ----

  function handlePointerDown(e) {
    const lensRect = lensRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - lensRect.left,
      y: e.clientY - lensRect.top,
    };
    setDragging(true);
    // Re-clone on pick-up so the magnified copy reflects the current state
    // (language switched, animation finished, theme toggled...).
    syncClone();
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!dragging) return;
    const nextX = e.clientX - dragOffsetRef.current.x;
    const nextY = e.clientY - dragOffsetRef.current.y;

    // The glass is allowed to hang off the edges — otherwise its centre can
    // never reach things pinned in the corners, like the nav buttons. We only
    // keep enough of it on screen to grab it again.
    const OVERHANG = LENS_SIZE * 0.55;

    setPos({
      x: Math.min(Math.max(-OVERHANG, nextX), window.innerWidth - LENS_SIZE + OVERHANG),
      y: Math.min(Math.max(-OVERHANG, nextY), window.innerHeight - LENS_SIZE + OVERHANG),
    });
  }

  function handlePointerUp(e) {
    setDragging(false);
    // position state already holds where it was dropped — it simply stays there
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  // Ранний выход только ПОСЛЕ всех хуков: правила хуков запрещают выходить из
  // компонента до их вызова, иначе при смене условия порядок хуков разъедется.
  if (isCoarsePointer) return null;

  return (
    <div
      ref={lensRef}
      className={`magnifier ${dragging ? 'is-dragging' : ''}`}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${LENS_SIZE}px`,
        height: `${LENS_SIZE}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="img"
      aria-label="Magnifying glass"
    >
      <span className="magnifier__handle" aria-hidden="true" />

      <div className="magnifier__glass">
        <div className="magnifier__viewport">
          <div className="magnifier__inner" ref={innerRef} />
        </div>
        <span className="magnifier__sheen" aria-hidden="true" />
        <span className="magnifier__rim" aria-hidden="true" />
      </div>
    </div>
  );
}
