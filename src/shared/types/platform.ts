/** Target social media platform for safe-zone calculations. */
export type Platform = 'tiktok' | 'reels' | 'shorts' | 'universal'

/**
 * Output aspect ratio for rendered clips.
 * - '9:16' — 1080×1920, vertical (TikTok, Reels, Shorts)
 * - '1:1'  — 1080×1080, square (Instagram Feed, Facebook)
 * - '4:5'  — 1080×1350, portrait (Instagram Post)
 * - '16:9' — 1920×1080, landscape (YouTube, Twitter)
 */
export type OutputAspectRatio = '9:16' | '1:1' | '4:5' | '16:9'
