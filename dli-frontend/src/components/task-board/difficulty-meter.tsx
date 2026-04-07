import type { Difficulty } from "@/config/constants";

const difficultySteps: Record<Difficulty, number> = {
  Beginner: 2,
  Intermediate: 3,
  Advanced: 5,
};

export function DifficultyMeter({ difficulty }: { difficulty: Difficulty }) {
  const activeBars = difficultySteps[difficulty];

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
        Difficulty / {difficulty}
      </p>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={`${difficulty}-${index}`}
            className={[
              "h-2.5 w-8 rounded-full transition-colors",
              index < activeBars ? "bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.35)]" : "bg-white/[0.08]",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
