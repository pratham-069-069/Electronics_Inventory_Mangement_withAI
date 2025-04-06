import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { FiAlertTriangle } from "react-icons/fi";
import { Button } from "../components/ui/button";

const InventoryAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInventoryAlerts();
  }, []);

  const fetchInventoryAlerts = async () => {
    try {
      const response = await fetch("http://localhost:5000/inventory-alerts");
      if (!response.ok) throw new Error("Failed to fetch inventory alerts");

      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await fetch(`http://localhost:5000/inventory-alerts/${alertId}/acknowledge`, {
        method: "PATCH",
      });
      setAlerts(alerts.filter((alert) => alert.alert_id !== alertId));
    } catch (err) {
      console.error("Error acknowledging alert:", err);
    }
  };

  if (loading) return <p>Loading inventory alerts...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Inventory Alerts</h2>
      {alerts.length > 0 ? (
        alerts.map((alert) => (
          <Alert key={alert.alert_id} variant="destructive">
            <FiAlertTriangle className="h-4 w-4 text-red-500" />
            <AlertTitle>Product ID: {alert.product_id}</AlertTitle>
            <AlertDescription>
              {alert.alert_type} - Threshold: {alert.threshold_quantity}
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => acknowledgeAlert(alert.alert_id)}
            >
              Acknowledge
            </Button>
          </Alert>
        ))
      ) : (
        <p className="text-green-600">✅ No active inventory alerts.</p>
      )}
    </div>
  );
};

export default InventoryAlerts;
