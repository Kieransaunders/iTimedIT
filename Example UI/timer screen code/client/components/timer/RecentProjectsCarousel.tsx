import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect } from "react";
import { Project } from "./ProjectSwitcher";

interface RecentProjectsCarouselProps {
  projects: Project[];
  onSelect: (id: string) => void;
}

export function RecentProjectsCarousel({ projects, onSelect }: RecentProjectsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ dragFree: true, containScroll: "trimSnaps" });

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!emblaApi) return;
      if (e.key === "ArrowRight") emblaApi.scrollNext();
      if (e.key === "ArrowLeft") emblaApi.scrollPrev();
    },
    [emblaApi],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div className="mt-8" aria-label="Recent projects carousel">
      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex gap-3">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="embla__slide shrink-0 basis-[70%] sm:basis-[40%] md:basis-[28%] lg:basis-[22%] rounded-xl border bg-card/60 backdrop-blur-sm p-4 text-left hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={`Switch to ${p.client} – ${p.name}`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color || "hsl(var(--primary))" }} />
                <span className="text-sm text-muted-foreground">{p.client}</span>
              </div>
              <div className="mt-1 font-semibold leading-tight">{p.name}</div>
              <div className="mt-2 text-xs text-muted-foreground">${p.hourlyRate}/hr</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
