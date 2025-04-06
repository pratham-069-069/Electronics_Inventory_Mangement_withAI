import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../components/ui/Dialog";

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    supplier_id: "",
    product_id: "",
    quantity_ordered: "",
    order_status: "pending",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("http://localhost:5000/purchase-orders");
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrder = async () => {
    if (!newOrder.supplier_id || !newOrder.product_id || !newOrder.quantity_ordered) {
      alert("Please fill all required fields!");
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });
      if (!response.ok) throw new Error("Failed to add order");
      const addedOrder = await response.json();
      setOrders([...orders, addedOrder]);
      setShowModal(false);
      setNewOrder({ supplier_id: "", product_id: "", quantity_ordered: "", order_status: "pending" });
    } catch (error) {
      console.error("Error adding order:", error);
    }
  };

  if (loading) return <p>Loading purchase orders...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Purchase Orders</h1>
      <Button onClick={() => setShowModal(true)}>Create Order</Button>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Supplier ID</TableHead>
            <TableHead>Product ID</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length > 0 ? (
            orders.map((order) => (
              <TableRow key={order.order_id}>
                <TableCell>{order.order_id}</TableCell>
                <TableCell>{order.supplier_id}</TableCell>
                <TableCell>{order.product_id}</TableCell>
                <TableCell>{order.quantity_ordered}</TableCell>
                <TableCell>{order.order_status}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan="5" className="text-center py-4">
                No orders found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Supplier ID" value={newOrder.supplier_id} onChange={(e) => setNewOrder({ ...newOrder, supplier_id: e.target.value })} />
              <Input placeholder="Product ID" value={newOrder.product_id} onChange={(e) => setNewOrder({ ...newOrder, product_id: e.target.value })} />
              <Input type="number" placeholder="Quantity" value={newOrder.quantity_ordered} onChange={(e) => setNewOrder({ ...newOrder, quantity_ordered: e.target.value })} />
              <div className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddOrder}>Create Order</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PurchaseOrders;
