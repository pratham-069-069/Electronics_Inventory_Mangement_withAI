// src/components/InventoryAlerts.jsx (or wherever you place your components)
"use client"; // Assuming Next.js App Router

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"; // Adjust path if needed
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi"; // Added FiCheckCircle
import { Button } from "../components/ui/button"; // Adjust path if needed

const InventoryAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch alerts when the component mounts
  useEffect(() => {
    fetchInventoryAlerts();
  }, []);

  // Function to fetch inventory alerts from the backend
  const fetchInventoryAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch from the correct backend endpoint
      const response = await fetch("http://localhost:5000/api/inventory-alerts");
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch inventory alerts: ${response.status} ${errorData}`);
      }

      const data = await response.json();
      // Set the fetched alerts into state
      setAlerts(data);
    } catch (err) {
      console.error("Fetch Alerts Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle acknowledging (deleting) an alert
  const acknowledgeAlert = async (alertId) => {
    // Optionally disable the button while processing? (Could add more state)
    setError(null); // Clear previous errors

    try {
      // Call the backend DELETE endpoint for the specific alert ID
      const response = await fetch(`http://localhost:5000/api/inventory-alerts/${alertId}`, {
        method: "DELETE", // Use the DELETE HTTP method
      });

      if (!response.ok) {
        // Try to get error message from backend response
        let errorMsg = `Failed to acknowledge/delete alert: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) { /* Response might not be JSON */ }
        throw new Error(errorMsg);
      }

      // If the backend deletion was successful, update the UI state
      // by filtering out the deleted alert
      setAlerts(currentAlerts => currentAlerts.filter((alert) => alert.alert_id !== alertId));
      console.log(`Alert ${alertId} acknowledged and removed.`);

    } catch (err) {
      console.error("Error acknowledging alert:", err);
      // Display the error message to the user
      setError(err.message || `Failed to acknowledge alert ${alertId}. Please try again.`);
    }
  };

  // Display loading state
  if (loading) {
    return <p className="p-4 text-center text-gray-600">Loading inventory alerts...</p>;
  }

  // Display error state
  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <FiAlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        {/* Optionally add a retry button */}
        <Button variant="outline" size="sm" className="mt-2" onClick={fetchInventoryAlerts}>Retry</Button>
      </Alert>
    );
  }

  // Display the alerts or a "no alerts" message
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold mb-4">Inventory Alerts (Low Stock)</h2>

      {/* Conditionally render error message if acknowledge fails but loading is done */}
       {error && !loading && (
           <Alert variant="destructive" className="mb-4">
               <FiAlertTriangle className="h-4 w-4" />
               <AlertTitle>Acknowledgement Error</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
           </Alert>
       )}

      {alerts.length > 0 ? (
        // Map through the alerts and display each one
        alerts.map((alert) => (
          <Alert key={alert.alert_id} variant="destructive" className="flex items-center justify-between gap-4">
            {/* Alert Details Section */}
            <div className="flex items-center flex-grow">
              <FiAlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 text-red-500" />
              <div>
                <AlertTitle className="font-semibold">
                  {/* Display product name if available, otherwise ID */}
                  {alert.product_name || `Product ID: ${alert.product_id}`}
                </AlertTitle>
                <AlertDescription>
                  {/* Display relevant alert details */}
                  Current Stock: {alert.current_stock ?? 'N/A'} | Threshold: {alert.threshold_quantity} | Date: {new Date(alert.alert_date).toLocaleDateString()}
                </AlertDescription>
              </div>
            </div>
            {/* Acknowledge Button Section */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => acknowledgeAlert(alert.alert_id)}
              className="ml-4 flex-shrink-0 border-red-300 text-red-700 hover:bg-red-50" // Style acknowledge button
              aria-label={`Acknowledge alert for ${alert.product_name || `Product ID ${alert.product_id}`}`}
            >
              Acknowledge
            </Button>
          </Alert>
        ))
      ) : (
        // Display message when there are no alerts
        <Alert variant="default" className="border-green-300 bg-green-50 text-green-800">
          <FiCheckCircle className="h-5 w-5 mr-3 text-green-600" />
          <AlertTitle className="font-semibold">All Clear!</AlertTitle>
          <AlertDescription>
            There are no active low stock inventory alerts at this time.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default InventoryAlerts;