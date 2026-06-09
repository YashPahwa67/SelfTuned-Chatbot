import { useMemo } from "react";

/**
 * Decides how heavy the 3D scene is allowed to be. Mobile devices, small
 * viewports and "prefers-reduced-motion" users get a lighter tier; a manual
 * low-power toggle forces it. This is the graceful-degradation knob: particle
 * count, bloom on/off and device-pixel-ratio all flow from here.
 */
export interface PerfTier {
  particleCount: number;
  bloom: boolean;
  dpr: [number, number];
  /** convenience flag for UI copy ("low power mode") */
  low: boolean;
}

export function usePerformanceTier(lowPowerOverride: boolean): PerfTier {
  return useMemo<PerfTier>(() => {
    const isMobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      window.innerWidth < 768;
    const prefersReduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const low = lowPowerOverride || isMobile || prefersReduced;

    if (low) {
      return { particleCount: 900, bloom: false, dpr: [1, 1.2], low: true };
    }
    return { particleCount: 3800, bloom: true, dpr: [1, 2], low: false };
  }, [lowPowerOverride]);
}
