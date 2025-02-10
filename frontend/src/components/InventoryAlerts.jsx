import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"; 
import { FiAlertTriangle } from "react-icons/fi";


const InventoryAlerts = () => {
  const alerts = [
    { id: 1, product: "Product A", message: "Low stock - only 5 units remaining" },
    { id: 2, product: "Product B", message: "Out of stock" },
    { id: 3, product: "Product C", message: "Expiring soon - 10 days left" },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Inventory Alerts</h2>
      {alerts.map((alert) => (
        <Alert key={alert.id} variant="destructive">
          <FiAlertTriangle className="h-4 w-4" />
          <AlertTitle>{alert.product}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  )
}

export default InventoryAlerts

