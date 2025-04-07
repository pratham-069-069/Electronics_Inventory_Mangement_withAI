import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"; // Adjust path if needed
import { FiBox, FiTruck, FiAlertCircle, FiDollarSign, FiShoppingCart, FiUsers, FiFileText, FiLoader } from "react-icons/fi"; // Added FiLoader

const DashboardCard = ({ title, value, icon: Icon, isLoading }) => (
  <Card className="w-full hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
      <CardTitle className="text-base font-semibold text-gray-700">{title}</CardTitle>
      <Icon className="w-5 h-5 text-gray-500" />
    </CardHeader>
    <CardContent className="p-4 pt-0">
      {isLoading ? (
        <div className="h-8 w-1/2 bg-gray-200 rounded animate-pulse"></div>
      ) : (
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      )}
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeSuppliers: 0,
    lowStockAlerts: 0,
    totalSales: 0,
    totalOrders: 0, // Initial state
    totalUsers: 0,   // Initial state
    totalReports: 0, // Initial state
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/api/dashboard/stats");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch dashboard stats: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      // ✅ *** Update state with ALL keys returned by the backend ***
      setStats(prevStats => ({
          ...prevStats,
          totalProducts: data.totalProducts ?? 0,
          activeSuppliers: data.activeSuppliers ?? 0,
          lowStockAlerts: data.lowStockAlerts ?? 0,
          totalSales: data.totalSales ?? 0,
          totalOrders: data.totalOrders ?? 0,     // Use data from API
          totalUsers: data.totalUsers ?? 0,       // Use data from API
          totalReports: data.totalReports ?? 0,   // Use data from API
      }));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Format total sales nicely
  const formattedTotalSales = Number(stats.totalSales).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD', // Adjust currency as needed
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded">
            <p><strong>Error:</strong> {error}</p>
            <button onClick={fetchDashboardStats} className="mt-2 text-sm font-semibold underline">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <DashboardCard title="Total Products" value={stats.totalProducts} icon={FiBox} isLoading={loading} />
          <DashboardCard title="Active Suppliers" value={stats.activeSuppliers} icon={FiTruck} isLoading={loading} />
          <DashboardCard title="Low Stock Alerts" value={stats.lowStockAlerts} icon={FiAlertCircle} isLoading={loading} />
          <DashboardCard title="Total Sales Value" value={formattedTotalSales} icon={FiDollarSign} isLoading={loading} />
          {/* ✅ *** Titles updated to remove "(N/A)" *** */}
          <DashboardCard title="Total Orders" value={stats.totalOrders} icon={FiShoppingCart} isLoading={loading} />
          <DashboardCard title="Total Users" value={stats.totalUsers} icon={FiUsers} isLoading={loading} />
          <DashboardCard title="Reports Generated" value={stats.totalReports} icon={FiFileText} isLoading={loading} />
        </div>

      </div>
    </div>
  );
};

export default Dashboard;