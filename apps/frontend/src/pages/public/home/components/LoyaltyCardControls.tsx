import { STARTING_STAMPS } from "../constants/loyaltyCard.constants.ts";
import type { LoyaltyCardControlsProps } from "../types/homeComponent.types.ts";
import { getDemoPhase, getButton, getAnnouncement } from "../models/loyaltyCardControlsModel";
import { COPY } from "../constants/loyaltyCardControls.constants.ts";

export function LoyaltyCardControls({ demo }: LoyaltyCardControlsProps) {
  const copy = COPY[getDemoPhase(demo)];
  const button = getButton(demo);
  const takeOver = demo.mode === "auto" || demo.complete;
  const canReset = demo.mode === "manual" && demo.stamps > STARTING_STAMPS && !demo.complete;
  return (
    <>
      <div className="fw-card-demo relative flex items-center flex-col gap-[8px] pb-[5px] w-full">
        <p className="fw-card-demo-narrative m-[0_0_2px] px-[10px] text-[color:var(--fw-text,_#2f4557)] text-[12px] leading-[1.6] text-center">
          {copy.narrative}
        </p>
        <div className="fw-card-demo-controls flex items-center justify-center flex-wrap gap-[12px]">
          <button
            type="button"
            className={`
              fw-card-demo-button [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:w-[21px]
              [&_>_span]:h-[21px] [&_>_span]:rounded-full [&_>_span]:[color:white] [&_>_span]:text-[17px]
              [&_>_span]:leading-[1] [&_>_span]:font-[400] [&_>_span]:[background:#087bd7]
              [&:hover:not(:disabled)]:[border-color:#087bd7]
              [&:hover:not(:disabled)]:[box-shadow:0_3px_15px_rgb(8_123_215_/_12%)]
              [&:focus-visible]:[outline:3px_solid_#087bd7] [&:focus-visible]:[outline-offset:4px]
              [&:disabled]:[cursor:default] [&:disabled]:[opacity:0.55] inline-flex items-center justify-center
              gap-[9px] min-h-[42px] p-[9px_17px] [border:1px_solid_var(--fw-border,_#d8e3eb)] rounded-[99px]
              text-[color:var(--fw-text,_#2f4557)] [font:inherit] text-[12px] font-semibold cursor-pointer
              [background:var(--fw-surface,_rgb(255_255_255_/_88%))]
              [transition:border-color_160ms_ease,_box-shadow_160ms_ease,_background_160ms_ease]
              motion-reduce:[transition:none]
            `}
            onClick={takeOver ? demo.startManualDemo : demo.addStamp}
            disabled={!demo.ready}
          >
            <span aria-hidden="true">{button.symbol}</span>
            {button.text}
          </button>
          {canReset && (
            <button
              type="button"
              className={`
                fw-card-demo-reset [&:focus-visible]:[outline:3px_solid_#087bd7]
                [&:focus-visible]:[outline-offset:3px] [&:focus-visible]:rounded-[6px] [border:0] p-[10px_4px]
                min-h-[42px] text-[color:var(--fw-muted,_#526a7b)] [font:inherit] text-[11px]
                [text-decoration:underline] [text-underline-offset:4px] cursor-pointer [background:none]
              `}
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
        className="fw-card-sr-only absolute w-[1px] h-[1px] p-0 m-[-1px] overflow-hidden whitespace-nowrap [border:0] [clip-path:inset(50%)]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {getAnnouncement(demo)}
      </span>
    </>
  );
}
