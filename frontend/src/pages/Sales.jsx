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
import { FiLoader, FiAlertCircle, FiFilter } from "react-icons/fi"; // Import icons

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [products, setProducts] = useState([]); // For add sale modal
  const [users, setUsers] = useState([]); // For add sale modal
  // const [customers, setCustomers] = useState([]); // Optional: for customer dropdown

  const [searchDate, setSearchDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [addError, setAddError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  // Initial state aligned with backend addSale controller logic
  const initialNewSaleState = {
    product_id: "",
    quantity_sold: "",
    unit_price: "", // We'll fetch this based on selected product
    customer_id: "", // Optional
    sold_by_user_id: "", // Required by backend
    payment_method: "cash", // Default example
    payment_status: "completed", // Default example
    // Backend calculates subtotal, tax_amount, total_amount
  };
  const [newSale, setNewSale] = useState(initialNewSaleState);
  const [selectedProductPrice, setSelectedProductPrice] = useState(0); // To display unit price

  useEffect(() => {
    // Fetch initial data on mount
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch sales, products, and users concurrently
        await Promise.all([fetchSales(), fetchProducts(), fetchUsers()/*, fetchCustomers()*/]);
      } catch (err) {
        console.error("Error loading initial sales data:", err);
        // Error state is handled within individual fetch functions
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Update filtered sales whenever the main sales data or search date changes
  useEffect(() => {
    handleFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, searchDate]);


  // Fetch Sales Records
  const fetchSales = async () => {
    try {
      // ✅ *** UPDATED URL HERE ***
      const response = await fetch("http://localhost:5000/api/sales");
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch sales data: ${response.status} ${errText}`);
      }
      const data = await response.json();
      setSales(data);
      // setFilteredSales(data); // Filtering is now handled by useEffect
    } catch (err) {
      console.error("Fetch Sales Error:", err);
      setError(err.message);
      setSales([]);
      setFilteredSales([]);
    }
  };

   // Fetch Products for Dropdown
   const fetchProducts = async () => {
     try {
       // ✅ *** Use existing products endpoint ***
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

   // Fetch Users for "Sold By" Dropdown
   const fetchUsers = async () => {
     try {
       // ✅ *** Use existing users endpoint ***
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

   // Optional: Fetch Customers for Dropdown
   // const fetchCustomers = async () => { /* ... implement if needed ... */ };


  // Handle filtering sales by date
  const handleFilter = () => {
    if (!searchDate) {
      setFilteredSales(sales); // Show all if no date selected
      return;
    }
    // Filter based on the date part only (YYYY-MM-DD)
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

  // Handle changes in the "Add Sale" modal form
   const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSale(prev => ({ ...prev, [name]: value }));

    // If product ID changes, update the stored unit price
    if (name === 'product_id') {
        const selectedProd = products.find(p => p.product_id.toString() === value);
        setSelectedProductPrice(selectedProd ? selectedProd.unit_price : 0);
         // Also update unit_price in the newSale state
         setNewSale(prev => ({ ...prev, unit_price: selectedProd ? selectedProd.unit_price : "" }));
    }
  };


  // Handle submitting the new sale
  const handleAddSale = async (e) => {
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);

    const { product_id, quantity_sold, customer_id, sold_by_user_id, payment_method, payment_status } = newSale;
    const quantity = parseInt(quantity_sold, 10);

    // Find selected product to get its price and check stock
    const selectedProduct = products.find(p => p.product_id.toString() === product_id);

    // Validation
    if (!product_id || !quantity_sold || !sold_by_user_id || !payment_method || !payment_status || quantity <= 0 || !selectedProduct) {
      setAddError("Please fill all required fields with valid values (Product, Quantity > 0, Sold By, Payment).");
      setIsAdding(false);
      return;
    }

    // Check available stock (optional but recommended client-side check)
    if (selectedProduct.current_stock < quantity) {
         setAddError(`Insufficient stock for ${selectedProduct.product_name}. Available: ${selectedProduct.current_stock}`);
         setIsAdding(false);
         return;
    }

    // Prepare data for backend (backend calculates totals)
     const saleDataToSend = {
         product_id: parseInt(product_id, 10),
         quantity_sold: quantity,
         unit_price: parseFloat(selectedProduct.unit_price), // Send unit price for backend calculation/verification
         customer_id: customer_id ? parseInt(customer_id, 10) : null, // Handle optional customer ID
         sold_by_user_id: parseInt(sold_by_user_id, 10),
         payment_method: payment_method,
         payment_status: payment_status,
         // Backend calculates: subtotal, tax_amount, total_amount
     };

    try {
      // ✅ *** UPDATED URL HERE ***
      const response = await fetch("http://localhost:5000/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleDataToSend),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Use detailed error from backend if available
        throw new Error(responseData.error || `Failed to add sale: ${response.status}`);
      }

      // Success: Refetch sales list for consistency
      await fetchSales();

      setShowModal(false); // Close modal
      setNewSale(initialNewSaleState); // Reset form
      setSelectedProductPrice(0); // Reset selected price display

    } catch (error) {
      console.error("Error adding sale:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally {
      setIsAdding(false); // Reset loading state
    }
  };

   // Handle opening the modal - reset form state
   const openAddModal = () => {
       setNewSale(initialNewSaleState);
       setAddError(null);
       setSelectedProductPrice(0);
       setShowModal(true);
   }

  // Main page loading state
  if (loading) {
      return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading sales records...</span></div>;
  }

  // Main page error state
  if (error && !sales.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Sales Records</h1>
        <Button onClick={openAddModal}>Add New Sale</Button>
      </div>

      {/* Filter Section */}
      <div className="flex items-end space-x-2 bg-gray-50 p-4 rounded border">
        <div>
             <Label htmlFor="searchDate" className="text-sm font-medium">Filter by Date</Label>
             <Input
                id="searchDate"
                className="max-w-xs mt-1" // Adjusted max-width
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
            />
        </div>
        {/* Filter button is now implicit via useEffect, but keep for explicit action if preferred */}
        {/* <Button variant="outline" onClick={handleFilter}><FiFilter className="mr-2 h-4 w-4"/> Filter</Button> */}
        {searchDate && (
            <Button variant="ghost" size="sm" onClick={() => setSearchDate("")}>Clear Filter</Button>
        )}
      </div>

      {/* Display general errors after initial load */}
       {error && sales.length > 0 && (
           <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded flex items-center text-sm">
               <FiAlertCircle className="h-4 w-4 mr-2" /> Warning: {error}
           </div>
       )}

      {/* Sales Table */}
       <div className="border rounded-lg overflow-hidden">
        <Table>
            <TableHeader className="bg-gray-50">
            <TableRow>
                <TableHead className="w-[80px]">Sale ID</TableHead>
                <TableHead>Date</TableHead>
                {/* Maybe Product Name instead of ID? Need JOIN on backend for GET /sales */}
                {/* <TableHead>Product</TableHead> */}
                <TableHead>Customer Name/ID</TableHead> {/* Need JOIN */}
                <TableHead>Sold By</TableHead> {/* Changed from ID */}
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                <TableRow key={sale.sales_id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{sale.sales_id}</TableCell>
                    <TableCell>{new Date(sale.sale_date).toLocaleString()}</TableCell>
                    {/* If backend GET /sales joins product: <TableCell>{sale.product_name || 'N/A'}</TableCell> */}
                    <TableCell>{sale.customer_name || `ID: ${sale.customer_id}` || "N/A"}</TableCell>
                    {/* ✅ *** Display User Name from backend JOIN *** */}
                    <TableCell>{sale.sold_by_user_name || `ID: ${sale.sold_by_user_id}`}</TableCell>
                    <TableCell className="text-right">${Number(sale.subtotal || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">${Number(sale.tax_amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">${Number(sale.total_amount || 0).toFixed(2)}</TableCell>
                     <TableCell>{sale.payment_method}</TableCell>
                     <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sale.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                            sale.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            sale.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                         {sale.payment_status}
                        </span>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                <TableCell colSpan="10" className="text-center py-10 text-gray-500">
                    {searchDate ? "No sales records match the selected date." : "No sales records found."}
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
      </div>

      {/* Add Sale Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record New Sale</DialogTitle>
            <DialogDescription>
              Select product, quantity, user, and payment details. Totals calculated automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSale} className="grid gap-4 py-4">
            {addError && ( // Show error specific to adding
                <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
                    {addError}
                </div>
            )}
            {/* Product Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product_id" className="text-right">Product *</Label>
              <select
                 id="product_id"
                 name="product_id"
                 value={newSale.product_id}
                 onChange={handleInputChange}
                 className="col-span-3 border rounded px-3 py-2"
                 required
              >
                <option value="" disabled>Select Product</option>
                {products.length > 0 ? products.map(product => (
                    <option key={product.product_id} value={product.product_id}>
                        {product.product_name} (Stock: {product.current_stock})
                    </option>
                )) : <option disabled>Loading products...</option>}
              </select>
            </div>
            {/* Display Unit Price (Readonly) */}
            {newSale.product_id && (
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right text-sm text-gray-600">Unit Price</Label>
                    <span className="col-span-3 text-sm text-gray-800">${Number(selectedProductPrice).toFixed(2)}</span>
                 </div>
             )}
             {/* Quantity Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity_sold" className="text-right">Quantity *</Label>
              <Input
                id="quantity_sold"
                name="quantity_sold"
                type="number"
                placeholder="0"
                min="1"
                step="1"
                value={newSale.quantity_sold}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
             {/* Sold By User Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sold_by_user_id" className="text-right">Sold By *</Label>
              <select
                 id="sold_by_user_id"
                 name="sold_by_user_id"
                 value={newSale.sold_by_user_id}
                 onChange={handleInputChange}
                 className="col-span-3 border rounded px-3 py-2"
                 required
              >
                <option value="" disabled>Select User</option>
                 {users.length > 0 ? users.map(user => (
                    <option key={user.user_id} value={user.user_id}>
                        {user.full_name}
                    </option>
                )) : <option disabled>Loading users...</option>}
              </select>
            </div>
             {/* Customer ID (Optional) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer_id" className="text-right">Customer</Label>
              <Input
                 id="customer_id"
                 name="customer_id"
                 type="number" // Or text if you use non-numeric IDs
                 placeholder="Customer ID (Optional)"
                 value={newSale.customer_id}
                 onChange={handleInputChange}
                 className="col-span-3"
               />
               {/* Or replace with a Customer dropdown if you implement fetchCustomers */}
            </div>
             {/* Payment Method */}
             <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="payment_method" className="text-right">Payment *</Label>
                 <select
                     id="payment_method"
                     name="payment_method"
                     value={newSale.payment_method}
                     onChange={handleInputChange}
                     className="col-span-3 border rounded px-3 py-2"
                     required
                 >
                     <option value="cash">Cash</option>
                     <option value="card">Card</option>
                     <option value="online">Online Transfer</option>
                     {/* Add other methods as needed */}
                 </select>
             </div>
              {/* Payment Status */}
              <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="payment_status" className="text-right">Status *</Label>
                 <select
                     id="payment_status"
                     name="payment_status"
                     value={newSale.payment_status}
                     onChange={handleInputChange}
                     className="col-span-3 border rounded px-3 py-2"
                     required
                 >
                     <option value="completed">Completed</option>
                     <option value="pending">Pending</option>
                     <option value="failed">Failed</option>
                 </select>
             </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? <FiLoader className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isAdding ? "Processing..." : "Record Sale"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;