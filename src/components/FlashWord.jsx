import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";

const arrivalEase = [0.16, 1, 0.3, 1];

function useMeasuredSize(targetRef) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = targetRef.current;
    if (!node) {
      return undefined;
    }

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({
        width: rect.width,
        height: rect.height
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [targetRef]);

  return size;
}

function point(left, top, width, height, xFactor, yFactor) {
  return `${(left + width * xFactor).toFixed(1)} ${(top + height * yFactor).toFixed(1)}`;
}

function boltPath(left, top, width, height, pairs) {
  return pairs
    .map(([xFactor, yFactor], index) =>
      `${index === 0 ? "M" : "L"} ${point(left, top, width, height, xFactor, yFactor)}`
    )
    .join(" ");
}

function curvedPath(left, top, width, height, start, c1, c2, end) {
  return [
    `M ${point(left, top, width, height, start[0], start[1])}`,
    `C ${point(left, top, width, height, c1[0], c1[1])}`,
    point(left, top, width, height, c2[0], c2[1]),
    point(left, top, width, height, end[0], end[1])
  ].join(" ");
}

function EnergyPath({
  d,
  width,
  coreWidth,
  glowStroke,
  coreStroke,
  glowFilter,
  coreFilter,
  animate,
  transition
}) {
  return (
    <>
      <motion.path
        d={d}
        fill="none"
        stroke={glowStroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glowFilter})`}
        vectorEffect="non-scaling-stroke"
        initial={animate.initial}
        animate={animate.glow}
        transition={transition}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={coreStroke}
        strokeWidth={coreWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${coreFilter})`}
        vectorEffect="non-scaling-stroke"
        initial={animate.initial}
        animate={animate.core}
        transition={transition}
      />
    </>
  );
}

