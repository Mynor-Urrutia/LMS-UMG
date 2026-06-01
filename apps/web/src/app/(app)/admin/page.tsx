'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/hooks/use-session';
import { api, ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { roleLabel } from '@/lib/utils';
import type {
  UserRole, UserStatus, Category, CustomRole, Permission,
  Course, CourseDifficulty, EnrollmentType, EnrollmentStatus, AcademicItem, BadgeItem, BadgeCriteria,
  AuditLogPage, EnrollmentWithStudent,
} from '@/types/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const roleVariant: Record<UserRole, 'default' | 'info' | 'warning'> = {
  STUDENT: 'default', TEACHER: 'info', ADMIN: 'warning',
};
const statusVariant: Record<UserStatus, 'success' | 'danger' | 'default'> = {
  ACTIVE: 'success', INACTIVE: 'default', SUSPENDED: 'danger',
};
const enrollStatusVariant: Record<EnrollmentStatus, 'success' | 'warning' | 'danger' | 'default' | 'info'> = {
  ACTIVE: 'success', PENDING: 'warning', REJECTED: 'danger', COMPLETED: 'info',
};
const enrollStatusLabel: Record<EnrollmentStatus, string> = {
  ACTIVE: 'Activo', PENDING: 'Pendiente', REJECTED: 'Rechazado', COMPLETED: 'Completado',
};

interface ApiUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  customRoleId?: string | null;
  profile: {
    firstName: string;
    lastName: string;
    carnet?: string | null;
    gradeId?: string | null;
    sectionId?: string | null;
    departmentId?: string | null;
    grade?: { id: string; name: string } | null;
    section?: { id: string; name: string } | null;
    department?: { id: string; name: string } | null;
  } | null;
}
interface UserListResponse { items: ApiUser[]; total: number; }

// ─── Create User Modal ────────────────────────────────────────────────────────

const EMPTY_CREATE_FORM = {
  firstName: '', lastName: '', email: '', password: '',
  role: 'STUDENT' as UserRole,
  carnet: '', gradeId: '', sectionId: '', departmentId: '',
};

