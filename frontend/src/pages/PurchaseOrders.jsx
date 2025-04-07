import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table"; // Adjust paths if needed
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label"; // Import Label
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Import DialogDescription
  DialogFooter, // Import DialogFooter
  DialogClose,
} from "../components/ui/Dialog"; // Adjust paths if needed
import { FiLoader, FiAlertCircle, FiCheckSquare, FiPackage, FiXCircle } from "react-icons/fi"; // Added more icons

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [addError, setAddError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(null); // Store ID being updated

  const initialNewOrderState = {
    supplier_id: "", product_id: "", quantity_ordered: "",
  };
  const [newOrder, setNewOrder] = useState(initialNewOrderState);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true); setError(null);
      try {
        await Promise.all([fetchOrders(), fetchSuppliers(), fetchProducts()]);
      } catch (err) { console.error("Error loading initial data:", err); }
      finally { setLoading(false); }
    };
    loadInitialData();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/purchase-orders");
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch orders: ${response.status} ${errText}`);
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error(err); setError(err.message);
    }
  };

  const fetchSuppliers = async () => {
     try {
      const response = await fetch("http://localhost:5000/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      setSuppliers(await response.json());
    } catch (err) {
      console.error("Error fetching suppliers:", err);
      setError(prev => prev ? `${prev}\nCould not load suppliers.` : 'Could not load suppliers.');
      setSuppliers([]);
    }
  };

  const fetchProducts = async () => {
     try {
      const response = await fetch("http://localhost:5000/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      setProducts(await response.json());
    } catch (err) {
      console.error("Error fetching products:", err);
       setError(prev => prev ? `${prev}\nCould not load products.` : 'Could not load products.');
       setProducts([]);
    }
  };

  const handleInputChange = (e) => {
      const { name, value } = e.target;
      setNewOrder({ ...newOrder, [name]: value });
  }

  const handleAddOrder = async (e) => {
    e.preventDefault();
    setAddError(null); setIsAdding(true);
    if (!newOrder.supplier_id || !newOrder.product_id || !newOrder.quantity_ordered || parseInt(newOrder.quantity_ordered, 10) <= 0) {
      setAddError("Please select a supplier, product, and enter a valid quantity.");
      setIsAdding(false); return;
    }
    try {
      const response = await fetch("http://localhost:5000/api/purchase-orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            supplier_id: parseInt(newOrder.supplier_id, 10),
            product_id: parseInt(newOrder.product_id, 10),
            quantity_ordered: parseInt(newOrder.quantity_ordered, 10)
        }),
      });
      const responseData = await response.json();
      if (!response.ok) { throw new Error(responseData.error || `Failed to add order: ${response.status}`); }
      await fetchOrders(); // Refetch orders after adding
      setShowModal(false); setNewOrder(initialNewOrderState);
    } catch (error) {
      console.error("Error adding order:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally { setIsAdding(false); }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
      setIsUpdatingStatus(orderId);
      setError(null);

      try {
          const response = await fetch(`http://localhost:5000/api/purchase-orders/${orderId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_status: newStatus })
          });

          const responseData = await response.json();

          if (!response.ok) {
              throw new Error(responseData.error || `Failed to update status: ${response.status}`);
          }

          setOrders(currentOrders =>
              currentOrders.map(order =>
                  order.order_id === orderId ? { ...order, order_status: newStatus } : order
              )
          );
          console.log(`Order ${orderId} status updated to ${newStatus}.`);

      } catch (err) {
          console.error(`Error updating status for order ${orderId}:`, err);
          setError(`Update failed for order ${orderId}: ${err.message}`);
      } finally {
          setIsUpdatingStatus(null);
      }
  };

  const openAddModal = () => {
       setNewOrder(initialNewOrderState); setAddError(null); setShowModal(true);
   }

  if (loading) {
      return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading purchase orders...</span></div>;
  }

  if (error && !orders.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Purchase Orders</h1>
        <Button onClick={openAddModal}>Create New Order</Button>
      </div>

       {error && (
           <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded flex items-center text-sm">
               <FiAlertCircle className="h-4 w-4 mr-2" /> Error: {error}
           </div>
       )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
            <TableHeader className="bg-gray-50">
            <TableRow>
                <TableHead className="w-[80px]">Order ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="w-[100px] text-right">Quantity</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[150px]">Order Date</TableHead>
                <TableHead className="w-[150px] text-center">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {orders.length > 0 ? (
                orders.map((order) => (
                <TableRow key={order.order_id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{order.order_id}</TableCell>
                    <TableCell>{order.supplier_name || `ID: ${order.supplier_id}`}</TableCell>
                    <TableCell>{order.product_name || `ID: ${order.product_id}`}</TableCell>
                    <TableCell className="text-right">{order.quantity_ordered}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.order_status === 'received' ? 'bg-green-100 text-green-800' :
                            order.order_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.order_status === 'canceled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                         {order.order_status}
                        </span>
                    </TableCell>
                    <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center">
                        {(order.order_status === 'pending' || order.order_status === 'shipped') && (
                             <Button
                                 variant="outline"
                                 size="sm"
                                 className="text-green-700 border-green-300 hover:bg-green-50"
                                 onClick={() => handleUpdateStatus(order.order_id, 'received')}
                                 disabled={isUpdatingStatus === order.order_id}
                                 title="Mark as Received"
                             >
                                 {isUpdatingStatus === order.order_id ? (
                                     <FiLoader className="h-4 w-4 animate-spin" />
                                 ) : (
                                     <FiCheckSquare className="h-4 w-4" />
                                 )}
                             </Button>
                        )}
                         {order.order_status === 'pending' && (
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 className="text-red-600 hover:bg-red-100 ml-1"
                                 onClick={() => handleUpdateStatus(order.order_id, 'canceled')}
                                 disabled={isUpdatingStatus === order.order_id}
                                 title="Cancel Order"
                             >
                                 {isUpdatingStatus === order.order_id ? (
                                      <FiLoader className="h-4 w-4 animate-spin" />
                                 ) : (
                                      <FiXCircle className="h-4 w-4" />
                                 )}
                             </Button>
                         )}
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan="7" className="text-center py-10 text-gray-500">
                    No purchase orders found.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
      </div>

      {/* Add Purchase Order Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription> Select supplier, product, and enter quantity. </DialogDescription>
          </DialogHeader>
          <form id="add-po-form" onSubmit={handleAddOrder} className="grid gap-4 pt-4">
            {addError && ( <div className="col-span-full p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">{addError}</div> )}
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="supplier_id" className="text-right">Supplier</Label>
                <select id="supplier_id" name="supplier_id" value={newOrder.supplier_id} onChange={handleInputChange} className="col-span-3 border rounded px-3 py-2 bg-white" required>
                    <option value="" disabled>Select Supplier</option>
                    {suppliers.length > 0 ? suppliers.map(supplier => (<option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.supplier_name} (ID: {supplier.supplier_id})</option>)) : <option disabled>Loading...</option>}
                </select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="product_id" className="text-right">Product</Label>
                <select id="product_id" name="product_id" value={newOrder.product_id} onChange={handleInputChange} className="col-span-3 border rounded px-3 py-2 bg-white" required>
                    <option value="" disabled>Select Product</option>
                     {products.length > 0 ? products.map(product => (<option key={product.product_id} value={product.product_id}>{product.product_name} (ID: {product.product_id})</option>)) : <option disabled>Loading...</option>}
                </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity_ordered" className="text-right">Quantity</Label>
              <Input id="quantity_ordered" name="quantity_ordered" type="number" placeholder="0" min="1" step="1" value={newOrder.quantity_ordered} onChange={handleInputChange} className="col-span-3" required/>
            </div>
          </form>
          {/* Footer outside the form */}
          <DialogFooter className="pt-4">
              <DialogClose asChild>
                 <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              {/* ✅ *** Corrected Button Structure *** */}
              <Button type="submit" form="add-po-form" disabled={isAdding}>
                  {isAdding && <FiLoader className="mr-2 h-4 w-4 animate-spin" />} {/* Render icon conditionally */}
                  {isAdding ? "Creating..." : "Create Order"} {/* Render text content directly */}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;