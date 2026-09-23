/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import { GeometryMatrix, GeometryNode } from "./geometry_matrix";

export class AxiomRenderer {
  private canvas: HTMLCanvasElement;
  private ctx2D: CanvasRenderingContext2D | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private animationFrameId: number | null = null;
  private isWebGL2Supported = false;
  private nodes: GeometryNode[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initContext();
    this.initSampleNodes();
  }

  private initContext() {
    this.gl = this.canvas.getContext("webgl2");
    if (this.gl) {
      this.isWebGL2Supported = true;
    } else {
      this.ctx2D = this.canvas.getContext("2d");
      this.isWebGL2Supported = false;
    }
  }

  private initSampleNodes() {
    this.nodes = [
      { x: 120, y: 150, radius: 6, label: "Z3_SMT_NODE", status: "verified" },
      { x: 280, y: 220, radius: 6, label: "LEAN4_PROVER", status: "verified" },
      { x: 450, y: 180, radius: 6, label: "P2P_MESH_ROOT", status: "active" },
    ];
  }

  public resize(width: number, height: number) {
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.ctx2D) {
      this.ctx2D.scale(window.devicePixelRatio, window.devicePixelRatio);
    } else if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public startRenderLoop() {
    const render = (time: number) => {
      const width = this.canvas.clientWidth;
      const height = this.canvas.clientHeight;

      if (this.isWebGL2Supported && this.gl) {
        this.gl.clearColor(0.03, 0.03, 0.05, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
      } else if (this.ctx2D) {
        this.ctx2D.clearRect(0, 0, width, height);
        this.ctx2D.fillStyle = "#08080C";
        this.ctx2D.fillRect(0, 0, width, height);

        GeometryMatrix.drawGrid(this.ctx2D, width, height, time);
        GeometryMatrix.drawNodes(this.ctx2D, this.nodes);
        GeometryMatrix.drawFooterBranding(this.ctx2D, width, height);
      }

      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  public stopRenderLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public getRenderingEngineName(): string {
    return this.isWebGL2Supported ? "WebGL 2.0 (120 FPS Native)" : "Canvas 2D (Graceful Fallback)";
  }
}
