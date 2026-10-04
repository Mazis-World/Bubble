import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import {
  APP_TOUR_STEPS,
  markAppTourComplete,
  spotlightRect,
  tooltipPosition,
  tourStepAt,
} from '../../services/appTour';

const CARD_WIDTH = 280;

const measureTarget = (target) => {
  if (!target || typeof document === 'undefined') return null;
  const node = document.querySelector(`[data-tour="${target}"]`);
  if (!node || typeof node.getBoundingClientRect !== 'function') return null;
  return spotlightRect(node.getBoundingClientRect());
};

const AppTour = ({
  open = false,
  steps = APP_TOUR_STEPS,
  onClose,
  onStep,
} = {}) => {
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState(null);
  const cardRef = useRef(null);

  const step = tourStepAt(index, steps);
  const last = index >= steps.length - 1;

  useEffect(() => {
    if (!open) {
      setIndex(0);
      return undefined;
    }
    setIndex(0);
    if (typeof onStep === 'function') onStep(tourStepAt(0, steps));
    return undefined;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => setHole(measureTarget(step?.target));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, step?.target, index]);

  useEffect(() => {
    if (!open || typeof onStep !== 'function') return;
    onStep(step);
  }, [open, step, onStep]);

  if (!open || !step) return null;

  const finish = () => {
    markAppTourComplete();
    if (typeof onClose === 'function') onClose();
  };

  const next = () => {
    if (last) {
      finish();
      return;
    }
    setIndex((current) => current + 1);
  };

  const cardSize = {
    width: CARD_WIDTH,
    height: cardRef.current?.offsetHeight || 168,
  };
  const tip = tooltipPosition({
    hole,
    placement: step.placement,
    viewport: {
      width: typeof window === 'undefined' ? 390 : window.innerWidth,
      height: typeof window === 'undefined' ? 844 : window.innerHeight,
    },
    card: cardSize,
  });

  return (
    <div
      className="fixed inset-0 z-[90]"
      data-testid="app-tour"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-tour-title"
    >
      {!hole && <div className="absolute inset-0 bg-slate-950/70" />}
      {hole && (
        <div
          data-testid="app-tour-spotlight"
          className="app-tour-pulse pointer-events-none absolute"
          style={{
            left: hole.left,
            top: hole.top,
            width: hole.width,
            height: hole.height,
            borderRadius: hole.radius,
          }}
        />
      )}
      <div
        ref={cardRef}
        className="absolute z-[91] rounded-3xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl"
        style={{
          top: tip.top,
          left: tip.left,
          width: tip.width,
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-fuchsia-500 to-cyan-400 text-white shadow-lg glow-blue">
              <Sparkles size={16} />
            </span>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-200/80">
              {index + 1} / {steps.length}
            </p>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg p-1 text-gray-400 hover:text-white"
            aria-label="Skip tour"
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="app-tour-title" className="mb-2 text-lg font-bold text-white">
          {step.title}
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-gray-300">{step.body}</p>
        <div className="mb-3 flex justify-center gap-1.5">
          {steps.map((item, stepIndex) => (
            <span
              key={item.id}
              className={`h-1.5 rounded-full transition-all ${
                stepIndex === index ? 'w-6 bg-sky-300' : stepIndex < index ? 'w-1.5 bg-white/50' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-fuchsia-500 to-cyan-400 py-3 font-semibold text-white shadow-lg glow-blue"
        >
          {last ? 'Let’s go' : 'Next'}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default AppTour;
