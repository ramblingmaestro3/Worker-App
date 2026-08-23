export type PickedLocation = {
  latitude: number;
  longitude: number;
  address: string;
  region: string | null;
};

let pending: PickedLocation | null = null;

/** Called by location-picker.tsx right before navigating back. */
export function setPickedLocation(loc: PickedLocation): void {
  pending = loc;
}

/** Called by the consuming screen (e.g. post-a-job.tsx) on focus. Returns the picked location once, then clears it. */
export function consumePickedLocation(): PickedLocation | null {
  const value = pending;
  pending = null;
  return value;
}
