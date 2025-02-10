import { Link, useLocation } from "react-router-dom";
import { FiHome, FiBox, FiTruck, FiAlertCircle, FiDollarSign, FiLogOut } from "react-icons/fi";
import { Button } from "./ui/button"; 


const Sidebar = () => {
  const location = useLocation()

  const navItems = [
    { icon: FiHome, label: "Dashboard", path: "/" },
    { icon: FiBox, label: "Products", path: "/products" },
    { icon: FiTruck, label: "Suppliers", path: "/suppliers" },
    { icon: FiAlertCircle, label: "Alerts", path: "/alerts" },
    { icon: FiDollarSign, label: "Sales", path: "/sales" },
  ]

  return (
    <aside className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 transition-colors ${
              location.pathname === item.path ? "bg-gray-700" : ""
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="absolute bottom-4">
        <Button variant="ghost" className="text-white hover:text-gray-300 flex items-center space-x-2">
          <FiLogOut className="w-5 h-5" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  )
}

const Layout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}

export default Layout

