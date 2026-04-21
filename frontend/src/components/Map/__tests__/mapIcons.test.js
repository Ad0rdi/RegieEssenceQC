import { describe, it, expect, vi } from 'vitest';

vi.mock('leaflet', () => ({
  default: {
    icon: vi.fn(),
    divIcon: vi.fn((options) => ({ options })),
  },
}));

vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: 'marker-icon.png' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: 'marker-shadow.png' }));

const L = await import('leaflet');
const { PRICING_COLORS, getStationPrice, getPriceLevelIcon, calculatePriceLevels } = await import('../mapIcons');

describe('PRICING_COLORS', () => {
  it('has correct color values', () => {
    expect(PRICING_COLORS.low).toBe('#16a34a');
    expect(PRICING_COLORS.medium).toBe('#f97316');
    expect(PRICING_COLORS.high).toBe('#dc2626');
  });
});

describe('getStationPrice', () => {
  it('returns the price when fuel type exists', () => {
    const prices = { regular: 1.45, super: 1.65, diesel: 1.55 };
    expect(getStationPrice(prices, 'regular')).toBe(1.45);
    expect(getStationPrice(prices, 'super')).toBe(1.65);
    expect(getStationPrice(prices, 'diesel')).toBe(1.55);
  });

  it('returns null when price does not exist', () => {
    const prices = { regular: 1.45 };
    expect(getStationPrice(prices, 'super')).toBe(null);
  });

  it('returns null when prices is null', () => {
    expect(getStationPrice(null, 'regular')).toBe(null);
  });

  it('returns null when fuelType is empty', () => {
    const prices = { regular: 1.45 };
    expect(getStationPrice(prices, '')).toBe(null);
  });
});

describe('getPriceLevelIcon', () => {
  it('returns a DivIcon for low level', () => {
    const icon = getPriceLevelIcon('low');
    expect(icon).toBeDefined();
    expect(icon.options.html).toContain('price-marker');
    expect(icon.options.html).toContain('#16a34a');
    expect(icon.options.html).toContain('$');
    expect(icon.options.iconSize).toEqual([28, 28]);
    expect(icon.options.iconAnchor).toEqual([14, 14]);
  });

  it('returns a DivIcon for medium level', () => {
    const icon = getPriceLevelIcon('medium');
    expect(icon.options.html).toContain('price-marker');
    expect(icon.options.html).toContain('#f97316');
  });

  it('returns a DivIcon for high level', () => {
    const icon = getPriceLevelIcon('high');
    expect(icon.options.html).toContain('price-marker');
    expect(icon.options.html).toContain('#dc2626');
  });

  it('returns null for invalid level', () => {
    expect(getPriceLevelIcon('invalid')).toBe(null);
    expect(getPriceLevelIcon(null)).toBe(null);
    expect(getPriceLevelIcon(undefined)).toBe(null);
  });

  it('returns a DivIcon with correct className', () => {
    const icon = getPriceLevelIcon('low');
    expect(icon).toBeDefined();
    expect(icon.options.className).toBe('price-marker');
  });
});

