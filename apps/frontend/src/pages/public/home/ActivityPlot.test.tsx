import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityPlot } from "./ActivityPlot";

describe("ActivityPlot", () => {
  it("updates the external SVG geometry to the selected values even with motion paused", async () => {
    const { rerender } = render(
      <ActivityPlot
        label="Visitas"
        values={[24, 38, 30, 52, 44, 73, 86]}
        stopped
      />,
    );
    rerender(
      <ActivityPlot
        label="Canjes"
        values={[8, 16, 12, 30, 23, 36, 44]}
        stopped
      />,
    );
    const plot = screen.getByRole("img", {
      name: "Canjes de ejemplo de lunes a domingo",
    });
    await waitFor(() =>
      expect(plot.querySelector("[data-chart-line]")).toHaveAttribute(
        "d",
        "M 14 102 L 57 94 L 100 98 L 143 80 L 186 87 L 229 74 L 272 66",
      ),
    );
    expect(plot.querySelector("circle:last-child")).toHaveAttribute("cy", "66");
  });

  it("isolates gradient references when multiple plots are rendered", () => {
    const values = [24, 38, 30, 52, 44, 73, 86];
    const { container } = render(
      <>
        <ActivityPlot label="Visitas" values={values} stopped />
        <ActivityPlot label="Canjes" values={values} stopped />
      </>,
    );
    const gradients = [...container.querySelectorAll("linearGradient")];
    expect(gradients[0].id).not.toBe(gradients[1].id);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.querySelector("[data-chart-area]")).toHaveAttribute(
        "fill",
        `url(#${svg.querySelector("linearGradient")?.id})`,
      );
    }
  });
});
