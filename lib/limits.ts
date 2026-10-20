// /**
//  * Imports resource limits from the single source of truth: worker/limits.json.
//  * Use this in Next.js API routes and UI to read the same values the worker enforces.
//  * Never hardcode limit numbers elsewhere.
//  */
// import rawLimits from "../worker/limits.json";

// export interface Limits {
//   image_max_bytes: number;
//   image_max_pixels: number;
//   image_min_dimension: number;
//   image_allowed_types: string[];

//   video_max_bytes: number;
//   video_max_seconds: number;
//   video_max_width: number;
//   video_max_height: number;
//   video_frame_sample_fps: number;
//   video_max_sampled_frames: number;
//   video_allowed_types: string[];

//   ai_max_images: number;
//   ai_max_image_dimension: number;
// }

// export const LIMITS: Limits = rawLimits as Limits;



/**
 * Imports resource limits from the single source of truth: worker/limits.json.
 * Use this in Next.js API routes and UI to read the same values the worker enforces.
 * Never hardcode limit numbers elsewhere.
 */
import rawLimits from "../worker/limits.json";

export type Limits = typeof rawLimits;

export const LIMITS: Limits = rawLimits;
