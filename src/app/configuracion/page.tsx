'use client'
import { 
  Settings, User, Bell, Shield, Gauge, 
  Moon, Sun, Palette, Save, LogOut 
} from 'lucide-react'

export default function ConfiguracionPage() {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="page-header">
        <div className="page-header-icon"><Settings size={22} /></div>
        <div>
          <h1>Configuración</h1>
          <p>Personaliza tu experiencia y gestiona el sistema</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
        {/* Profile Card */}
        <div className="card" style={{ padding: 32 }}>
          <div className="section-title">
            <User size={18} color="var(--accent)" />
            <span>Perfil de Usuario</span>
          </div>
          <div className="profile-header" style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '24px 0' }}>
            <div className="avatar-big">JD</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Jesus Diaz</div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>Administrador de Metrología</div>
            </div>
          </div>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input type="text" readOnly value="jdiaz@polifusion.cl" className="input-readonly" />
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>Editar Perfil</button>
        </div>

        {/* System Customization */}
        <div className="card" style={{ padding: 32 }}>
          <div className="section-title">
            <Palette size={18} color="var(--accent)" />
            <span>Preferencias Visuales</span>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-label">Tema del Sistema</div>
              <div className="setting-desc">Alternar entre modo claro y oscuro</div>
            </div>
            <div className="theme-toggle-group">
              <button className="theme-btn active"><Sun size={14} /> Claro</button>
              <button className="theme-btn"><Moon size={14} /> Oscuro</button>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-label">Densidad de Interfaz</div>
              <div className="setting-desc">Ajustar el espaciado de los elementos</div>
            </div>
            <select className="input-select">
              <option>Estándar</option>
              <option>Compacta</option>
            </select>
          </div>
        </div>

        {/* Security and Roles */}
        <div className="card" style={{ padding: 32 }}>
          <div className="section-title">
            <Shield size={18} color="var(--accent)" />
            <span>Seguridad y Accesos</span>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-label">Rol Actual</div>
              <div className="badge badge-apto" style={{ marginTop: 4 }}>ADMIN-PRO</div>
            </div>
            <button className="btn btn-ghost btn-sm">Ver Permisos</button>
          </div>
          <div className="setting-row">
            <div>
              <div className="setting-label">Autenticación</div>
              <div className="setting-desc">Estado: Verificado con éxito</div>
            </div>
            <button className="btn btn-ghost btn-sm">Cambiar Clave</button>
          </div>
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--snow-3)' }}>
            <button className="btn btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }}>
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 8px;
        }
        .avatar-big {
          width: 64px;
          height: 64px;
          background: var(--accent);
          color: #fff;
          border-radius: 16px;
          display: grid;
          place-items: center;
          font-size: 22px;
          font-weight: 800;
          box-shadow: 0 8px 16px var(--accent-glow);
        }
        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          border-bottom: 1px solid var(--snow-2);
        }
        .setting-row:last-child {
          border-bottom: none;
        }
        .setting-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
        }
        .setting-desc {
          font-size: 12px;
          color: var(--text-soft);
          margin-top: 2px;
        }
        .theme-toggle-group {
          display: flex;
          background: var(--snow-2);
          padding: 3px;
          border-radius: 10px;
          gap: 3px;
        }
        .theme-btn {
          border: none;
          background: none;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-soft);
          border-radius: 7px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .theme-btn.active {
          background: #fff;
          color: var(--accent);
          box-shadow: var(--shadow-sm);
        }
        .input-readonly {
          width: 100%;
          padding: 10px 14px;
          background: var(--snow-1);
          border: 1px solid var(--snow-3);
          border-radius: 10px;
          font-size: 13px;
          color: var(--text-soft);
          margin-top: 8px;
        }
        .input-select {
          padding: 8px 12px;
          border: 1px solid var(--snow-3);
          border-radius: 8px;
          font-size: 12px;
          background: #fff;
          outline: none;
        }
      `}</style>
    </div>
  )
}
