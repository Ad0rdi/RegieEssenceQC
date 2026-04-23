import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FuelFilter from '../FuelFilter';
import { FilterProvider } from '../../../context/FilterContext';

function Wrapper({ children }) {
  return <FilterProvider>{children}</FilterProvider>;
}

const getPillsContainer = (container) =>
  container.querySelector('.fuel-filter-pills');

const hasActiveClass = (element) => element.classList.contains('active');

const getButtonByText = (container, text) =>
  Array.from(getPillsContainer(container).querySelectorAll('button')).find(
    (btn) => btn.textContent === text
  );

describe('FuelFilter', () => {
  it('renders all fuel type buttons', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const buttons = getPillsContainer(container).querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('applies active class to all selected fuel types by default', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const regularBtn = getButtonByText(container, 'Régulier');
    const superBtn = getButtonByText(container, 'Super');
    const dieselBtn = getButtonByText(container, 'Diesel');
    expect(hasActiveClass(regularBtn)).toBe(true);
    expect(hasActiveClass(superBtn)).toBe(true);
    expect(hasActiveClass(dieselBtn)).toBe(true);
  });

  it('toggles fuel type off on click', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const regularBtn = getButtonByText(container, 'Régulier');
    fireEvent.click(regularBtn);
    expect(hasActiveClass(regularBtn)).toBe(false);
  });

  it('toggles fuel type back on with second click', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const regularBtn = getButtonByText(container, 'Régulier');
    fireEvent.click(regularBtn);
    expect(hasActiveClass(regularBtn)).toBe(false);
    fireEvent.click(regularBtn);
    expect(hasActiveClass(regularBtn)).toBe(true);
  });

  it('preserves other active filters when toggling one', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const regularBtn = getButtonByText(container, 'Régulier');
    const superBtn = getButtonByText(container, 'Super');
    const dieselBtn = getButtonByText(container, 'Diesel');
    fireEvent.click(regularBtn);
    expect(hasActiveClass(regularBtn)).toBe(false);
    expect(hasActiveClass(superBtn)).toBe(true);
    expect(hasActiveClass(dieselBtn)).toBe(true);
  });

  it('toggles all fuel types independently', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const regularBtn = getButtonByText(container, 'Régulier');
    const dieselBtn = getButtonByText(container, 'Diesel');
    fireEvent.click(regularBtn);
    fireEvent.click(dieselBtn);
    expect(hasActiveClass(regularBtn)).toBe(false);
    expect(hasActiveClass(getButtonByText(container, 'Super'))).toBe(true);
    expect(hasActiveClass(dieselBtn)).toBe(false);
  });

  it('renders with French label for regular fuel type', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const pills = getPillsContainer(container);
    const labels = Array.from(pills.querySelectorAll('button')).map(btn => btn.textContent);
    expect(labels).toContain('Régulier');
    expect(labels).toContain('Super');
    expect(labels).toContain('Diesel');
  });
});
