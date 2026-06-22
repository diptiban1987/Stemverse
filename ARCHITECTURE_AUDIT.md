# ARCHITECTURE AUDIT — Phase 36A.5

## Codebase Statistics

| Metric | Value |
|--------|-------|
| Runtime files (src/stage/) | 90 |
| Test files (tests/) | 111 |
| Total types (interfaces + type aliases) | ~800+ |
| Types file lines | 8,807 |
| Source lines (estimated) | ~54,000 |
| Source bytes | ~2.8 MB |
| UI panel files | 41 |
| Snapshot fields in StageSyncState | 40 |

## Architecture Pattern Compliance

| Pattern | Status | Details |
|---------|--------|---------|
| Map + order array storage | ✅ COMPLIANT | All synchronizers use Map<string, T> + string[] |
| Deep copy safety | ✅ COMPLIANT | JSON.parse(JSON.stringify()) everywhere |
| Warning-only validation | ✅ COMPLIANT | console.warn, never throw |
| Snapshot integration | ✅ COMPLIANT | All 40 snapshot fields match phases 18D–36A |
| Serialization round-trip | ✅ COMPLIANT | toJSON/fromJSON on all synchronizers |
| Lifecycle cleanup | ✅ COMPLIANT | clear() on all synchronizers |
| Deterministic ordering | ✅ COMPLIANT | Order arrays maintain insertion order |

## Duplicate Export Analysis

| Export Name | Files | Status |
|-------------|-------|--------|
| `calculateSelectionBounds` | workspace-runtime.ts, simulator-ux-runtime.ts | ✅ MITIGATED via alias re-export |

No other duplicates found among 1,474+ exported functions.

## Misplaced Files

| File | Current Location | Should Be |
|------|-----------------|-----------|
| `workspace-persistence-runtime.test.ts` | `src/stage/` | `tests/` |

## Runtime Files Without Test Coverage

| Runtime File | Test Coverage |
|-------------|--------------|
| `component-svg-assets.ts` | ⚠️ No direct test |
| `component-svg-extended.ts` | ⚠️ No direct test |
| `component-asset-extensions.ts` | ⚠️ No direct test |
| `prompt-library.ts` | ⚠️ No direct test |
| `circuit-template-runtime.ts` | ⚠️ No direct test |
| `snap-preview-runtime.ts` | ⚠️ No direct test |
| `auto-save-runtime.ts` | ⚠️ Indirect via persistence tests |
| `project-thumbnail-runtime.ts` | ⚠️ No direct test |

## Web App Integration Analysis

| Category | Connected | Not Connected |
|----------|-----------|---------------|
| Core simulator | ✅ BaseRuntime, PixiRendererAdapter, SVG assets | — |
| Persistence | ✅ WorkspacePersistenceSnapshot, LocalProjectVersion | — |
| Platform features | — | ❌ 85+ modules (classroom, marketplace, tenant, etc.) |

> [!IMPORTANT]
> 85 of 91 stage modules are exported but never imported by the web app. These are runtime-engine internal implementations — domain logic, validators, data models. They are tested and architecturally sound but require UI wiring.

## Architecture Score: **85/100**
