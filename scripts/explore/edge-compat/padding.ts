/**
 * Safety / generation padding for source tile coverage.
 * Do not weaken these to reduce tile count.
 */
import { GENERATOR_BUFFERS } from "./config.js";

export type PaddingBreakdown = {
  requestedRadiusMetres: number;
  maximumSafetyBufferMetres: number;
  generationSpacingBufferMetres: number;
  environmentContextBufferMetres: number;
  alternativeDisplacementBufferMetres: number;
  sourceRadiusMetres: number;
};

/**
 * Derive effective source radius from generator constants.
 *
 * effective_source_radius =
 *   requested_radius
 *   + maximum_safety_buffer
 *   + generation_spacing_buffer
 *   + environment_context_buffer
 *   + alternative_displacement_buffer
 */
export function computeSourcePadding(requestedRadiusMetres: number): PaddingBreakdown {
  const maximumSafetyBufferMetres = Math.max(
    GENERATOR_BUFFERS.motorwayBufferMeters,
    GENERATOR_BUFFERS.trunkBufferMeters,
    GENERATOR_BUFFERS.primaryBufferMeters,
    GENERATOR_BUFFERS.railwayBufferMeters,
    GENERATOR_BUFFERS.waterBufferMeters,
    GENERATOR_BUFFERS.pathWaterBufferMeters,
    GENERATOR_BUFFERS.nearWaterReviewMeters,
    GENERATOR_BUFFERS.barrierBufferMeters,
    GENERATOR_BUFFERS.gateBufferMeters,
    GENERATOR_BUFFERS.schoolBufferMeters,
    GENERATOR_BUFFERS.bboxEdgeBufferMeters,
    GENERATOR_BUFFERS.nearMajorRoadReviewMeters
  );

  const generationSpacingBufferMetres = GENERATOR_BUFFERS.minimumStopSpacingMeters;
  const environmentContextBufferMetres = GENERATOR_BUFFERS.environmentRadiusMeters;
  const alternativeDisplacementBufferMetres =
    GENERATOR_BUFFERS.maxAlternativeDisplacementMeters;

  const sourceRadiusMetres =
    requestedRadiusMetres +
    maximumSafetyBufferMetres +
    generationSpacingBufferMetres +
    environmentContextBufferMetres +
    alternativeDisplacementBufferMetres;

  return {
    requestedRadiusMetres,
    maximumSafetyBufferMetres,
    generationSpacingBufferMetres,
    environmentContextBufferMetres,
    alternativeDisplacementBufferMetres,
    sourceRadiusMetres,
  };
}
