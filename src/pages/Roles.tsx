import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { isAdminHeadRole, isAdminHeadRoleCode } from '../lib/roles';

type Row = Record<string, unknown> & { _id: string; name: string };
function list(data: unknown): Row[] { return Array.isArray(data) ? data as Row[] : []; }
function joined(value: unknown, excludeAdminHead = false): string {
  return Array.isArray(value)
    ? value.filter((item) => {
      if (!excludeAdminHead) return true;
      const code = typeof item === 'object' && item && 'code' in item ? (item as Record<string, unknown>).code : item;
      return !isAdminHeadRoleCode(code);
    }).map((item) => typeof item === 'object' && item && 'code' in item ? String((item as Record<string, unknown>).code) : String(item)).join(', ')
    : '';
}

export default function Roles() {
  const [roles, setRoles] = useState<Row[]>([]);
  const [permissions, setPermissions] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<'role' | 'permission' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [roleResult, permissionResult] = await Promise.all([
        api.get<unknown>('/roles'),
        api.get<unknown>('/roles/permissions'),
      ]);
      setRoles(list(roleResult.data).filter((role) => !isAdminHeadRole(role)));
      setPermissions(list(permissionResult.data));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load roles and permissions'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const csv = (name: string) => String(values[name] ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    const isRole = form === 'role';
    const allowedChildRoleCodes = csv('allowedChildRoleCodes');
    if (isRole && isAdminHeadRole({ code: values.code, name: values.name })) {
      setError('The Admin Head role is not available in this project.');
      return;
    }
    if (allowedChildRoleCodes.some(isAdminHeadRoleCode)) {
      setError('Admin Head cannot be assigned as an allowed child role.');
      return;
    }
    const payload: Record<string, unknown> = isRole
      ? {
        name: values.name, code: values.code, description: values.description,
        level: Number(values.level), parentCode: values.parentCode,
        permissionCodes: csv('permissionCodes'), allowedChildRoleCodes,
      }
      : { module: values.module, action: values.action, description: values.description };
    if (editing && !isRole) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (editing) await api.patch(`/roles/${encodeURIComponent(editing._id)}`, { name: values.name, description: values.description, permissionCodes: csv('permissionCodes'), allowedChildRoleCodes, isActive: values.isActive === 'true' });
      else if (isRole) await api.post('/roles', payload);
      else await api.post('/roles/permissions', payload);
      setNotice(editing ? 'Role updated.' : isRole ? 'Role created.' : 'Permission created.');
      setForm(null);
      setEditing(null);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save role configuration'); }
    finally { setBusy(false); }
  }

  return <div className="page-wrap">
    <div className="page-heading"><div><div className="eyebrow">ACCESS CONTROL</div><h1>Roles & permissions</h1><p>Manage roles and permission codes. The API restricts these operations to the Managing Director.</p></div><div className="heading-actions"><button className="secondary-btn" onClick={() => { setEditing(null); setForm('permission'); }}><Plus size={15}/>Permission</button><button className="primary-btn" onClick={() => { setEditing(null); setForm('role'); }}><Plus size={15}/>Role</button></div></div>
    {error && <div className="notice-error" role="alert">{error}</div>}{notice && <div className="success-note" role="status">{notice}</div>}
    <section className="panel records-panel"><div className="panel-heading"><div><h2><ShieldCheck size={18}/> Configured roles</h2><p>{roles.length} roles · {permissions.length} permissions</p></div><button className="filter-btn" onClick={() => void load()}><RefreshCw size={15}/>Refresh</button></div>
      <div className="table-scroll"><table><thead><tr><th>Name</th><th>Code</th><th>Parent</th><th>Permissions</th><th>Active</th><th>Actions</th></tr></thead><tbody>
        {roles.map((role) => <tr key={role._id}><td>{role.name}</td><td>{String(role.code ?? '—')}</td><td>{typeof role.parentRole === 'object' && role.parentRole ? String((role.parentRole as Row).code ?? '—') : '—'}</td><td>{joined(role.permissions)}</td><td>{role.isActive === false ? 'No' : 'Yes'}</td><td><button className="icon-button" aria-label={`Edit ${role.name}`} onClick={() => { setEditing(role); setForm('role'); }}><Pencil size={15}/></button></td></tr>)}
        {!roles.length && <tr><td className="table-state" colSpan={6}>No roles are available for this account.</td></tr>}
      </tbody></table></div>
    </section>
    <section className="panel records-panel permission-panel"><div className="panel-heading"><div><h2>Permissions</h2><p>Permission codes available for role configuration.</p></div></div><div className="permission-list">{permissions.map((permission) => <span className="permission-chip" key={permission._id}>{String(permission.code ?? `${permission.module}.${permission.action}`)}</span>)}</div></section>
    {form && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setForm(null); setEditing(null); } }}><section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="role-form-title">
      <div className="modal-heading"><div><div className="eyebrow">ACCESS CONTROL</div><h2 id="role-form-title">{editing ? 'Edit role' : form === 'role' ? 'Create role' : 'Create permission'}</h2></div><button className="icon-button" aria-label="Close" onClick={() => { setForm(null); setEditing(null); }}>×</button></div>
      <form onSubmit={(event) => void submit(event)}><div className="modal-fields">
        {form === 'permission' ? <>
          <label>Module<input name="module" required maxLength={40}/></label><label>Action<input name="action" required maxLength={40}/></label><label className="field-wide">Description<input name="description" maxLength={300}/></label>
        </> : <>
          <label>Name<input name="name" required minLength={2} maxLength={100} defaultValue={String(editing?.name ?? '')}/></label><label>Code<input name="code" required maxLength={40} disabled={Boolean(editing)} defaultValue={String(editing?.code ?? '')}/></label>
          <label>Description<input name="description" maxLength={500} defaultValue={String(editing?.description ?? '')}/></label>
          {!editing && <><label>Hierarchy level<input name="level" type="number" min={0} max={100} required/></label><label>Parent role code<input name="parentCode" required/></label></>}
          <label className="field-wide">Permission codes (comma-separated)<input name="permissionCodes" defaultValue={joined(editing?.permissions)}/></label>
          <label className="field-wide">Allowed child role codes (comma-separated)<input name="allowedChildRoleCodes" defaultValue={joined(editing?.allowedChildRoles, true)}/></label>
          {editing && <label>Active<select name="isActive" defaultValue={String(editing.isActive !== false)}><option value="true">Active</option><option value="false">Inactive</option></select></label>}
        </>}
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => { setForm(null); setEditing(null); }}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div></form>
    </section></div>}
  </div>;
}
