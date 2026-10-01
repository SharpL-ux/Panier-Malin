import { describe, expect, it } from 'vitest';
import type { Product } from '../types/catalog';
import type { PriceObservation } from '../types/prices';
import {
  indexObservations,
  isStale,
  itemCost,
  needInRefUnit,
  priceKey,
  selectPrice,
  unitCents,
} from './pricing';

const today = new Date(2026, 9, 1);
const fiche = (patch: Partial<Product> = {}): Product => ({
  id: 'lait',
  name: 'Lait demi-écrémé UHT',
  categoryId: 'cremerie',
  icon: '🥛',
  pack: { count: 1, size: 1000, unit: 'ml' },
  soldByWeight: false,
  halal: false,
  references: [],
  ...patch,
});
const obs = (patch: Partial<PriceObservation> = {}): PriceObservation => ({
  productId: 'lait',
  storeId: 'op-1',
  cents: 95,
  per: 'pack',
  date: '2026-09-20',
  source: 'open-prices',
  ...patch,
});

describe('coût d’un article selon le format', () => {
  it('multiplie le prix du conditionnement quand le format est le même', () => {
    expect(itemCost(fiche(), 3, obs())).toBe(285);
  });

  it('achète des conditionnements entiers quand le format diffère', () => {
    const couches = fiche({ pack: { count: 1, size: 44, unit: 'piece' } });
    // 2 paquets de 44 = 88 couches ; en paquets de 48, il en faut 2.
    expect(
      itemCost(couches, 2, obs({ cents: 1299, pack: { count: 1, size: 48, unit: 'piece' } })),
    ).toBe(2598);
    // Un pack de 6 × 1 L couvre 3 L : un seul pack.
    expect(
      itemCost(fiche(), 3, obs({ cents: 540, pack: { count: 6, size: 1000, unit: 'ml' } })),
    ).toBe(540);
  });

  it('proratise le vrac au kilo et compte les pièces', () => {
    const bananes = fiche({ soldByWeight: true, pack: { count: 1, size: 1000, unit: 'g' } });
    expect(itemCost(bananes, 1.5, obs({ cents: 199, per: 'kg' }))).toBe(299);
    const avocats = fiche({ pack: { count: 1, size: 1, unit: 'piece' } });
    expect(itemCost(avocats, 4, obs({ cents: 89, per: 'piece' }))).toBe(356);
    // Fraises en barquette de 250 g, prix relevé au kilo.
    const fraises = fiche({ pack: { count: 1, size: 250, unit: 'g' } });
    expect(itemCost(fraises, 2, obs({ cents: 1196, per: 'kg' }))).toBe(598);
  });

  it('refuse un relevé incomparable', () => {
    expect(itemCost(fiche(), 1, obs({ per: 'kg' }))).toBeNull();
    expect(itemCost(fiche(), 1, obs({ pack: { count: 1, size: 500, unit: 'g' } }))).toBeNull();
  });

  it('donne le prix au litre, au kilo ou à la pièce', () => {
    expect(
      unitCents(fiche(), obs({ cents: 540, pack: { count: 6, size: 1000, unit: 'ml' } })),
    ).toBe(90);
    expect(unitCents(fiche(), obs({ cents: 199, per: 'kg' }))).toBe(199);
    expect(needInRefUnit(fiche({ pack: { count: 4, size: 125, unit: 'g' } }), 3)).toBe(1.5);
  });
});

describe('choix du prix', () => {
  it('donne la priorité à votre saisie, même plus ancienne', () => {
    const chosen = selectPrice(
      [obs({ date: '2026-09-28' }), obs({ source: 'manuel', cents: 89, date: '2026-09-01' })],
      { today },
    );
    expect(chosen?.observation.cents).toBe(89);
  });

  it('peut préférer le relevé le plus récent quelle que soit sa source', () => {
    const chosen = selectPrice(
      [obs({ date: '2026-09-28' }), obs({ source: 'manuel', cents: 89, date: '2026-09-01' })],
      {
        today,
        preferManual: false,
      },
    );
    expect(chosen?.observation.cents).toBe(95);
  });

  it('préfère un relevé du magasin à celui d’un autre magasin de l’enseigne, signalé', () => {
    const other = obs({ cents: 79, date: '2026-09-30', fallbackFrom: 'Lidl, Puteaux' });
    expect(selectPrice([other, obs()], { today })?.observation.cents).toBe(95);
    const onlyOther = selectPrice([other], { today });
    expect(onlyOther).toMatchObject({
      fallback: true,
      observation: { fallbackFrom: 'Lidl, Puteaux' },
    });
    expect(selectPrice([other], { today, allowFallback: false })).toBeNull();
  });

  it('prend le relevé le plus récent et signale ceux de plus de trois mois', () => {
    const chosen = selectPrice(
      [obs({ date: '2026-05-01', cents: 99 }), obs({ date: '2026-06-01', cents: 105 })],
      { today },
    );
    expect(chosen).toMatchObject({ stale: true, observation: { cents: 105 } });
    expect(isStale('2026-07-03', today)).toBe(false);
    expect(isStale('2026-07-02', today)).toBe(true);
  });

  it('ne renvoie rien sans relevé', () => {
    expect(selectPrice([], { today })).toBeNull();
  });

  it('indexe les relevés par fiche et par magasin', () => {
    const index = indexObservations([obs(), obs({ storeId: 'op-2' }), obs({ cents: 99 })]);
    expect(index.get(priceKey('lait', 'op-1'))).toHaveLength(2);
    expect(index.get(priceKey('lait', 'op-2'))).toHaveLength(1);
  });
});
