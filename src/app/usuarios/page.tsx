'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { 
  Users, UserPlus, Shield, ShieldCheck, Wrench, Eye, 
  Trash2, Edit3, Lock, Mail, User, Check, X, AlertTriangle, 
  Search, RefreshCw, Key
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface UserItem {
  email: string
  nombre: string
  rol: 'Admin' | 'Técnico' | 'Lector' | string
  username: string
  hasPassword: boolean
}

export default function UsuariosPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'Técnico',
    contrasena: ''
  })
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  // Delete Confirm State
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/usuarios', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      } else {
        toast.error('Error al cargar la lista de usuarios')
      }
    } catch {
      toast.error('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleOpenCreateModal = () => {
    setEditingUser(null)
    setFormData({
      nombre: '',
      email: '',
      rol: 'Técnico',
      contrasena: ''
    })
    setModalError('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (u: UserItem) => {
    setEditingUser(u)
    setFormData({
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      contrasena: ''
    })
    setModalError('')
    setIsModalOpen(true)
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim() || !formData.email.trim() || !formData.rol) {
      setModalError('Complete los campos obligatorios')
      return
    }

    if (!editingUser && !formData.contrasena.trim()) {
      setModalError('Ingrese una contraseña para el nuevo usuario')
      return
    }

    try {
      setModalLoading(true)
      setModalError('')

      const method = editingUser ? 'PUT' : 'POST'
      const res = await fetch('/api/usuarios', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok && data.success) {
        toast.success(editingUser ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente')
        setIsModalOpen(false)
        fetchUsers()
      } else {
        setModalError(data.error || 'Error al procesar la solicitud')
      }
    } catch {
      setModalError('Error de conexión')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDeleteUser = async (email: string) => {
    try {
      setDeleteLoading(true)
      const res = await fetch(`/api/usuarios?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      })
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success('Usuario eliminado del sistema')
        setDeletingEmail(null)
        fetchUsers()
      } else {
        toast.error(data.error || 'Error al eliminar usuario')
      }
    } catch {
      toast.error('Error al conectar con el servidor')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = selectedRoleFilter === 'ALL' || u.rol === selectedRoleFilter
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'Admin':
        return (
          <span className="role-badge admin">
            <Shield size={12} />
            <span>Administrador</span>
          </span>
        )
      case 'Técnico':
        return (
          <span className="role-badge tech">
            <Wrench size={12} />
            <span>Técnico Metrólogo</span>
          </span>
        )
      default:
        return (
          <span className="role-badge reader">
            <Eye size={12} />
            <span>Lector</span>
          </span>
        )
    }
  }

  return (
    <div className="users-page-container">
      {/* Header Bar */}
      <div className="users-header">
        <div className="title-area">
          <div className="title-row">
            <div className="title-icon-box">
              <Users size={22} />
            </div>
            <div>
              <h1 className="page-title">Gestión de Usuarios</h1>
              <p className="page-subtitle">Administración de credenciales, roles y permisos del sistema</p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button onClick={fetchUsers} className="btn-refresh" title="Actualizar lista">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button onClick={handleOpenCreateModal} className="btn-create">
            <UserPlus size={18} />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total Usuarios</span>
          <span className="stat-val">{users.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Administradores</span>
          <span className="stat-val admin-color">{users.filter(u => u.rol === 'Admin').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Técnicos Autorizados</span>
          <span className="stat-val tech-color">{users.filter(u => u.rol === 'Técnico').length}</span>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o correo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="clear-btn">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="role-filters">
          {['ALL', 'Admin', 'Técnico', 'Lector'].map(role => (
            <button
              key={role}
              onClick={() => setSelectedRoleFilter(role)}
              className={`filter-btn ${selectedRoleFilter === role ? 'active' : ''}`}
            >
              {role === 'ALL' ? 'Todos los roles' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table Card */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Cargando usuarios...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <Users size={40} className="empty-icon" />
            <h3>No se encontraron usuarios</h3>
            <p>Ajuste los términos de búsqueda o agregue un nuevo usuario.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo Institucional</th>
                  <th>Rol / Permisos</th>
                  <th>Autenticación</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const initials = u.nombre
                    ? u.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : u.username.slice(0, 2).toUpperCase()
                  
                  const isCurrent = currentUser?.email === u.email

                  return (
                    <tr key={u.email} className={isCurrent ? 'current-user-row' : ''}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {initials}
                          </div>
                          <div className="user-names">
                            <span className="user-fullname">{u.nombre}</span>
                            <span className="user-account">Cuenta: <strong>{u.username}</strong> {isCurrent && <span className="you-pill">Tú</span>}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="email-cell">
                          <Mail size={14} className="email-icon" />
                          <span>{u.email}</span>
                        </div>
                      </td>
                      <td>
                        {getRoleBadge(u.rol)}
                      </td>
                      <td>
                        {u.hasPassword ? (
                          <span className="auth-pill active">
                            <Key size={12} />
                            <span>Contraseña Habilitada</span>
                          </span>
                        ) : (
                          <span className="auth-pill inactive">
                            <span>Sin Clave</span>
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="btn-action edit"
                            title="Editar usuario y clave"
                          >
                            <Edit3 size={15} />
                            <span>Editar</span>
                          </button>
                          
                          <button
                            onClick={() => setDeletingEmail(u.email)}
                            disabled={isCurrent}
                            className={`btn-action delete ${isCurrent ? 'disabled' : ''}`}
                            title={isCurrent ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit User */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <div className="modal-icon">
                  {editingUser ? <Edit3 size={20} /> : <UserPlus size={20} />}
                </div>
                <div>
                  <h3>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
                  <p>{editingUser ? `Modificando cuenta: ${editingUser.username}` : 'Ingrese los datos para habilitar acceso al sistema'}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="btn-close">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="modal-error-box">
                <AlertTriangle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="modal-form">
              <div className="form-group">
                <label>Nombre Completo *</label>
                <div className="modal-input-wrapper">
                  <User size={16} className="modal-field-icon" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. César Munizaga"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Usuario o Correo Electrónico *</label>
                <div className="modal-input-wrapper">
                  <Mail size={16} className="modal-field-icon" />
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    placeholder="Ej. cmunizaga o cmunizaga@polifusion.cl"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {editingUser && (
                  <span className="field-hint">El correo/identificador principal no puede modificarse una vez creado.</span>
                )}
              </div>

              <div className="form-group">
                <label>Rol de Usuario *</label>
                <div className="role-options-grid">
                  {[
                    { id: 'Admin', title: 'Administrador', desc: 'Control total, gestión de usuarios y configuraciones', icon: Shield },
                    { id: 'Técnico', title: 'Técnico Metrólogo', desc: 'Registro de verificaciones, firmas y certificados', icon: Wrench },
                    { id: 'Lector', title: 'Lector', desc: 'Visualización de datos, fichas técnicas y reportes', icon: Eye }
                  ].map(r => {
                    const IconComp = r.icon
                    const isSelected = formData.rol === r.id
                    return (
                      <div
                        key={r.id}
                        className={`role-option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, rol: r.id })}
                      >
                        <div className="role-option-header">
                          <IconComp size={16} className="role-option-icon" />
                          <span className="role-option-title">{r.title}</span>
                          {isSelected && <Check size={14} className="role-check" />}
                        </div>
                        <p className="role-option-desc">{r.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="form-group">
                <label>{editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso *'}</label>
                <div className="modal-input-wrapper">
                  <Lock size={16} className="modal-field-icon" />
                  <input
                    type="text"
                    placeholder={editingUser ? 'Dejar en blanco para mantener la actual' : 'Ingrese clave segura (Ej. Plf2026**)'}
                    value={formData.contrasena}
                    onChange={e => setFormData({ ...formData, contrasena: e.target.value })}
                  />
                </div>
                {editingUser && (
                  <span className="field-hint">Solo complete este campo si desea restablecer o cambiar la contraseña del usuario.</span>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-cancel">
                  Cancelar
                </button>
                <button type="submit" disabled={modalLoading} className="btn-submit">
                  {modalLoading ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete */}
      {deletingEmail && (
        <div className="modal-backdrop" onClick={() => setDeletingEmail(null)}>
          <div className="delete-confirm-card" onClick={e => e.stopPropagation()}>
            <div className="delete-icon-box">
              <AlertTriangle size={28} />
            </div>
            <h3>¿Eliminar este usuario?</h3>
            <p>Se eliminará el acceso para <strong>{deletingEmail}</strong>. Esta acción no se puede deshacer.</p>

            <div className="delete-actions">
              <button onClick={() => setDeletingEmail(null)} className="btn-cancel">
                Cancelar
              </button>
              <button 
                onClick={() => handleDeleteUser(deletingEmail)} 
                disabled={deleteLoading} 
                className="btn-confirm-delete"
              >
                {deleteLoading ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .users-page-container {
          padding: 24px var(--page-px, 24px);
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .users-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .title-icon-box {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          background: rgba(14, 165, 233, 0.12);
          color: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(14, 165, 233, 0.2);
        }

        .page-title {
          font-size: 24px;
          font-weight: 900;
          color: var(--text-main, #0f172a);
          letter-spacing: -0.02em;
          margin: 0;
        }

        .page-subtitle {
          font-size: 13px;
          color: var(--text-dim, #64748b);
          margin: 2px 0 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-refresh {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid var(--glass-border, #e2e8f0);
          background: var(--card-bg, #ffffff);
          color: var(--text-main, #0f172a);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-refresh:hover {
          background: var(--page-bg-soft, #f8fafc);
        }

        .spinning {
          animation: spin 0.8s linear infinite;
        }

        .btn-create {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
          transition: all 0.2s ease;
        }

        .btn-create:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(14, 165, 233, 0.4);
        }

        /* Stats Row */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .stat-card {
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--glass-border, #e2e8f0);
          padding: 18px 20px;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow: var(--shadow-sm);
        }

        .stat-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-dim, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .stat-val {
          font-size: 26px;
          font-weight: 900;
          color: var(--text-main, #0f172a);
        }

        .admin-color { color: #8b5cf6; }
        .tech-color { color: #0284c7; }

        /* Toolbar */
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          max-width: 460px;
          background: var(--card-bg, #ffffff);
          border: 1.5px solid var(--glass-border, #e2e8f0);
          border-radius: 14px;
          padding: 0 14px;
        }

        .search-icon {
          color: var(--text-dim, #94a3b8);
          margin-right: 10px;
        }

        .search-box input {
          width: 100%;
          height: 42px;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          color: var(--text-main, #0f172a);
          font-weight: 500;
        }

        .clear-btn {
          background: var(--page-bg-soft, #f1f5f9);
          border: none;
          border-radius: 50%;
          padding: 4px;
          cursor: pointer;
          color: var(--text-dim, #64748b);
          display: flex;
        }

        .role-filters {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid var(--glass-border, #e2e8f0);
          background: var(--card-bg, #ffffff);
          color: var(--text-dim, #64748b);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .filter-btn.active {
          background: #0284c7;
          border-color: #0284c7;
          color: #ffffff;
        }

        /* Table */
        .table-card {
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--glass-border, #e2e8f0);
          border-radius: 20px;
          box-shadow: var(--shadow-sm);
          overflow: hidden;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .users-table th {
          padding: 14px 20px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-dim, #64748b);
          background: var(--page-bg-soft, #f8fafc);
          border-bottom: 1px solid var(--glass-border, #e2e8f0);
        }

        .users-table td {
          padding: 16px 20px;
          border-bottom: 1px solid var(--glass-border, #f1f5f9);
          font-size: 13px;
          color: var(--text-main, #0f172a);
          vertical-align: middle;
        }

        .current-user-row {
          background: rgba(14, 165, 233, 0.03);
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
          flex-shrink: 0;
        }

        .user-names {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .user-fullname {
          font-weight: 700;
          color: var(--text-main, #0f172a);
          font-size: 14px;
        }

        .user-account {
          font-size: 12px;
          color: var(--text-dim, #64748b);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .you-pill {
          background: rgba(14, 165, 233, 0.15);
          color: #0284c7;
          font-size: 10px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 6px;
        }

        .email-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-dim, #475569);
          font-weight: 500;
        }

        .email-icon {
          color: var(--text-soft, #94a3b8);
        }

        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
        }

        .role-badge.admin {
          background: rgba(139, 92, 246, 0.12);
          color: #7c3aed;
          border: 1px solid rgba(139, 92, 246, 0.25);
        }

        .role-badge.tech {
          background: rgba(14, 165, 233, 0.12);
          color: #0284c7;
          border: 1px solid rgba(14, 165, 233, 0.25);
        }

        .role-badge.reader {
          background: rgba(100, 116, 139, 0.12);
          color: #475569;
          border: 1px solid rgba(100, 116, 139, 0.25);
        }

        .auth-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .auth-pill.active {
          color: #059669;
        }

        .auth-pill.inactive {
          color: #94a3b8;
        }

        .action-buttons {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
        }

        .btn-action.edit {
          background: var(--page-bg-soft, #f1f5f9);
          color: var(--text-main, #0f172a);
          border-color: var(--glass-border, #e2e8f0);
        }

        .btn-action.edit:hover {
          background: var(--card-bg, #ffffff);
          border-color: #0284c7;
          color: #0284c7;
        }

        .btn-action.delete {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border-color: rgba(239, 68, 68, 0.2);
          padding: 6px 10px;
        }

        .btn-action.delete:hover:not(.disabled) {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-action.delete.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          gap: 12px;
          color: var(--text-dim, #64748b);
        }

        .empty-icon {
          color: var(--text-soft, #cbd5e1);
        }

        /* Modals */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .modal-card {
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--glass-border, #e2e8f0);
          border-radius: 24px;
          width: 100%;
          max-width: 520px;
          padding: 28px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: popIn 0.25s ease-out;
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .modal-header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(14, 165, 233, 0.12);
          color: #0284c7;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0;
        }

        .modal-header p {
          font-size: 12px;
          color: var(--text-dim, #64748b);
          margin: 2px 0 0;
        }

        .btn-close {
          background: transparent;
          border: none;
          color: var(--text-dim, #94a3b8);
          cursor: pointer;
          padding: 4px;
        }

        .modal-error-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main, #1e293b);
        }

        .modal-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .modal-field-icon {
          position: absolute;
          left: 14px;
          color: var(--text-dim, #94a3b8);
          pointer-events: none;
        }

        .modal-input-wrapper input {
          width: 100%;
          height: 44px;
          padding: 0 14px 0 42px;
          border-radius: 12px;
          border: 1.5px solid var(--glass-border, #e2e8f0);
          background: var(--page-bg-soft, #f8fafc);
          color: var(--text-main, #0f172a);
          font-size: 14px;
          font-weight: 600;
          outline: none;
          box-sizing: border-box;
        }

        .modal-input-wrapper input:focus {
          border-color: #0ea5e9;
          background: var(--card-bg, #ffffff);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
        }

        .field-hint {
          font-size: 11px;
          color: var(--text-dim, #64748b);
          margin-top: 2px;
        }

        .role-options-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .role-option-card {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1.5px solid var(--glass-border, #e2e8f0);
          background: var(--page-bg-soft, #f8fafc);
          cursor: pointer;
          transition: all 0.15s;
        }

        .role-option-card:hover {
          border-color: #0ea5e9;
        }

        .role-option-card.selected {
          border-color: #0ea5e9;
          background: rgba(14, 165, 233, 0.08);
        }

        .role-option-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .role-option-icon {
          color: #0ea5e9;
        }

        .role-option-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main, #0f172a);
          flex: 1;
        }

        .role-check {
          color: #0ea5e9;
        }

        .role-option-desc {
          font-size: 11px;
          color: var(--text-dim, #64748b);
          margin: 3px 0 0 24px;
        }

        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 10px;
        }

        .btn-cancel {
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid var(--glass-border, #e2e8f0);
          background: transparent;
          color: var(--text-dim, #64748b);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-submit {
          padding: 10px 20px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
        }

        /* Delete Confirm */
        .delete-confirm-card {
          background: var(--card-bg, #ffffff);
          border-radius: 24px;
          padding: 32px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .delete-icon-box {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #fef2f2;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .delete-confirm-card h3 {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-main, #0f172a);
          margin: 0;
        }

        .delete-confirm-card p {
          font-size: 13px;
          color: var(--text-dim, #64748b);
          margin: 0;
          line-height: 1.4;
        }

        .delete-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          margin-top: 12px;
        }

        .delete-actions button {
          flex: 1;
          height: 42px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-confirm-delete {
          background: #dc2626;
          border: none;
          color: #ffffff;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
