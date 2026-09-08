import { useState, type FormEvent } from 'react';
import { Badge, Card, CardBody, CardHeader, DataTable, Notice, Stat, Td } from '@/components/ui';
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

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader title="Add a member" hint="An ID and password are generated automatically." />
          <CardBody>
            <form onSubmit={onCreate}>
              <label className="block">
                <span className="text-[12px] font-medium uppercase tracking-wider text-faint">Full name</span>
                <input
                  className="mt-1.5 w-full rounded-lg border border-line bg-raised px-3 py-2 text-[14px] text-ink placeholder:text-faint"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Anjali Verma"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="mt-4 w-full rounded-lg bg-gold px-4 py-2.5 text-[14px] font-semibold text-canvas transition-opacity disabled:opacity-60"
              >
                {busy ? 'Generating…' : 'Create member'}
              </button>
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
                  Hand these over now. Only a hash is stored, so this password cannot be shown again — issue a new one
                  if it is lost.
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Member accounts" hint="Suspend an account to block sign-in without deleting it." />
          <CardBody className="px-0 py-0">
            <div className="max-h-[460px] overflow-y-auto px-3 py-2">
              <DataTable
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
                        <button
                          type="button"
                          onClick={() => void onReset(account.id)}
                          className="rounded-md border border-line px-2 py-1 text-[12px] text-muted hover:text-gold"
                        >
                          New password
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleStatus(account)}
                          className="rounded-md border border-line px-2 py-1 text-[12px] text-muted hover:text-ink"
                        >
                          {account.status === 'active' ? 'Suspend' : 'Restore'}
                        </button>
                      </span>
                    </Td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </CardBody>
        </Card>
      </div>

      <Notice tone="info" title="Where these accounts live">
        Accounts are held in this browser’s local storage so the access model can be reviewed without a server. Point
        the four functions in the store module at an API and the rest of the app is unchanged.
      </Notice>
    </div>
  );
}

function Credential({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2">
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-wider text-faint">{label}</dt>
        <dd className="tnum truncate text-[14px] font-semibold text-ink">{value}</dd>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-md border border-line px-2 py-1 text-[12px] text-muted"
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
