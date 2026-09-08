import { Badge, Card, CardBody, CardHeader, DataTable, Stat, Td } from '@/components/ui';
import {
  checkPlanIntegrity,
  integritySummary,
  COMMISSIONABLE_BASE,
  LEVEL_TIERS,
  MATCHING,
  RANKS,
  REWARD_BUCKETS,
  SAVINGS,
  type FindingLevel,
} from '@/lib/plan';
import { bpsLabel, count, money } from '@/lib/format';

const TONE: Record<FindingLevel, 'positive' | 'info' | 'caution'> = {
  ok: 'positive',
  info: 'info',
  warning: 'caution',
};

const LABEL: Record<FindingLevel, string> = {
  ok: 'Reconciles',
  info: 'Interpreted',
  warning: 'Needs a decision',
};

/**
 * The plan as the engine actually reads it, plus every place the source
 * document is ambiguous. An operator should be able to answer "why did we pay
 * that?" from this page alone.
 */
export function PlanRules() {
  const findings = checkPlanIntegrity();
  const summary = integritySummary(findings);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Rules checked"
          value={count(findings.length)}
          sub="Every figure recomputed from the document"
        />
        <Stat label="Reconcile cleanly" value={count(summary.ok)} sub="Stated and computed values agree" />
        <Stat
          label="Interpreted"
          value={count(summary.info)}
          sub="Readable, but the engine had to choose a reading"
        />
        <Stat
          label="Need a decision"
          value={count(summary.warning)}
          accent={Boolean(summary.warning > 0 ? 'gold' : undefined)}
          sub="A gap or contradiction the company should resolve"
        />
      </div>

      <Card>
        <CardHeader
          title="Plan integrity"
          hint="Each check recomputes a figure from the encoded plan and compares it with what the document says."
        />
        <CardBody className="space-y-3">
          {findings.map((finding) => (
            <div key={finding.id} className="rounded-card border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-[14px] font-semibold text-ink">{finding.title}</h3>
                <Badge tone={TONE[finding.level]}>{LABEL[finding.level]}</Badge>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{finding.detail}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink">
                <span className="text-faint">How the engine handles it: </span>
                {finding.resolution}
              </p>
              <p className="mt-2 text-[12px] text-faint">{finding.source}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="The savings contract" />
          <CardBody className="px-0 py-0">
            <div className="px-3 py-2">
              <DataTable
                caption="Savings plan terms"
                columns={[
                  { key: 'term', label: 'Term' },
                  { key: 'value', label: 'Value', align: 'right' },
                ]}
              >
                <Row label="Monthly deposit" value={money(SAVINGS.monthlyDeposit)} />
                <Row label="Term" value={`${SAVINGS.termMonths} months`} />
                <Row label="Total deposited" value={money(SAVINGS.statedTotalDeposit)} />
                <Row label="Commissionable share" value="20% of each deposit" />
                <Row
                  label="Commissionable value"
                  value={`${money(COMMISSIONABLE_BASE)} per member per month`}
                />
                <Row label="First-month spin benefit" value={money(SAVINGS.firstMonthBenefit)} />
                <Row label="Benefit step per month" value={money(SAVINGS.benefitStep)} />
                <Row
                  label="Maturity"
                  value={`${money(SAVINGS.maturityValue)} in month ${SAVINGS.maturityMonth}`}
                />
                <Row label="Matched pair" value={money(MATCHING.payoutPerPair)} />
                <Row
                  label="Binary ratio"
                  value={`${MATCHING.ratio.weak}:${MATCHING.ratio.strong} or ${MATCHING.ratio.strong}:${MATCHING.ratio.weak}`}
                />
              </DataTable>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Level reward rates" hint="Level N opens once you hold N direct referrals." />
          <CardBody className="px-0 py-0">
            <div className="px-3 py-2">
              <DataTable
                caption="Level reward rates"
                columns={[
                  { key: 'level', label: 'Level' },
                  { key: 'rate', label: 'Rate', align: 'right' },
                  { key: 'per', label: 'Per active member', align: 'right' },
                  { key: 'directs', label: 'Directs needed', align: 'right' },
                ]}
              >
                {LEVEL_TIERS.map((tier) => (
                  <tr key={tier.level}>
                    <Td>Level {tier.level}</Td>
                    <Td align="right">{bpsLabel(tier.rate)}</Td>
                    <Td align="right">{money((COMMISSIONABLE_BASE * tier.rate) / 10_000)}</Td>
                    <Td align="right">{tier.directsRequired}</Td>
                  </tr>
                ))}
                <tr className="border-t-2 border-line font-semibold">
                  <Td>Total</Td>
                  <Td align="right">{bpsLabel(LEVEL_TIERS.reduce((total, tier) => total + tier.rate, 0))}</Td>
                  <Td align="right">
                    {money(
                      (COMMISSIONABLE_BASE * LEVEL_TIERS.reduce((total, tier) => total + tier.rate, 0)) /
                        10_000,
                    )}
                  </Td>
                  <Td align="right">—</Td>
                </tr>
              </DataTable>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Rank requirements"
          hint="Transcribed from the qualification table, with gaps marked."
        />
        <CardBody className="px-0 py-0">
          <div className="px-3 py-2">
            <DataTable
              caption="Rank qualification and rewards"
              columns={[
                { key: 'rank', label: 'Rank' },
                { key: 'directs', label: 'Directs', align: 'right' },
                { key: 'team', label: 'Team', align: 'right' },
                { key: 'bv', label: 'BV', align: 'right' },
                { key: 'active', label: 'Active', align: 'right' },
                { key: 'cap', label: 'Daily cap', align: 'right' },
                { key: 'pool', label: 'Pool share', align: 'right' },
              ]}
            >
              {RANKS.map((rank) => (
                <tr key={rank.id} className="hover:bg-raised/60">
                  <Td>{rank.label}</Td>
                  <Td align="right">{rank.directsRequired}</Td>
                  <Td align="right">{count(rank.teamRequired)}</Td>
                  <Td align="right">
                    {rank.bvRequired === null ? (
                      <span className="text-caution">Not stated</span>
                    ) : (
                      count(rank.bvRequired)
                    )}
                  </Td>
                  <Td align="right">{rank.activeRequired}</Td>
                  <Td align="right">
                    {rank.dailyMatchingCap === null ? (
                      <span className="text-caution">Not stated</span>
                    ) : (
                      money(rank.dailyMatchingCap)
                    )}
                  </Td>
                  <Td align="right">{bpsLabel(rank.leadershipPoolShare)}</Td>
                </tr>
              ))}
            </DataTable>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Reward buckets" />
        <CardBody className="px-0 py-0">
          <div className="px-3 py-2">
            <DataTable
              caption="Reward buckets"
              columns={[
                { key: 'bucket', label: 'Reward' },
                { key: 'share', label: 'Share', align: 'right' },
                { key: 'value', label: 'Per member-month', align: 'right' },
                { key: 'blurb', label: 'What it pays for' },
              ]}
            >
              {REWARD_BUCKETS.map((bucket) => (
                <tr key={bucket.id}>
                  <Td>{bucket.label}</Td>
                  <Td align="right">{bpsLabel(bucket.share)}</Td>
                  <Td align="right">{money((COMMISSIONABLE_BASE * bucket.share) / 10_000)}</Td>
                  <Td className="text-muted">{bucket.blurb}</Td>
                </tr>
              ))}
            </DataTable>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <Td className="text-muted">{label}</Td>
      <Td align="right" className="font-medium">
        {value}
      </Td>
    </tr>
  );
}
