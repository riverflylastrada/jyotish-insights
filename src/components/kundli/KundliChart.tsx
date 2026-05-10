import { useChartStore } from '@/stores/useChartStore';
import type { DivisionalChart, PlanetName } from '@/lib/astro/types';
import { PLANET_LABELS } from '@/lib/astro/types';
import { cn } from '@/lib/utils';

interface Props {
  chart: DivisionalChart;
  style?: 'north' | 'south';
  size?: number;
  onHouseClick?: (house: number) => void;
}

// House centroid positions for the North Indian diamond chart in a 400x400 box.
// House 1 is the central top diamond (Lagna), then anti-clockwise.
const NORTH_HOUSE_CENTERS: Record<number, { x: number; y: number }> = {
  1:  { x: 200, y: 110 },
  2:  { x: 110, y: 60 },
  3:  { x: 60,  y: 110 },
  4:  { x: 110, y: 200 },
  5:  { x: 60,  y: 290 },
  6:  { x: 110, y: 340 },
  7:  { x: 200, y: 290 },
  8:  { x: 290, y: 340 },
  9:  { x: 340, y: 290 },
  10: { x: 290, y: 200 },
  11: { x: 340, y: 110 },
  12: { x: 290, y: 60 },
};

// South Indian: 4x4 fixed grid, signs at fixed positions (Pisces top-left).
// Returns the cell x,y by sign number 1-12.
const SOUTH_SIGN_CELLS: Record<number, { col: number; row: number }> = {
  12: { col: 0, row: 0 }, 1:  { col: 1, row: 0 }, 2: { col: 2, row: 0 }, 3: { col: 3, row: 0 },
  11: { col: 0, row: 1 },                                                 4: { col: 3, row: 1 },
  10: { col: 0, row: 2 },                                                 5: { col: 3, row: 2 },
  9:  { col: 0, row: 3 }, 8:  { col: 1, row: 3 }, 7: { col: 2, row: 3 }, 6: { col: 3, row: 3 },
};

