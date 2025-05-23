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
import { FiLoader, FiAlertCircle, FiFilter, FiPlus, FiEdit } from "react-icons/fi"; // Added FiEdit

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  // const [customers, setCustomers] = useState([]); // For customer dropdown if needed

  const [searchDate, setSearchDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Add Sale Modal State ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const initialNewSaleState = {
    product_id: "", quantity_sold: "", unit_price: "", customer_id: "",
    sold_by_user_id: "", payment_method: "cash", payment_status: "completed",
  };
  const [newSale, setNewSale] = useState(initialNewSaleState);
  const [selectedProductPrice, setSelectedProductPrice] = useState(0);

  // --- Edit Sale Modal State ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editError, setEditError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingSale, setEditingSale] = useState(null); // Will hold the sale object to edit
                                                        // Structure: { sales_id, customer_id, payment_method, payment_status, ...other fields for display }

  // --- useEffects and Data Fetching ---
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true); setError(null);
      try {
        await Promise.all([fetchSales(), fetchProducts(), fetchUsers()]);
      } catch (err) { console.error("Error loading initial sales data:", err); }
      finally { setLoading(false); }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    handleFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, searchDate]);

  const fetchSales = async () => { /* ... remains the same ... */
    try {
      const response = await fetch("http://localhost:5000/api/sales");
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch sales data: ${response.status} ${errText}`);
      }
      const data = await response.json();
      setSales(data);
    } catch (err) {
      console.error("Fetch Sales Error:", err);
      setError(err.message);
      setSales([]);
      setFilteredSales([]);
    }
  };
  const fetchProducts = async () => { /* ... remains the same ... */
     try {
      const response = await fetch("http://localhost:5000/api/products");
      if (!response.ok) throw new Error("Failed to fetch products for dropdown");
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
       setError(prev => prev ? `${prev}\nCould not load products.` : 'Could not load products.');
       setProducts([]);
    }
  };
  const fetchUsers = async () => { /* ... remains the same ... */
     try {
      const response = await fetch("http://localhost:5000/api/users");
      if (!response.ok) throw new Error("Failed to fetch users for dropdown");
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(prev => prev ? `${prev}\nCould not load users.` : 'Could not load users.');
      setUsers([]);
    }
  };

  // --- Filtering ---
  const handleFilter = () => { /* ... remains the same ... */
    if (!searchDate) {
      setFilteredSales(sales);
      return;
    }
    const filtered = sales.filter((sale) => {
        try {
            const saleDate = new Date(sale.sale_date).toISOString().split('T')[0];
            return saleDate === searchDate;
        } catch (e) {
            console.warn("Invalid sale date format:", sale.sale_date);
            return false;
        }
    });
    setFilteredSales(filtered);
  };

  // --- Add Sale Logic ---
  const handleAddInputChange = (e) => { /* ... remains the same (renamed for clarity) ... */
    const { name, value } = e.target;
    setNewSale(prev => ({ ...prev, [name]: value }));
    if (name === 'product_id') {
        const selectedProd = products.find(p => p.product_id.toString() === value);
        const price = selectedProd ? selectedProd.unit_price : 0;
        setSelectedProductPrice(price);
        setNewSale(prev => ({ ...prev, unit_price: price ? price : "" }));
    }
  };
  const handleAddSale = async (e) => { /* ... remains the same ... */
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);
    const { product_id, quantity_sold, customer_id, sold_by_user_id, payment_method, payment_status } = newSale;
    const quantity = parseInt(quantity_sold, 10);
    const selectedProduct = products.find(p => p.product_id.toString() === product_id);
    if (!product_id || !quantity_sold || !sold_by_user_id || !payment_method || !payment_status || quantity <= 0 || !selectedProduct) {
      setAddError("Please fill all required fields with valid values (Product, Quantity > 0, Sold By, Payment).");
      setIsAdding(false); return;
    }
    if (selectedProduct.current_stock < quantity) {
         setAddError(`Insufficient stock for ${selectedProduct.product_name}. Available: ${selectedProduct.current_stock}`);
         setIsAdding(false); return;
    }
     const saleDataToSend = {
         product_id: parseInt(product_id, 10),
         quantity_sold: quantity,
         unit_price: parseFloat(selectedProduct.unit_price),
         customer_id: customer_id ? parseInt(customer_id, 10) : null,
         sold_by_user_id: parseInt(sold_by_user_id, 10),
         payment_method: payment_method,
         payment_status: payment_status,
     };
    try {
      const response = await fetch("http://localhost:5000/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleDataToSend),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || `Failed to add sale: ${response.status}`);
      await fetchSales(); 
      setShowAddModal(false);
      setNewSale(initialNewSaleState);
      setSelectedProductPrice(0);
    } catch (error) {
      console.error("Error adding sale:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally {
      setIsAdding(false);
    }
  };
  const openAddModal = () => { /* ... remains the same (renamed setShowModal to setShowAddModal) ... */
       setNewSale(initialNewSaleState);
       setAddError(null);
       setSelectedProductPrice(0);
       setShowAddModal(true);
   };

  // --- Edit Sale Logic ---
  const openEditModal = (saleToEdit) => {
    console.log("Editing sale:", saleToEdit);
    setEditingSale({ // Set only editable fields, or all fields if backend handles partial updates
        sales_id: saleToEdit.sales_id,
        customer_id: saleToEdit.customer_id || "", // Handle null customer_id
        payment_method: saleToEdit.payment_method,
        payment_status: saleToEdit.payment_status,
        // For display in modal (read-only), you might want to include more:
        sale_date: saleToEdit.sale_date,
        total_amount: saleToEdit.total_amount,
        sold_by_user_name: saleToEdit.sold_by_user_name, // If available from initial fetch
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingSale(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateSale = async (e) => {
    e.preventDefault();
    if (!editingSale || !editingSale.sales_id) {
        setEditError("No sale selected for editing.");
        return;
    }
    setEditError(null);
    setIsUpdating(true);

    // Only send fields that are meant to be updatable
    const { sales_id, customer_id, payment_method, payment_status } = editingSale;

    if ( !payment_method || !payment_status) {
        setEditError("Payment method and status are required.");
        setIsUpdating(false);
        return;
    }

    const updateData = {
        customer_id: customer_id ? parseInt(customer_id, 10) : null,
        payment_method,
        payment_status,
        // Do NOT send product_id, quantity_sold, unit_price here unless your backend
        // is designed to handle full recalculation and stock adjustment for edits.
    };

    try {
        const response = await fetch(`http://localhost:5000/api/sales/${sales_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
        });
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.error || `Failed to update sale: ${response.status}`);
        }
        await fetchSales(); // Refetch sales to show updated data
        setShowEditModal(false);
        setEditingSale(null);
    } catch (error) {
        console.error("Error updating sale:", error);
        setEditError(error.message || "An unexpected error occurred during update.");
    } finally {
        setIsUpdating(false);
    }
  };


  // --- Loading / Error States ---
  if (loading) { /* ... */
      return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading sales records...</span></div>;
  }
  if (error && !sales.length) { /* ... */
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }

  // --- Main Render ---
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Sales Records</h1>
        <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <FiPlus className="mr-2 h-4 w-4" /> Add New Sale
        </Button>
      </div>

      {/* Filter Section */}
      <div className="flex flex-wrap items-end gap-4 bg-gray-800 p-4 rounded border border-gray-700 shadow">
        <div>
             <Label htmlFor="searchDate" className="text-sm font-medium text-gray-200 mb-1 block">Filter by Date</Label>
             <Input id="searchDate" type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)}
                className="block w-full max-w-xs bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                style={{ colorScheme: 'dark' }} />
        </div>
        {searchDate && (
            <Button variant="ghost" size="sm" onClick={() => setSearchDate("")}
              className="text-indigo-400 hover:bg-gray-700 hover:text-indigo-300">
              Clear Filter
            </Button>
        )}
      </div>

      {/* General Errors */}
       {error && sales.length > 0 && ( /* ... */
           <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded flex items-center text-sm">
               <FiAlertCircle className="h-4 w-4 mr-2" /> Warning: {error}
           </div>
       )}

      {/* Sales Table */}
       <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
            <TableHeader className="bg-gray-50">
            <TableRow>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale ID</TableHead>
                <TableHead>Date</TableHead> <TableHead>Customer</TableHead> <TableHead>Sold By</TableHead>
                <TableHead className="text-right">Subtotal</TableHead> <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead> <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead> {/* New Actions column */}
            </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
            {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                <TableRow key={sale.sales_id} className="hover:bg-gray-50">
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{sale.sales_id}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(sale.sale_date).toLocaleString()}</TableCell>
                    <TableCell>{sale.customer_name || `ID: ${sale.customer_id}` || "N/A"}</TableCell>
                    <TableCell>{sale.sold_by_user_name || `ID: ${sale.sold_by_user_id}`}</TableCell>
                    <TableCell className="text-right">${Number(sale.subtotal || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${Number(sale.tax_amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">${Number(sale.total_amount || 0).toFixed(2)}</TableCell>
                     <TableCell>{sale.payment_method}</TableCell>
                     <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            sale.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                            sale.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            sale.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                         {sale.payment_status}
                        </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(sale)}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            title="Edit Sale"
                        >
                            <FiEdit className="h-4 w-4" />
                        </Button>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan="10" className="text-center py-10 text-gray-500"> {/* Updated colspan */}
                    {searchDate ? "No sales records match the selected date." : "No sales records found."}
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
      </div>

      {/* Add Sale Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}> {/* Changed variable */}
        <DialogContent className="sm:max-w-lg bg-gray-800 text-white rounded-lg shadow-xl overflow-hidden">
          <DialogHeader className="px-6 py-5 bg-gray-800 border-b border-gray-600">
            <DialogTitle className="text-lg font-medium leading-6 text-white">Record New Sale</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-300">
              Select product, quantity, user, and payment details.
            </DialogDescription>
          </DialogHeader>
          {/* Changed handleInputChange to handleAddInputChange */}
          <form id="add-sale-form" onSubmit={handleAddSale} className="px-6 py-6 space-y-4">
            {addError && ( /* ... */
                <div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md text-sm font-medium">
                    {addError}
                </div>
            )}
            <div> {/* Product Selection */}
              <Label htmlFor="add_product_id" className="block text-sm font-medium text-gray-200 mb-1">Product *</Label>
              <select id="add_product_id" name="product_id" value={newSale.product_id} onChange={handleAddInputChange}
                 className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" required>
                <option value="" disabled className="text-gray-500">Select Product...</option>
                {products.map(p => (<option key={p.product_id} value={p.product_id} className="text-white bg-gray-700">{p.product_name} (Stock: {p.current_stock})</option>))}
              </select>
            </div>
            {newSale.product_id && ( /* Display Unit Price */
                 <div className="mt-2"><span className="text-sm font-medium text-gray-400">Unit Price: </span><span className="text-sm text-gray-100">${Number(selectedProductPrice).toFixed(2)}</span></div>
            )}
            <div> {/* Quantity Input */}
              <Label htmlFor="add_quantity_sold" className="block text-sm font-medium text-gray-200 mb-1">Quantity *</Label>
              <Input id="add_quantity_sold" name="quantity_sold" type="number" placeholder="0" min="1" step="1" value={newSale.quantity_sold} onChange={handleAddInputChange}
                className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400" required />
            </div>
            <div> {/* Sold By User Selection */}
              <Label htmlFor="add_sold_by_user_id" className="block text-sm font-medium text-gray-200 mb-1">Sold By *</Label>
              <select id="add_sold_by_user_id" name="sold_by_user_id" value={newSale.sold_by_user_id} onChange={handleAddInputChange}
                 className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" required>
                <option value="" disabled className="text-gray-500">Select User...</option>
                {users.map(u => (<option key={u.user_id} value={u.user_id} className="text-white bg-gray-700">{u.full_name}</option>))}
              </select>
            </div>
            <div> {/* Customer ID (Optional) */}
              <Label htmlFor="add_customer_id" className="block text-sm font-medium text-gray-200 mb-1">Customer (Optional)</Label>
              <Input id="add_customer_id" name="customer_id" type="number" placeholder="Customer ID" value={newSale.customer_id} onChange={handleAddInputChange}
                 className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400" />
            </div>
            <div> {/* Payment Method */}
                 <Label htmlFor="add_payment_method" className="block text-sm font-medium text-gray-200 mb-1">Payment Method *</Label>
                 <select id="add_payment_method" name="payment_method" value={newSale.payment_method} onChange={handleAddInputChange}
                     className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" required>
                     <option value="cash" className="text-white bg-gray-700">Cash</option> <option value="card" className="text-white bg-gray-700">Card</option> <option value="online" className="text-white bg-gray-700">Online Transfer</option>
                 </select>
            </div>
            <div> {/* Payment Status */}
                 <Label htmlFor="add_payment_status" className="block text-sm font-medium text-gray-200 mb-1">Payment Status *</Label>
                 <select id="add_payment_status" name="payment_status" value={newSale.payment_status} onChange={handleAddInputChange}
                     className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" required>
                     <option value="completed" className="text-white bg-gray-700">Completed</option> <option value="pending" className="text-white bg-gray-700">Pending</option> <option value="failed" className="text-white bg-gray-700">Failed</option>
                 </select>
            </div>
            <DialogFooter className="px-6 py-4 bg-gray-700 border-t border-gray-600 flex justify-end space-x-3">
              <DialogClose asChild><Button type="button" variant="outline" className="border-gray-500 bg-transparent text-gray-200 hover:bg-gray-600">Cancel</Button></DialogClose>
              <Button type="submit" form="add-sale-form" disabled={isAdding} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isAdding ? <><FiLoader className="mr-2 h-4 w-4 animate-spin" />Processing...</> : "Record Sale"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Sale Modal - Dark Theme */}
      {editingSale && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-lg bg-gray-800 text-white rounded-lg shadow-xl overflow-hidden">
            <DialogHeader className="px-6 py-5 bg-gray-800 border-b border-gray-600">
              <DialogTitle className="text-lg font-medium leading-6 text-white">
                Edit Sale (ID: {editingSale.sales_id})
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-300">
                Update customer, payment method, or status. Item details cannot be changed here.
              </DialogDescription>
            </DialogHeader>
            <form id="edit-sale-form" onSubmit={handleUpdateSale} className="px-6 py-6 space-y-4">
              {editError && (
                  <div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md text-sm font-medium">
                      {editError}
                  </div>
              )}

              {/* Display some read-only info */}
              <div className="text-sm text-gray-400">
                <p>Sale Date: {new Date(editingSale.sale_date).toLocaleString()}</p>
                <p>Sold By: {editingSale.sold_by_user_name || `ID: ${editingSale.sold_by_user_id}`}</p>
                <p>Original Total: ${Number(editingSale.total_amount || 0).toFixed(2)}</p>
              </div>

              {/* Customer ID (Optional & Editable) */}
              <div>
                <Label htmlFor="edit_customer_id" className="block text-sm font-medium text-gray-200 mb-1">
                    Customer (Optional)
                </Label>
                <Input
                    id="edit_customer_id"
                    name="customer_id"
                    type="number"
                    placeholder="Enter Customer ID"
                    value={editingSale.customer_id || ""} // Ensure it's controlled
                    onChange={handleEditInputChange}
                    className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
                />
                {/* Future: Could be a dropdown of existing customers */}
              </div>

              {/* Payment Method (Editable) */}
              <div>
                <Label htmlFor="edit_payment_method" className="block text-sm font-medium text-gray-200 mb-1">
                    Payment Method *
                </Label>
                <select
                    id="edit_payment_method"
                    name="payment_method"
                    value={editingSale.payment_method}
                    onChange={handleEditInputChange}
                    className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    required
                >
                    <option value="cash" className="text-white bg-gray-700">Cash</option>
                    <option value="card" className="text-white bg-gray-700">Card</option>
                    <option value="online" className="text-white bg-gray-700">Online Transfer</option>
                </select>
              </div>

              {/* Payment Status (Editable) */}
              <div>
                <Label htmlFor="edit_payment_status" className="block text-sm font-medium text-gray-200 mb-1">
                    Payment Status *
                </Label>
                <select
                    id="edit_payment_status"
                    name="payment_status"
                    value={editingSale.payment_status}
                    onChange={handleEditInputChange}
                    className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    required
                >
                    <option value="completed" className="text-white bg-gray-700">Completed</option>
                    <option value="pending" className="text-white bg-gray-700">Pending</option>
                    <option value="failed" className="text-white bg-gray-700">Failed</option>
                </select>
              </div>

              <DialogFooter className="px-6 py-4 bg-gray-700 border-t border-gray-600 flex justify-end space-x-3 mt-2"> {/* Removed outer padding from form, added here */}
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="border-gray-500 bg-transparent text-gray-200 hover:bg-gray-600" onClick={() => setEditingSale(null)}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" form="edit-sale-form" disabled={isUpdating} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isUpdating ? <><FiLoader className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Update Sale"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Sales;