function CreateUserModal({
  open, token, onClose, onCreated,
  grades, sections, departments,
}: {
  open: boolean; token: string; onClose: () => void; onCreated: () => void;
  grades: AcademicItem[]; sections: AcademicItem[]; departments: AcademicItem[];
}) {
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleClose() { setForm(EMPTY_CREATE_FORM); setError(null); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { userId } = await api.post<{ userId: string }>('/auth/register', {
        email: form.email, password: form.password,
        firstName: form.firstName, lastName: form.lastName,
        role: form.role,
      }, token);
      const profilePayload: Record<string, string | null> = {
        firstName: form.firstName, lastName: form.lastName,
      };
      if (form.carnet.trim()) profilePayload.carnet = form.carnet.trim();
      if (form.gradeId) profilePayload.gradeId = form.gradeId;
      if (form.sectionId) profilePayload.sectionId = form.sectionId;
      if (form.departmentId) profilePayload.departmentId = form.departmentId;
      await api.patch(`/users/${userId}/profile`, profilePayload, token);
      onCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al crear el usuario.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo usuario" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className="input-base" placeholder="Juan" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Apellido <span className="text-red-500">*</span></label>
            <input value={form.lastName} onChange={e => set('lastName', e.target.value)} className="input-base" placeholder="Pérez" required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Correo <span className="text-red-500">*</span></label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-base" placeholder="usuario@email.com" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contraseña temporal <span className="text-red-500">*</span></label>
          <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className="input-base" placeholder="Mínimo 8 caracteres" minLength={8} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rol <span className="text-red-500">*</span></label>
          <select value={form.role} onChange={e => set('role', e.target.value as UserRole)} className="input-base">
            <option value="STUDENT">Estudiante</option>
            <option value="TEACHER">Docente</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Número de carnet</label>
          <input value={form.carnet} onChange={e => set('carnet', e.target.value)} className="input-base" placeholder="ej. 2024-001" maxLength={50} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Grado</label>
            <select value={form.gradeId} onChange={e => set('gradeId', e.target.value)} className="input-base">
              <option value="">Sin grado</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sección</label>
            <select value={form.sectionId} onChange={e => set('sectionId', e.target.value)} className="input-base">
              <option value="">Sin sección</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Departamento</label>
            <select value={form.departmentId} onChange={e => set('departmentId', e.target.value)} className="input-base">
              <option value="">Sin departamento</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary px-5 py-2 text-sm flex items-center gap-2">
            {loading && <Spinner size="sm" />}Crear usuario
          </button>
          <button type="button" onClick={handleClose} className="btn-secondary px-5 py-2 text-sm">Cancelar</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit User Profile Modal ──────────────────────────────────────────────────

function EditUserProfileModal({
  open, token, user, onClose, onSaved,
  grades, sections, departments,
}: {
  open: boolean; token: string; user: ApiUser | null; onClose: () => void; onSaved: () => void;
  grades: AcademicItem[]; sections: AcademicItem[]; departments: AcademicItem[];
}) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', carnet: '', gradeId: '', sectionId: '', departmentId: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.profile?.firstName ?? '',
        lastName: user.profile?.lastName ?? '',
        carnet: user.profile?.carnet ?? '',
        gradeId: user.profile?.gradeId ?? '',
        sectionId: user.profile?.sectionId ?? '',
        departmentId: user.profile?.departmentId ?? '',
      });
      setError(null);
    }
  }, [user]);

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, string | null> = {
        firstName: form.firstName,
        lastName: form.lastName,
        carnet: form.carnet.trim() || null,
        gradeId: form.gradeId || null,
        sectionId: form.sectionId || null,
        departmentId: form.departmentId || null,
      };
      await api.patch(`/users/${user.id}/profile`, payload, token);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar el perfil.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar perfil" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className="input-base" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Apellido <span className="text-red-500">*</span></label>
            <input value={form.lastName} onChange={e => set('lastName', e.target.value)} className="input-base" required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Número de carnet</label>
          <input value={form.carnet} onChange={e => set('carnet', e.target.value)} className="input-base" placeholder="ej. 2024-001" maxLength={50} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Grado</label>
            <select value={form.gradeId} onChange={e => set('gradeId', e.target.value)} className="input-base">
              <option value="">Sin grado</option>
              {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sección</label>
            <select value={form.sectionId} onChange={e => set('sectionId', e.target.value)} className="input-base">
              <option value="">Sin sección</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Departamento</label>
            <select value={form.departmentId} onChange={e => set('departmentId', e.target.value)} className="input-base">
              <option value="">Sin departamento</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={loading} className="btn-primary px-5 py-2 text-sm flex items-center gap-2">
            {loading && <Spinner size="sm" />}Guardar
          </button>
          <button type="button" onClick={onClose} className="btn-secondary px-5 py-2 text-sm">Cancelar</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Reset Password Modal (Admin) ─────────────────────────────────────────────

function ResetPasswordModal({ open, token, user, onClose }: {
  open: boolean; token: string; user: ApiUser | null; onClose: () => void;
}) {
  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setForm({ newPassword: '', confirm: '' });
    setError(null); setSuccess(false); onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (form.newPassword !== form.confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (form.newPassword.length < 8) { setError('Mínimo 8 caracteres.'); return; }
    setError(null); setLoading(true);
    try {
      await api.patch(`/auth/users/${user.id}/reset-password`, { newPassword: form.newPassword }, token);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al resetear la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  const userName = user?.profile ? `${user.profile.firstName} ${user.profile.lastName}`.trim() : user?.email;

  return (
    <Modal open={open} onClose={handleClose} title="Resetear contraseña" maxWidth="sm">
      {success ? (
        <div className="space-y-4 text-center py-2">
          <p className="text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm">
            Contraseña actualizada para <strong>{userName}</strong>. Sus sesiones activas fueron cerradas.
          </p>
          <button onClick={handleClose} className="btn-primary px-6 py-2 text-sm">Cerrar</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Estás reseteando la contraseña de <strong className="text-gray-800 dark:text-gray-100">{userName}</strong>.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nueva contraseña <span className="text-red-500">*</span></label>
            <input type="password" value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              className="input-base" minLength={8} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Confirmar contraseña <span className="text-red-500">*</span></label>
            <input type="password" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              className="input-base" minLength={8} required />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary px-5 py-2 text-sm flex items-center gap-2">
              {loading && <Spinner size="sm" />}Resetear
            </button>
            <button type="button" onClick={handleClose} className="btn-secondary px-5 py-2 text-sm">Cancelar</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ token, currentUserId }: { token: string; currentUserId: string }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [resettingUser, setResettingUser] = useState<ApiUser | null>(null);

  const { data, isLoading } = useQuery<UserListResponse>({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get<UserListResponse>('/users', token),
    enabled: !!token,
  });

  const { data: grades = [] } = useQuery<AcademicItem[]>({
    queryKey: ['academic', 'grades'],
    queryFn: () => api.get<AcademicItem[]>('/academic/grades'),
    staleTime: 0,
  });
  const { data: sections = [] } = useQuery<AcademicItem[]>({
    queryKey: ['academic', 'sections'],
    queryFn: () => api.get<AcademicItem[]>('/academic/sections'),
    staleTime: 0,
  });
  const { data: departments = [] } = useQuery<AcademicItem[]>({
    queryKey: ['academic', 'departments'],
    queryFn: () => api.get<AcademicItem[]>('/academic/departments'),
    staleTime: 0,
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      api.patch(`/users/${userId}/role`, { role }, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      api.patch(`/users/${userId}/status`, { status }, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  function refetchUsers() { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); }

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {data?.total ?? 0} usuario{(data?.total ?? 0) !== 1 ? 's' : ''} registrado{(data?.total ?? 0) !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm">
          + Nuevo usuario
        </button>
      </div>

      <CreateUserModal
        open={showCreate} token={token}
        onClose={() => setShowCreate(false)}
        onCreated={refetchUsers}
        grades={grades} sections={sections} departments={departments}
      />
      <EditUserProfileModal
        open={!!editingUser} token={token} user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={refetchUsers}
        grades={grades} sections={sections} departments={departments}
      />
      <ResetPasswordModal
        open={!!resettingUser} token={token} user={resettingUser}
        onClose={() => setResettingUser(null)}
      />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Usuario</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Carnet</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Grado / Sección</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {(data?.items ?? []).map(u => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {u.profile ? `${u.profile.firstName} ${u.profile.lastName}`.trim() : '(sin perfil)'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-gray-600 dark:text-gray-400">
                  {u.profile?.carnet ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  {u.profile?.grade || u.profile?.section ? (
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {[u.profile.grade?.name, u.profile.section?.name].filter(Boolean).join(' / ')}
                    </span>
                  ) : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  {u.id !== currentUserId ? (
                    <select
                      className="text-xs rounded border border-gray-300 dark:border-gray-600 px-2 py-1 bg-white dark:bg-gray-900 dark:text-gray-100"
                      value={u.role}
                      onChange={e => changeRole.mutate({ userId: u.id, role: e.target.value as UserRole })}
                    >
                      <option value="STUDENT">Estudiante</option>
                      <option value="TEACHER">Docente</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <Badge variant={roleVariant[u.role]}>{roleLabel(u.role)}</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[u.status]}>
                    {u.status === 'ACTIVE' ? 'Activo' : u.status === 'SUSPENDED' ? 'Suspendido' : 'Inactivo'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setResettingUser(u)}
                      className="text-xs px-2 py-1 rounded border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                    >
                      Contraseña
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => changeStatus.mutate({
                          userId: u.id,
                          status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                        })}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'border-green-300 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Suspender' : 'Activar'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">No hay usuarios todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Academic Structure Tab ───────────────────────────────────────────────────

type AcademicSection = 'grades' | 'sections' | 'departments';

const ACADEMIC_META: Record<AcademicSection, { singular: string; plural: string; endpoint: string; hasOrder: boolean }> = {
  grades: { singular: 'grado', plural: 'Grados', endpoint: '/academic/grades', hasOrder: true },
  sections: { singular: 'sección', plural: 'Secciones', endpoint: '/academic/sections', hasOrder: false },
  departments: { singular: 'departamento', plural: 'Departamentos', endpoint: '/academic/departments', hasOrder: false },
};

function AcademicList({ section, token }: { section: AcademicSection; token: string }) {
  const queryClient = useQueryClient();
  const { singular, plural, endpoint, hasOrder } = ACADEMIC_META[section];
  const [name, setName] = useState('');
  const [order, setOrder] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState('');

  const { data: items = [], isLoading } = useQuery<AcademicItem[]>({
    queryKey: ['academic', section],
    queryFn: () => api.get<AcademicItem[]>(endpoint),
    staleTime: 0,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['academic', section] });

  const create = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { name: name.trim() };
      if (hasOrder && order.trim()) body.order = parseInt(order, 10);
      return api.post(endpoint, body, token);
    },
    onSuccess: () => { invalidate(); setName(''); setOrder(''); setError(null); },
    onError: (err) => setError(err instanceof ApiError ? err.message : `Error al crear ${singular}.`),
  });

  const update = useMutation({
    mutationFn: ({ id, n, o }: { id: string; n: string; o: string }) => {
      const body: Record<string, unknown> = { name: n.trim() };
      if (hasOrder && o.trim()) body.order = parseInt(o, 10);
      return api.patch(`${endpoint}/${id}`, body, token);
    },
    onSuccess: () => { invalidate(); setEditingId(null); setError(null); },
    onError: (err) => setError(err instanceof ApiError ? err.message : `Error al actualizar ${singular}.`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`${endpoint}/${id}`, token),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : `Error al eliminar ${singular}.`),
  });

  function startEdit(item: AcademicItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditOrder(item.order?.toString() ?? '');
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-700 dark:text-gray-300">{plural}</h3>
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) create.mutate(); }} className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} className="input-base flex-1"
          placeholder={`Nuevo ${singular}...`} maxLength={100} required />
        {hasOrder && (
          <input value={order} onChange={e => setOrder(e.target.value)}
            className="input-base w-20" placeholder="Orden" type="number" min={0} />
        )}
        <button type="submit" disabled={create.isPending || !name.trim()} className="btn-primary px-4 py-2 text-sm whitespace-nowrap">
          {create.isPending ? <Spinner size="sm" /> : 'Agregar'}
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" className="text-primary-500" /></div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {items.map(item => (
            <li key={item.id} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
              {editingId === item.id ? (
                <div className="flex items-center gap-2">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="input-base flex-1 text-sm"
                    autoFocus
                    onKeyDown={e => e.key === 'Escape' && setEditingId(null)}
                  />
                  {hasOrder && (
                    <input value={editOrder} onChange={e => setEditOrder(e.target.value)}
                      className="input-base w-16 text-sm" placeholder="Orden" type="number" min={0} />
                  )}
                  <button
                    onClick={() => update.mutate({ id: item.id, n: editName, o: editOrder })}
                    disabled={update.isPending || !editName.trim()}
                    className="text-xs px-2 py-1 rounded bg-primary-600 text-white hover:bg-primary-700"
                  >
                    {update.isPending ? <Spinner size="sm" /> : 'Guardar'}
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-800 dark:text-gray-100">
                    {item.name}
                    {hasOrder && item.order !== undefined && (
                      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">#{item.order}</span>
                    )}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(item)}
                      className="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                      Editar
                    </button>
                    <button
                      onClick={() => { if (confirm(`¿Eliminar "${item.name}"?`)) remove.mutate(item.id); }}
                      disabled={remove.isPending}
                      className="text-xs px-2 py-0.5 rounded border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500">Sin {plural.toLowerCase()} todavía.</li>
          )}
        </ul>
      )}
    </div>
  );
}

function AcademicStructureTab({ token }: { token: string }) {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <AcademicList section="grades" token={token} />
      <AcademicList section="sections" token={token} />
      <AcademicList section="departments" token={token} />
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories', token),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const createCategory = useMutation({
    mutationFn: (n: string) => api.post('/categories', { name: n }, token),
    onSuccess: () => { setName(''); invalidate(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al crear la categoría.'),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, n }: { id: string; n: string }) => api.patch(`/categories/${id}`, { name: n }, token),
    onSuccess: () => { setEditingId(null); invalidate(); setError(null); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al renombrar la categoría.'),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`, token),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al eliminar la categoría.'),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim()) createCategory.mutate(name.trim());
  }

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="card p-4 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nueva categoría</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-base" placeholder="ej. Programación Web" required />
        </div>
        <button type="submit" disabled={createCategory.isPending} className="btn-primary px-4 py-2 text-sm">
          {createCategory.isPending ? <Spinner size="sm" /> : 'Crear'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Slug</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {categories.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3">
                  {editingId === c.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="input-base text-sm"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); if (e.key === 'Enter') { e.preventDefault(); updateCategory.mutate({ id: c.id, n: editName }); } }}
                      />
                      <button
                        onClick={() => updateCategory.mutate({ id: c.id, n: editName })}
                        disabled={updateCategory.isPending || !editName.trim()}
                        className="text-xs px-2 py-1 rounded bg-primary-600 dark:bg-primary-500 text-white hover:bg-primary-700 dark:hover:bg-primary-600"
                      >
                        {updateCategory.isPending ? <Spinner size="sm" /> : 'Guardar'}
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600">✕</button>
                    </div>
                  ) : (
                    <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {editingId !== c.id && (
                      <button
                        onClick={() => { setEditingId(c.id); setEditName(c.name); setError(null); }}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Editar
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm(`¿Eliminar "${c.name}"?`)) deleteCategory.mutate(c.id); }}
                      disabled={deleteCategory.isPending}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">No hay categorías.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function PermissionMatrix({
  permissions, selected, onChange,
}: {
  permissions: Permission[]; selected: string[]; onChange: (keys: string[]) => void;
}) {
  const groups = Array.from(new Set(permissions.map(p => p.group)));

  function toggle(key: string) {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  }
  function toggleGroup(group: string, checked: boolean) {
    const groupKeys = permissions.filter(p => p.group === group).map(p => p.key);
    if (checked) onChange(Array.from(new Set([...selected, ...groupKeys])));
    else onChange(selected.filter(k => !groupKeys.includes(k)));
  }

  return (
    <div className="space-y-3">
      {groups.map(group => {
        const groupPerms = permissions.filter(p => p.group === group);
        const allChecked = groupPerms.every(p => selected.includes(p.key));
        return (
          <div key={group} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
              <input type="checkbox" checked={allChecked}
                onChange={e => toggleGroup(group, e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{group}</span>
            </div>
            <div className="grid grid-cols-2 gap-0 divide-y divide-gray-100 dark:divide-gray-700">
              {groupPerms.map(perm => (
                <label key={perm.key} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(perm.key)}
                    onChange={() => toggle(perm.key)} className="mt-0.5 rounded border-gray-300 dark:border-gray-600" />
                  <div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{perm.name}</p>
                    {perm.description && <p className="text-xs text-gray-400 dark:text-gray-500">{perm.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoleForm({ token, permissions, role, onDone }: {
  token: string; permissions: Permission[]; role?: CustomRole; onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: role?.name ?? '',
    description: role?.description ?? '',
    baseRole: role?.baseRole ?? ('STUDENT' as UserRole),
    color: role?.color ?? '#3b82f6',
    icon: role?.icon ?? '',
    permissionKeys: role?.permissions ?? [] as string[],
  });
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => role
      ? api.patch(`/custom-roles/${role.id}`, { ...form }, token)
      : api.post('/custom-roles', form, token),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['custom-roles'] }); onDone(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al guardar el rol.'),
  });

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-gray-800 dark:text-gray-100">{role ? 'Editar rol' : 'Nuevo rol'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre del rol</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="input-base" placeholder="ej. Moderador" required disabled={role?.isSystem} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rol base del sistema</label>
          <select value={form.baseRole} onChange={e => set('baseRole', e.target.value as UserRole)}
            className="input-base" disabled={!!role}>
            <option value="STUDENT">Estudiante</option>
            <option value="TEACHER">Docente</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
        <input value={form.description} onChange={e => set('description', e.target.value)}
          className="input-base" placeholder="Breve descripción del rol" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Color</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
              className="h-8 w-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5" />
            <input value={form.color} onChange={e => set('color', e.target.value)}
              className="input-base flex-1 font-mono text-xs" placeholder="#3b82f6" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ícono (emoji)</label>
          <input value={form.icon} onChange={e => set('icon', e.target.value)}
            className="input-base" placeholder="🎭" maxLength={4} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Permisos</label>
        <PermissionMatrix permissions={permissions} selected={form.permissionKeys}
          onChange={keys => set('permissionKeys', keys)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary px-4 py-2 text-sm">
          {save.isPending ? <Spinner size="sm" /> : 'Guardar'}
        </button>
        <button onClick={onDone} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
      </div>
    </div>
  );
}

function RolesTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState<CustomRole | null | 'new'>(null);

  const { data: roles = [], isLoading: rolesLoading } = useQuery<CustomRole[]>({
    queryKey: ['custom-roles'],
    queryFn: () => api.get<CustomRole[]>('/custom-roles', token),
    enabled: !!token,
  });
  const { data: permissions = [], isLoading: permsLoading } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: () => api.get<Permission[]>('/custom-roles/permissions', token),
    enabled: !!token,
  });
  const deleteRole = useMutation({
    mutationFn: (id: string) => api.delete(`/custom-roles/${id}`, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-roles'] }),
  });

  if (rolesLoading || permsLoading) return <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>;

  if (editingRole !== null) {
    return <RoleForm token={token} permissions={permissions}
      role={editingRole === 'new' ? undefined : editingRole} onDone={() => setEditingRole(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{roles.length} rol{roles.length !== 1 ? 'es' : ''} configurado{roles.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setEditingRole('new')} className="btn-primary px-4 py-2 text-sm">+ Nuevo rol</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map(role => (
          <div key={role.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {role.icon && <span className="text-xl">{role.icon}</span>}
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{role.name}</h3>
                    {role.isSystem && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded px-1.5 py-0.5 font-medium">SISTEMA</span>}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{roleLabel(role.baseRole)}</p>
                </div>
              </div>
              {role.color && <span className="h-4 w-4 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: role.color }} />}
            </div>
            {role.description && <p className="text-xs text-gray-500 dark:text-gray-400">{role.description}</p>}
            <div className="flex flex-wrap gap-1">
              {role.permissions.length === 0 ? (
                <span className="text-xs text-gray-400 italic">Sin permisos</span>
              ) : (
                role.permissions.map(key => (
                  <span key={key} className="text-[10px] bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded px-1.5 py-0.5 font-medium">{key}</span>
                ))
              )}
            </div>
            <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => setEditingRole(role)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
                Editar permisos
              </button>
              {!role.isSystem && (
                <button
                  onClick={() => { if (confirm(`¿Eliminar el rol "${role.name}"?`)) deleteRole.mutate(role.id); }}
                  disabled={deleteRole.isPending}
                  className="text-xs px-2 py-1 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Edit Course Modal ────────────────────────────────────────────────────────

function EditCourseModal({
  open, token, course, onClose, onSaved, categories,
}: {
  open: boolean; token: string; course: Course | null; onClose: () => void; onSaved: () => void; categories: Category[];
}) {
  const [form, setForm] = useState({
    title: '', description: '', difficulty: 'BEGINNER' as CourseDifficulty,
    enrollmentType: 'OPEN' as EnrollmentType, categoryId: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (course) {
      setForm({
        title: course.title,
        description: course.description ?? '',
        difficulty: course.difficulty,
        enrollmentType: course.enrollmentType,
        categoryId: course.category?.id ?? '',
      });
      setError(null);
    }
  }, [course]);

  function setF<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm(f => ({ ...f, [k]: v })); }

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        title: form.title,
        difficulty: form.difficulty,
        enrollmentType: form.enrollmentType,
        categoryId: form.categoryId || null,
      };
      if (form.description.trim()) body.description = form.description.trim();
      return api.patch(`/courses/${course!.id}`, body, token);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al guardar el curso.'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Editar curso" maxWidth="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Título <span className="text-red-500">*</span></label>
          <input value={form.title} onChange={e => setF('title', e.target.value)} className="input-base" required maxLength={200} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
          <textarea value={form.description} onChange={e => setF('description', e.target.value)}
            className="input-base resize-none" rows={3} maxLength={5000} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nivel</label>
            <select value={form.difficulty} onChange={e => setF('difficulty', e.target.value as CourseDifficulty)} className="input-base">
              <option value="BEGINNER">Principiante</option>
              <option value="INTERMEDIATE">Intermedio</option>
              <option value="ADVANCED">Avanzado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Inscripción</label>
            <select value={form.enrollmentType} onChange={e => setF('enrollmentType', e.target.value as EnrollmentType)} className="input-base">
              <option value="OPEN">Abierta — el alumno se inscribe y accede al instante</option>
              <option value="APPROVAL">Con aprobación — el docente debe aprobar cada inscripción</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Categoría</label>
            <select value={form.categoryId} onChange={e => setF('categoryId', e.target.value)} className="input-base">
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.title.trim()} className="btn-primary px-5 py-2 text-sm flex items-center gap-2">
            {save.isPending && <Spinner size="sm" />}Guardar
          </button>
          <button onClick={onClose} className="btn-secondary px-5 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Courses Tab ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Borrador', PUBLISHED: 'Publicado', ARCHIVED: 'Archivado' };
const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  ARCHIVED: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
};

// ─── Create Course Modal ──────────────────────────────────────────────────────

const EMPTY_COURSE_FORM = {
  teacherId: '', title: '', description: '',
  difficulty: 'BEGINNER' as CourseDifficulty,
  enrollmentType: 'OPEN' as EnrollmentType,
  categoryId: '',
};

function CreateCourseModal({
  open, token, onClose, onCreated, teachers, categories,
}: {
  open: boolean; token: string; onClose: () => void; onCreated: () => void;
  teachers: ApiUser[]; categories: Category[];
}) {
  const [form, setForm] = useState(EMPTY_COURSE_FORM);
  const [error, setError] = useState<string | null>(null);

  function setF<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm(f => ({ ...f, [k]: v })); }

  function handleClose() { setForm(EMPTY_COURSE_FORM); setError(null); onClose(); }

  const create = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        teacherId: form.teacherId, title: form.title,
        difficulty: form.difficulty, enrollmentType: form.enrollmentType,
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.categoryId) body.categoryId = form.categoryId;
      return api.post<Course>('/courses', body, token);
    },
    onSuccess: () => { onCreated(); handleClose(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Error al crear el curso.'),
  });

  return (
    <Modal open={open} onClose={handleClose} title="Nuevo curso" maxWidth="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Catedrático asignado <span className="text-red-500">*</span></label>
          <select value={form.teacherId} onChange={e => setF('teacherId', e.target.value)} className="input-base" required>
            <option value="">Seleccioná un catedrático</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.profile ? `${t.profile.firstName} ${t.profile.lastName}` : t.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Título <span className="text-red-500">*</span></label>
          <input value={form.title} onChange={e => setF('title', e.target.value)}
            className="input-base" placeholder="ej. Introducción a React" required maxLength={200} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Descripción</label>
          <textarea value={form.description} onChange={e => setF('description', e.target.value)}
            className="input-base resize-none" rows={3} maxLength={5000} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nivel</label>
            <select value={form.difficulty} onChange={e => setF('difficulty', e.target.value as CourseDifficulty)} className="input-base">
              <option value="BEGINNER">Principiante</option>
              <option value="INTERMEDIATE">Intermedio</option>
              <option value="ADVANCED">Avanzado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Inscripción</label>
            <select value={form.enrollmentType} onChange={e => setF('enrollmentType', e.target.value as EnrollmentType)} className="input-base">
              <option value="OPEN">Abierta — el alumno se inscribe y accede al instante</option>
              <option value="APPROVAL">Con aprobación — el docente debe aprobar cada inscripción</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Categoría</label>
            <select value={form.categoryId} onChange={e => setF('categoryId', e.target.value)} className="input-base">
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => { if (form.teacherId && form.title.trim()) create.mutate(); }}
            disabled={create.isPending || !form.teacherId || !form.title.trim()}
            className="btn-primary px-5 py-2 text-sm flex items-center gap-2"
          >
            {create.isPending && <Spinner size="sm" />}Crear curso
          </button>
          <button onClick={handleClose} className="btn-secondary px-5 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </Modal>
  );
}

function AdminEnrollModal({ open, token, course, onClose }: {
  open: boolean; token: string; course: Course | null; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<ApiUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce: only hit the API 300ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Server-side search — role=STUDENT, limit=20 (just dropdown results)
  const { data: searchData, isFetching } = useQuery<UserListResponse>({
    queryKey: ['admin', 'users', 'enroll-search', debouncedSearch],
    queryFn: () => api.get<UserListResponse>(
      `/users?role=STUDENT&limit=20&search=${encodeURIComponent(debouncedSearch)}`,
      token,
    ),
    enabled: open && !!token && debouncedSearch.length >= 2,
  });

  // Already-enrolled for this course — used for table + to exclude from search results
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<EnrollmentWithStudent[]>({
    queryKey: ['admin', 'course-enrollments', course?.id],
    queryFn: () => api.get<EnrollmentWithStudent[]>(`/courses/${course!.id}/enrollments`, token),
    enabled: open && !!course && !!token,
  });

  const enrolledIds = new Set(
    enrollments.filter(e => e.status !== 'REJECTED').map(e => e.student.id)
  );

  const results = (searchData?.items ?? []).filter(s => !enrolledIds.has(s.id));

  const handleSelect = useCallback((s: ApiUser) => {
    setSelected(s);
    setSearch('');
    setDebouncedSearch('');
    setShowDropdown(false);
    setErr('');
    setOk('');
  }, []);

  const handleClear = () => { setSelected(null); setSearch(''); setDebouncedSearch(''); setErr(''); setOk(''); };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const enroll = useMutation({
    mutationFn: () => api.post(`/admin/courses/${course!.id}/enroll`, { studentId: selected!.id }, token),
    onSuccess: () => {
      const studentId = selected!.id;
      const name = selected!.profile
        ? `${selected!.profile.firstName} ${selected!.profile.lastName}`
        : selected!.email;
      setOk(`${name} inscrito correctamente`);
      setNewlyAddedIds(prev => new Set(prev).add(studentId));
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'course-enrollments', course?.id] });
    },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : 'Error'),
  });

  const handleClose = () => {
    setSearch(''); setDebouncedSearch(''); setSelected(null);
    setErr(''); setOk(''); setShowDropdown(false); setNewlyAddedIds(new Set());
    onClose();
  };

  if (!open || !course) return null;

  const showList = showDropdown && debouncedSearch.length >= 2;

  const activeEnrollments = enrollments.filter(e => e.status !== 'REJECTED');

  return (
    <Modal open onClose={handleClose} title={`Inscribir en: ${course.title}`} maxWidth="lg">
      <div className="space-y-5">
        {/* Search + enroll form */}
        <div className="space-y-3">
          {err && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          {ok && <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-2 rounded-lg">{ok}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Buscar por nombre, carnet o email
            </label>

            {selected ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-900 dark:text-primary-100 truncate">
                    {selected.profile
                      ? `${selected.profile.firstName} ${selected.profile.lastName}`
                      : selected.email}
                    {selected.profile?.carnet && (
                      <span className="text-primary-600 dark:text-primary-400 font-normal ml-1">· {selected.profile.carnet}</span>
                    )}
                  </p>
                  <p className="text-xs text-primary-600 dark:text-primary-400 truncate">{selected.email}</p>
                </div>
                <button onClick={handleClear} className="text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-lg leading-none shrink-0">×</button>
              </div>
            ) : (
              <div ref={containerRef} className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true); setErr(''); setOk(''); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Mínimo 2 caracteres…"
                  className="input-base w-full"
                  autoComplete="off"
                />
                {showList && (
                  <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
                    {isFetching ? (
                      <li className="px-4 py-3 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                        <Spinner size="sm" className="text-primary-500" /> Buscando…
                      </li>
                    ) : results.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">Sin resultados</li>
                    ) : results.map(s => (
                      <li
                        key={s.id}
                        onMouseDown={() => handleSelect(s)}
                        className="flex flex-col px-4 py-2.5 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/30 border-b border-gray-50 dark:border-gray-800 last:border-0"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {s.profile ? `${s.profile.firstName} ${s.profile.lastName}` : s.email}
                          {s.profile?.carnet && (
                            <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">· {s.profile.carnet}</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{s.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={handleClose} className="btn-secondary text-sm">Cerrar</button>
            <button
              onClick={() => { setErr(''); enroll.mutate(); }}
              disabled={!selected || enroll.isPending}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {enroll.isPending ? 'Inscribiendo…' : 'Inscribir'}
            </button>
          </div>
        </div>

        {/* Enrolled students table */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Alumnos inscritos
            {activeEnrollments.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">({activeEnrollments.length})</span>
            )}
          </h3>

          {enrollmentsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" className="text-primary-500" />
            </div>
          ) : activeEnrollments.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
              Todavía no hay alumnos inscritos en este curso.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Alumno</th>
                    <th className="px-3 py-2.5 text-center font-medium text-gray-600 dark:text-gray-400">Estado</th>
                    <th className="px-3 py-2.5 text-right font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Inscripto el</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {activeEnrollments.map(e => {
                    const name = (e.student.firstName || e.student.lastName)
                      ? `${e.student.firstName ?? ''} ${e.student.lastName ?? ''}`.trim()
                      : e.student.email;
                    const isNew = newlyAddedIds.has(e.student.id);
                    return (
                      <tr key={e.id} className={`${isNew ? 'bg-green-50/60 dark:bg-green-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{name}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{e.student.email}</p>
                            </div>
                            {isNew && (
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 shrink-0">
                                Nuevo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant={enrollStatusVariant[e.status]}>{enrollStatusLabel[e.status]}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          {new Date(e.enrolledAt).toLocaleDateString('es-AR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CoursesTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [enrollingCourse, setEnrollingCourse] = useState<Course | null>(null);

  const { data: teachersData } = useQuery<UserListResponse>({
    queryKey: ['admin', 'users', 'teachers'],
    queryFn: () => api.get<UserListResponse>('/users?role=TEACHER&limit=100', token),
    enabled: !!token,
  });
  const teachers = teachersData?.items ?? [];

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories'),
  });

  const { data: courses, isLoading } = useQuery<{ items: Course[]; total: number }>({
    queryKey: ['admin', 'courses'],
    queryFn: () => api.get('/courses?limit=100', token),
    enabled: !!token,
  });

  const invalidateCourses = () => queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });

  const courseAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'publish' | 'unpublish' | 'archive' }) =>
      api.patch(`/courses/${id}/${action}`, {}, token),
    onSuccess: invalidateCourses,
  });

  const deleteCourse = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${id}`, token),
    onSuccess: invalidateCourses,
  });

  return (
    <div className="space-y-4">
      {teachers.length === 0 && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          No hay catedráticos registrados. Creá al menos un usuario con rol <strong>Catedrático</strong> en la pestaña Usuarios antes de crear cursos.
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {courses?.total ?? 0} curso{(courses?.total ?? 0) !== 1 ? 's' : ''} registrado{(courses?.total ?? 0) !== 1 ? 's' : ''}
        </p>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-4 py-2 text-sm">
          + Nuevo curso
        </button>
      </div>

      <CreateCourseModal
        open={showCreate} token={token}
        onClose={() => setShowCreate(false)}
        onCreated={invalidateCourses}
        teachers={teachers} categories={categories}
      />
      <EditCourseModal
        open={!!editingCourse} token={token} course={editingCourse}
        onClose={() => setEditingCourse(null)}
        onSaved={invalidateCourses}
        categories={categories}
      />
      <AdminEnrollModal
        open={!!enrollingCourse} token={token} course={enrollingCourse}
        onClose={() => setEnrollingCourse(null)}
      />

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Título</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Catedrático</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Nivel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {(courses?.items ?? []).map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{c.title}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status] ?? ''}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{c.difficulty}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/teacher/courses/${c.slug}`}
                        className="text-xs px-2 py-1 rounded border border-primary-300 dark:border-primary-800 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                      >
                        Gestionar
                      </Link>
                      <button
                        onClick={() => setEditingCourse(c)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Editar
                      </button>
                      {c.status === 'DRAFT' && (
                        <button
                          onClick={() => courseAction.mutate({ id: c.id, action: 'publish' })}
                          disabled={courseAction.isPending}
                          className="text-xs px-2 py-1 rounded border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
                        >
                          Publicar
                        </button>
                      )}
                      {c.status === 'PUBLISHED' && (
                        <>
                          <button
                            onClick={() => courseAction.mutate({ id: c.id, action: 'unpublish' })}
                            disabled={courseAction.isPending}
                            className="text-xs px-2 py-1 rounded border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                          >
                            Despublicar
                          </button>
                          <button
                            onClick={() => { if (confirm(`¿Archivar "${c.title}"?`)) courseAction.mutate({ id: c.id, action: 'archive' }); }}
                            disabled={courseAction.isPending}
                            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            Archivar
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEnrollingCourse(c)}
                        className="text-xs px-2 py-1 rounded border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                      >
                        Inscribir
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar "${c.title}"? Esta acción no se puede deshacer.`)) deleteCourse.mutate(c.id); }}
                        disabled={deleteCourse.isPending}
                        className="text-xs px-2 py-1 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(courses?.items ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">No hay cursos todavía</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Gamification Tab ─────────────────────────────────────────────────────────

const CRITERIA_LABELS: Record<BadgeCriteria, string> = {
  COURSE_COMPLETE: 'Curso completado',
  PERFECT_QUIZ: 'Quiz perfecto',
  FIRST_ENROLLMENT: 'Primera inscripción',
  STREAK: 'Racha',
  MANUAL: 'Manual',
};

const AUTO_CRITERIA = new Set<BadgeCriteria>(['COURSE_COMPLETE', 'PERFECT_QUIZ', 'FIRST_ENROLLMENT', 'STREAK']);

const XP_BY_CRITERIA: Partial<Record<BadgeCriteria, number>> = {
  COURSE_COMPLETE: 100,
  PERFECT_QUIZ: 50,
  FIRST_ENROLLMENT: 20,
  STREAK: 30,
};

const EMPTY_BADGE_FORM = { name: '', description: '', criteriaType: 'MANUAL' as BadgeCriteria, courseId: '' };

function GamificationTab({ token }: { token: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_BADGE_FORM);
  const [editing, setEditing] = useState<BadgeItem | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_BADGE_FORM);
  const [awardUserId, setAwardUserId] = useState('');
  const [awardBadgeId, setAwardBadgeId] = useState('');
  const [awardXpUserId, setAwardXpUserId] = useState('');
  const [awardXpAmount, setAwardXpAmount] = useState('');
  const [awardXpReason, setAwardXpReason] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const { data: badges = [], isLoading } = useQuery<BadgeItem[]>({
    queryKey: ['admin-badges'],
    queryFn: () => api.get('/badges', token),
  });

  const { data: usersData } = useQuery<UserListResponse>({
    queryKey: ['admin', 'users', 'all-for-gamification'],
    queryFn: () => api.get<UserListResponse>('/users?limit=200', token),
    enabled: !!token,
  });
  const allUsers = usersData?.items ?? [];

  const createBadge = useMutation({
    mutationFn: () => api.post('/badges', { ...form, courseId: form.courseId || undefined, description: form.description || undefined }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-badges'] }); setForm(EMPTY_BADGE_FORM); setErr(''); },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : 'Error'),
  });

  const updateBadge = useMutation({
    mutationFn: () => api.patch(`/badges/${editing!.id}`, { ...editForm, courseId: editForm.courseId || undefined, description: editForm.description || undefined }, token),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-badges'] }); setEditing(null); setErr(''); },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : 'Error'),
  });

  const deleteBadge = useMutation({
    mutationFn: (id: string) => api.delete(`/badges/${id}`, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-badges'] }),
  });

  const awardBadge = useMutation({
    mutationFn: () => api.post(`/users/${awardUserId}/badges/${awardBadgeId}`, {}, token),
    onSuccess: () => { setMsg('Badge otorgado'); setAwardUserId(''); setAwardBadgeId(''); },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : 'Error'),
  });

  const awardXp = useMutation({
    mutationFn: () => api.post(`/users/${awardXpUserId}/xp`, { amount: Number(awardXpAmount), reason: awardXpReason }, token),
    onSuccess: () => { setMsg('XP otorgado'); setAwardXpUserId(''); setAwardXpAmount(''); setAwardXpReason(''); },
    onError: (e: unknown) => setErr(e instanceof Error ? e.message : 'Error'),
  });

  return (
    <div className="space-y-8">
      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-green-600">{msg}</p>}

      {/* Badge list */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Badges</h2>
        {isLoading ? <div className="flex justify-center py-6"><Spinner size="sm" className="text-primary-500" /></div> : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Criterio</th>
                  <th className="px-4 py-3 text-left">XP</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {badges.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{b.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{CRITERIA_LABELS[b.criteriaType]}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{XP_BY_CRITERIA[b.criteriaType] ?? 0} XP</td>
                    <td className="px-4 py-3">
                      {AUTO_CRITERIA.has(b.criteriaType)
                        ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">Automático</span>
                        : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Manual</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">{b.description ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditing(b); setEditForm({ name: b.name, description: b.description ?? '', criteriaType: b.criteriaType, courseId: b.courseId ?? '' }); }}
                          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">Editar</button>
                        <button onClick={() => { if (confirm(`¿Eliminar badge "${b.name}"?`)) deleteBadge.mutate(b.id); }}
                          className="text-xs px-2 py-1 rounded border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {badges.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">No hay badges todavía</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create badge */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Crear badge</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nombre *" maxLength={200} className="input-base col-span-2 sm:col-span-1" />
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Descripción" maxLength={1000} className="input-base col-span-2 sm:col-span-1" />
          <select value={form.criteriaType} onChange={e => setForm(f => ({ ...f, criteriaType: e.target.value as BadgeCriteria }))}
            className="input-base">
            {(Object.keys(CRITERIA_LABELS) as BadgeCriteria[]).map(k => (
              <option key={k} value={k}>{CRITERIA_LABELS[k]}</option>
            ))}
          </select>
          <button onClick={() => createBadge.mutate()} disabled={!form.name || createBadge.isPending}
            className="btn-primary text-sm disabled:opacity-50">
            {createBadge.isPending ? 'Creando…' : 'Crear'}
          </button>
        </div>
      </div>

      {/* Award badge — manual only */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Otorgar badge manualmente</h3>
          <p className="text-xs text-gray-500 mt-0.5">Los badges automáticos se otorgan solos al completar cursos, evaluaciones e inscripciones.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <select value={awardUserId} onChange={e => setAwardUserId(e.target.value)} className="input-base">
            <option value="">Seleccionar usuario…</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email} — {u.email}</option>
            ))}
          </select>
          <select value={awardBadgeId} onChange={e => setAwardBadgeId(e.target.value)} className="input-base">
            <option value="">Seleccionar badge…</option>
            {badges.map(b => <option key={b.id} value={b.id}>{b.name} ({CRITERIA_LABELS[b.criteriaType]})</option>)}
          </select>
          <button onClick={() => awardBadge.mutate()} disabled={!awardUserId || !awardBadgeId || awardBadge.isPending}
            className="btn-primary text-sm disabled:opacity-50">
            {awardBadge.isPending ? 'Otorgando…' : 'Otorgar'}
          </button>
        </div>
      </div>

      {/* Award XP */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Otorgar XP manualmente</h3>
        <div className="grid grid-cols-3 gap-3">
          <select value={awardXpUserId} onChange={e => setAwardXpUserId(e.target.value)} className="input-base">
            <option value="">Seleccionar usuario…</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email} — {u.email}</option>
            ))}
          </select>
          <input value={awardXpAmount} onChange={e => setAwardXpAmount(e.target.value)}
            placeholder="Cantidad XP" type="number" min={1} max={10000} className="input-base" />
          <input value={awardXpReason} onChange={e => setAwardXpReason(e.target.value)}
            placeholder="Razón" className="input-base" />
        </div>
        <button onClick={() => awardXp.mutate()} disabled={!awardXpUserId || !awardXpAmount || awardXp.isPending}
          className="btn-primary text-sm mt-3 disabled:opacity-50">
          {awardXp.isPending ? 'Otorgando…' : 'Otorgar XP'}
        </button>
      </div>

      {/* Edit badge modal */}
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={`Editar badge: ${editing.name}`}>
          <div className="space-y-3">
            <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nombre *" maxLength={200} className="input-base w-full" />
            <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción" maxLength={1000} className="input-base w-full" />
            <select value={editForm.criteriaType} onChange={e => setEditForm(f => ({ ...f, criteriaType: e.target.value as BadgeCriteria }))}
              className="input-base w-full">
              {(Object.keys(CRITERIA_LABELS) as BadgeCriteria[]).map(k => (
                <option key={k} value={k}>{CRITERIA_LABELS[k]}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="btn-secondary text-sm">Cancelar</button>
              <button onClick={() => updateBadge.mutate()} disabled={!editForm.name || updateBadge.isPending}
                className="btn-primary text-sm disabled:opacity-50">
                {updateBadge.isPending ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

const ENTITY_TYPES = ['Assignment', 'Category', 'Course', 'CourseModule', 'Enrollment', 'ForumPost', 'ForumThread', 'Grade', 'Lesson', 'Submission', 'User'];

function AuditLogTab({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');

  const params = new URLSearchParams({ page: String(page), limit: '50' });
  if (entityType) params.set('entityType', entityType);

  const { data, isLoading } = useQuery<AuditLogPage>({
    queryKey: ['audit-logs', page, entityType],
    queryFn: () => api.get(`/audit-logs?${params}`, token),
  });

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Registro de auditoría</h2>
        <select value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}
          className="input-base text-sm w-48">
          <option value="">Todas las entidades</option>
          {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="lg" className="text-primary-500" /></div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Actor</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Entidad</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Acción</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {data?.data.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400 dark:text-gray-500">Sin registros</td></tr>
                ) : data?.data.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 dark:text-gray-400">
                      {new Date(log.createdAt).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{log.actor?.email ?? log.actorId ?? '—'}</td>
                    <td className="px-3 py-2"><Badge variant="default">{log.entityType}</Badge></td>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{log.action}</td>
                    <td className="px-3 py-2 text-gray-400 dark:text-gray-500 font-mono truncate max-w-[120px]">{log.entityId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>{data?.total ?? 0} registros</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-secondary py-1 text-xs disabled:opacity-40">Anterior</button>
                <span className="py-1 px-2">Pág {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="btn-secondary py-1 text-xs disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'users' | 'academic' | 'categories' | 'roles' | 'courses' | 'gamification' | 'auditlog';
const TAB_LABELS: Record<Tab, string> = {
  users: 'Usuarios',
  academic: 'Estructura académica',
  categories: 'Categorías',
  roles: 'Roles',
  courses: 'Cursos',
  gamification: 'Gamificación',
  auditlog: 'Auditoría',
};

export default function AdminPage() {
  const { token, user, isLoading: sessionLoading, isAuthenticated } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('users');

  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) router.push('/login?from=/admin');
  }, [sessionLoading, isAuthenticated, router]);

  if (sessionLoading) return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Administración</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Gestioná usuarios, estructura académica, roles, categorías, cursos y gamificación.</p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6 overflow-x-auto">
          {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'users' && token && user && <UsersTab token={token} currentUserId={user.id} />}
      {tab === 'academic' && token && <AcademicStructureTab token={token} />}
      {tab === 'categories' && token && <CategoriesTab token={token} />}
      {tab === 'roles' && token && <RolesTab token={token} />}
      {tab === 'courses' && token && <CoursesTab token={token} />}
      {tab === 'gamification' && token && <GamificationTab token={token} />}
      {tab === 'auditlog' && token && <AuditLogTab token={token} />}
    </div>
  );
}
