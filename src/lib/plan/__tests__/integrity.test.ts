import { describe, expect, it } from 'vitest';
import { checkPlanIntegrity, integritySummary } from '../integrity';

describe('plan integrity audit', () => {
  const findings = checkPlanIntegrity();
  const byId = new Map(findings.map((finding) => [finding.id, finding]));

  it('flags the level table overshooting its 20% heading', () => {
    const finding = byId.get('level-table-sum');
    expect(finding?.level).toBe('warning');
    expect(finding?.title).toContain('21%');
  });

  it('reports that the four buckets allocate only 80% of the base', () => {
    const finding = byId.get('bucket-allocation');
    expect(finding?.title).toContain('80%');
  });

  it('flags the missing Ruby daily cap', () => {
    const finding = byId.get('missing-daily-cap');
    expect(finding?.level).toBe('warning');
    expect(finding?.title).toContain('Ruby');
  });

  it('flags the missing Associate business-volume threshold', () => {
    expect(byId.get('missing-bv-requirement')?.level).toBe('info');
  });

  it('confirms the parts that do reconcile', () => {
    expect(byId.get('deposit-total')?.level).toBe('ok');
    expect(byId.get('leadership-pool')?.level).toBe('ok');
    expect(byId.get('projection-arithmetic')?.level).toBe('ok');
  });

  it('summarises to a warning overall', () => {
    const summary = integritySummary(findings);
    expect(summary.worst).toBe('warning');
    expect(summary.ok + summary.info + summary.warning).toBe(findings.length);
  });

  it('gives every finding a resolution and a source', () => {
    for (const finding of findings) {
      expect(finding.resolution.length).toBeGreaterThan(0);
      expect(finding.source.length).toBeGreaterThan(0);
    }
  });
});
