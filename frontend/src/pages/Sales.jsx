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
import { FiLoader, FiAlertCircle, FiFilter, FiPlus } from "react-icons/fi"; // Added FiPlus

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
  };
  const [newSale, setNewSale] = useState(initialNewSaleState);
  const [selectedProductPrice, setSelectedProductPrice] = useState(0); // To display unit price

  // --- useEffects and Data Fetching (remain the same) ---
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchSales(), fetchProducts(), fetchUsers()]);
      } catch (err) {
        console.error("Error loading initial sales data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    handleFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, searchDate]);


  const fetchSales = async () => {
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

   const fetchProducts = async () => {
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

   const fetchUsers = async () => {
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

  // --- Filtering and Form Handling (remain the same) ---
  const handleFilter = () => {
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

   const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSale(prev => ({ ...prev, [name]: value }));
    if (name === 'product_id') {
        const selectedProd = products.find(p => p.product_id.toString() === value);
        const price = selectedProd ? selectedProd.unit_price : 0;
        setSelectedProductPrice(price);
        setNewSale(prev => ({ ...prev, unit_price: price ? price : "" }));
    }
  };

  const handleAddSale = async (e) => {
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
      await fetchSales(); // Refetch sales after successful addition
      setShowModal(false);
      setNewSale(initialNewSaleState);
      setSelectedProductPrice(0);
    } catch (error) {
      console.error("Error adding sale:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally {
      setIsAdding(false);
    }
  };

   const openAddModal = () => {
       setNewSale(initialNewSaleState);
       setAddError(null);
       setSelectedProductPrice(0);
       setShowModal(true);
   }

  // --- Loading / Error States (remain the same) ---
  if (loading) {
      return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading sales records...</span></div>;
  }
  if (error && !sales.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }

  // --- Main Render ---
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Sales Records</h1>
        <Button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white" // Styled Add button
        >
            <FiPlus className="mr-2 h-4 w-4" /> Add New Sale
        </Button>
      </div>

      {/* Filter Section - Dark Date Input */}
      <div className="flex flex-wrap items-end gap-4 bg-gray-800 p-4 rounded border border-gray-700 shadow"> {/* Dark background for filter section */}
        <div>
             <Label htmlFor="searchDate" className="text-sm font-medium text-gray-200 mb-1 block">Filter by Date</Label> {/* Light label */}
             <Input
                id="searchDate"
                // Dark theme styles for date input
                className="block w-full max-w-xs bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                // Style date picker indicator if possible (browser dependent)
                style={{ colorScheme: 'dark' }} // Hint for browsers to use dark controls
            />
        </div>
        {searchDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchDate("")}
              className="text-indigo-400 hover:bg-gray-700 hover:text-indigo-300" // Adjusted clear button for dark theme
            >
              Clear Filter
            </Button>
        )}
      </div>

      {/* General Errors (keep light for visibility contrast) */}
       {error && sales.length > 0 && (
           <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded flex items-center text-sm">
               <FiAlertCircle className="h-4 w-4 mr-2" /> Warning: {error}
           </div>
       )}

      {/* Sales Table (keep light theme) */}
       <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
            <TableHeader className="bg-gray-50">
            <TableRow>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale ID</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold By</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-gray-200">
            {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                <TableRow key={sale.sales_id} className="hover:bg-gray-50">
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{sale.sales_id}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(sale.sale_date).toLocaleString()}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{sale.customer_name || `ID: ${sale.customer_id}` || "N/A"}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{sale.sold_by_user_name || `ID: ${sale.sold_by_user_id}`}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">${Number(sale.subtotal || 0).toFixed(2)}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">${Number(sale.tax_amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900">${Number(sale.total_amount || 0).toFixed(2)}</TableCell>
                     <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{sale.payment_method}</TableCell>
                     <TableCell className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ // Adjusted padding
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
                <TableCell colSpan="9" className="text-center py-10 text-gray-500"> {/* Updated colspan */}
                    {searchDate ? "No sales records match the selected date." : "No sales records found."}
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
      </div>

      {/* Add Sale Modal - Dark Theme */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg bg-gray-800 text-white rounded-lg shadow-xl overflow-hidden">
          {/* Header - Dark */}
          <DialogHeader className="px-6 py-5 bg-gray-800 border-b border-gray-600">
            <DialogTitle className="text-lg font-medium leading-6 text-white">
                Record New Sale
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-300">
              Select product, quantity, user, and payment details. Totals calculated automatically upon saving.
            </DialogDescription>
          </DialogHeader>

          {/* Form - Dark */}
          <form onSubmit={handleAddSale} className="px-6 py-6 space-y-4">
            {/* Error Message - Dark */}
            {addError && (
                <div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md text-sm font-medium">
                    {addError}
                </div>
            )}

            {/* Product Selection */}
            <div>
              <Label htmlFor="product_id" className="block text-sm font-medium text-gray-200 mb-1">
                Product <span className="text-red-400">*</span>
              </Label>
              <select
                 id="product_id"
                 name="product_id"
                 value={newSale.product_id}
                 onChange={handleInputChange}
                 className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                 required
              >
                <option value="" disabled className="text-gray-500">Select Product...</option>
                {products.length > 0 ? products.map(product => (
                    <option key={product.product_id} value={product.product_id} className="text-white bg-gray-700">
                        {product.product_name} (Stock: {product.current_stock})
                    </option>
                )) : <option disabled className="text-gray-500">Loading products...</option>}
              </select>
            </div>

            {/* Display Unit Price (Readonly) */}
            {newSale.product_id && (
                 <div className="mt-2"> {/* Adjusted margin */}
                    <span className="text-sm font-medium text-gray-400">Unit Price: </span>
                    <span className="text-sm text-gray-100">${Number(selectedProductPrice).toFixed(2)}</span>
                 </div>
             )}

             {/* Quantity Input */}
            <div>
              <Label htmlFor="quantity_sold" className="block text-sm font-medium text-gray-200 mb-1">
                Quantity <span className="text-red-400">*</span>
              </Label>
              <Input
                id="quantity_sold"
                name="quantity_sold"
                type="number"
                placeholder="0"
                min="1"
                step="1"
                value={newSale.quantity_sold}
                onChange={handleInputChange}
                className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
                required
              />
            </div>

             {/* Sold By User Selection */}
            <div>
              <Label htmlFor="sold_by_user_id" className="block text-sm font-medium text-gray-200 mb-1">
                Sold By <span className="text-red-400">*</span>
              </Label>
              <select
                 id="sold_by_user_id"
                 name="sold_by_user_id"
                 value={newSale.sold_by_user_id}
                 onChange={handleInputChange}
                 className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                 required
              >
                <option value="" disabled className="text-gray-500">Select User...</option>
                 {users.length > 0 ? users.map(user => (
                    <option key={user.user_id} value={user.user_id} className="text-white bg-gray-700">
                        {user.full_name} {/* Assuming 'full_name' exists */}
                    </option>
                )) : <option disabled className="text-gray-500">Loading users...</option>}
              </select>
            </div>

             {/* Customer ID (Optional) */}
            <div>
              <Label htmlFor="customer_id" className="block text-sm font-medium text-gray-200 mb-1">
                Customer (Optional)
              </Label>
              <Input
                 id="customer_id"
                 name="customer_id"
                 type="number"
                 placeholder="Enter Customer ID if applicable"
                 value={newSale.customer_id}
                 onChange={handleInputChange}
                 className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
               />
            </div>

             {/* Payment Method */}
            <div>
                 <Label htmlFor="payment_method" className="block text-sm font-medium text-gray-200 mb-1">
                    Payment Method <span className="text-red-400">*</span>
                 </Label>
                 <select
                     id="payment_method"
                     name="payment_method"
                     value={newSale.payment_method}
                     onChange={handleInputChange}
                     className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                     required
                 >
                     <option value="cash" className="text-white bg-gray-700">Cash</option>
                     <option value="card" className="text-white bg-gray-700">Card</option>
                     <option value="online" className="text-white bg-gray-700">Online Transfer</option>
                 </select>
             </div>

              {/* Payment Status */}
            <div>
                 <Label htmlFor="payment_status" className="block text-sm font-medium text-gray-200 mb-1">
                    Payment Status <span className="text-red-400">*</span>
                 </Label>
                 <select
                     id="payment_status"
                     name="payment_status"
                     value={newSale.payment_status}
                     onChange={handleInputChange}
                     className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                     required
                 >
                     <option value="completed" className="text-white bg-gray-700">Completed</option>
                     <option value="pending" className="text-white bg-gray-700">Pending</option>
                     <option value="failed" className="text-white bg-gray-700">Failed</option>
                 </select>
             </div>

            {/* Footer - Dark */}
            <DialogFooter className="px-6 py-4 bg-gray-700 border-t border-gray-600 flex justify-end space-x-3">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-500 bg-transparent text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isAdding}
                 className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50"
              >
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