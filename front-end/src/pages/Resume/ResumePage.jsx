import { useRef } from 'react';
import ParchmentScroll from './components/ParchmentScroll';
import ResumeNav from './components/ResumeNav';
import Magnifier from './components/Magnifier';
import './ResumePage.css';

export default function ResumePage() {
  // Everything inside this wrapper is what the magnifier duplicates and scales.
  // The lens itself lives outside it — otherwise it would clone itself.
  const zoomSourceRef = useRef(null);

  return (
    <div className="resume-page">
      <div className="resume-zoom-source" ref={zoomSourceRef}>
        <div className="resume-bg" aria-hidden="true">
          <div className="resume-bg__hexgrid" />
          <div className="resume-bg__dust" />
        </div>

        <ResumeNav />

        <main className="resume-content">
          <ParchmentScroll />
        </main>
      </div>

      <Magnifier sourceRef={zoomSourceRef} />
    </div>
  );
}
