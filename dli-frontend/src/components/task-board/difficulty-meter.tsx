import type { TaskDifficulty } from "./types";

const difficultySteps: Record<TaskDifficulty, number> = {
  beginner: 2,
  intermediate: 3,
  advanced: 5,
};

function formatDifficultyLabel(difficulty: TaskDifficulty) {
  return `${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`;
}

export function DifficultyMeter({ difficulty }: { difficulty: TaskDifficulty }) {
  const activeBars = difficultySteps[difficulty];

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
        {formatDifficultyLabel(difficulty)}
      </p>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={`${difficulty}-${index}`}
            className={[
              "h-1.5 w-4 rounded-sm transition-colors",
              index < activeBars
                ? "bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.25)]"
                : "bg-neutral-800",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