describe('calculatePriceLevels', () => {
  const stations = [
    { id: 1, name: 'Station A', prices: { regular: 1.45 } },
    { id: 2, name: 'Station B', prices: { regular: 1.30 } },
    { id: 3, name: 'Station C', prices: { regular: 1.60 } },
    { id: 4, name: 'Station D', prices: { regular: 1.50 } },
    { id: 5, name: 'Station E', prices: { regular: 1.35 } },
    { id: 6, name: 'Station F', prices: { regular: 1.55 } },
  ];

  it('assigns correct levels for 6 stations', () => {
    const result = calculatePriceLevels(stations, 'regular');
    expect(result.get(2)).toBe('low');
    expect(result.get(5)).toBe('low');
    expect(result.get(1)).toBe('medium');
    expect(result.get(4)).toBe('medium');
    expect(result.get(6)).toBe('high');
    expect(result.get(3)).toBe('high');
  });

  it('handles single station', () => {
    const single = [{ id: 1, name: 'Only', prices: { regular: 1.50 } }];
    const result = calculatePriceLevels(single, 'regular');
    expect(result.size).toBe(1);
    expect(result.get(1)).toBe('low');
  });

  it('handles two stations', () => {
    const two = [
      { id: 1, name: 'Cheaper', prices: { regular: 1.30 } },
      { id: 2, name: 'Expensive', prices: { regular: 1.60 } },
    ];
    const result = calculatePriceLevels(two, 'regular');
    expect(result.size).toBe(2);
    expect(result.get(1)).toBe('low');
    expect(result.get(2)).toBe('high');
  });

  it('excludes stations without valid price for fuel type', () => {
    const mixed = [
      { id: 1, name: 'Has regular', prices: { regular: 1.45 } },
      { id: 2, name: 'No regular', prices: { super: 1.60 } },
      { id: 3, name: 'Has regular', prices: { regular: 1.30 } },
    ];
    const result = calculatePriceLevels(mixed, 'regular');
    expect(result.size).toBe(2);
    expect(result.has(2)).toBe(false);
    expect(result.get(1)).toBe('high');
    expect(result.get(3)).toBe('low');
  });

  it('returns empty map when no stations have valid price', () => {
    const noPrices = [
      { id: 1, name: 'No regular', prices: { super: 1.60 } },
      { id: 2, name: 'Also no regular', prices: { diesel: 1.50 } },
    ];
    const result = calculatePriceLevels(noPrices, 'regular');
    expect(result.size).toBe(0);
  });

  it('handles 3 stations evenly', () => {
    const three = [
      { id: 1, name: 'Cheapest', prices: { regular: 1.30 } },
      { id: 2, name: 'Medium', prices: { regular: 1.45 } },
      { id: 3, name: 'Expensive', prices: { regular: 1.60 } },
    ];
    const result = calculatePriceLevels(three, 'regular');
    expect(result.get(1)).toBe('low');
    expect(result.get(2)).toBe('medium');
    expect(result.get(3)).toBe('high');
  });

  it('works with different fuel types', () => {
    const multiFuel = [
      { id: 1, name: 'A', prices: { regular: 1.45, diesel: 1.50 } },
      { id: 2, name: 'B', prices: { regular: 1.30, diesel: 1.40 } },
      { id: 3, name: 'C', prices: { regular: 1.60, diesel: 1.60 } },
    ];
    const regResult = calculatePriceLevels(multiFuel, 'regular');
    const dieselResult = calculatePriceLevels(multiFuel, 'diesel');
    expect(regResult.get(1)).toBe('medium');
    expect(regResult.get(3)).toBe('high');
    expect(dieselResult.get(1)).toBe('medium');
    expect(dieselResult.get(3)).toBe('high');
  });

  it('handles stations with null prices', () => {
    const withNulls = [
      { id: 1, name: 'A', prices: { regular: null } },
      { id: 2, name: 'B', prices: { regular: 1.30 } },
      { id: 3, name: 'C', prices: { regular: 1.60 } },
    ];
    const result = calculatePriceLevels(withNulls, 'regular');
    expect(result.size).toBe(2);
    expect(result.has(1)).toBe(false);
  });

  it('handles ties by distributing evenly based on order', () => {
    const ties = [
      { id: 1, name: 'A', prices: { regular: 1.50 } },
      { id: 2, name: 'B', prices: { regular: 1.50 } },
      { id: 3, name: 'C', prices: { regular: 1.50 } },
      { id: 4, name: 'D', prices: { regular: 1.50 } },
      { id: 5, name: 'E', prices: { regular: 1.50 } },
      { id: 6, name: 'F', prices: { regular: 1.50 } },
    ];
    const result = calculatePriceLevels(ties, 'regular');
    const levels = [...result.values()];
    const lowCount = levels.filter(l => l === 'low').length;
    const mediumCount = levels.filter(l => l === 'medium').length;
    const highCount = levels.filter(l => l === 'high').length;
    expect(lowCount).toBe(2);
    expect(mediumCount).toBe(2);
    expect(highCount).toBe(2);
  });
});
