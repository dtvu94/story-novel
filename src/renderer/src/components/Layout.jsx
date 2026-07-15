import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Icon from './Icon'

function SideItem({ to, icon, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
      <Icon name={icon} size={17} />
      {label}
    </NavLink>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">
            <Icon name="book" size={15} />
          </span>
          Story Shelf
        </div>
        <SideItem to="/" icon="library" label="Library" />
        <SideItem to="/import" icon="import" label="Import" />
        <div className="nav-spacer" />
        <button className="btn primary" onClick={() => navigate('/studio/new')}>
          <Icon name="plus" size={16} /> New book
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
