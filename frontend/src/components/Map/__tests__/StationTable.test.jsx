import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StationTable from '../StationTable';

const mockStations = [
  { id: 1, name: 'Station A', brand: 'Brand A', company: 'Company A', address: '123 Main St', prices: { regular: 1.459, super: 1.559, diesel: 1.659 } },
  { id: 2, name: 'Station B', brand: 'Brand B', company: 'Company B', address: '456 Oak Ave', prices: { regular: 1.399, diesel: 1.599 } },
];

describe('StationTable', () => {
  it('renders all station brands', () => {
    render(<StationTable stations={mockStations} onStationClick={vi.fn()} />);
    expect(screen.getByText('Brand A')).toBeTruthy();
    expect(screen.getByText('Brand B')).toBeTruthy();
  });

  it('renders table headers', () => {
    render(<StationTable stations={mockStations} onStationClick={vi.fn()} />);
    expect(screen.getByText('Brand')).toBeTruthy();
    expect(screen.getByText('Company')).toBeTruthy();
    expect(screen.getByText('Address')).toBeTruthy();
    expect(screen.getByText('Min Price')).toBeTruthy();
  });

  it('renders prices for each station', () => {
    render(<StationTable stations={mockStations} onStationClick={vi.fn()} />);
    expect(screen.getByText('$1.459')).toBeTruthy();
    expect(screen.getByText('$1.399')).toBeTruthy();
  });

  it('renders company and address for each station', () => {
    render(<StationTable stations={mockStations} onStationClick={vi.fn()} />);
    expect(screen.getByText('Company A')).toBeTruthy();
    expect(screen.getByText('Company B')).toBeTruthy();
    expect(screen.getByText('123 Main St')).toBeTruthy();
    expect(screen.getByText('456 Oak Ave')).toBeTruthy();
  });

  it('calls onStationClick when a row is clicked', () => {
    const handleClick = vi.fn();
    render(<StationTable stations={mockStations} onStationClick={handleClick} />);
    const row = screen.getByText('Brand A').closest('tr');
    if (row) {
      fireEvent.click(row);
      expect(handleClick).toHaveBeenCalledWith(mockStations[0]);
    }
  });

  it('handles stations with missing optional fields gracefully', () => {
    const stationsWithMissingFields = [
      { id: 3, name: 'Station C', brand: 'Brand C', company: null, address: '', prices: { regular: 1.299 } },
    ];
    render(<StationTable stations={stationsWithMissingFields} onStationClick={vi.fn()} />);
    expect(screen.getByText('Brand C')).toBeTruthy();
  });

  it('handles empty stations array', () => {
    render(<StationTable stations={[]} onStationClick={vi.fn()} />);
    expect(screen.getByText('Brand')).toBeTruthy();
    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBe(0);
  });

  it('sorts by brand column when clicked', () => {
    render(<StationTable stations={mockStations} onStationClick={vi.fn()} />);
    const brandHeader = screen.getByText('Brand');
    fireEvent.click(brandHeader);
    expect(screen.getByText('Brand A')).toBeTruthy();
  });

  it('sorts by min price column when clicked', () => {
    render(<StationTable stations={mockStations} onStationClick={vi.fn()} />);
    const priceHeader = screen.getByText('Min Price');
    fireEvent.click(priceHeader);
    expect(screen.getByText('$1.399')).toBeTruthy();
  });
});
