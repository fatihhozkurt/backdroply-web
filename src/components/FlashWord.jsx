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
  const strikeLeft = boltPath(left, top, wordWidth, wordHeight, [
    [0.18, -0.08],
    [0.24, 0.04],
    [0.16, 0.16],
    [0.28, 0.3],
    [0.12, 0.44],
    [0.24, 0.58],
    [0.14, 0.74],
    [0.22, 0.9],
    [0.16, 1.1]
  ]);
  const strikeLeftBranchHigh = boltPath(left, top, wordWidth, wordHeight, [
    [0.16, 0.16],
    [0.08, 0.28],
    [0.14, 0.42]
  ]);
  const strikeLeftBranchLow = boltPath(left, top, wordWidth, wordHeight, [
    [0.24, 0.58],
    [0.32, 0.68],
    [0.26, 0.82]
  ]);
  const strikeCenter = boltPath(left, top, wordWidth, wordHeight, [
    [0.5, -0.1],
    [0.56, 0.02],
    [0.45, 0.16],
    [0.58, 0.3],
    [0.42, 0.46],
    [0.54, 0.62],
    [0.44, 0.78],
    [0.52, 0.96],
    [0.47, 1.12]
  ]);
  const strikeCenterBranchRight = boltPath(left, top, wordWidth, wordHeight, [
    [0.58, 0.3],
    [0.68, 0.4],
    [0.6, 0.56]
  ]);
  const strikeCenterBranchLeft = boltPath(left, top, wordWidth, wordHeight, [
    [0.42, 0.46],
    [0.34, 0.58],
    [0.39, 0.72]
  ]);
  const strikeRight = boltPath(left, top, wordWidth, wordHeight, [
    [0.82, -0.08],
    [0.88, 0.06],
    [0.76, 0.2],
    [0.9, 0.34],
    [0.74, 0.5],
    [0.86, 0.66],
    [0.76, 0.82],
    [0.84, 0.98],
    [0.79, 1.12]
  ]);
  const strikeRightBranchHigh = boltPath(left, top, wordWidth, wordHeight, [
    [0.76, 0.2],
    [0.68, 0.3],
    [0.73, 0.44]
  ]);
  const strikeRightBranchLow = boltPath(left, top, wordWidth, wordHeight, [
    [0.86, 0.66],
    [0.96, 0.78],
    [0.89, 0.92]
  ]);

  const boltGradientId = `flashBoltGradient-${uid}`;
  const fieldGradientId = `flashFieldGradient-${uid}`;
  const softGlowId = `flashSoftGlow-${uid}`;
  const sharpGlowId = `flashSharpGlow-${uid}`;

  const strikeAnimate = {
    initial: { pathLength: 0, opacity: 0 },
    glow: {
      pathLength: [0, 1, 1, 1, 1],
      opacity: [0, 0.98, 0.44, 0.16, 0]
    },
    core: {
      pathLength: [0, 1, 1, 1, 1],
      opacity: [0, 1, 0.22, 0.05, 0]
    }
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

          <EnergyPath
            d={strikeLeft}
            width={6.6}
            coreWidth={1.5}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.98)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{
              duration: 0.2,
              repeat: Infinity,
              repeatDelay: 4.3,
              ease: [0.16, 0.94, 0.24, 1],
              delay: 1.16,
              times: [0, 0.22, 0.52, 0.82, 1]
            }}
          />
          <EnergyPath
            d={strikeLeftBranchHigh}
            width={4.6}
            coreWidth={1.08}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.9)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{
              duration: 0.18,
              repeat: Infinity,
              repeatDelay: 4.3,
              ease: [0.16, 0.94, 0.24, 1],
              delay: 1.2,
              times: [0, 0.2, 0.48, 0.8, 1]
            }}
          />
          <EnergyPath
            d={strikeLeftBranchLow}
            width={4.2}
            coreWidth={1}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.88)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{
              duration: 0.19,
              repeat: Infinity,
              repeatDelay: 4.3,
              ease: [0.16, 0.94, 0.24, 1],
              delay: 1.24,
              times: [0, 0.2, 0.48, 0.8, 1]
            }}
          />
          <EnergyPath
            d={strikeCenter}
            width={6.9}
            coreWidth={1.62}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.99)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{
              duration: 0.22,
              repeat: Infinity,
              repeatDelay: 5.1,
              ease: [0.16, 0.94, 0.24, 1],
              delay: 2.54,
              times: [0, 0.22, 0.54, 0.84, 1]
            }}
          />
          <EnergyPath
            d={strikeCenterBranchRight}
            width={4.9}
            coreWidth={1.12}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.92)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{
              duration: 0.19,
              repeat: Infinity,
              repeatDelay: 5.1,
              ease: [0.16, 0.94, 0.24, 1],
              delay: 2.6,
              times: [0, 0.2, 0.5, 0.82, 1]
            }}
          />
          <EnergyPath
            d={strikeCenterBranchLeft}
            width={4.4}
            coreWidth={1}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.88)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{
              duration: 0.2,
              repeat: Infinity,
              repeatDelay: 5.1,
              ease: [0.16, 0.94, 0.24, 1],
              delay: 2.64,
              times: [0, 0.2, 0.5, 0.82, 1]
            }}
          />
          <EnergyPath
            d={strikeRight}
            width={6.5}
            coreWidth={1.48}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.97)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{
              duration: 0.21,
              repeat: Infinity,
              repeatDelay: 4.8,
              ease: [0.16, 0.94, 0.24, 1],
              delay: 3.46,
              times: [0, 0.22, 0.52, 0.82, 1]
            }}
          />
          <EnergyPath
            d={strikeRightBranchHigh}
            width={4.7}
            coreWidth={1.06}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.9)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{
              duration: 0.18,
              repeat: Infinity,
              repeatDelay: 4.8,
              ease: [0.16, 0.94, 0.24, 1],
              delay: 3.5,
              times: [0, 0.2, 0.48, 0.8, 1]
            }}
          />
          <EnergyPath
            d={strikeRightBranchLow}
            width={4.3}
            coreWidth={1}
            glowStroke={`url(#${boltGradientId})`}
            coreStroke="rgba(255,255,255,0.88)"
            glowFilter={softGlowId}
            coreFilter={sharpGlowId}
            animate={strikeAnimate}
            transition={{
              duration: 0.19,
              repeat: Infinity,
              repeatDelay: 4.8,
              ease: [0.16, 0.94, 0.24, 1],
              delay: 3.56,
              times: [0, 0.2, 0.48, 0.8, 1]
            }}
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
                opacity: 0,
                filter: "blur(12px) brightness(1.26)",
                scaleX: 1.03
              }
        }
        animate={
          reduceMotion
            ? false
            : {
                opacity: 1,
                filter: ["blur(8px) brightness(1.22)", "blur(0px) brightness(1.04)", "blur(0px) brightness(1)"],
                scaleX: [1.02, 1.005, 1]
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
