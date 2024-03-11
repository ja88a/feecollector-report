/**
 * Result of an events scraping session.
 */
export interface ResultEventScrapingSession {
  /** User friendly sumup message */
  message: string
  /** Number of new onchain events collected */
  eventsNew: number
  /** Number of scanned blocks */
  blocksScanned: number
}
