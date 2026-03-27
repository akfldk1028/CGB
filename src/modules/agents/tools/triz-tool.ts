/** TRIZ 40 Inventive Principles Tool
 *
 * 근거:
 * - Altshuller, G. (1999). The Innovation Algorithm.
 * - TRIZ Agents (Szczepanik & Chudziak, ICAART 2025)
 * - TRIZ-GPT (Chen et al., 2024)
 * - TRIZ-RAGNER (Xu et al., 2026)
 *
 * SCAMPER는 TRIZ의 단순화 버전. TRIZ 40원리는 더 체계적이고 강력.
 * 에이전트가 문제의 "모순"을 식별 → 적절한 원리 추천.
 */

import type { AgentTool } from './registry';

/** TRIZ 40 Inventive Principles — 전체 (Altshuller 1999) */
const TRIZ_PRINCIPLES: Record<number, { name: string; description: string; example: string }> = {
  1:  { name: 'Segmentation', description: 'Divide an object into independent parts', example: 'Modular furniture, microservices architecture' },
  2:  { name: 'Taking out / Extraction', description: 'Extract the disturbing part or property', example: 'Noise-cancelling headphones extract noise' },
  3:  { name: 'Local quality', description: 'Change uniform structure to non-uniform', example: 'Progressive lens glasses, targeted ads' },
  4:  { name: 'Asymmetry', description: 'Change symmetrical form to asymmetrical', example: 'Asymmetric encryption, ergonomic mouse' },
  5:  { name: 'Merging / Consolidation', description: 'Combine identical or similar objects/operations', example: 'Swiss Army knife, all-in-one apps' },
  6:  { name: 'Universality', description: 'Make an object perform multiple functions', example: 'Smartphone replacing camera+phone+GPS' },
  7:  { name: 'Nested doll (Matryoshka)', description: 'Place one object inside another', example: 'Telescoping antenna, nested containers' },
  8:  { name: 'Anti-weight / Counterweight', description: 'Compensate weight with lift or buoyancy', example: 'Helium balloons for decoration, load balancer' },
  9:  { name: 'Preliminary anti-action', description: 'Perform opposite action in advance to prevent harm', example: 'Pre-stress concrete, input validation' },
  10: { name: 'Preliminary action', description: 'Perform required changes in advance', example: 'Pre-pasted wallpaper, pre-loaded content' },
  11: { name: 'Beforehand cushioning', description: 'Prepare emergency means in advance', example: 'Airbags, circuit breakers, error fallbacks' },
  12: { name: 'Equipotentiality', description: 'Change conditions to eliminate lifting/lowering', example: 'Canal locks, auto-scaling infrastructure' },
  13: { name: 'The other way round / Inversion', description: 'Invert the action or process', example: 'Running on treadmill instead of road' },
  14: { name: 'Spheroidality / Curvature', description: 'Use curves instead of straight lines, spheres instead of cubes', example: 'Ball bearings, curved screens, rounded UI corners' },
  15: { name: 'Dynamization', description: 'Make rigid objects flexible or adaptable', example: 'Adjustable standing desk, responsive design' },
  16: { name: 'Partial or excessive action', description: 'Do slightly more/less than required', example: 'Overfill then trim, over-provision cloud resources' },
  17: { name: 'Another dimension', description: 'Move to a new dimension (1D→2D→3D)', example: 'QR codes (1D→2D), 3D printing, multi-tenant' },
  18: { name: 'Mechanical vibration', description: 'Use oscillation, resonance, or frequency', example: 'Ultrasonic cleaning, vibration alerts' },
  19: { name: 'Periodic action', description: 'Replace continuous with periodic/pulsating action', example: 'Batch processing, cron jobs, heartbeat checks' },
  20: { name: 'Continuity of useful action', description: 'Carry on work without pauses, eliminate idle time', example: 'Continuous deployment, streaming pipelines' },
  21: { name: 'Skipping / Rushing through', description: 'Perform harmful actions at high speed', example: 'Flash pasteurization, quick deploy + rollback' },
  22: { name: 'Blessing in disguise', description: 'Use harmful factors to achieve positive effect', example: 'Vaccination uses weakened virus, adversarial training' },
  23: { name: 'Feedback', description: 'Introduce feedback to improve process', example: 'Thermostat, A/B testing, user analytics' },
  24: { name: 'Intermediary / Mediator', description: 'Use an intermediate object to transfer action', example: 'API gateway, middleware, message queue' },
  25: { name: 'Self-service', description: 'Make the object service itself', example: 'Self-cleaning oven, auto-update software' },
  26: { name: 'Copying', description: 'Use simpler/cheaper copies', example: 'Digital twin, simulation, mockup, shadow DOM' },
  27: { name: 'Cheap short-living objects', description: 'Replace expensive with cheap disposable ones', example: 'Disposable cameras, serverless functions, ephemeral containers' },
  28: { name: 'Mechanics substitution', description: 'Replace mechanical with sensory means', example: 'Touch ID replacing physical keys, voice UI' },
  29: { name: 'Pneumatics and hydraulics', description: 'Use gas/liquid instead of solid parts', example: 'Air cushion packaging, cloud computing, fluid compute' },
  30: { name: 'Flexible shells and thin films', description: 'Use flexible shells or thin films instead of rigid', example: 'Bubble wrap, thin-client architecture, edge functions' },
  31: { name: 'Porous materials', description: 'Make an object porous or add porous elements', example: 'Sponge filters, sparse attention, skip connections' },
  32: { name: 'Color changes', description: 'Change color or transparency', example: 'Mood ring, pH indicator, dark mode, syntax highlighting' },
  33: { name: 'Homogeneity', description: 'Make objects of same material or consistent properties', example: 'Monorepo, unified API, consistent design system' },
  34: { name: 'Discarding and recovering', description: 'Discard used parts, restore consumed parts', example: 'Garbage collection, cache eviction, log rotation' },
  35: { name: 'Parameter changes', description: 'Change physical/chemical state or parameters', example: 'Freeze-dried food, compressed files, quantization' },
  36: { name: 'Phase transitions', description: 'Use effects during phase transitions', example: 'State machine transitions, deployment blue/green' },
  37: { name: 'Thermal expansion', description: 'Use expansion/contraction with temperature', example: 'Auto-scaling based on load, elastic compute' },
  38: { name: 'Strong oxidants / Accelerated oxidation', description: 'Replace common environment with enriched one', example: 'GPU acceleration, specialized hardware, TPU' },
  39: { name: 'Inert atmosphere', description: 'Replace normal environment with inert one', example: 'Sandboxed execution, isolated containers, air-gapped networks' },
  40: { name: 'Composite materials', description: 'Replace homogeneous with composite', example: 'Carbon fiber, hybrid apps, ensemble models, RAG' },
};

