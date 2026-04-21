import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FuelFilter from '../FuelFilter';
import { FilterProvider } from '../../../context/FilterContext';

function Wrapper({ children }) {
  return <FilterProvider>{children}</FilterProvider>;
}

const getButtons = (container) =>
  container.querySelector('.fuel-filter-container');

const hasActiveClass = (element) => element.classList.contains('active');

const getButtonByText = (container, text) =>
  Array.from(getButtons(container).querySelectorAll('button')).find(
    (btn) => btn.textContent === text
  );

describe('FuelFilter', () => {
  it('renders all fuel type buttons', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const buttons = getButtons(container).querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('applies active class to all selected fuel types by default', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const regularBtn = getButtonByText(container, 'Regular');
    const superBtn = getButtonByText(container, 'Super');
    const dieselBtn = getButtonByText(container, 'Diesel');
    expect(hasActiveClass(regularBtn)).toBe(true);
    expect(hasActiveClass(superBtn)).toBe(true);
    expect(hasActiveClass(dieselBtn)).toBe(true);
  });

  it('toggles fuel type off on click', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const regularBtn = getButtonByText(container, 'Regular');
    fireEvent.click(regularBtn);
    expect(hasActiveClass(regularBtn)).toBe(false);
  });

  it('toggles fuel type back on with second click', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const regularBtn = getButtonByText(container, 'Regular');
    fireEvent.click(regularBtn);
    expect(hasActiveClass(regularBtn)).toBe(false);
    fireEvent.click(regularBtn);
    expect(hasActiveClass(regularBtn)).toBe(true);
  });

  it('preserves other active filters when toggling one', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const regularBtn = getButtonByText(container, 'Regular');
    const superBtn = getButtonByText(container, 'Super');
    const dieselBtn = getButtonByText(container, 'Diesel');
    fireEvent.click(regularBtn);
    expect(hasActiveClass(regularBtn)).toBe(false);
    expect(hasActiveClass(superBtn)).toBe(true);
    expect(hasActiveClass(dieselBtn)).toBe(true);
  });

  it('toggles all fuel types independently', () => {
    const { container } = render(<FuelFilter />, { wrapper: Wrapper });
    const regularBtn = getButtonByText(container, 'Regular');
    const dieselBtn = getButtonByText(container, 'Diesel');
    fireEvent.click(regularBtn);
    fireEvent.click(dieselBtn);
    expect(hasActiveClass(regularBtn)).toBe(false);
    expect(hasActiveClass(getButtonByText(container, 'Super'))).toBe(true);
    expect(hasActiveClass(dieselBtn)).toBe(false);
  });
});
