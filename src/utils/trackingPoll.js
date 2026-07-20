/** Live tracking poll — mobile GPS ~5 min; admin refreshes once per minute. */
export const LIVE_TRACKING_POLL_MS = 60_000;

/** Day-map silent sync while viewing today's duty. */
export const DAY_MAP_AUTO_SYNC_MS = 60_000;

/** @deprecated use LIVE_TRACKING_POLL_MS or DAY_MAP_AUTO_SYNC_MS */
export const TRACKING_AUTO_SYNC_MS = LIVE_TRACKING_POLL_MS;
