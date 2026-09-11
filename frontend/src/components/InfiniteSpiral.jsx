import React, { useRef, useEffect, useState, useCallback } from "react";

/**
 * InfiniteSpiral — 3D Helical Image Gallery
 *
 * Props:
 *  - items: Array of { image, alt, label, tag } or image URL strings
 *  - speed: number (default 0.45) — automatic travel speed (revolutions / rate)
 *  - direction: "up" | "down" (default "up")
 *  - radius: number (default 180) — depth radius of the 3D helix
 *  - cardWidth: number (default 135) — width of cards
 *  - cardHeight: number (default 155) — height of cards
 *  - verticalSpacing: number (default 72) — vertical distance between neighbor cards
 *  - perspective: number (default 1000) — 3D stage perspective
 *  - cardsPerTurn: number (default 7) — cards per complete 360-degree revolution
 *  - rotation: number (default 0) — baseline angular offset in degrees
 *  - cardTilt: number (default 0) — slight tilt in degrees
 *  - cardRadius: number (default 8) — border radius in px
 *  - centerScale: number (default 1.15) — zoom multiplier for front-center cards
 *  - edgeFade: number (default 0.32) — fraction of top/bottom travel used for fading
 *  - edgeBlur: number (default 4) — blur in px near edge bounds
 *  - pauseOnHover: boolean (default true) — smoothly eases motion on mouse enter
 *  - imageFit: "cover" | "contain" (default "cover")
 *  - grayscale: number (default 1) — grayscale filter amount (0 to 1)
 *  - className: string
 *  - style: object
 */
