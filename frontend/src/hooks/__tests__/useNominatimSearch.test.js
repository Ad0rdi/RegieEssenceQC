import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNominatimSearch, getCachedResults, setCachedResults } from '../../utils/nominatimSearch';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
  localStorage.clear();
});

describe('useNominatimSearch', () => {
  it('returns cached results when available', async () => {
    setCachedResults('ste-foy', [
      { lat: 46.77, lng: -71.28, name: 'Ste-Foy, QC', display_name: 'Ste-Foy, QC' }
    ]);

    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useNominatimSearch());

    let results;
    await act(async () => {
      results = await result.current.search('ste-Foy');
    });

    expect(results).toEqual([
      { lat: 46.77, lng: -71.28, name: 'Ste-Foy, QC', display_name: 'Ste-Foy, QC' }
    ]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls Nominatim API when cache is empty', async () => {
    const nominatimResponse = [
      {
        lat: '46.77',
        lon: '-71.28',
        display_name: 'Ste-Foy, Quebec, Canada',
      },
      {
        lat: '46.78',
        lon: '-71.27',
        display_name: 'Ste-Foy–Sillery, Quebec, Canada',
      }
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => nominatimResponse
    });

    const { result } = renderHook(() => useNominatimSearch());

    let results;
    await act(async () => {
      results = await result.current.search('ste-foy');
    });

    expect(results).toEqual([
      { lat: 46.77, lng: -71.28, name: 'Ste-Foy, Quebec, Canada', display_name: 'Ste-Foy, Quebec, Canada' },
      { lat: 46.78, lng: -71.27, name: 'Ste-Foy–Sillery, Quebec, Canada', display_name: 'Ste-Foy–Sillery, Quebec, Canada' }
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('ste-foy'),
      expect.objectContaining({
        headers: { 'User-Agent': 'RegieEssenceQC/1.0' }
      })
    );
  });

  it('caches results after API call', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{
        lat: '46.81',
        lon: '-71.21',
        display_name: 'Quebec City, QC, Canada'
      }]
    });

    const { result } = renderHook(() => useNominatimSearch());

    await act(async () => {
      await result.current.search('quebec');
    });

    await act(async () => {
      await result.current.search('quebec');
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns empty array for queries shorter than 2 characters', async () => {
    const { result } = renderHook(() => useNominatimSearch());

    let results;
    await act(async () => {
      results = await result.current.search('a');
    });

    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('sets error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNominatimSearch());

    await act(async () => {
      await result.current.search('montreal');
    });

    expect(result.current.error).toBe('Impossible de rechercher. Vérifiez votre connexion.');
    expect(result.current.isSearching).toBe(false);
  });

  it('sets rate limit error on 429 response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });

    const { result } = renderHook(() => useNominatimSearch());

    await act(async () => {
      await result.current.search('montreal');
    });

    expect(result.current.error).toBe('Trop de requêtes, réessayez plus tard.');
    expect(result.current.isSearching).toBe(false);
  });

  it('shows isSearching while fetching', async () => {
    let resolveFetch;
    mockFetch.mockReturnValue(new Promise(resolve => { resolveFetch = resolve; }));

    const { result } = renderHook(() => useNominatimSearch());

    let searchPromise;
    act(() => {
      searchPromise = result.current.search('test');
    });

    expect(result.current.isSearching).toBe(true);

    resolveFetch({ ok: true, json: async () => [] });
    await act(async () => {
      await searchPromise;
    });

    expect(result.current.isSearching).toBe(false);
  });

  it('clears all cache entries', async () => {
    setCachedResults('test1', []);
    setCachedResults('test2', []);
    localStorage.setItem('other_key', 'value');

    const { result } = renderHook(() => useNominatimSearch());

    await act(async () => {
      result.current.clearAllCache();
    });

    expect(localStorage.getItem('nominatim_test1')).toBeNull();
    expect(localStorage.getItem('nominatim_test2')).toBeNull();
    expect(localStorage.getItem('other_key')).toBe('value');
  });
});
