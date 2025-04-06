import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Sales from "./pages/Sales.jsx";
import InventoryAlerts from "./components/InventoryAlerts.jsx";
import Chatbot from "./components/Chatbot.jsx";
import Reports from "./pages/Reports.jsx";
import PurchaseOrders from "./pages/PurchaseOrders.jsx";
import Users from "./pages/Users.jsx";
import { useState } from "react";

const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // ✅ Function to handle authentication
    const handleLogin = (email, password) => {
        if (email === "admin@gmail.com" && password === "admin") {
            setIsAuthenticated(true);
        } else {
            alert("Invalid email or password");
        }
    };

    return (
        <Router>
            <Routes>
                <Route 
                    path="/login" 
                    element={<Login onLogin={handleLogin} />} 
                />
                <Route
                    path="/*"
                    element={
                        isAuthenticated ? (
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/products" element={<Products />} />
                                    <Route path="/suppliers" element={<Suppliers />} />
                                    <Route path="/sales" element={<Sales />} />
                                    <Route path="/alerts" element={<InventoryAlerts />} />
                                    <Route path="/reports" element={<Reports />} />
                                    <Route path="/purchase-orders" element={<PurchaseOrders />} />
                                    <Route path="/users" element={<Users />} />
                                </Routes>
                                <Chatbot />
                            </Layout>
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    }
                />
            </Routes>
        </Router>
    );
};

export default App;
