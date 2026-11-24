import { defineRouteConfig } from '@medusajs/admin-sdk';
import { BuildingStorefront } from '@medusajs/icons';
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Prompt,
  Table,
  Text,
  toast,
} from '@medusajs/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { sdk } from '../../lib/client';

type Tenant = {
  id: string;
  name: string;
  currency_code: string | null;
  publishable_keys: { id: string; title: string; token: string }[];
  settings: {
    deposit_percent: number;
    default_contact_email: string | null;
    slug: string | null;
    address: string | null;
    domains: { host: string; verified: boolean; cname_target: string }[];
    base_domain: string;
    cname_target: string;
  };
  portal_admins: { id: string; email: string; name: string | null; activated: boolean }[];
  collaborators: number;
  pending_requests: number;
};

const KEY = ['admin-portal-tenants'];

/** A value with a copy button (long keys and invite links). */
const Copyable = ({
  content,
  children,
  className,
}: {
  content: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`flex items-center gap-2 ${className ?? ''}`}>
    <div className="min-w-0 flex-1">{children}</div>
    <Button
      size="small"
      variant="secondary"
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(content).then(
          () => toast.success('Copied'),
          () => toast.error('Could not copy')
        );
      }}
    >
      Copy
    </Button>
  </div>
);

/** Platform (Medusa) admin: every tenant = one store with its own portal admin, deposit and storefront key. */
const PortalsPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: () =>
      sdk.client.fetch<{
        stores: Tenant[];
        portal_url: string;
        base_domain: string;
        cname_target: string;
      }>('/admin/portal/stores'),
  });
  const [createOpen, setCreateOpen] = useState(false);
  // Keep only the ids: the drawers read the freshest copy from the list after every change.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const stores = data?.stores ?? [];

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Portals (tenants)</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Each store has its own portal admin, deposit % and storefront key. Collaborators can
            work for several stores. Everyone signs in at one fixed address:{' '}
            <a className="underline" href={data?.portal_url} target="_blank" rel="noreferrer">
              {data?.portal_url ?? '/portal'}
            </a>
          </Text>
        </div>
        <Button size="small" onClick={() => setCreateOpen(true)}>
          New store
        </Button>
      </div>

      <div className="px-2 pb-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Store</Table.HeaderCell>
              <Table.HeaderCell>Storefront address</Table.HeaderCell>
              <Table.HeaderCell>Portal admin</Table.HeaderCell>
              <Table.HeaderCell>Deposit</Table.HeaderCell>
              <Table.HeaderCell>Collaborators</Table.HeaderCell>
              <Table.HeaderCell>Pending</Table.HeaderCell>
              <Table.HeaderCell>Storefront key</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              <Table.Row>
                <Table.Cell>Loading…</Table.Cell>
              </Table.Row>
            ) : null}
            {stores.map((s) => (
              <Table.Row key={s.id}>
                <Table.Cell>
                  <div className="flex flex-col">
                    <a className="font-medium underline" href={`/app/portals/${s.id}`}>
                      {s.name}
                    </a>
                    <span className="text-ui-fg-muted text-xs">
                      {s.id} · {s.currency_code?.toUpperCase() ?? '—'}
                    </span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col gap-0.5">
                    {s.settings.address ? (
                      <a
                        className="text-xs underline"
                        href={`http://${s.settings.address}:4100`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {s.settings.address}
                      </a>
                    ) : null}
                    {s.settings.domains.map((d) => (
                      <div key={d.host} className="flex items-center gap-1 text-xs">
                        {d.host}
                        <Badge size="2xsmall" color={d.verified ? 'green' : 'orange'}>
                          {d.verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {s.portal_admins.length ? (
                    s.portal_admins.map((a) => (
                      <div key={a.id} className="flex items-center gap-2">
                        <span>{a.email}</span>
                        <Badge size="2xsmall" color={a.activated ? 'green' : 'orange'}>
                          {a.activated ? 'Active' : 'Invited'}
                        </Badge>
                        <RemoveAdmin
                          id={a.id}
                          email={a.email}
                          onDone={() => qc.invalidateQueries({ queryKey: KEY })}
                        />
                      </div>
                    ))
                  ) : (
                    <Text size="small" className="text-ui-fg-subtle">
                      No admin yet
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>{s.settings.deposit_percent}%</Table.Cell>
                <Table.Cell>{s.collaborators}</Table.Cell>
                <Table.Cell>{s.pending_requests}</Table.Cell>
                <Table.Cell>
                  {s.publishable_keys[0] ? (
                    <Copyable content={s.publishable_keys[0].token} className="max-w-[10rem]">
                      <span className="block truncate text-xs">{s.publishable_keys[0].token}</span>
                    </Copyable>
                  ) : (
                    <Text size="small" className="text-ui-fg-subtle">
                      —
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex justify-end gap-2">
                    <Button size="small" variant="secondary" onClick={() => setInvitingId(s.id)}>
                      {s.portal_admins.length ? 'Resend invite' : 'Invite admin'}
                    </Button>
                    <Button size="small" variant="secondary" onClick={() => setEditingId(s.id)}>
                      Settings
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>

      <CreateDrawer
        baseDomain={data?.base_domain ?? 'localhost'}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => qc.invalidateQueries({ queryKey: KEY })}
      />
      <SettingsDrawer
        tenant={stores.find((x) => x.id === editingId) ?? null}
        onClose={() => setEditingId(null)}
        onDone={() => qc.invalidateQueries({ queryKey: KEY })}
      />
      <InviteDrawer
        tenant={stores.find((x) => x.id === invitingId) ?? null}
        onClose={() => setInvitingId(null)}
        onDone={() => qc.invalidateQueries({ queryKey: KEY })}
      />
    </Container>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <Label size="small">{label}</Label>
    {children}
  </div>
);

function CreateDrawer({
  open,
  onClose,
  onDone,
  baseDomain,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  baseDomain: string;
}) {
  const [form, setForm] = useState({
    name: '',
    currency_code: 'vnd',
    deposit_percent: '20',
    slug: '',
    admin_email: '',
    admin_name: '',
  });
  const [locations, setLocations] = useState<string[]>([]);
  const { data: locRes } = useQuery({
    queryKey: ['admin-portal-stock-locations'],
    queryFn: () => sdk.admin.stockLocation.list({ limit: 100, fields: 'id,name' }),
    enabled: open,
  });
  const [result, setResult] = useState<{ invite_link: string | null; key: string } | null>(null);
  const m = useMutation({
    mutationFn: () =>
      sdk.client.fetch<any>('/admin/portal/stores', {
        method: 'POST',
        body: {
          name: form.name,
          currency_code: form.currency_code,
          deposit_percent: Number(form.deposit_percent),
          slug: form.slug || undefined,
          stock_location_ids: locations,
          admin_email: form.admin_email || null,
          admin_name: form.admin_name || null,
        },
      }),
    onSuccess: (r) => {
      onDone();
      setResult({ invite_link: r.invite_link, key: r.publishable_key.token });
      toast.success('Store created');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not create the store'),
  });
  const close = () => {
    setResult(null);
    setForm({
      name: '',
      currency_code: 'vnd',
      deposit_percent: '20',
      slug: '',
      admin_email: '',
      admin_name: '',
    });
    setLocations([]);
    onClose();
  };
  return (
    <Drawer open={open} onOpenChange={(o) => (!o ? close() : null)}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>New store (tenant)</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4">
          {result ? (
            <>
              <Text>The store is ready. Point its storefront at this publishable key:</Text>
              <Copyable content={result.key}>
                <span className="break-all text-xs">{result.key}</span>
              </Copyable>
              {result.invite_link ? (
                <>
                  <Text>Portal admin invite link (also emailed):</Text>
                  <Copyable content={result.invite_link}>
                    <span className="break-all text-xs">{result.invite_link}</span>
                  </Copyable>
                </>
              ) : null}
            </>
          ) : (
            <>
              <Field label="Store name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Currency (3 letters)">
                  <Input
                    value={form.currency_code}
                    maxLength={3}
                    onChange={(e) => setForm({ ...form, currency_code: e.target.value })}
                  />
                </Field>
                <Field label="Deposit %">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.deposit_percent}
                    onChange={(e) => setForm({ ...form, deposit_percent: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Store address (optional, from the name by default)">
                <Input
                  placeholder="my-store"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                />
              </Field>
              <Text size="small" className="text-ui-fg-subtle">
                The store is served at its own address, &lt;name&gt;.{baseDomain}. Add your own
                domain afterwards in the store settings.
              </Text>
              <Field label="Sells from stock location(s)">
                <div className="flex flex-col gap-1">
                  {(locRes?.stock_locations ?? []).map((l: { id: string; name: string }) => (
                    <label key={l.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={locations.includes(l.id)}
                        onChange={(e) =>
                          setLocations(
                            e.target.checked
                              ? [...locations, l.id]
                              : locations.filter((x) => x !== l.id)
                          )
                        }
                      />
                      {l.name}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Portal admin email (optional)">
                <Input
                  type="email"
                  value={form.admin_email}
                  onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                />
              </Field>
              <Field label="Portal admin name (optional)">
                <Input
                  value={form.admin_name}
                  onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                />
              </Field>
            </>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary" onClick={close}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {result ? null : (
            <Button
              isLoading={m.isPending}
              disabled={form.name.trim().length < 2 || form.currency_code.length !== 3}
              onClick={() => m.mutate()}
            >
              Create store
            </Button>
          )}
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

function SettingsDrawer({
  tenant,
  onClose,
  onDone,
}: {
  tenant: Tenant | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({ name: '', deposit: '', email: '', slug: '' });
  const [seeded, setSeeded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (tenant && seeded !== tenant.id) {
    setSeeded(tenant.id);
    setForm({
      name: tenant.name,
      deposit: String(tenant.settings.deposit_percent),
      email: tenant.settings.default_contact_email ?? '',
      slug: tenant.settings.slug ?? '',
    });
  }
  const close = () => {
    setSeeded(null);
    onClose();
  };
  const save = useMutation({
    mutationFn: () =>
      sdk.client.fetch(`/admin/portal/stores/${tenant!.id}`, {
        method: 'POST',
        body: {
          name: form.name,
          deposit_percent: Number(form.deposit),
          default_contact_email: form.email || null,
          ...(form.slug ? { slug: form.slug } : {}),
        },
      }),
    onSuccess: () => {
      onDone();
      toast.success('Store saved');
      close();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not save'),
  });
  const del = useMutation({
    mutationFn: () => sdk.client.fetch(`/admin/portal/stores/${tenant!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      onDone();
      toast.success('Store deleted');
      setConfirmDelete(false);
      close();
    },
    onError: (e: any) => {
      setConfirmDelete(false);
      toast.error(e?.message ?? 'Could not delete');
    },
  });
  return (
    <Drawer open={!!tenant} onOpenChange={(o) => (!o ? close() : null)}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{tenant?.name} · store settings</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4">
          <Field label="Store name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field
            label={`Store address (${form.slug || 'name'}.${tenant?.settings.base_domain ?? ''})`}
          >
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            />
          </Field>
          {tenant ? <CustomDomains tenant={tenant} onDone={onDone} /> : null}
          <Field label="Deposit % (of commercial price × quantity)">
            <Input
              type="number"
              min={0}
              max={100}
              value={form.deposit}
              onChange={(e) => setForm({ ...form, deposit: e.target.value })}
            />
          </Field>
          <Field label="Default contact email (shown on the payment page)">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
        </Drawer.Body>
        <Drawer.Footer className="justify-between">
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete store
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              isLoading={save.isPending}
              disabled={form.name.trim().length < 2}
              onClick={() => save.mutate()}
            >
              Save
            </Button>
          </div>
        </Drawer.Footer>
        <Prompt open={confirmDelete} variant="danger">
          <Prompt.Content>
            <Prompt.Header>
              <Prompt.Title>Delete {tenant?.name}?</Prompt.Title>
              <Prompt.Description>
                Removes the store, its sales channel, storefront key and portal admin. Refused if it
                has collaborator requests or payouts. Products and orders stay in Medusa.
              </Prompt.Description>
            </Prompt.Header>
            <Prompt.Footer>
              <Prompt.Cancel onClick={() => setConfirmDelete(false)}>Cancel</Prompt.Cancel>
              <Prompt.Action onClick={() => del.mutate()}>Delete</Prompt.Action>
            </Prompt.Footer>
          </Prompt.Content>
        </Prompt>
      </Drawer.Content>
    </Drawer>
  );
}

function CustomDomains({ tenant, onDone }: { tenant: Tenant; onDone: () => void }) {
  const [host, setHost] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const call = (method: string, h: string) =>
    sdk.client.fetch<any>(`/admin/portal/stores/${tenant.id}/domains`, {
      method,
      body: { host: h },
    });
  const add = useMutation({
    mutationFn: () => call('POST', host),
    onSuccess: () => {
      setHost('');
      onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not add the domain'),
  });
  const verify = useMutation({
    mutationFn: (h: string) => call('PUT', h),
    onSuccess: (r) => {
      onDone();
      if (r.verified) {
        toast.success(`${r.host} is verified`);
        setMsg(null);
      } else {
        setMsg(
          r.found?.length
            ? `${r.host} points to ${r.found.join(', ')}, not ${r.cname_target}.`
            : `No CNAME found for ${r.host} yet. DNS changes can take a few minutes.`
        );
      }
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not check DNS'),
  });
  const remove = useMutation({
    mutationFn: (h: string) => call('DELETE', h),
    onSuccess: onDone,
    onError: (e: any) => toast.error(e?.message ?? 'Could not remove'),
  });
  const domains = tenant.settings.domains;
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <Label size="small">Custom domains</Label>
      <Text size="small" className="text-ui-fg-subtle">
        Point a CNAME record for your domain at <b>{tenant.settings.cname_target}</b>, add it here,
        then check DNS. It only serves this store once verified.
      </Text>
      {domains.map((d) => (
        <div key={d.host} className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            {d.host}
            <Badge size="2xsmall" color={d.verified ? 'green' : 'orange'}>
              {d.verified ? 'Verified' : 'Pending'}
            </Badge>
          </span>
          <span className="flex gap-1">
            {d.verified ? null : (
              <Button
                size="small"
                variant="secondary"
                isLoading={verify.isPending}
                onClick={() => verify.mutate(d.host)}
              >
                Check DNS
              </Button>
            )}
            <Button
              size="small"
              variant="transparent"
              className="text-ui-fg-error"
              onClick={() => remove.mutate(d.host)}
            >
              Remove
            </Button>
          </span>
        </div>
      ))}
      {msg ? (
        <Text size="small" className="text-ui-fg-error">
          {msg}
        </Text>
      ) : null}
      <div className="flex gap-2">
        <Input
          placeholder="shop.yourdomain.com"
          value={host}
          onChange={(e) => setHost(e.target.value)}
        />
        <Button
          size="small"
          variant="secondary"
          disabled={host.trim().length < 3}
          isLoading={add.isPending}
          onClick={() => add.mutate()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function RemoveAdmin({ id, email, onDone }: { id: string; email: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const m = useMutation({
    mutationFn: () => sdk.client.fetch(`/admin/portal/admins/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      onDone();
      toast.success('Portal admin removed');
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not remove'),
  });
  return (
    <>
      <Button
        size="small"
        variant="transparent"
        className="text-ui-fg-error"
        onClick={() => setOpen(true)}
      >
        Remove
      </Button>
      <Prompt open={open} variant="danger">
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>Remove {email}?</Prompt.Title>
            <Prompt.Description>
              They will no longer be able to sign in to this store's portal.
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel onClick={() => setOpen(false)}>Cancel</Prompt.Cancel>
            <Prompt.Action onClick={() => m.mutate()}>Remove</Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </>
  );
}

function InviteDrawer({
  tenant,
  onClose,
  onDone,
}: {
  tenant: Tenant | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [seeded, setSeeded] = useState<string | null>(null);
  if (tenant && seeded !== tenant.id) {
    setSeeded(tenant.id);
    setEmail(tenant.portal_admins[0]?.email ?? '');
    setName(tenant.portal_admins[0]?.name ?? '');
    setLink(null);
  }
  const m = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ invite_link: string | null }>('/admin/portal/admins', {
        method: 'POST',
        body: { store_id: tenant!.id, email, name: name || null },
      }),
    onSuccess: (r) => {
      onDone();
      setLink(r.invite_link);
      toast.success(r.invite_link ? 'Invite created' : 'This admin is already active');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Could not invite'),
  });
  const close = () => {
    setSeeded(null);
    onClose();
  };
  return (
    <Drawer open={!!tenant} onOpenChange={(o) => (!o ? close() : null)}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{tenant?.name} · portal admin</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4">
          <Text size="small" className="text-ui-fg-subtle">
            A portal admin manages exactly one store (this one). The same email cannot administer
            another store.
          </Text>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Name (optional)">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {link ? (
            <>
              <Text size="small">Invite link (also emailed):</Text>
              <Copyable content={link}>
                <span className="break-all text-xs">{link}</span>
              </Copyable>
            </>
          ) : null}
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
          <Button isLoading={m.isPending} disabled={!email} onClick={() => m.mutate()}>
            Send invite
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

export const config = defineRouteConfig({
  label: 'Portals',
  icon: BuildingStorefront,
});

export default PortalsPage;