export default function FlashWord({ children }) {
  const reduceMotion = useReducedMotion();
  const hostRef = useRef(null);
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const size = useMeasuredSize(hostRef);

  const padX = 156;
  const padY = 84;
  const svgWidth = Math.max(10, size.width + padX * 2);
  const svgHeight = Math.max(10, size.height + padY * 2);
  const left = padX;
  const top = padY;
  const wordWidth = size.width;
  const wordHeight = size.height;
  const centerX = left + wordWidth * 0.5;
  const centerY = top + wordHeight * 0.48;

  const trailOuter = `M ${-220} ${(centerY + 6).toFixed(1)} C ${(centerX - 190).toFixed(1)} ${(centerY - 18).toFixed(1)}, ${(centerX - 88).toFixed(1)} ${(centerY - 10).toFixed(1)}, ${(centerX - 8).toFixed(1)} ${centerY.toFixed(1)}`;
  const trailInner = `M ${-180} ${(centerY + 1).toFixed(1)} C ${(centerX - 160).toFixed(1)} ${(centerY - 9).toFixed(1)}, ${(centerX - 66).toFixed(1)} ${(centerY - 5).toFixed(1)}, ${(centerX + 8).toFixed(1)} ${(centerY - 1).toFixed(1)}`;

  const ambientA = curvedPath(left, top, wordWidth, wordHeight, [0.04, 0.2], [0.14, -0.04], [0.3, -0.02], [0.44, 0.08]);
  const ambientB = curvedPath(left, top, wordWidth, wordHeight, [0.52, 0.02], [0.66, -0.04], [0.84, 0.02], [0.94, 0.18]);
  const ambientC = curvedPath(left, top, wordWidth, wordHeight, [0.12, 0.66], [0.24, 0.82], [0.36, 0.82], [0.48, 0.72]);
  const ambientD = curvedPath(left, top, wordWidth, wordHeight, [0.66, 0.24], [0.76, 0.16], [0.86, 0.22], [0.94, 0.36]);

  const strikeA = boltPath(left, top, wordWidth, wordHeight, [
    [0.72, 0.03],
    [0.67, 0.26],
    [0.74, 0.38],
    [0.64, 0.58],
    [0.69, 0.73],
    [0.58, 1.03]
  ]);
  const strikeB = boltPath(left, top, wordWidth, wordHeight, [
    [0.46, -0.02],
    [0.42, 0.18],
    [0.49, 0.3],
    [0.4, 0.5],
    [0.45, 0.66],
    [0.36, 0.98]
  ]);
  const groundArc = curvedPath(left, top, wordWidth, wordHeight, [0.47, 1.03], [0.54, 0.92], [0.66, 0.92], [0.74, 1.01]);

  const trailGradientId = `flashTrailGradient-${uid}`;
  const boltGradientId = `flashBoltGradient-${uid}`;
  const fieldGradientId = `flashFieldGradient-${uid}`;
  const softGlowId = `flashSoftGlow-${uid}`;
  const sharpGlowId = `flashSharpGlow-${uid}`;

  const ambientAnimate = {
    initial: { pathLength: 0.14, opacity: 0 },
    glow: { pathLength: [0.18, 1, 0.86, 0.24], opacity: [0, 0.8, 0.18, 0] },
    core: { pathLength: [0.22, 1, 0.9, 0.26], opacity: [0, 1, 0.24, 0] }
  };

  const strikeAnimate = {
    initial: { pathLength: 0, opacity: 0 },
    glow: { pathLength: [0, 1, 1], opacity: [0, 1, 0] },
    core: { pathLength: [0, 1, 1], opacity: [0, 1, 0] }
  };

  const trailTransition = {
    duration: 0.62,
    delay: 0.08,
    ease: arrivalEase,
    times: [0, 0.62, 1]
  };

  return (
    <span className="flash-word">
      {!reduceMotion && size.width > 0 && (
        <svg
          className="flash-word__svg"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={trailGradientId} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="rgba(56,189,248,0)" />
              <stop offset="52%" stopColor="rgba(96,165,250,0.26)" />
              <stop offset="82%" stopColor="rgba(255,255,255,0.98)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <linearGradient id={boltGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c4f1ff" />
              <stop offset="46%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#73d0ff" />
            </linearGradient>
            <radialGradient id={fieldGradientId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="42%" stopColor="rgba(125,211,252,0.12)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0)" />
            </radialGradient>
            <filter id={softGlowId} x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
              />
            </filter>
            <filter id={sharpGlowId} x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="2.3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <motion.ellipse
            className="flash-word__field"
            cx={centerX}
            cy={centerY + 2}
            rx={wordWidth * 0.9}
            ry={wordHeight * 0.88}
            fill={`url(#${fieldGradientId})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.16, 0.3, 0.16] }}
            transition={{ duration: 2.8, repeat: Infinity, repeatType: "mirror", delay: 0.9 }}
          />

          <motion.path
            d={trailOuter}
            className="flash-word__trail"
            fill="none"
            stroke={`url(#${trailGradientId})`}
            strokeWidth="17"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${softGlowId})`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={trailTransition}
          />
          <motion.path
            d={trailInner}
            className="flash-word__trail flash-word__trail--core"
            fill="none"
            stroke="rgba(255,255,255,0.98)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${sharpGlowId})`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={trailTransition}
          />

          <EnergyPath
            d={ambientA}
            width={5.1}
            coreWidth={1.2}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.94)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={ambientAnimate}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.24, ease: "easeInOut", delay: 0.92 }}
          />
          <EnergyPath
            d={ambientB}
            width={4.6}
            coreWidth={1.12}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.9)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={ambientAnimate}
            transition={{ duration: 2.75, repeat: Infinity, repeatDelay: 0.32, ease: "easeInOut", delay: 1.28 }}
          />
          <EnergyPath
            d={ambientC}
            width={4.4}
            coreWidth={1.08}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.88)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={ambientAnimate}
            transition={{ duration: 2.95, repeat: Infinity, repeatDelay: 0.44, ease: "easeInOut", delay: 1.64 }}
          />
          <EnergyPath
            d={ambientD}
            width={4.2}
            coreWidth={1.02}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.86)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={ambientAnimate}
            transition={{ duration: 3.15, repeat: Infinity, repeatDelay: 0.58, ease: "easeInOut", delay: 2.02 }}
          />

          <EnergyPath
            d={strikeA}
            width={6.4}
            coreWidth={1.5}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.98)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{ duration: 0.32, repeat: Infinity, repeatDelay: 3.4, ease: "easeOut", delay: 1.18 }}
          />
          <EnergyPath
            d={strikeB}
            width={5.2}
            coreWidth={1.26}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.94)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{ duration: 0.28, repeat: Infinity, repeatDelay: 4.2, ease: "easeOut", delay: 2.36 }}
          />
          <EnergyPath
            d={groundArc}
            width={4.2}
            coreWidth={1.06}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.78)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{ duration: 0.26, repeat: Infinity, repeatDelay: 3.4, ease: "easeOut", delay: 1.18 }}
          />

          <motion.circle
            className="flash-word__spark"
            cx={left + wordWidth * 0.3}
            cy={top + wordHeight * 0.16}
            r="2"
            fill="rgba(255,255,255,0.98)"
            filter={`url(#${sharpGlowId})`}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.15, 0.5], x: [0, 9, 14], y: [0, -7, -11] }}
            transition={{ duration: 0.42, repeat: Infinity, repeatDelay: 2.4, ease: "easeOut", delay: 1.08 }}
          />
          <motion.circle
            className="flash-word__spark"
            cx={left + wordWidth * 0.8}
            cy={top + wordHeight * 0.14}
            r="1.65"
            fill="rgba(255,255,255,0.96)"
            filter={`url(#${sharpGlowId})`}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.08, 0.45], x: [0, 8, 10], y: [0, -5, -8] }}
            transition={{ duration: 0.38, repeat: Infinity, repeatDelay: 3.1, ease: "easeOut", delay: 1.9 }}
          />
          <motion.circle
            className="flash-word__spark"
            cx={left + wordWidth * 0.64}
            cy={top + wordHeight * 1.02}
            r="1.8"
            fill="rgba(255,255,255,0.92)"
            filter={`url(#${sharpGlowId})`}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 1, 0], scale: [0.6, 1.18, 0.45], x: [0, 0, 0], y: [0, 4, 8] }}
            transition={{ duration: 0.3, repeat: Infinity, repeatDelay: 3.4, ease: "easeOut", delay: 1.2 }}
          />
        </svg>
      )}

      <motion.span
        ref={hostRef}
        className="flash-word__text-wrap"
        initial={
          reduceMotion
            ? false
            : {
                x: -118,
                opacity: 0,
                filter: "blur(16px) brightness(1.4)",
                skewX: -14,
                scaleX: 1.07
              }
        }
        animate={
          reduceMotion
            ? false
            : {
                x: [0, 14, 0],
                opacity: 1,
                filter: ["blur(10px) brightness(1.34)", "blur(0px) brightness(1.08)", "blur(0px) brightness(1)"],
                skewX: [0, -3, 0],
                scaleX: [1.04, 1.01, 1]
              }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                duration: 0.66,
                delay: 0.1,
                ease: arrivalEase,
                times: [0, 0.72, 1]
              }
        }
      >
        <span className="flash-word__text">{children}</span>
      </motion.span>
    </span>
  );
}
