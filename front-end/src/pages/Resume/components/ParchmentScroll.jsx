import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import VideoAvatar from './VideoAvatar';
import './ParchmentScroll.css';

export default function ParchmentScroll() {
  const { t } = useTranslation();

  const paperRef = useRef(null);   // the sheet itself — measured, and animated open
  const contentRef = useRef(null); // direct children fade in after the paper opens
  const rollRef = useRef(null);    // the rolled-up cylinder travelling down the sheet
  const rollClipRef = useRef(null); // carries the sheet's torn silhouette as a clip
  const shadowRef = useRef(null);  // depth shadow, masked in step with the sheet

  const [scale, setScale] = useState(1);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Fit-to-viewport: the page itself never scrolls. We measure the sheet's natural
  // size and scale the whole thing down (never up) to fit inside the available space.
  //
  // Critical detail: we measure `paperRef` (the sheet), which is absolutely
  // positioned with a fixed width in CSS. Measuring the *scale wrapper* instead
  // caused a feedback loop — the wrapper is a child of the stage, the stage width
  // was being set from the measurement, so the wrapper got squeezed, its text
  // reflowed, its height changed, we re-measured, and the layout collapsed. That
  // is what broke at zoom levels above 100%. An absolutely positioned, fixed-width
  // element can't be squeezed by the stage, so the measurement is now stable.
  useLayoutEffect(() => {
    function recompute() {
      const el = paperRef.current;
      if (!el) return;
      const naturalWidth = el.offsetWidth;
      const naturalHeight = el.offsetHeight;
      if (!naturalWidth || !naturalHeight) return;

      const availableWidth = window.innerWidth - 48;
      const availableHeight = window.innerHeight - 120;

      const nextScale = Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight);

      setScale(nextScale);
      setStageSize({ width: naturalWidth * nextScale, height: naturalHeight * nextScale });
    }

    recompute();

    // Re-measure on resize, on browser zoom (zoom changes visualViewport scale
    // without always firing a plain resize), and once more after fonts settle.
    window.addEventListener('resize', recompute);
    window.visualViewport?.addEventListener('resize', recompute);

    // ResizeObserver catches content height changes (e.g. language switch making
    // text longer) that no window event would report.
    const ro = new ResizeObserver(recompute);
    if (paperRef.current) ro.observe(paperRef.current);

    const raf = requestAnimationFrame(recompute);
    return () => {
      window.removeEventListener('resize', recompute);
      window.visualViewport?.removeEventListener('resize', recompute);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // React 18 StrictMode mounts effects twice in dev. Without this guard, the
    // first timeline gets killed mid-flight right after it sets the initial
    // "from" state, and the sheet stays collapsed forever.
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    const sheet = paperRef.current;
    const roll = rollRef.current;
    const rollClip = rollClipRef.current;
    const shadow = shadowRef.current;
    if (!sheet || !roll || !rollClip || !shadow) return;

    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;

    // На тач-устройствах разворачивания нет вовсе. mask-image со строкой
    // градиента — это перерисовка области каждый кадр, а её мобильный GPU
    // дёшево делать не умеет: ни троттлинг применения кадров, ни упрощение
    // девятислойного фона листа не убрали рывки до конца — анимация
    // растягивалась с 2.4 секунд до десятков. Лист просто проявляется,
    // рулон не показывается. На десктопе всё ниже работает как прежде.
    if (isCoarsePointer) {
      gsap.set(roll, { display: 'none' });
      gsap.fromTo(sheet, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out' });
      return;
    }

    const fullHeight = sheet.offsetHeight;

    // The clip container must be exactly as tall as the sheet, because its
    // clip-path is expressed in percentages of its own box — same height means
    // the torn silhouette lines up pixel for pixel with the paper's.
    gsap.set(rollClip, { height: fullHeight });

    // Roll thickness: a real roll loses radius as it pays out paper. The paper
    // area stays constant, so radius shrinks with the square root of what's
    // left on the roll — not linearly. That's why it stays fat for most of the
    // travel and then thins out quickly near the end.
    const MAX_THICKNESS = 58;
    const MIN_THICKNESS = 9;

    const state = { p: 0 };

    // The roll fades before it reaches the ragged bottom tear.
    const FADE_START = 0.82;
    const REVEAL_DONE = 0.93;

    // Feathered reveal edge, in pixels. Previously the paper was revealed by a
    // window with overflow:hidden, which cuts with a hard horizontal line —
    // and a hard line crossing the ragged bottom edge is exactly what produced
    // the flickering hairline. A soft gradient edge has no crisp boundary to
    // alias, and it sits under the roll anyway, so it's invisible in motion.
    const FEATHER = 10;

    // The shadow box isn't the same height as the sheet — it sits 16px lower and
    // overhangs the bottom (see .paper-shadow). Feeding it the sheet's reveal
    // distance left a strip at its bottom still masked on the final frame, which
    // then popped into view the moment the mask was removed. Revealing it as a
    // fraction of its *own* height makes it finish exactly with the paper.
    const SHADOW_FEATHER = 34;
    const shadowHeight = shadow.offsetHeight;

    function maskFor(revealedPx, feather) {
      const edge = Math.max(0, revealedPx);
      const solid = Math.max(0, edge - feather);
      return `linear-gradient(to bottom, #000 0px, #000 ${solid}px, rgba(0,0,0,0) ${edge}px)`;
    }

    function applyFrame() {
      const p = state.p;
      const remaining = 1 - p;
      const thickness =
        MIN_THICKNESS + (MAX_THICKNESS - MIN_THICKNESS) * Math.sqrt(remaining);

      const revealProgress = Math.min(1, p / REVEAL_DONE);
      const revealed = Math.round(fullHeight * revealProgress);

      const fadeProgress =
        p <= FADE_START ? 0 : (p - FADE_START) / (1 - FADE_START);
      const opacity = 1 - fadeProgress;

      // The feather leads the reveal line rather than trailing it. Trailing left
      // the sheet's bottom ~10px still semi-transparent on the final frame, so
      // clearing the mask snapped it to full opacity — the glitch in the last
      // few millimetres. Leading is safe because the soft tail always sits
      // inside the roll while the roll is thick, and once the reveal completes
      // the tail hangs past the bottom of the sheet where there's nothing left
      // to reveal.
      const sheetMask = maskFor(revealed + FEATHER, FEATHER);
      gsap.set(sheet, { maskImage: sheetMask, webkitMaskImage: sheetMask });

      // + SHADOW_FEATHER so the soft tail is fully past the bottom edge at the
      // end rather than leaving the last band half-transparent.
      const shadowMask = maskFor(
        shadowHeight * revealProgress + SHADOW_FEATHER,
        SHADOW_FEATHER
      );
      gsap.set(shadow, { maskImage: shadowMask, webkitMaskImage: shadowMask });

      gsap.set(roll, {
        height: Math.round(thickness),
        y: Math.round(revealed - thickness * 0.5),
        opacity,
        backgroundPositionY: `${-p * 520}px`,
      });
    }

    applyFrame();
    gsap.set(sheet, { opacity: 1 });

    // No separate fade-in for the text: the type is already "printed" on the
    // sheet, so it emerges line by line from under the roll as the reveal
    // grows. Animating it separately made everything pop in at once at the end.
    const tl = gsap.timeline({ delay: 0.25 });

    tl.to(state, {
      p: 1,
      duration: 2.4,
      ease: 'power2.inOut',
      onUpdate: applyFrame,
      onComplete: () => {
        // Only the sheet's mask is cleared. The shadow keeps its mask: it's
        // fully solid by now, so it costs nothing visually, and removing a mask
        // is exactly what used to make the shadow jump.
        gsap.set(sheet, { maskImage: 'none', webkitMaskImage: 'none' });
        gsap.set(roll, { display: 'none' });
      },
    });
  }, []);

  const education = t('resume.education', { returnObjects: true }) || [];
  const complementary = t('resume.complementary', { returnObjects: true }) || [];
  const languages = t('resume.languages', { returnObjects: true }) || [];
  const experience = t('resume.experience', { returnObjects: true }) || [];
  const skills = t('resume.skills', { returnObjects: true }) || [];
  const qualities = t('resume.qualities', { returnObjects: true }) || [];
  const projects = t('resume.projects', { returnObjects: true }) || [];

  return (
    <div
      className="paper-stage"
      style={stageSize.width ? { width: stageSize.width, height: stageSize.height } : undefined}
    >
      <div className="paper-scale" style={{ transform: `translateX(-50%) scale(${scale})` }}>
        <div className="paper-perspective">
          {/* Shadow lives on this wrapper, not on a ::before inside the sheet.
              The sheet has will-change:transform, which creates a stacking
              context — a z-index:-1 pseudo-element inside it can't drop behind
              the sheet's own background, so it was painting on top and dimming
              the whole page. */}
          <div className="paper-shadow" aria-hidden="true">
            <div className="paper-shadow__fill" ref={shadowRef} />
          </div>

          <div className="paper-reveal">
            <div className="paper-sheet" ref={paperRef}>
              <span className="paper-scratches" aria-hidden="true" />

            <div className="paper-content" ref={contentRef}>
              <div className="cv-header-row">
                <VideoAvatar />
                <div className="cv-header-info">
                  <h1>{t('resume.name')}</h1>
                  <p className="cv-role">{t('resume.role')}</p>
                  <p className="cv-contact">
                    {t('resume.location')} · {t('resume.contact.phone')} ·{' '}
                    <a href={`mailto:${t('resume.contact.email')}`}>{t('resume.contact.email')}</a>
                  </p>
                </div>
              </div>

              <div className="cv-columns">
                <div className="cv-col cv-col-left">
                  <section>
                    <h2>{t('resume.objectiveTitle')}</h2>
                    <p>{t('resume.objective')}</p>
                  </section>

                  <section>
                    <h2>{t('resume.qualitiesTitle')}</h2>
                    <ul>
                      {qualities.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </section>

                  <p className="cv-availability">{t('resume.availability')}</p>

                  <section>
                    <h2>{t('resume.languagesTitle')}</h2>
                    <ul className="cv-languages">
                      {languages.map((l) => (
                        <li key={l.name}>
                          <span>{l.name}</span>
                          <span className="cv-languages__level">{l.level}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="cv-section--last">
                    <h2>{t('resume.complementaryTitle')}</h2>
                    {complementary.map((c) => (
                      <div className="cv-entry" key={c.period}>
                        <p className="cv-entry__meta">{c.period}</p>
                        <ul>
                          {c.items.map((i) => (
                            <li key={i}>{i}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                </div>

                <div className="cv-col cv-col-right">
                  <section>
                    <h2>{t('resume.skillsTitle')}</h2>
                    <ul className="cv-skills">
                      {skills.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h2>{t('resume.projectsTitle')}</h2>
                    {projects.map((p) => (
                      <div className="cv-entry cv-entry--compact" key={p.name}>
                        <h3>{p.name}</h3>
                        <p className="cv-entry__meta">{p.stack}</p>
                        <p className="cv-entry__desc">{p.description}</p>
                      </div>
                    ))}
                  </section>

                  <section>
                    <h2>{t('resume.educationTitle')}</h2>
                    {education.map((e) => (
                      <div className="cv-entry" key={e.title}>
                        <p className="cv-entry__meta">{e.period}</p>
                        <h3>{e.title}</h3>
                        <p>{e.place}</p>
                      </div>
                    ))}
                  </section>

                  <section className="cv-section--last">
                    <h2>{t('resume.experienceTitle')}</h2>
                    {experience.map((ex) => (
                      <div className="cv-entry" key={ex.role}>
                        <h3>{ex.role}</h3>
                        <p className="cv-entry__meta">{ex.place}</p>
                        <ul>
                          {ex.items.map((i) => (
                            <li key={i}>{i}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* The roll: same paper, shaded as a cylinder. Travels down the sheet
              as it unrolls, then flattens away at the end. Wrapped in a clip
              container carrying the sheet's own torn silhouette, so the roll
              can never overhang the ragged bottom-left corner. */}
          <div className="paper-roll-clip" ref={rollClipRef} aria-hidden="true">
            <div className="paper-roll" ref={rollRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
