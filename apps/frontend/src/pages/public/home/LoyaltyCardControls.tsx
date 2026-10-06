import type { LoyaltyCardState } from "./useLoyaltyCard";

type DemoState = Pick<
  LoyaltyCardState,
  | "mode"
  | "complete"
  | "ready"
  | "autoRunning"
  | "stamps"
  | "startManualDemo"
  | "addStamp"
>;

const COPY = {
  intro: { narrative: "Cada visita tiene algo bueno.", label: "Demo en pausa" },
  playing: {
    narrative: "Cada visita, un paso más cerca del regalo.",
    label: "Demo automática",
  },
  paused: {
    narrative: "La historia sigue cuando tú quieras.",
    label: "Demo en pausa",
  },
  autoComplete: {
    narrative: "Así se siente volver. Ahora pruébalo tú.",
    label: "De la visita a la recompensa",
  },
  manual: {
    narrative: "Una visita, un sello. El próximo lo sumas tú.",
    label: "Tú tienes el control",
  },
  manualComplete: {
    narrative: "Un buen motivo para la próxima visita.",
    label: "Tú tienes el control",
  },
};

function getDemoPhase({
  mode,
  complete,
  ready,
  autoRunning,
}: DemoState): keyof typeof COPY {
  if (mode === "manual") return complete ? "manualComplete" : "manual";
  if (complete) return "autoComplete";
  if (!ready) return "intro";
  return autoRunning ? "playing" : "paused";
}

function getButton({ mode, complete }: DemoState) {
  if (mode === "auto") return { text: "Probar yo", symbol: "↗" };
  if (complete) return { text: "Volver a probar", symbol: "↻" };
  return { text: "Sumar un sello", symbol: "+" };
}

function getAnnouncement({ mode, complete, autoRunning, stamps }: DemoState) {
  if (complete) {
    const next =
      mode === "auto"
        ? "Elige Probar yo para sumar tus propios sellos."
        : "Puedes volver a probar.";
    return "10 de 10 sellos. ¡Recompensa desbloqueada! " + next;
  }
  const automatic = autoRunning
    ? "Demostración automática en curso."
    : "Demostración automática en pausa.";
  const prefix = mode === "manual" ? "Demostración manual." : automatic;
  return (
    prefix +
    " " +
    stamps +
    " de 10 sellos. Faltan " +
    (10 - stamps) +
    " para tu recompensa."
  );
}

export function LoyaltyCardControls({ demo }: { demo: DemoState }) {
  const copy = COPY[getDemoPhase(demo)];
  const button = getButton(demo);
  const takeOver = demo.mode === "auto" || demo.complete;
  const canReset = demo.mode === "manual" && demo.stamps > 2 && !demo.complete;
  return (
    <>
      <div className="fw-card-demo relative flex items-center flex-col gap-[8px] pb-[5px] w-full">
        <p className="fw-card-demo-narrative [margin:0_0_2px] px-[10px] text-[color:var(--fw-text,_#2f4557)] text-[12px] leading-[1.6] text-center">
          {copy.narrative}
        </p>
        <div className="fw-card-demo-controls flex items-center justify-center flex-wrap gap-[12px]">
          <button
            type="button"
            className="fw-card-demo-button inline-flex items-center justify-center gap-[9px] min-h-[42px] [padding:9px_17px] [border:1px_solid_var(--fw-border,_#d8e3eb)] rounded-[99px] text-[color:var(--fw-text,_#2f4557)] [font:inherit] text-[12px] font-semibold [cursor:pointer]"
            onClick={takeOver ? demo.startManualDemo : demo.addStamp}
            disabled={!demo.ready}
          >
            <span aria-hidden="true">{button.symbol}</span>
            {button.text}
          </button>
          {canReset && (
            <button
              type="button"
              className="fw-card-demo-reset [border:0] [padding:10px_4px] min-h-[42px] text-[color:var(--fw-muted,_#526a7b)] [font:inherit] text-[11px] [text-decoration:underline] [text-underline-offset:4px] [cursor:pointer]"
              onClick={demo.startManualDemo}
            >
              Reiniciar
            </button>
          )}
        </div>
        <span className="fw-card-example-label text-[color:var(--fw-muted,_#526a7b)] text-[9px]">
          Tarjeta de ejemplo · {copy.label}
        </span>
      </div>
      <span
        className="fw-card-sr-only absolute w-[1px] h-[1px] p-0 m-[-1px] overflow-hidden whitespace-nowrap [border:0]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {getAnnouncement(demo)}
      </span>
    </>
  );
}
