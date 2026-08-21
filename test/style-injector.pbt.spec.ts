import fc from 'fast-check';

import { adoptPlayerstackStyles, ensureGlobalTokens, getSharedStyleSheet } from '@styles/style-injector';
import type { StyleInjectionTarget } from '@typings/styles/style-injector.types';

/**
 * WHY a `replaceSync` polyfill for the adopt path
 *   Property 6 asserts that the SHARED constructable stylesheet is adopted EXACTLY
 *   once no matter how many times `adoptPlayerstackStyles` runs. That path is guarded
 *   by a feature-detection of `CSSStyleSheet.prototype.replaceSync`, which the jsdom
 *   used by this test environment does NOT provide. To exercise the real adopt logic
 *   deterministically (approach "a": a fake `StyleInjectionTarget` seeded with foreign
 *   sheets) we install a no-op `replaceSync` for the duration of the suite so the
 *   feature detection passes and `getSharedStyleSheet()` can build the singleton.
 *   The polyfill is removed in `afterAll` so it never leaks into other suites.
 */
type ReplaceSyncProto = { replaceSync?: (text: string) => void };

let installedReplaceSync = false;

beforeAll(() => {
  const proto = CSSStyleSheet.prototype as unknown as ReplaceSyncProto;
  if (!('replaceSync' in proto)) {
    proto.replaceSync = function replaceSync(): void {
      /* no-op: jsdom cannot parse CSS text into a constructable sheet */
    };
    installedReplaceSync = true;
  }
});

afterAll(() => {
  if (installedReplaceSync) {
    delete (CSSStyleSheet.prototype as unknown as ReplaceSyncProto).replaceSync;
    installedReplaceSync = false;
  }
});

/** Counts how many times a given sheet identity appears in an adopted-sheets array. */
function countOccurrences(sheets: CSSStyleSheet[], target: CSSStyleSheet): number {
  return sheets.filter((sheet) => sheet === target).length;
}

/** Removes any previously injected global-tokens marker so state never leaks between runs. */
function clearGlobalTokens(): void {
  document.head.querySelectorAll('style[data-playerstack-tokens]').forEach((el) => {
    el.remove();
  });
}

describe('style-injector Style_Auto_Injection PBT', () => {
  // Feature: framework-agnostic-ui-core, Property 6: Idempotencia de Style_Auto_Injection
  it('Property 6: Idempotencia de Style_Auto_Injection — the shared sheet is adopted exactly once and global tokens are injected exactly once across N calls', () => {
    // Validates: Requirements 3.7, 3.8, 3.10, 20.6
    fc.assert(
      fc.property(
        // N >= 1 repeated calls; a handful of pre-existing foreign sheets on the target.
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 5 }),
        (calls, foreignCount) => {
          // The singleton shared sheet is stable across the whole property run.
          const shared = getSharedStyleSheet();

          // Seed the fake target with distinct foreign sheets that must survive untouched.
          const foreignSheets = Array.from({ length: foreignCount }, () => new CSSStyleSheet());
          const target: StyleInjectionTarget = { adoptedStyleSheets: [...foreignSheets] };

          for (let i = 0; i < calls; i += 1) {
            adoptPlayerstackStyles(target);
          }

          // Idempotence: the shared sheet appears EXACTLY once regardless of N calls.
          expect(countOccurrences(target.adoptedStyleSheets, shared)).toBe(1);

          // Pre-existing foreign sheets remain present (nothing is dropped).
          foreignSheets.forEach((sheet) => {
            expect(target.adoptedStyleSheets).toContain(sheet);
          });

          // The target grows by exactly one entry (the shared sheet) over its seed.
          expect(target.adoptedStyleSheets).toHaveLength(foreignCount + 1);

          // Global tokens: start clean so prior iterations never leak, then call N times.
          clearGlobalTokens();
          for (let i = 0; i < calls; i += 1) {
            ensureGlobalTokens(document);
          }

          // Idempotence: exactly ONE global tokens marker exists after N calls.
          expect(document.head.querySelectorAll('style[data-playerstack-tokens]')).toHaveLength(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
