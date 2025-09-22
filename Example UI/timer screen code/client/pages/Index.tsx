import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TimerDisplay } from "@/components/timer/TimerDisplay";
import { CostTicker } from "@/components/timer/CostTicker";
import { Project, ProjectSwitcher } from "@/components/timer/ProjectSwitcher";
import { RecentProjectsCarousel } from "@/components/timer/RecentProjectsCarousel";
import { SmartInterruptionDialog } from "@/components/timer/SmartInterruptionDialog";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";

interface TimerState {
  running: boolean;
  startMs: number | null;
  elapsedMs: number;
  lastActivityMs: number;
}

const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutes

const seedProjects: Project[] = [
  { id: "acme-web", client: "Acme Co.", name: "Website Redesign", hourlyRate: 140, color: "#8b5cf6" },
  { id: "nova-app", client: "Nova Systems", name: "iOS App", hourlyRate: 180, color: "#06b6d4" },
  { id: "atlas-brand", client: "Atlas Labs", name: "Brand Sprint", hourlyRate: 120, color: "#22c55e" },
  { id: "zen-ads", client: "Zen Media", name: "Ad Campaign Q4", hourlyRate: 160, color: "#f59e0b" },
];

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function Index() {
  const { light, success } = useHaptics();
  const [projects, setProjects] = useState<Project[]>(() => loadJSON("projects_v1", seedProjects));
  const [currentId, setCurrentId] = useState<string>(() => loadJSON("current_project_v1", projects[0]?.id ?? ""));
  const [timers, setTimers] = useState<Record<string, TimerState>>(() =>
    loadJSON("timers_v1", Object.fromEntries(projects.map((p) => [p.id, { running: false, startMs: null, elapsedMs: 0, lastActivityMs: Date.now() }]))),
  );
  const [now, setNow] = useState(Date.now());
  const [showInterrupt, setShowInterrupt] = useState(false);
  const snoozeUntilRef = useRef<number>(0);

  const current = useMemo(() => projects.find((p) => p.id === currentId) ?? projects[0], [projects, currentId]);
  const tState = timers[current?.id ?? ""] ?? { running: false, startMs: null, elapsedMs: 0, lastActivityMs: Date.now() };

  useEffect(() => {
    saveJSON("projects_v1", projects);
  }, [projects]);
  useEffect(() => {
    saveJSON("current_project_v1", currentId);
  }, [currentId]);
  useEffect(() => {
    saveJSON("timers_v1", timers);
  }, [timers]);

  useEffect(() => {
    if (!tState.running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [tState.running]);

  const totalElapsedMs = tState.elapsedMs + (tState.running && tState.startMs ? now - tState.startMs : 0);
  const totalSeconds = Math.floor(totalElapsedMs / 1000);

  const updateActivity = useCallback(() => {
    setTimers((prev) => ({
      ...prev,
      [current.id]: { ...prev[current.id], lastActivityMs: Date.now() },
    }));
  }, [current?.id]);

  useEffect(() => {
    const onAny = () => updateActivity();
    window.addEventListener("mousemove", onAny);
    window.addEventListener("keydown", onAny);
    window.addEventListener("touchstart", onAny, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onAny);
      window.removeEventListener("keydown", onAny);
      window.removeEventListener("touchstart", onAny);
    };
  }, [updateActivity]);

  useEffect(() => {
    if (!tState.running) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now < snoozeUntilRef.current && showInterrupt) return;
      if (now - (tState.lastActivityMs || 0) > INACTIVITY_MS && now > snoozeUntilRef.current) {
        setShowInterrupt(true);
      }
    }, 10000);
    return () => window.clearInterval(id);
  }, [tState.running, tState.lastActivityMs, showInterrupt]);

  const toggleTimer = useCallback(() => {
    setTimers((prev) => {
      const t = prev[current.id] ?? { running: false, startMs: null, elapsedMs: 0, lastActivityMs: Date.now() };
      if (t.running) {
        const elapsed = t.elapsedMs + (t.startMs ? Date.now() - t.startMs : 0);
        return { ...prev, [current.id]: { running: false, startMs: null, elapsedMs: elapsed, lastActivityMs: Date.now() } };
      } else {
        return { ...prev, [current.id]: { ...t, running: true, startMs: Date.now(), lastActivityMs: Date.now() } };
      }
    });
    light();
  }, [current?.id, light]);

  const switchProject = useCallback(
    (id: string) => {
      if (!id || id === currentId) return;
      setTimers((prev) => {
        const updates = { ...prev };
        const currentTimer = updates[currentId];
        if (currentTimer?.running) {
          const elapsed = currentTimer.elapsedMs + (currentTimer.startMs ? Date.now() - currentTimer.startMs : 0);
          updates[currentId] = { running: false, startMs: null, elapsedMs: elapsed, lastActivityMs: Date.now() };
          updates[id] = { ...(updates[id] || { running: false, startMs: null, elapsedMs: 0, lastActivityMs: Date.now() }), running: true, startMs: Date.now(), lastActivityMs: Date.now() };
        }
        return updates;
      });
      setCurrentId(id);
      success();
    },
    [currentId, success],
  );

  // Swipe gestures for quick project switching
  useEffect(() => {
    let startX = 0;
    let isActive = false;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      isActive = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!isActive) return;
      const dx = e.touches[0].clientX - startX;
      if (Math.abs(dx) > 80) {
        isActive = false;
        const idx = projects.findIndex((p) => p.id === currentId);
        const nextIdx = dx < 0 ? (idx + 1) % projects.length : (idx - 1 + projects.length) % projects.length;
        switchProject(projects[nextIdx].id);
      }
    };
    const onEnd = () => {
      isActive = false;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [projects, currentId, switchProject]);

  const onInterruptContinue = useCallback(() => {
    setShowInterrupt(false);
    snoozeUntilRef.current = 0;
    light();
    updateActivity();
  }, [light, updateActivity]);

  const onInterruptStop = useCallback(() => {
    setShowInterrupt(false);
    snoozeUntilRef.current = 0;
    setTimers((prev) => {
      const t = prev[current.id];
      const elapsed = t.elapsedMs + (t.startMs ? Date.now() - t.startMs : 0);
      return { ...prev, [current.id]: { running: false, startMs: null, elapsedMs: elapsed, lastActivityMs: Date.now() } };
    });
    light();
  }, [current?.id, light]);

  const onInterruptSwitch = useCallback(() => {
    setShowInterrupt(false);
    snoozeUntilRef.current = 0;
    const idx = projects.findIndex((p) => p.id === currentId);
    const nextIdx = (idx + 1) % projects.length;
    switchProject(projects[nextIdx].id);
  }, [projects, currentId, switchProject]);

  const onSnooze = useCallback(() => {
    setShowInterrupt(false);
    snoozeUntilRef.current = Date.now() + 5 * 60 * 1000;
  }, []);

  return (
    <div
      className={cn(
        "min-h-screen",
        "bg-[radial-gradient(1000px_600px_at_10%_-20%,_rgba(139,92,246,0.25),_transparent),radial-gradient(800px_500px_at_100%_20%,_rgba(6,182,212,0.18),_transparent)]",
      )}
      onKeyDown={(e) => {
        if (e.code === "Space") {
          e.preventDefault();
          toggleTimer();
        }
      }}
      tabIndex={0}
    >
      <main className="container flex min-h-screen flex-col items-center justify-center gap-6 py-10">
        <div className="w-full flex flex-col items-center gap-3">
          <ProjectSwitcher projects={projects} value={current.id} onChange={(v) => switchProject(v)} />
          <div className="text-sm text-muted-foreground">Swipe left/right to switch projects</div>
        </div>

        <TimerDisplay elapsedMs={totalElapsedMs} />
        <CostTicker seconds={totalSeconds} hourlyRate={current.hourlyRate} clientName={current.client} />

        <div className="mt-6 flex items-center gap-3">
          <Button
            size="lg"
            className={cn(
              "h-14 px-10 text-lg font-semibold shadow-lg shadow-primary/30",
              tState.running ? "bg-red-500 hover:bg-red-500/90" : "",
            )}
            onClick={toggleTimer}
            aria-pressed={tState.running}
          >
            {tState.running ? "Stop" : "Start"}
          </Button>
        </div>

        <section className="w-full">
          <h2 className="sr-only">Recent projects</h2>
          <RecentProjectsCarousel
            projects={projects}
            onSelect={(id) => {
              switchProject(id);
            }}
          />
        </section>
      </main>

      <SmartInterruptionDialog
        open={showInterrupt}
        onOpenChange={(o) => {
          setShowInterrupt(o);
          if (!o) onSnooze();
        }}
        clientName={current.client}
        projectName={current.name}
        hourlyRate={current.hourlyRate}
        elapsedMs={totalElapsedMs}
        onContinue={onInterruptContinue}
        onStop={onInterruptStop}
        onSwitch={onInterruptSwitch}
        autoDismissMs={60000}
      />
    </div>
  );
}
