import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { FiBox, FiTruck, FiAlertCircle, FiDollarSign } from "react-icons/fi";

const DashboardCard = ({ title, value, icon: Icon }) => (
  <Card className="w-full hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between p-6">
      <CardTitle className="text-lg font-semibold text-white-500">{title}</CardTitle>
      <Icon className="w-6 h-6 text-white-500" />
    </CardHeader>
    <CardContent className="p-6 pt-0">
      <div className="text-3xl font-bold text-white-500">{value}</div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeSuppliers: 0,
    lowStockAlerts: 0,
    totalSales: 0
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("http://localhost:5000/dashboard-stats"); // Update with your backend API
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard title="Total Products" value={stats.totalProducts} icon={FiBox} />
          <DashboardCard title="Active Suppliers" value={stats.activeSuppliers} icon={FiTruck} />
          <DashboardCard title="Low Stock Alerts" value={stats.lowStockAlerts} icon={FiAlertCircle} />
          <DashboardCard title="Total Sales" value={`$${stats.totalSales.toLocaleString()}`} icon={FiDollarSign} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
