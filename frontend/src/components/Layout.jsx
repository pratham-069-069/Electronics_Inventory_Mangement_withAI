import { Link, useLocation, useNavigate } from "react-router-dom"; // Added useNavigate
import {
  FiHome, FiBox, FiTruck, FiAlertCircle, FiDollarSign,
  FiCreditCard, // Billing Icon
  FiShoppingCart, FiUsers, FiLogOut ,
  FiCornerUpLeft 
  // Removed: FiFileText (Reports), FiActivity (Stock Log), FiCornerUpLeft (Returns)
  // Add back icons if you re-implement those features
} from "react-icons/fi";
import { Button } from "./ui/button"; // Adjust path if needed

const Sidebar = ({ setIsAuthenticated }) => { // Accept setIsAuthenticated if logout logic is here
  const location = useLocation();
  const navigate = useNavigate(); // Hook for navigation

  const navItems = [
    { icon: FiHome, label: "Dashboard", path: "/" },
    { icon: FiBox, label: "Products", path: "/products" },
    { icon: FiTruck, label: "Suppliers", path: "/suppliers" },
    { icon: FiAlertCircle, label: "Alerts", path: "/alerts" },
    { icon: FiDollarSign, label: "Sales", path: "/sales" },
    { icon: FiCreditCard, label: "Billing", path: "/billing" }, // Billing Link Added
    { icon: FiShoppingCart, label: "Purchase Orders", path: "/purchase-orders" },
    // { icon: FiFileText, label: "Reports", path: "/reports" }, // Reports Link Removed
    { icon: FiUsers, label: "User Management", path: "/users" },
    { icon: FiCornerUpLeft, label: "Returns", path: "/returns" }, // <-- Add Returns Link

  ];

  // Handle Logout
  const handleLogout = () => {
    console.log("Logout initiated...");
    // In a real app:
    // 1. Clear authentication state (e.g., token from localStorage/sessionStorage)
    // 2. Update global auth state (e.g., call setIsAuthenticated(false) if passed down)
    if (setIsAuthenticated) {
        setIsAuthenticated(false); // Update App's state if function is provided
    }
    // 3. Redirect to login page
    navigate("/login", { replace: true }); // Use navigate hook
  };

  return (
    <aside className="bg-gray-800 text-white w-64 min-h-screen p-4 flex flex-col"> {/* Added flex flex-col */}
      <div className="mb-8"> {/* Optional: Add some space at the top */}
          <h2 className="text-xl font-semibold text-center">Smart Inventory</h2>
      </div>
      <nav className="flex-grow space-y-1"> {/* Adjusted space */}
        {navItems.map((item) => (
          <Link
            key={item.label} // Use label or path as key
            to={item.path}
            className={`flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700 transition-colors text-sm ${ // Adjusted padding/spacing/text size
              // Check if the current path starts with the item path for nested routes highlighting
              location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                ? "bg-gray-900 font-medium text-white" // Active state styling
                : "text-gray-300 hover:text-white" // Default state styling
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" /> {/* Added flex-shrink-0 */}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-700"> {/* Use mt-auto to push to bottom */}
        <Button
           variant="ghost"
           className="w-full justify-start text-gray-300 hover:bg-red-700 hover:text-white flex items-center space-x-3 p-2 text-sm" // Adjusted styling
           onClick={handleLogout} // Call handleLogout
           title="Logout" // Added title attribute
        >
          <FiLogOut className="w-5 h-5" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
};

// Layout component - Can pass down auth state updater if needed
const Layout = ({ children, setIsAuthenticated }) => { // Accept setIsAuthenticated
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Pass setIsAuthenticated to Sidebar if logout is handled there */}
      <Sidebar setIsAuthenticated={setIsAuthenticated} />
      <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main> {/* Adjusted padding */}
    </div>
  );
};


export default Layout;