export function KundliChart({ chart, style = 'north', size = 360, onHouseClick }: Props) {
  const highlighted = useChartStore((s) => s.highlightedHouse);
  const setHighlighted = useChartStore((s) => s.setHighlightedHouse);

  const handleClick = (house: number) => {
    setHighlighted(highlighted === house ? null : house);
    onHouseClick?.(house);
  };

  // Group planets per house
  const planetsByHouse = new Map<number, { p: PlanetName; retro: boolean }[]>();
  chart.planets.forEach((p) => {
    if (p.planet === 'ascendant') return;
    const arr = planetsByHouse.get(p.houseNumber) ?? [];
    arr.push({ p: p.planet, retro: p.isRetrograde });
    planetsByHouse.set(p.houseNumber, arr);
  });

  if (style === 'north') {
    return (
      <svg viewBox="0 0 400 400" width={size} height={size} className="block max-w-full" role="img" aria-label={`${chart.vargaName} chart`}>
        {/* Outer frame */}
        <rect x="4" y="4" width="392" height="392" fill="hsl(var(--bg-surface))" stroke="hsl(var(--brand-maroon))" strokeWidth="1.5" />
        {/* Inner diamond + diagonals */}
        <g fill="none" stroke="hsl(var(--brand-maroon))" strokeWidth="1">
          <rect x="4" y="4" width="392" height="392" />
          <line x1="4" y1="4" x2="396" y2="396" />
          <line x1="396" y1="4" x2="4" y2="396" />
          <polygon points="200,4 396,200 200,396 4,200" />
        </g>
        {/* Corner ornaments */}
        {[[12,12],[388,12],[12,388],[388,388]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="2" fill="hsl(var(--brand-gold))" />
        ))}
        {/* Click targets — rough rectangles per house centroid for accessibility */}
        {Object.entries(NORTH_HOUSE_CENTERS).map(([h, pos]) => {
          const house = Number(h);
          const isHi = highlighted === house;
          const planets = planetsByHouse.get(house) ?? [];
          const sign = ((chart.ascendantSign - 1 + house - 1) % 12) + 1;
          return (
            <g key={h} onClick={() => handleClick(house)} className="cursor-pointer">
              <circle cx={pos.x} cy={pos.y} r="34" fill={isHi ? 'hsl(var(--brand-saffron) / 0.12)' : 'transparent'} />
              <text x={pos.x - 28} y={pos.y - 24} className="font-mono" fontSize="9" fill="hsl(var(--text-tertiary))">{sign}</text>
              <text x={pos.x + 28} y={pos.y - 24} textAnchor="end" className="font-mono" fontSize="9" fill="hsl(var(--text-muted))">H{house}</text>
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="11" fontWeight={500} fill="hsl(var(--text-primary))" className="font-sans">
                {planets.map(({ p, retro }, i) => (
                  <tspan key={i} dx={i === 0 ? 0 : 6} fill={`hsl(var(--planet-${p}))`}>
                    {PLANET_LABELS[p].short}{retro ? '℞' : ''}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // South Indian style — 4x4 grid, fixed sign positions
  const cell = 100; // 400 / 4
  return (
    <svg viewBox="0 0 400 400" width={size} height={size} className="block max-w-full" role="img" aria-label={`${chart.vargaName} chart`}>
      <rect x="4" y="4" width="392" height="392" fill="hsl(var(--bg-surface))" stroke="hsl(var(--brand-maroon))" strokeWidth="1.5" />
      {/* grid lines */}
      <g stroke="hsl(var(--brand-maroon))" strokeWidth="1" fill="none">
        {[1,2,3].map((i) => (<line key={`v${i}`} x1={4 + i*cell - (i===0?0:0)} y1="4" x2={4 + i*cell} y2="396" />))}
        {[1,2,3].map((i) => (<line key={`h${i}`} x1="4" y1={4 + i*cell} x2="396" y2={4 + i*cell} />))}
      </g>
      {Object.entries(SOUTH_SIGN_CELLS).map(([sign, { col, row }]) => {
        const signN = Number(sign);
        // Compute house relative to ascendant
        const house = ((signN - chart.ascendantSign + 12) % 12) + 1;
        const x = col * cell;
        const y = row * cell;
        const isHi = highlighted === house;
        const planets = planetsByHouse.get(house) ?? [];
        const isLagna = signN === chart.ascendantSign;
        return (
          <g key={sign} onClick={() => handleClick(house)} className="cursor-pointer">
            <rect x={x + 4} y={y + 4} width={cell} height={cell}
              fill={isHi ? 'hsl(var(--brand-saffron) / 0.12)' : 'transparent'} />
            {isLagna && (
              <line x1={x + 4} y1={y + 4} x2={x + 30} y2={y + 30}
                stroke="hsl(var(--brand-maroon))" strokeWidth="1.5" />
            )}
            <text x={x + 8} y={y + 16} className="font-mono" fontSize="9" fill="hsl(var(--text-tertiary))">{signN}</text>
            <text x={x + cell - 4} y={y + 16} textAnchor="end" className="font-mono" fontSize="9" fill="hsl(var(--text-muted))">H{house}</text>
            <text x={x + cell/2 + 2} y={y + cell/2 + 8} textAnchor="middle" fontSize="11" fontWeight={500} className="font-sans">
              {planets.map(({ p, retro }, i) => (
                <tspan key={i} dx={i === 0 ? 0 : 6} fill={`hsl(var(--planet-${p}))`}>
                  {PLANET_LABELS[p].short}{retro ? '℞' : ''}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function KundliFrame({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-md border border-hairline-subtle bg-surface p-5 shadow-sm', className)}>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-eyebrow text-text-tertiary">{title}</div>
          {subtitle && <div className="font-display text-h3 text-text-primary">{subtitle}</div>}
        </div>
      </div>
      <div className="flex justify-center">{children}</div>
    </div>
  );
}
