import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="paper-grain flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="label-mono mb-4 text-terracotta">404 · Off the map</div>
        <h1 className="m-0 font-display text-[44px] leading-[1.05] tracking-[-0.02em] sm:text-[56px]">
          That page <span className="font-display-italic">isn&apos;t here.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] text-ink-2">
          Maybe a typo, maybe a plan that&apos;s been deleted. Either way, the way back is
          short.
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[14px] text-paper hover:bg-ink-2"
        >
          Back home
          <span className="font-display-italic">→</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
