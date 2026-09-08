import { useMemo, useState } from 'react';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ScrollPanel,
  SegmentedControl,
  Stat,
  Td,
} from '@/components/ui';
import { BarList } from '@/components/charts/BarList';
import { LegBalance } from '@/components/charts/LegBalance';
import type { Account, Leg, TeamMember } from '@/data/generate';
import { count, dateLabel, money } from '@/lib/format';

type LegFilter = 'all' | Leg;
type ActivityFilter = 'all' | 'active' | 'inactive';

export function Team({ account }: { account: Account }) {
  const [leg, setLeg] = useState<LegFilter>('all');
  const [activity, setActivity] = useState<ActivityFilter>('all');
  const [level, setLevel] = useState<'all' | number>('all');

  const filtered = useMemo(
    () =>
      account.team.filter((member) => {
        if (leg !== 'all' && member.leg !== leg) return false;
        if (activity === 'active' && !member.active) return false;
        if (activity === 'inactive' && member.active) return false;
        if (level !== 'all' && member.level !== level) return false;
        return true;
      }),
    [account.team, leg, activity, level],
  );

  const byLevel = useMemo(() => {
    const rows: Array<{ level: number; members: number; active: number }> = [];
    for (let depth = 1; depth <= 10; depth += 1) {
      const members = account.team.filter((member) => member.level === depth);
      if (members.length === 0) continue;
      rows.push({ level: depth, members: members.length, active: members.filter((m) => m.active).length });
    }
    return rows;
  }, [account.team]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total team"
          value={count(account.standing.teamSize)}
          sub={`Across ${byLevel.length} levels`}
        />
        <Stat
          label="Active this month"
          value={count(account.standing.activeMembers)}
          sub={`${Math.round((account.standing.activeMembers / account.standing.teamSize) * 100)}% of the team is depositing`}
        />
        <Stat
          label="Direct referrals"
          value={count(account.standing.directs)}
          sub="Ten are needed for every rank in the plan"
        />
        <Stat
          label="Business volume"
          value={count(account.standing.businessVolume)}
          sub="One unit per instalment received anywhere in the team"
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader
            title="Binary legs"
            hint="Solid shows volume that matched; the pale overhang is unmatched."
          />
          <CardBody>
            <LegBalance
              left={account.legs.left.volume}
              right={account.legs.right.volume}
              matchedLeft={account.income.matching.consumedLeft}
              matchedRight={account.income.matching.consumedRight}
            />
            <DataTable
              className="mt-4"
              caption="Leg detail"
              columns={[
                { key: 'leg', label: 'Leg' },
                { key: 'members', label: 'Members', align: 'right' },
                { key: 'active', label: 'Active', align: 'right' },
                { key: 'volume', label: 'Volume', align: 'right' },
                { key: 'carry', label: 'Carried in', align: 'right' },
              ]}
            >
              {(['left', 'right'] as const).map((side) => {
                const snapshot = account.legs[side];
                return (
                  <tr key={side}>
                    <Td className="capitalize">{side}</Td>
                    <Td align="right">{count(snapshot.members)}</Td>
                    <Td align="right">{count(snapshot.activeMembers)}</Td>
                    <Td align="right">{count(snapshot.volume)}</Td>
                    <Td align="right">{count(snapshot.carryIn)}</Td>
                  </tr>
                );
              })}
            </DataTable>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              {count(account.income.matching.pairs)} pairs matched this month for{' '}
              {money(account.income.matching.payable)}. The stronger leg is carrying{' '}
              {count(Math.max(account.income.matching.carryLeft, account.income.matching.carryRight))} BV that
              has nothing to pair with.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Depth" hint="How the team spreads across the ten paid levels." />
          <CardBody>
            <BarList
              ariaLabel="Team members by level"
              items={byLevel.map((row) => ({
                label: `Level ${row.level}`,
                value: row.members,
                display: count(row.members),
                note: `${count(row.active)} active`,
              }))}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={`Team roster (${count(filtered.length)})`}
          hint="Filter the tree, then read the rows."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl
                label="Leg"
                value={leg}
                onChange={setLeg}
                options={[
                  { value: 'all', label: 'Both legs' },
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                ]}
              />
              <SegmentedControl
                label="Activity"
                value={activity}
                onChange={setActivity}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Lapsed' },
                ]}
              />
              <select
                className="rounded-lg border border-line bg-raised px-2.5 py-1.5 text-[12px] text-ink"
                value={String(level)}
                onChange={(event) =>
                  setLevel(event.target.value === 'all' ? 'all' : Number(event.target.value))
                }
                aria-label="Level"
              >
                <option value="all">All levels</option>
                {byLevel.map((row) => (
                  <option key={row.level} value={row.level}>
                    Level {row.level}
                  </option>
                ))}
              </select>
            </div>
          }
        />
        <CardBody className="px-0 py-0">
          <ScrollPanel maxHeight={520} className="px-3 py-2">
            <DataTable
              stickyHeader
              caption="Team roster"
              columns={[
                { key: 'name', label: 'Member' },
                { key: 'level', label: 'Level', align: 'right' },
                { key: 'leg', label: 'Leg' },
                { key: 'joined', label: 'Joined' },
                { key: 'paid', label: 'Instalments', align: 'right' },
                { key: 'status', label: 'Status', align: 'right' },
              ]}
            >
              {filtered.slice(0, 200).map((member) => (
                <TeamRow key={member.id} member={member} />
              ))}
            </DataTable>
          </ScrollPanel>
          {filtered.length > 200 ? (
            <p className="border-t border-line px-5 py-3 text-[12px] text-faint">
              Showing the first 200 of {count(filtered.length)} matching members.
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

function TeamRow({ member }: { member: TeamMember }) {
  return (
    <tr className="hover:bg-raised/60">
      <Td>
        <span className="text-ink">{member.name}</span>
        <span className="ml-2 text-[11px] text-faint">{member.city}</span>
      </Td>
      <Td align="right">{member.level}</Td>
      <Td className="capitalize text-muted">{member.leg}</Td>
      <Td className="text-muted">{dateLabel(member.joinedAt)}</Td>
      <Td align="right">{member.instalmentsPaid} / 30</Td>
      <Td align="right">
        {member.spinWonInMonth !== null ? (
          <Badge tone="gold">Won month {member.spinWonInMonth}</Badge>
        ) : member.active ? (
          <Badge tone="positive">Active</Badge>
        ) : (
          <Badge tone="neutral">Lapsed</Badge>
        )}
      </Td>
    </tr>
  );
}