export const trizTool: AgentTool = {
  name: 'triz_principle',
  description: `Apply TRIZ (Theory of Inventive Problem Solving) principles to find innovative solutions. TRIZ is more systematic than SCAMPER — it identifies contradictions in a problem and suggests specific inventive principles. Based on Altshuller (1999), TRIZ Agents (ICAART 2025), TRIZ-GPT (2024).

Use this when:
- SCAMPER feels too generic for the problem
- There's a clear CONTRADICTION (improving X worsens Y)
- You need engineering-level inventive solutions`,
  parameters: {
    problem: { type: 'string', description: 'Description of the problem or idea to improve' },
    contradiction: { type: 'string', description: 'The contradiction: "Improving X worsens Y"' },
    principle_number: { type: 'number', description: 'Specific TRIZ principle to apply (optional, agent can choose)' },
  },
  execute: async (params) => {
    const num = params.principle_number as number | undefined;

    if (num && TRIZ_PRINCIPLES[num]) {
      const p = TRIZ_PRINCIPLES[num];
      return {
        principle: { number: num, ...p },
        instruction: `Apply TRIZ Principle #${num} "${p.name}" to the problem: "${params.problem}". Contradiction: "${params.contradiction}". Example: ${p.example}. Generate a solution that resolves the contradiction using this principle.`,
      };
    }

    // 원리 미지정 → 주요 원리 추천 (문제 유형별)
    const allPrinciples = Object.entries(TRIZ_PRINCIPLES)
      .map(([n, p]) => ({ number: parseInt(n), ...p }));
    const recommended = allPrinciples.filter((p) =>
      [1, 2, 5, 10, 13, 15, 17, 22, 24, 25, 27, 35, 40].includes(p.number)
    );

    return {
      problem: params.problem,
      contradiction: params.contradiction,
      availablePrinciples: recommended,
      instruction: `Choose the most relevant TRIZ principle for this contradiction: "${params.contradiction}". Apply it to generate an inventive solution. Save the solution with graph_add_node.`,
      reference: 'Altshuller (1999), TRIZ Agents (ICAART 2025)',
    };
  },
};
