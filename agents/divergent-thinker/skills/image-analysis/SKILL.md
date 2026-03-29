---
name: image-analysis
description: Extract visual concepts from images using VLM
version: 1.0.0
tools: [analyze-image, graph-add-node, graph-add-edge]
---
# Image Analysis Skill
Uses Gemini multimodal to analyze images and extract:
- Concepts (abstract themes) → Concept nodes
- Visual inspirations → Idea nodes with method: visual_inspiration
- Object relationships → USES_CONCEPT and SIMILAR_TO edges
Papers: Wu 2026, Lohner 2024, Peshevski 2025.
