import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const LG_BREAKPOINT = 1024;

function useBelow(breakpoint: number) {
  const [isBelow, setIsBelow] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsBelow(window.innerWidth < breakpoint);
    mql.addEventListener("change", onChange);
    setIsBelow(window.innerWidth < breakpoint);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return !!isBelow;
}

export function useIsMobile() {
  return useBelow(MOBILE_BREAKPOINT);
}

export function useBelowLg() {
  return useBelow(LG_BREAKPOINT);
}
