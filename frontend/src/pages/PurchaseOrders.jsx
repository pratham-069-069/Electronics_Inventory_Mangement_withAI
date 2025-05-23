import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "../components/ui/Dialog";
import { FiLoader, FiAlertCircle, FiCheckSquare, FiPackage, FiXCircle, FiEdit, FiPlus } from "react-icons/fi";

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const initialNewOrderState = { supplier_id: "", product_id: "", quantity_ordered: "" };
  const [newOrder, setNewOrder] = useState(initialNewOrderState);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [editError, setEditError] = useState(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(null);

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

  const handleAddInputChange = (e) => {
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
      await fetchOrders();
      setShowAddModal(false); setNewOrder(initialNewOrderState);
    } catch (error) {
      console.error("Error adding order:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally { setIsAdding(false); }
  };

    const openAddModal = () => {
       setNewOrder(initialNewOrderState); setAddError(null); setShowAddModal(true);
   };

  const openEditModal = (orderToEdit) => {
    setEditingOrder({
        order_id: orderToEdit.order_id,
        supplier_id: orderToEdit.supplier_id,
        supplier_name: orderToEdit.supplier_name,
        product_id: orderToEdit.product_id,
        product_name: orderToEdit.product_name,
        quantity_ordered: orderToEdit.quantity_ordered,
        order_status: orderToEdit.order_status,
        order_date: orderToEdit.order_date
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingOrder(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    setEditError(null);
    setIsUpdatingOrder(true);

    const { order_id, quantity_ordered, order_status } = editingOrder;
    const parsedQuantity = parseInt(quantity_ordered, 10);

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        setEditError("Quantity must be a positive number.");
        setIsUpdatingOrder(false);
        return;
    }
    const allowedStatuses = ['pending', 'shipped', 'received', 'canceled'];
    if (!allowedStatuses.includes(order_status)) {
        setEditError("Invalid order status selected.");
        setIsUpdatingOrder(false);
        return;
    }

    const updateData = {
        quantity_ordered: parsedQuantity,
        order_status: order_status
    };

    try {
        const response = await fetch(`http://localhost:5000/api/purchase-orders/${order_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
        });
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.error || `Failed to update purchase order: ${response.status}`);
        }
        await fetchOrders();
        setShowEditModal(false);
        setEditingOrder(null);
    } catch (error) {
        console.error("Error updating purchase order:", error);
        setEditError(error.message || "An unexpected error occurred during update.");
    } finally {
        setIsUpdatingOrder(false);
    }
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
          if (newStatus === 'received') await fetchProducts();
          console.log(`Order ${orderId} status updated to ${newStatus}.`);
      } catch (err) {
          console.error(`Error updating status for order ${orderId}:`, err);
          setError(`Update failed for order ${orderId}: ${err.message}`);
      } finally {
          setIsUpdatingStatus(null);
      }
  };

  if (loading) {
      return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading purchase orders...</span></div>;
  }

  if (error && !orders.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Purchase Orders</h1>
        <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <FiPlus className="mr-2 h-4 w-4"/> Create New Order
        </Button>
      </div>

       {error && (
           <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded flex items-center text-sm">
               <FiAlertCircle className="h-4 w-4 mr-2" /> Warning: {error}
           </div>
       )}

      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
            <TableHeader className="bg-gray-50">
            <TableRow>
                <TableHead className="w-[80px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</TableHead>
                <TableHead className="w-[100px] px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</TableHead>
                <TableHead className="w-[120px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</TableHead>
                <TableHead className="w-[180px] px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
                <TableRow key={order.order_id} className="hover:bg-gray-50">
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_id}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{order.supplier_name || `ID: ${order.supplier_id}`}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{order.product_name || `ID: ${order.product_id}`}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">{order.quantity_ordered}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            order.order_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.order_status === 'received' ? 'bg-green-100 text-green-800' :
                            order.order_status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.order_status === 'canceled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                         {order.order_status}
                        </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(order.order_date).toLocaleDateString()}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium space-x-1">
                        {order.order_status === 'pending' && (
                             <Button
                                 variant="outline" size="icon"
                                 className="text-blue-600 border-blue-300 hover:bg-blue-50 rounded-full"
                                 onClick={() => openEditModal(order)}
                                 disabled={isUpdatingStatus === order.order_id || isUpdatingOrder}
                                 title="Edit Order"
                             > <FiEdit className="h-4 w-4" /> </Button>
                        )}
                        {(order.order_status === 'pending' || order.order_status === 'shipped') && (
                             <Button
                                 variant="outline" size="icon"
                                 className="text-green-700 border-green-300 hover:bg-green-50 rounded-full"
                                 onClick={() => handleUpdateStatus(order.order_id, 'received')}
                                 disabled={isUpdatingStatus === order.order_id || isUpdatingOrder} title="Mark as Received">
                                 {isUpdatingStatus === order.order_id && order.order_status !== 'received' ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiCheckSquare className="h-4 w-4" />}
                             </Button>
                        )}
                         {order.order_status === 'pending' && (
                              <Button
                                 variant="ghost" size="icon"
                                 className="text-red-600 hover:bg-red-100 rounded-full"
                                 onClick={() => handleUpdateStatus(order.order_id, 'canceled')}
                                 disabled={isUpdatingStatus === order.order_id || isUpdatingOrder} title="Cancel Order">
                                 {isUpdatingStatus === order.order_id && order.order_status !== 'canceled' ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiXCircle className="h-4 w-4" />}
                             </Button>
                         )}
                    </TableCell>
                </TableRow>
            ))}
            {orders.length === 0 && (
                <TableRow><TableCell colSpan="7" className="text-center py-10 text-gray-500">No purchase orders found.</TableCell></TableRow>
            )}
            </TableBody>
        </Table>
      </div>

    {/* Add Purchase Order Modal - Dark Theme APPLIED */}
    <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
      <DialogContent className="sm:max-w-lg bg-gray-900 text-gray-200 rounded-lg shadow-xl overflow-hidden">
        <DialogHeader className="px-6 py-5 bg-gray-800 border-b border-gray-700">
          <DialogTitle className="text-lg font-medium leading-6 text-white">Create Purchase Order</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-gray-400">Select supplier, product, and quantity.</DialogDescription>
        </DialogHeader>
        <form id="add-po-form" onSubmit={handleAddOrder} className="px-6 py-6 space-y-5">
          {addError && (<div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md text-sm font-medium">{addError}</div>)}
          <div>
            <Label htmlFor="add_supplier_id" className="block text-sm font-medium text-gray-300 mb-1">Supplier <span className="text-red-400">*</span></Label>
            <select id="add_supplier_id" name="supplier_id" value={newOrder.supplier_id} onChange={handleAddInputChange}
                    className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" required>
              <option value="" disabled className="text-gray-500">Select Supplier...</option>
              {suppliers.map(s => (<option key={s.supplier_id} value={s.supplier_id} className="text-white bg-gray-700">{s.supplier_name} (ID: {s.supplier_id})</option>))}
            </select>
          </div>
          <div>
            <Label htmlFor="add_product_id" className="block text-sm font-medium text-gray-300 mb-1">Product <span className="text-red-400">*</span></Label>
            <select id="add_product_id" name="product_id" value={newOrder.product_id} onChange={handleAddInputChange}
                    className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" required>
              <option value="" disabled className="text-gray-500">Select Product...</option>
              {products.map(p => (<option key={p.product_id} value={p.product_id} className="text-white bg-gray-700">{p.product_name} (ID: {p.product_id})</option>))}
            </select>
          </div>
          <div>
            <Label htmlFor="add_quantity_ordered" className="block text-sm font-medium text-gray-300 mb-1">Quantity <span className="text-red-400">*</span></Label>
            <Input id="add_quantity_ordered" name="quantity_ordered" type="number" placeholder="0" min="1" step="1" value={newOrder.quantity_ordered} onChange={handleAddInputChange}
                   className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400" required/>
          </div>
        </form>
        <DialogFooter className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex justify-end space-x-3">
          <DialogClose asChild>
            <Button type="button" variant="outline"
                    className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" form="add-po-form" disabled={isAdding}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-50">
            {isAdding ? <><FiLoader className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Edit Purchase Order Modal - Dark Theme APPLIED */}
    {editingOrder && (
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg bg-gray-900 text-gray-200 rounded-lg shadow-xl overflow-hidden">
          <DialogHeader className="px-6 py-5 bg-gray-800 border-b border-gray-700">
            <DialogTitle className="text-lg font-medium leading-6 text-white">Edit Purchase Order (ID: {editingOrder.order_id})</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-400">Update quantity or status. Supplier and Product cannot be changed.</DialogDescription>
          </DialogHeader>
          <form id="edit-po-form" onSubmit={handleUpdateOrder} className="px-6 py-6 space-y-5">
            {editError && (<div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md text-sm font-medium">{editError}</div> )}
            <div className="text-sm text-gray-400 space-y-1">
              <p>Supplier: <span className="text-gray-100">{editingOrder.supplier_name || `ID: ${editingOrder.supplier_id}`}</span></p>
              <p>Product: <span className="text-gray-100">{editingOrder.product_name || `ID: ${editingOrder.product_id}`}</span></p>
              <p>Order Date: <span className="text-gray-100">{new Date(editingOrder.order_date).toLocaleDateString()}</span></p>
            </div>
            {editingOrder.order_status === 'pending' ? (
              <div>
                <Label htmlFor="edit_quantity_ordered" className="block text-sm font-medium text-gray-300 mb-1">Quantity <span className="text-red-400">*</span></Label>
                <Input id="edit_quantity_ordered" name="quantity_ordered" type="number" placeholder="0" min="1" step="1"
                       value={editingOrder.quantity_ordered} onChange={handleEditInputChange}
                       className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400" required />
              </div>
            ) : (
              <div className="text-sm text-gray-400">Quantity: <span className="text-gray-100">{editingOrder.quantity_ordered}</span> (Cannot edit for non-pending orders)</div>
            )}
            {editingOrder.order_status !== 'received' && editingOrder.order_status !== 'canceled' ? (
              <div>
                <Label htmlFor="edit_order_status" className="block text-sm font-medium text-gray-300 mb-1">Order Status <span className="text-red-400">*</span></Label>
                <select id="edit_order_status" name="order_status" value={editingOrder.order_status} onChange={handleEditInputChange}
                        className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" required>
                  <option value="pending" className="text-white bg-gray-700">Pending</option>
                  <option value="shipped" className="text-white bg-gray-700">Shipped</option>
                </select>
              </div>
            ) : (
               <div className="text-sm text-gray-400">Status: <span className="text-gray-100">{editingOrder.order_status}</span> (Final status)</div>
            )}
          </form>
          <DialogFooter className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex justify-end space-x-3 mt-2">
            <DialogClose asChild><Button type="button" variant="outline"
                                          className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                                          onClick={() => setEditingOrder(null)}>Cancel</Button></DialogClose>
            {editingOrder.order_status !== 'received' && editingOrder.order_status !== 'canceled' && (
              <Button type="submit" form="edit-po-form" disabled={isUpdatingOrder}
                      className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-50">
                {isUpdatingOrder ? <><FiLoader className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Update Order"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </div>
  );
};

export default PurchaseOrders;