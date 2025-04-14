'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from '@/app/HomePage.module.css';

interface Dot {
  id: number;
  originalX: number;
  originalY: number;
  ref: React.RefObject<HTMLDivElement | null>;
}

const DotGridAnimation: React.FC = () => {
  const dotGridRef = useRef<HTMLDivElement>(null);
  const [dots, setDots] = useState<Dot[]>([]);
  const [logoDimensions, setLogoDimensions] = useState({ width: 0, height: 0 });
  const [centerPullStrength, setCenterPullStrength] = useState(3.5);
  const centerPullStrengthTempRef = useRef(3.5);
  const animationFrameRef = useRef<number | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isInitialLoadRef = useRef(true);

  // Safe DOM query function
  const querySelectorSafe = useCallback((selector: string): Element | null => {
    if (typeof document !== 'undefined') {
      return document.querySelector(selector);
    }
    return null;
  }, []);

  // Initialize dots, sound, and get logo dimensions
  useEffect(() => {
    // This effect should only run client-side
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const EDGE_PADDING = 40;
    const GRID_SIZE_X = Math.max(1, Math.floor(viewportWidth / 100));
    const GRID_SIZE_Y = Math.max(1, Math.floor(viewportHeight / 100));
    const usableWidth = viewportWidth - (2 * EDGE_PADDING);
    const usableHeight = viewportHeight - (2 * EDGE_PADDING);
    const gapX = usableWidth / (GRID_SIZE_X > 1 ? GRID_SIZE_X - 1 : 1);
    const gapY = usableHeight / (GRID_SIZE_Y > 1 ? GRID_SIZE_Y - 1 : 1);

    const initialDots: Dot[] = [];
    for (let y = 0; y < GRID_SIZE_Y; y++) {
      for (let x = 0; x < GRID_SIZE_X; x++) {
        const posX = EDGE_PADDING + (x * gapX);
        const posY = EDGE_PADDING + (y * gapY);
        initialDots.push({
          id: y * GRID_SIZE_X + x,
          originalX: posX,
          originalY: posY,
          ref: React.createRef<HTMLDivElement>(),
        });
      }
    }
    setDots(initialDots);

    const logoElement = querySelectorSafe(`.${styles.centerLogo}`) as HTMLImageElement | null;
    if (logoElement) {
      const updateLogoSize = () => {
          if(logoElement.clientWidth > 0 && logoElement.clientHeight > 0) {
            setLogoDimensions({ width: logoElement.clientWidth, height: logoElement.clientHeight });
          }
      };
      if (logoElement.complete && logoElement.naturalHeight !== 0) {
        updateLogoSize();
      } else {
        logoElement.onload = updateLogoSize;
        logoElement.onerror = () => console.error("Logo failed to load");
      }
    }

    isInitialLoadRef.current = true;
    const initialLoadTimer = setTimeout(() => { isInitialLoadRef.current = false; }, 150);

    return () => clearTimeout(initialLoadTimer);
  }, [styles.centerLogo, querySelectorSafe]); // Add querySelectorSafe

  // Core animation logic
  const applyEffects = useCallback(() => {
    if (typeof window === 'undefined') return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const MAX_DISTANCE = 700;
    const MAX_MOVEMENT = 70;
    const BLACK_HOLE_PULL = 1.2;
    const BLACK_HOLE_RADIUS = Math.min(viewportWidth, viewportHeight) * 0.35;
    const INNER_RADIUS = BLACK_HOLE_RADIUS * 0.3;
    const TEXT_AREA_RADIUS_BASE = BLACK_HOLE_RADIUS * 0.2;
    const CURSOR_EFFECT_RADIUS = 150;
    const MAX_DOT_SCALE = 2.5;

    const mouseX = mousePosRef.current.x;
    const mouseY = mousePosRef.current.y;

    dots.forEach(dot => {
      if (!dot.ref.current) return;
      const dotElement = dot.ref.current;

      const distToMouseX = mouseX - dot.originalX;
      const distToMouseY = mouseY - dot.originalY;
      const distToMouse = Math.sqrt(distToMouseX * distToMouseX + distToMouseY * distToMouseY);
      const distToCenterX = centerX - dot.originalX;
      const distToCenterY = centerY - dot.originalY;
      const distToCenter = Math.sqrt(distToCenterX * distToCenterX + distToCenterY * distToCenterY);

      let moveX = 0;
      let moveY = 0;
      let dotScale = 1;
      let opacity = 1;

      // Mouse proximity scaling
      if (distToMouse < CURSOR_EFFECT_RADIUS) {
        const scaleRatio = 1 - (distToMouse / CURSOR_EFFECT_RADIUS);
        dotScale = 1 + (scaleRatio * MAX_DOT_SCALE);
      }

      // Mouse movement effect
      if (distToMouse < MAX_DISTANCE && distToMouse > 0) {
        const mouseStrength = Math.pow((MAX_DISTANCE - distToMouse) / MAX_DISTANCE, 2) * 0.5;
        moveX += (distToMouseX / distToMouse) * mouseStrength * MAX_MOVEMENT;
        moveY += (distToMouseY / distToMouse) * mouseStrength * MAX_MOVEMENT;
      }

      // Black hole movement effect
      if (distToCenter < MAX_DISTANCE && distToCenter > 0) {
        let centerStrength;
        if (distToCenter < BLACK_HOLE_RADIUS) {
          centerStrength = Math.pow((BLACK_HOLE_RADIUS - distToCenter) / BLACK_HOLE_RADIUS, 1) * centerPullStrength;
          if (isInitialLoadRef.current) {
            centerStrength *= (0.9 + Math.random() * 0.2);
          }
        } else {
          centerStrength = Math.pow((MAX_DISTANCE - distToCenter) / MAX_DISTANCE, 2) * BLACK_HOLE_PULL;
        }
        moveX += (distToCenterX / distToCenter) * centerStrength * MAX_MOVEMENT;
        moveY += (distToCenterY / distToCenter) * centerStrength * MAX_MOVEMENT;
      }

      let finalScale = dotScale;

      // Black hole visual effects (scale & opacity)
      if (distToCenter < BLACK_HOLE_RADIUS) {
        const depthRatio = 1 - (distToCenter / BLACK_HOLE_RADIUS);
        const blackHoleScale = Math.max(0.2, 1 - (depthRatio * 0.8));
        finalScale *= blackHoleScale;

        // Adjust text area based on logo size if available
        const effectiveTextAreaRadius = Math.max(TEXT_AREA_RADIUS_BASE, (logoDimensions.width || 0) * 0.15);

        if (distToCenter < effectiveTextAreaRadius) {
          opacity = 0;
        } else if (distToCenter < INNER_RADIUS) {
          opacity = Math.max(0, (distToCenter - effectiveTextAreaRadius) / (INNER_RADIUS - effectiveTextAreaRadius) * 0.5);
        } else {
          const cornerDistance = Math.sqrt(
            Math.pow(Math.max(Math.abs(dot.originalX - centerX), Math.abs(centerX - (viewportWidth - dot.originalX))), 2) +
            Math.pow(Math.max(Math.abs(dot.originalY - centerY), Math.abs(centerY - (viewportHeight - dot.originalY))), 2)
          );
          const maxCornerDist = Math.sqrt(Math.pow(viewportWidth / 2, 2) + Math.pow(viewportHeight / 2, 2));
          const cornerFactor = maxCornerDist > 0 ? cornerDistance / maxCornerDist : 0;
          const depthOpacity = Math.max(0.05, 1 - (depthRatio * 0.95));
          opacity = depthOpacity * (0.3 + (0.7 * cornerFactor));
        }
      } else if (distToCenter >= MAX_DISTANCE && distToMouse >= MAX_DISTANCE) {
        moveX = 0;
        moveY = 0;
        finalScale = 1;
        opacity = 1;
      }

      dotElement.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px)) scale(${finalScale})`;
      dotElement.style.opacity = `${opacity}`;
    });

    animationFrameRef.current = requestAnimationFrame(applyEffects);
  }, [dots, centerPullStrength, logoDimensions.width]);

  // Start/Stop animation loop
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const startAnimation = () => {
        animationFrameRef.current = requestAnimationFrame(applyEffects);
    }
    const timeoutId = setTimeout(startAnimation, 100);

    return () => {
      clearTimeout(timeoutId);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [applyEffects]);

  // Mouse move listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Button hover interaction listener
  useEffect(() => {
    const buttonContainerElem = querySelectorSafe(`.${styles.buttonContainer}`);
    if (!buttonContainerElem) return;

    const handleMouseEnter = () => {
      centerPullStrengthTempRef.current = centerPullStrength;
      setCenterPullStrength(5.0);
    };
    const handleMouseLeave = () => {
      setCenterPullStrength(centerPullStrengthTempRef.current);
    };

    buttonContainerElem.addEventListener('mouseenter', handleMouseEnter);
    buttonContainerElem.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      buttonContainerElem.removeEventListener('mouseenter', handleMouseEnter);
      buttonContainerElem.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [centerPullStrength, styles.buttonContainer, querySelectorSafe]); // Add querySelectorSafe dependency

  // Button click listener (ripple effect)
  useEffect(() => {
    const ctaButtonElem = querySelectorSafe(`.${styles.ctaButton}`);
    if (!ctaButtonElem) return;

    // Use EventListener type for broader compatibility
    const handleClick: EventListener = (event) => {
      if (!(event instanceof MouseEvent && event.target instanceof HTMLElement)) return;
      const mouseEvent = event;
      const targetElement = event.target;

      const buttonRect = targetElement.getBoundingClientRect();
      const ripple = document.createElement('span');
      const x = mouseEvent.clientX - buttonRect.left;
      const y = mouseEvent.clientY - buttonRect.top;

      Object.assign(ripple.style, {
        position: 'absolute',
        background: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '50%',
        transform: 'scale(0)',
        animation: `ripple 0.4s cubic-bezier(0.19, 1, 0.22, 1)`,
        top: `${y}px`,
        left: `${x}px`,
        pointerEvents: 'none',
      });

      targetElement.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
        alert('Starting your learning journey!'); // Replace with navigation/action
      }, 400);
    };

    ctaButtonElem.addEventListener('click', handleClick);
    return () => {
      ctaButtonElem.removeEventListener('click', handleClick);
    };
  }, [styles.ctaButton, querySelectorSafe]); // Add querySelectorSafe dependency

  return (
    <div ref={dotGridRef} className={styles.dotGrid} id="dot-grid">
      {dots.map(dot => (
        <div
          key={dot.id}
          ref={dot.ref}
          className={styles.dot}
          style={{
            position: 'absolute',
            left: `${dot.originalX}px`,
            top: `${dot.originalY}px`,
            // Initial state set here, dynamic updates in applyEffects
            transform: 'translate(-50%, -50%) scale(1)',
            opacity: '1',
          }}
        />
      ))}
    </div>
  );
};

export default DotGridAnimation; 