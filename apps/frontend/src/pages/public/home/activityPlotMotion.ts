import { animate } from "motion";

function renderPlot(svg: SVGSVGElement, values: readonly number[]) {
  const line = values
    .map((y, index) => `${index ? "L" : "M"} ${14 + index * 43} ${y}`)
    .join(" ");
  svg.querySelector("[data-chart-line]")?.setAttribute("d", line);
  svg
    .querySelector("[data-chart-area]")
    ?.setAttribute("d", `${line} L 272 118 L 14 118 Z`);
  svg.querySelectorAll("circle").forEach((circle, index) => {
    circle.setAttribute("cy", String(values[index]));
  });
}

export function animatePlot(
  svg: SVGSVGElement,
  values: readonly number[],
  duration: number,
) {
  const target = values.map((value) => 110 - value);
  if (duration === 0) {
    renderPlot(svg, target);
    return () => {};
  }
  const start = [...svg.querySelectorAll("circle")].map((circle) =>
    Number(circle.getAttribute("cy")),
  );
  const control = animate(0, 1, {
    duration,
    ease: "easeInOut",
    onUpdate: (progress) =>
      renderPlot(
        svg,
        target.map(
          (value, index) => start[index] + (value - start[index]) * progress,
        ),
      ),
  });
  return () => control.stop();
}
