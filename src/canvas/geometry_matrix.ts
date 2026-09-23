/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export interface GeometryNode {
  x: number;
  y: number;
  radius: number;
  label: string;
  status: "active" | "verified" | "idle";
}

export class GeometryMatrix {
  public static drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
    ctx.strokeStyle = "rgba(0, 255, 170, 0.04)";
    ctx.lineWidth = 1;
    const gridSize = 40;

    ctx.beginPath();
    for (let x = 0; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Dinamik Aksiyomatik Izgara Dalgalanması
    const waveY = (Math.sin(time * 0.002) + 1) * (height / 2);
    ctx.strokeStyle = "rgba(0, 255, 170, 0.12)";
    ctx.beginPath();
    ctx.moveTo(0, waveY);
    ctx.lineTo(width, waveY);
    ctx.stroke();
  }

  public static drawNodes(ctx: CanvasRenderingContext2D, nodes: GeometryNode[]) {
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.status === "verified" ? "rgba(16, 185, 129, 0.8)" : "rgba(59, 130, 246, 0.8)";
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = "10px monospace";
      ctx.fillStyle = "#A1A1AA";
      ctx.fillText(node.label, node.x - node.radius, node.y + node.radius + 14);
    });
  }

  public static drawFooterBranding(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const text = "AXIOM Kernel v12 — Powered by Tedbirge WebOS © 2026 Tedbirge Labs";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(161, 161, 170, 0.6)";
    ctx.fillText(text, width / 2, height - 16);
  }
}
