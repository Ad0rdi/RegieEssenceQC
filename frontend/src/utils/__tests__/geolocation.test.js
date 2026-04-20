import { describe, it, expect } from 'vitest';
import { calculateDistance, deg2rad, toRad } from '../geolocation';

describe('deg2rad', () => {
  it('converts 0 degrees to 0 radians', () => {
    expect(deg2rad(0)).toBe(0);
  });

  it('converts 180 degrees to PI radians', () => {
    expect(deg2rad(180)).toBeCloseTo(Math.PI);
  });

  it('converts 90 degrees to PI/2 radians', () => {
    expect(deg2rad(90)).toBeCloseTo(Math.PI / 2);
  });
});

describe('toRad', () => {
  it('returns the same value', () => {
    expect(toRad(Math.PI)).toBe(Math.PI);
  });
});

describe('calculateDistance', () => {
  it('returns 0 for the same coordinates', () => {
    expect(calculateDistance(45.5017, -73.5673, 45.5017, -73.5673)).toBe(0);
  });

  it('calculates distance between Montreal and Quebec City (~235 km)', () => {
    const montreal = { lat: 45.5017, lon: -73.5673 };
    const quebec = { lat: 46.8139, lon: -71.2080 };
    const distance = calculateDistance(montreal.lat, montreal.lon, quebec.lat, quebec.lon);
    expect(distance).toBeCloseTo(235, -1);
  });

  it('calculates distance between Paris and London (~344 km)', () => {
    const paris = { lat: 48.8566, lon: 2.3522 };
    const london = { lat: 51.5074, lon: -0.1278 };
    const distance = calculateDistance(paris.lat, paris.lon, london.lat, london.lon);
    expect(distance).toBeCloseTo(344, -1);
  });

  it('returns same distance regardless of order', () => {
    const a = { lat: 45.5017, lon: -73.5673 };
    const b = { lat: 46.8139, lon: -71.2080 };
    expect(calculateDistance(a.lat, a.lon, b.lat, b.lon)).toBeCloseTo(
      calculateDistance(b.lat, b.lon, a.lat, a.lon)
    );
  });
});
