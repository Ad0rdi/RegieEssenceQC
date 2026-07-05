

const ZOOM_DRAG_TIMEOUT = 250;

export const pendingMarkerClickState = {
  ref: { current: null },
  timeoutRef: { current: null },
  touchPhaseRef: { current: 'IDLE' },
  ZOOM_DRAG_TIMEOUT,
  suppressClickRef: { current: false },
};

export const mapAnimatingRef = { current: false };
export const stationPopupOpenRef = { current: false };
export const stationPopupJustClosedRef = { current: false };
export const clusterFlyToState = { active: false };
