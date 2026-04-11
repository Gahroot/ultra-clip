/** Named color grade preset that maps to concrete FFmpeg eq/hue parameters. */
export type ColorGradePreset =
  | 'none'           // No color treatment
  | 'warm'           // Warm golden tones
  | 'cool'           // Cool blue-shifted
  | 'cinematic'      // Desaturated, crushed blacks
  | 'vintage'        // Faded, lifted blacks
  | 'high-contrast'  // Punchy, vivid
  | 'bw'             // Black and white
  | 'film'           // Film grain look (slight desaturation + warm shift)

/** Color grade configuration with optional fine-tuning overrides. */
export interface ColorGradeConfig {
  preset: ColorGradePreset
  /** Fine-tune brightness adjustment (-1.0 to 1.0). Default: 0 */
  brightness?: number
  /** Fine-tune contrast adjustment (0.0 to 3.0). Default: 1.0 */
  contrast?: number
  /** Fine-tune saturation adjustment (0.0 to 3.0). Default: 1.0 */
  saturation?: number
}
