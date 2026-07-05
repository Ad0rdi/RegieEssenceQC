import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FilterProvider, useFilters } from '../FilterContext';

const wrapper = ({ children }) => <FilterProvider>{children}</FilterProvider>;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FilterContext', () => {
  it('provides default fuel types', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(result.current.selectedFuelTypes).toEqual(['regular', 'super', 'diesel']);
  });

  it('persists fuel types to localStorage', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.toggleFuelType('diesel');
    });

    expect(result.current.selectedFuelTypes).toEqual(['regular', 'super']);
    expect(localStorage.getItem('pref_fuelTypes')).toBe('["regular","super"]');
  });

  it('loads fuel types from localStorage', () => {
    localStorage.setItem('pref_fuelTypes', '["regular"]');
    const { result } = renderHook(() => useFilters(), { wrapper });
    expect(result.current.selectedFuelTypes).toEqual(['regular']);
  });

  it('persists radius filter', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.setRadiusFilter(10);
    });

    expect(result.current.radiusFilter).toBe(10);
    expect(localStorage.getItem('pref_radiusFilter')).toBe('10');
  });

  it('persists price filter', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.setPriceFilter({ min: 1.0, max: 2.0 });
    });

    expect(result.current.priceFilter).toEqual({ min: 1.0, max: 2.0 });
    const parsed = JSON.parse(localStorage.getItem('pref_priceFilter'));
    expect(parsed).toEqual({ min: 1, max: 2 });
  });

  it('persists center location', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.setCenterLocation({ lat: 45.5, lng: -73.5, source: 'search' });
    });

    expect(result.current.centerLocation).toEqual({ lat: 45.5, lng: -73.5, source: 'search' });
    expect(localStorage.getItem('pref_centerLocation')).toBe('{"lat":45.5,"lng":-73.5,"source":"search"}');
  });

  it('toggles datasaver', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.toggleDatasaver();
    });

    expect(result.current.datasaver).toBe(true);
    expect(localStorage.getItem('pref_datasaver')).toBe('true');

    act(() => {
      result.current.toggleDatasaver();
    });

    expect(result.current.datasaver).toBe(false);
    expect(localStorage.getItem('pref_datasaver')).toBe('false');
  });

  it('resetAllPrefs resets all values', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.toggleFuelType('diesel');
      result.current.setRadiusFilter(10);
      result.current.setPriceFilter({ min: 1.0, max: 2.0 });
      result.current.setCenterLocation({ lat: 45.5, lng: -73.5 });
      result.current.toggleDatasaver();
    });

    expect(result.current.selectedFuelTypes).toEqual(['regular', 'super']);
    expect(result.current.radiusFilter).toBe(10);

    act(() => {
      result.current.resetAllPrefs();
    });

    expect(result.current.selectedFuelTypes).toEqual(['regular', 'super', 'diesel']);
    expect(result.current.radiusFilter).toBeNull();
    expect(result.current.priceFilter).toEqual({ min: null, max: null });
    expect(result.current.centerLocation).toBeNull();
    expect(result.current.datasaver).toBe(false);
  });

  it('resetAllPrefs restores default values', () => {
    const { result } = renderHook(() => useFilters(), { wrapper });

    act(() => {
      result.current.toggleFuelType('diesel');
      result.current.setRadiusFilter(5);
    });

    expect(result.current.selectedFuelTypes).toEqual(['regular', 'super']);
    expect(result.current.radiusFilter).toBe(5);

    act(() => {
      result.current.resetAllPrefs();
    });

    expect(result.current.selectedFuelTypes).toEqual(['regular', 'super', 'diesel']);
    expect(result.current.radiusFilter).toBeNull();
    expect(result.current.priceFilter).toEqual({ min: null, max: null });
    expect(result.current.centerLocation).toBeNull();
    expect(result.current.datasaver).toBe(false);
    expect(result.current.drawerOpen).toBe(false);
  });
});
