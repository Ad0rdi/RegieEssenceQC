import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPref, setPref } from '../utils/storage';

const PREF_KEYS = {
  fuelTypes: 'pref_fuelTypes',
  radiusFilter: 'pref_radiusFilter',
  priceFilter: 'pref_priceFilter',
  centerLocation: 'pref_centerLocation',
  datasaver: 'pref_datasaver',
};

const DEFAULT_FUEL_TYPES = ['regular', 'super', 'diesel'];

const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  const [selectedFuelTypes, setSelectedFuelTypes] = useState(() => getPref(PREF_KEYS.fuelTypes, DEFAULT_FUEL_TYPES));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [radiusFilter, setRadiusFilterState] = useState(() => getPref(PREF_KEYS.radiusFilter, null));
  const [priceFilter, setPriceFilterState] = useState(() => getPref(PREF_KEYS.priceFilter, { min: null, max: null }));
  const [centerLocation, setCenterLocationState] = useState(() => getPref(PREF_KEYS.centerLocation, null));
  const [datasaver, setDatasaverState] = useState(() => getPref(PREF_KEYS.datasaver, false));

  useEffect(() => {
    setPref(PREF_KEYS.fuelTypes, selectedFuelTypes);
  }, [selectedFuelTypes]);

  useEffect(() => {
    setPref(PREF_KEYS.radiusFilter, radiusFilter);
  }, [radiusFilter]);

  useEffect(() => {
    setPref(PREF_KEYS.priceFilter, priceFilter);
  }, [priceFilter]);

  useEffect(() => {
    setPref(PREF_KEYS.centerLocation, centerLocation);
  }, [centerLocation]);

  useEffect(() => {
    setPref(PREF_KEYS.datasaver, datasaver);
  }, [datasaver]);

  const toggleFuelType = useCallback((type) => {
    setSelectedFuelTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const setRadiusFilter = useCallback((value) => {
    setRadiusFilterState(value);
  }, []);

  const setPriceFilter = useCallback((value) => {
    setPriceFilterState(value);
  }, []);

  const setCenterLocation = useCallback((value) => {
    setCenterLocationState(value);
  }, []);

  const toggleDatasaver = useCallback(() => {
    setDatasaverState(prev => !prev);
  }, []);

  const setDatasaver = useCallback((value) => {
    setDatasaverState(value);
  }, []);

  const resetAllPrefs = useCallback(() => {
    setSelectedFuelTypes(DEFAULT_FUEL_TYPES);
    setRadiusFilterState(null);
    setPriceFilterState({ min: null, max: null });
    setCenterLocationState(null);
    setDatasaverState(false);
    setDrawerOpen(false);
    Object.values(PREF_KEYS).forEach(key => localStorage.removeItem(key));
  }, []);

  return (
    <FilterContext.Provider value={{
      selectedFuelTypes,
      toggleFuelType,
      drawerOpen,
      setDrawerOpen,
      radiusFilter,
      setRadiusFilter,
      priceFilter,
      setPriceFilter,
      centerLocation,
      setCenterLocation,
      datasaver,
      toggleDatasaver,
      setDatasaver,
      resetAllPrefs,
    }}>
      {children}
    </FilterContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useFilters = () => useContext(FilterContext);