export default function InfiniteSpiral({
  items = [],
  speed = 0.45,
  direction = "up",
  radius = 185,
  cardWidth = 135,
  cardHeight = 155,
  verticalSpacing = 72,
  perspective = 1000,
  cardsPerTurn = 7,
  rotation = 0,
  cardTilt = 0,
  cardRadius = 8,
  centerScale = 1.15,
  edgeFade = 0.32,
  edgeBlur = 4,
  pauseOnHover = true,
  imageFit = "cover",
  grayscale = 1,
  className = "",
  style = {},
}) {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);

  // Normalized items: ensure at least 14-21 virtual cards for seamless looping
  const normalizedItems = React.useMemo(() => {
    if (!items || items.length === 0) return [];
    let list = items.map((it, idx) => {
      if (typeof it === "string") {
        return { id: `item-${idx}`, image: it, alt: `Face ${idx + 1}` };
      }
      return { id: it.id || `item-${idx}`, ...it };
    });

    // Ensure we have enough virtual items to fill the cylinder smoothly
    const minCards = Math.max(16, cardsPerTurn * 2 + 2);
    while (list.length < minCards) {
      list = [...list, ...items.map((it, idx) => ({
        ...(typeof it === "string" ? { image: it, alt: `Face ${idx + 1}` } : it),
        id: `dup-${list.length + idx}`,
      }))];
    }
    return list;
  }, [items, cardsPerTurn]);

  const totalCards = normalizedItems.length;
  const loopHeight = totalCards * verticalSpacing;

  // Animation state stored in refs to prevent React re-render overhead at 60fps
  const offsetRef = useRef(0);
  const speedMultiplierRef = useRef(1);
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const cardsDomRef = useRef([]);

  // Handle pointer drag interaction
  const onPointerDown = (e) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartOffset.current = offsetRef.current;
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - dragStartY.current;
    const dirSign = direction === "down" ? -1 : 1;
    offsetRef.current = (dragStartOffset.current + deltaY * dirSign) % loopHeight;
  };

  const onPointerUp = (e) => {
    setIsDragging(false);
    try {
      if (containerRef.current) {
        containerRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
  };

  // Wheel interaction for subtle scroll control
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const dirSign = direction === "down" ? -1 : 1;
    offsetRef.current = (offsetRef.current + e.deltaY * 0.4 * dirSign) % loopHeight;
  }, [direction, loopHeight]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // Main 60fps Animation Loop
  useEffect(() => {
    const angleStep = (2 * Math.PI) / cardsPerTurn;
    const radRotation = (rotation * Math.PI) / 180;
    const dirSign = direction === "down" ? -1 : 1;

    const renderFrame = (now) => {
      const deltaSec = Math.min(0.06, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // Smooth deceleration on hover
      const targetMultiplier = (isHovered && pauseOnHover) ? 0 : 1;
      speedMultiplierRef.current += (targetMultiplier - speedMultiplierRef.current) * 0.08;

      if (!isDragging) {
        const step = speed * verticalSpacing * speedMultiplierRef.current * deltaSec * dirSign;
        offsetRef.current = (offsetRef.current + step) % loopHeight;
        if (offsetRef.current < 0) offsetRef.current += loopHeight;
      }

      const currentOffset = offsetRef.current;
      const halfHeight = loopHeight / 2;

      // Update card positions directly via DOM transform for max 60+ FPS performance
      for (let i = 0; i < totalCards; i++) {
        const cardEl = cardsDomRef.current[i];
        if (!cardEl) continue;

        // Wrapped y position centered around 0
        let y = ((i * verticalSpacing + currentOffset) % loopHeight) - halfHeight;
        if (y < -halfHeight) y += loopHeight;
        if (y >= halfHeight) y -= loopHeight;

        // Angle around the cylinder
        const angle = (y / verticalSpacing) * angleStep + radRotation;
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius;

        // Normalized distance from center (0 = center, 1 = extreme top/bottom edge)
        const normDist = Math.min(1, Math.abs(y) / (halfHeight * 0.85));

        // Scale: larger when near center and facing front (z > 0)
        const frontRatio = Math.max(0, (z + radius) / (2 * radius));
        const centerProximity = Math.max(0, 1 - normDist * 1.4);
        const scale = 1 + (centerScale - 1) * centerProximity * (0.4 + 0.6 * frontRatio);

        // Edge fade & blur
        let opacity = 1;
        let blurPx = 0;
        if (normDist > (1 - edgeFade)) {
          const edgeProgress = (normDist - (1 - edgeFade)) / edgeFade;
          opacity = Math.max(0, 1 - edgeProgress);
          blurPx = edgeProgress * edgeBlur;
        }

        // Z-Index for natural stacking
        const zIndex = Math.round(z + radius);

        // Rotation around Y axis + card tilt
        const rotYDeg = (angle * 180) / Math.PI;

        cardEl.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateY(${rotYDeg.toFixed(2)}deg) rotateZ(${cardTilt}deg) scale(${scale.toFixed(3)})`;
        cardEl.style.opacity = opacity.toFixed(3);
        cardEl.style.zIndex = zIndex;
        cardEl.style.filter = `grayscale(${grayscale}) blur(${blurPx.toFixed(1)}px)`;
      }

      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };

    animationFrameRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    cardsPerTurn,
    direction,
    edgeBlur,
    edgeFade,
    grayscale,
    isDragging,
    isHovered,
    loopHeight,
    pauseOnHover,
    radius,
    rotation,
    cardTilt,
    centerScale,
    speed,
    totalCards,
    verticalSpacing,
  ]);

  return (
    <div
      ref={containerRef}
      className={`infinite-spiral-container ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 520,
        overflow: "hidden",
        perspective: `${perspective}px`,
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        ...style,
      }}
    >
      {/* Top and bottom gradient fade masks to blend seamlessly with the clinical background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 110,
          background: "linear-gradient(to bottom, var(--bg, #0B0E14) 15%, transparent 100%)",
          zIndex: 1000,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          background: "linear-gradient(to top, var(--bg, #0B0E14) 15%, transparent 100%)",
          zIndex: 1000,
          pointerEvents: "none",
        }}
      />

      {/* 3D Stage */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {normalizedItems.map((item, idx) => (
          <div
            key={item.id || idx}
            ref={(el) => (cardsDomRef.current[idx] = el)}
            style={{
              position: "absolute",
              top: -cardHeight / 2,
              left: -cardWidth / 2,
              width: cardWidth,
              height: cardHeight,
              borderRadius: cardRadius,
              background: "var(--panel, #141923)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow: "0 14px 34px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(255, 255, 255, 0.05)",
              overflow: "hidden",
              backfaceVisibility: "visible",
              willChange: "transform, opacity, filter",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ position: "relative", width: "100%", height: "100%", background: "#000" }}>
              <img
                src={item.image}
                alt={item.alt || "Face sample"}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: imageFit,
                  display: "block",
                }}
              />
              {item.tag && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 6,
                    left: 6,
                    right: 6,
                    padding: "3px 6px",
                    background: "rgba(20, 24, 31, 0.78)",
                    backdropFilter: "blur(4px)",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#fff",
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 9,
                    letterSpacing: 0.5,
                  }}
                >
                  <span
                    style={{
                      color: item.tag === "REAL" ? "#34D399" : "#F87171",
                      fontWeight: 600,
                    }}
                  >
                    {item.tag}
                  </span>
                  <span style={{ opacity: 0.75 }}>{item.score || ""}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
