import { useState, type FormEvent } from 'react';
import { Badge, Card, CardBody, CardHeader, DataTable, Notice, ScrollPanel, Stat, Td } from '@/components/ui';
import { Button, TextField } from '@/components/ui';
import {
  createMember,
  listAccounts,
  resetPassword,
  setStatus,
  type Account,
  type NewMember,
} from '@/lib/auth/store';
import { count, dateLabel } from '@/lib/format';

/**
 * Member provisioning.
 *
 * Creating a member allocates a unique ID and a generated password. The
 * password is shown exactly once, at creation: only its PBKDF2 derivation is
 * stored, so nothing here can display it again — the admin re-issues instead.
 */
export function Members() {
  const [accounts, setAccounts] = useState<Account[]>(() => listAccounts());
  const [name, setName] = useState('');
  const [issued, setIssued] = useState<NewMember | null>(null);
  const [busy, setBusy] = useState(false);

  const members = accounts.filter((account) => account.role === 'member');

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (busy || name.trim().length === 0) return;

    setBusy(true);
    const created = await createMember(name);
    setAccounts(listAccounts());
    setIssued(created);
    setName('');
    setBusy(false);
  }

  async function onReset(id: string) {
    setBusy(true);
    const reissued = await resetPassword(id);
    setAccounts(listAccounts());
    setIssued(reissued);
    setBusy(false);
  }

  function onToggleStatus(account: Account) {
    setStatus(account.id, account.status === 'active' ? 'suspended' : 'active');
    setAccounts(listAccounts());
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Member accounts" value={count(members.length)} sub="Provisioned on this device" />
        <Stat
          label="Active"
          value={count(members.filter((account) => account.status === 'active').length)}
          sub="Able to sign in right now"
        />
        <Stat
          label="Awaiting first sign-in"
          value={count(members.filter((account) => account.lastSignInAt === null).length)}
          sub="Credentials issued but never used"
        />
        <Stat
          label="Must change password"
          value={count(members.filter((account) => account.mustChangePassword).length)}
          sub="Still on a generated password"
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Add a member" hint="An ID and password are generated automatically." />
          <CardBody>
            <form onSubmit={onCreate}>
              <TextField
                label="Full name"
                value={name}
                onChange={setName}
                placeholder="Anjali Verma"
                required
              />
              <Button type="submit" disabled={busy} full className="mt-4">
                {busy ? 'Generating…' : 'Create member'}
              </Button>
            </form>

            {issued ? (
              <div className="mt-5 rounded-card border border-gold/40 bg-gold/8 p-4">
                <p className="text-[12px] font-medium uppercase tracking-wider text-gold">
                  Credentials for {issued.account.name}
                </p>
                <dl className="mt-3 space-y-2">
                  <Credential label="Member ID" value={issued.account.id} />
                  <Credential label="Password" value={issued.password} />
                </dl>
                <p className="mt-3 text-[12px] leading-relaxed text-muted">
                  Hand these over now. Only a hash is stored, so this password cannot be shown again — issue a
                  new one if it is lost.
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="How access works"
            hint="The same sign-in serves both dashboards; the ID decides which one opens."
          />
          <CardBody className="space-y-3 text-[13px] leading-relaxed text-muted">
            <p>
              A member signs in with the ID and password issued here and sees only their own savings, income,
              team and rank. Spin and Win is not in their navigation, and typing its route lands them back on
              their overview.
            </p>
            <p>
              Passwords are never stored. Each account keeps a random salt and a PBKDF2-SHA-256 derivation at
              210,000 iterations, so a lost password is re-issued rather than looked up.
            </p>
            <p>
              Suspending an account blocks sign-in immediately without removing its history. Restore it at any
              time.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Member accounts" hint="Suspend an account to block sign-in without deleting it." />
        <CardBody className="px-0 py-0">
          <ScrollPanel maxHeight={460} className="px-3 py-2">
            <DataTable
              stickyHeader
              caption="Provisioned member accounts"
              columns={[
                { key: 'id', label: 'Member ID' },
                { key: 'name', label: 'Name' },
                { key: 'created', label: 'Created' },
                { key: 'signin', label: 'Last sign-in' },
                { key: 'status', label: 'Status', align: 'right' },
                { key: 'actions', label: 'Actions', align: 'right' },
              ]}
            >
              {members.map((account) => (
                <tr key={account.id} className="hover:bg-raised/60">
                  <Td className="tnum">{account.id}</Td>
                  <Td>{account.name}</Td>
                  <Td className="text-muted">{dateLabel(new Date(account.createdAt))}</Td>
                  <Td className="text-muted">
                    {account.lastSignInAt ? dateLabel(new Date(account.lastSignInAt)) : 'Never'}
                  </Td>
                  <Td align="right">
                    {account.status === 'active' ? (
                      <Badge tone="positive">Active</Badge>
                    ) : (
                      <Badge tone="critical">Suspended</Badge>
                    )}
                  </Td>
                  <Td align="right">
                    <span className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-tiny font-medium"
                        onClick={() => void onReset(account.id)}
                      >
                        New password
                      </Button>
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-tiny font-medium"
                        onClick={() => onToggleStatus(account)}
                      >
                        {account.status === 'active' ? 'Suspend' : 'Restore'}
                      </Button>
                    </span>
                  </Td>
                </tr>
              ))}
            </DataTable>
          </ScrollPanel>
        </CardBody>
      </Card>

      <Notice tone="info" title="Where these accounts live">
        Accounts are held in this browser’s local storage so the access model can be reviewed without a
        server. Point the four functions in the store module at an API and the rest of the app is unchanged.
      </Notice>
    </div>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="well flex items-center justify-between gap-3 bg-surface px-3 py-2.5">
      <div className="min-w-0">
        <dt className="eyebrow">{label}</dt>
        {/* Monospace: these are codes to be read character by character. */}
        <dd className="truncate font-mono text-small font-medium text-ink">{value}</dd>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-md border border-line px-2 py-1 text-tiny text-muted transition-all duration-200 hover:text-ink active:scale-95"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(
            () => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            },
            () => setCopied(false),
          );
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
