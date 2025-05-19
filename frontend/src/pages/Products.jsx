import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/Table"; // Adjust paths if needed
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label"; // Import Label
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription
} from "../components/ui/Dialog"; // Adjust paths if needed
import { FiLoader, FiAlertCircle, FiEdit, FiSave, FiPlusCircle, FiXCircle } from "react-icons/fi"; // Added FiXCircle for delete

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const initialNewProductState = {
    product_name: "",
    description: "",
    category_id: "",
    unit_price: "",
    current_stock: "",
  };
  const [newProduct, setNewProduct] = useState(initialNewProductState);

  // State for Set/Delete Threshold Modal
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdError, setThresholdError] = useState(null);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false); // Used for save and delete actions
  const [editingProduct, setEditingProduct] = useState(null); // To store { id, name, currentThreshold }
  const [newThreshold, setNewThreshold] = useState(""); // Input value for threshold

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch products and categories in parallel
        await Promise.all([fetchProducts(), fetchCategories()]);
      } catch (err) {
        console.error("Error loading initial data:", err);
        // Individual fetch functions handle setting their specific errors or state
        // setError might be set here for a general failure if needed
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/products");
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch products: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      setProducts(data);
      setError(null); // Clear general error if products load successfully
    } catch (err) {
      console.error("Fetch Products Error:", err);
      setError(prev => prev ? `${prev}\nFailed to fetch products.` : 'Failed to fetch products.'); // Append or set error
      setProducts([]); // Reset products on error
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/product-categories");
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Failed to fetch categories: ${response.status} ${errorText}`);
        // Don't overwrite product fetch error, just append if needed
        setError(prev => prev ? `${prev}\nCould not load categories.` : 'Could not load categories.');
        setCategories([]);
        return; // Stop if categories fail, but products might have loaded
      }
      const data = await response.json();
      setCategories(data);
      // Optionally clear category part of the error if successful, complex logic needed
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(prev => prev ? `${prev}\nError fetching categories.` : 'Error fetching categories.');
      setCategories([]);
    }
  };

  // --- Add Product ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);

    if (!newProduct.product_name || !newProduct.category_id || !newProduct.unit_price || !newProduct.current_stock) {
      setAddError("Please fill in all required fields.");
      setIsAdding(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: newProduct.product_name,
          description: newProduct.description,
          category_id: parseInt(newProduct.category_id, 10),
          unit_price: parseFloat(newProduct.unit_price),
          current_stock: parseInt(newProduct.current_stock, 10)
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to add product: ${response.status}`);
      }

      // Add the new product to the state immediately for responsiveness
      // The backend should return the newly created product including its ID
      setProducts(currentProducts => [...currentProducts, responseData]); // Assuming responseData is the new product object

      // Or refetch the whole list (simpler, potentially slower)
      // await fetchProducts();

      setShowAddModal(false);
      setNewProduct(initialNewProductState);

    } catch (error) {
      console.error("Error adding product:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally {
      setIsAdding(false);
    }
  };


  // --- Threshold Modal Logic ---
  const openThresholdModal = (product) => {
    setEditingProduct({
      product_id: product.product_id,
      product_name: product.product_name,
      currentThreshold: product.threshold_quantity // Keep original value separate
    });
    // Initialize input field with current value or empty string
    setNewThreshold(product.threshold_quantity !== null && product.threshold_quantity !== undefined ? String(product.threshold_quantity) : "");
    setThresholdError(null);
    setShowThresholdModal(true);
  };

  const handleThresholdChange = (e) => {
    setNewThreshold(e.target.value);
  };

  // Handle *SAVING* the threshold
  const handleUpdateThreshold = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    const thresholdValueStr = newThreshold.trim();
    // Treat empty string as 0, otherwise parse
    const thresholdValue = thresholdValueStr === "" ? 0 : parseInt(thresholdValueStr, 10);

    // Validate: must be a non-negative integer
    if (isNaN(thresholdValue) || thresholdValue < 0) {
      setThresholdError("Please enter a valid non-negative number (e.g., 0, 5, 10).");
      return;
    }

    setIsUpdatingThreshold(true);
    setThresholdError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/inventory-alerts/threshold/${editingProduct.product_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold_quantity: thresholdValue }) // Send the parsed integer
      });

      const responseData = await response.json(); // Expect confirmation or error
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to update threshold: ${response.status}`);
      }

      // Update local state optimistically or based on response
      setProducts(currentProducts =>
        currentProducts.map(p =>
          p.product_id === editingProduct.product_id
            ? { ...p, threshold_quantity: thresholdValue } // Update with the new value
            : p
        )
      );

      setShowThresholdModal(false);
      setEditingProduct(null);
      setNewThreshold("");

    } catch (err) {
      console.error("Error updating threshold:", err);
      setThresholdError(err.message || "An unexpected error occurred.");
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  // Handle *DELETING* (clearing) the threshold
  const handleDeleteThreshold = async () => {
    if (!editingProduct) return;

    // Confirmation could be added here
    // if (!window.confirm(`Are you sure you want to clear the threshold for ${editingProduct.product_name}?`)) {
    //   return;
    // }

    setIsUpdatingThreshold(true); // Reuse loading state
    setThresholdError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/inventory-alerts/threshold/${editingProduct.product_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold_quantity: null }) // Send null to clear it
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to clear threshold: ${response.status}`);
      }

      // Update local state
      setProducts(currentProducts =>
        currentProducts.map(p =>
          p.product_id === editingProduct.product_id
            ? { ...p, threshold_quantity: null } // Set to null locally
            : p
        )
      );

      setShowThresholdModal(false);
      setEditingProduct(null);
      setNewThreshold("");

    } catch (err) {
      console.error("Error clearing threshold:", err);
      setThresholdError(err.message || "An unexpected error occurred while clearing.");
    } finally {
      setIsUpdatingThreshold(false);
    }
  };


  // Filter products based on search term (case-insensitive)
  const filteredProducts = products.filter((product) =>
    product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Main loading state for the page
  if (loading) {
    return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading products...</span></div>;
  }

  // Main error state for the page (only show if initial load failed badly)
  if (error && !products.length && !categories.length) { // Check if both failed
    return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Product Management</h1>
        <Button onClick={() => { setShowAddModal(true); setAddError(null); setNewProduct(initialNewProductState); }}>
          <FiPlusCircle className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Display general errors that occurred but maybe some data loaded */}
      {error && (products.length > 0 || categories.length > 0) && (
        <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded flex items-center text-sm">
          <FiAlertCircle className="h-4 w-4 mr-2" /> Warning: {error}
        </div>
      )}

      {/* Search Input - Added text-white, bg-gray-700 and placeholder style */}
      <Input
        className="max-w-sm text-white bg-gray-700 placeholder:text-gray-400"
        placeholder="Search by product name or category..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Products Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px] text-right">Stock</TableHead>
              <TableHead className="w-[100px] text-right">Threshold</TableHead>
              <TableHead className="w-[120px] text-right">Price</TableHead>
              <TableHead className="w-[120px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <TableRow key={product.product_id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{product.product_id}</TableCell>
                  <TableCell>{product.product_name}</TableCell>
                  <TableCell>{product.category_name || "N/A"}</TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={product.description}>{product.description || "-"}</TableCell>
                  <TableCell className="text-right">{product.current_stock}</TableCell>
                  <TableCell className="text-right">
                    {product.threshold_quantity !== null && product.threshold_quantity !== undefined
                      ? product.threshold_quantity
                      : <span className="text-xs text-gray-500 italic">Not Set</span>}
                  </TableCell>
                  <TableCell className="text-right">${Number(product.unit_price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    {/* Modified Button for white icon */}
                    <Button
                      variant="default" // Changed from outline to default for background
                      size="sm"
                      onClick={() => openThresholdModal(product)}
                      title="Set Low Stock Threshold"
                      className="bg-blue-600 hover:bg-blue-700 text-white" // Added background and text color
                    >
                      <FiEdit className="h-4 w-4" /> {/* Icon inherits text color */}
                    </Button>
                    {/* Add Delete Product Button Here if Needed */}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan="8" className="text-center py-10 text-gray-500">
                  {products.length === 0 ? "No products available." : "No products match your search."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

 {/* Add Product Modal - Dark Mode with White/Grey Text */}
<Dialog open={showAddModal} onOpenChange={setShowAddModal}>
  {/* Dark background with lighter border for contrast */}
  <DialogContent className="sm:max-w-lg bg-black rounded-lg shadow-lg border border-gray-700 overflow-hidden">

    {/* Header with slightly lighter background for separation */}
    <DialogHeader className="px-6 py-5 bg-gray-900 border-b border-gray-700">
      <DialogTitle className="text-lg font-semibold leading-6 text-white">
        Add New Product
      </DialogTitle>
      <DialogDescription className="mt-1 text-sm text-gray-300">
        Fill in the details for the new product. Required fields are marked with *.
      </DialogDescription>
    </DialogHeader>

    {/* Form with proper spacing and dark inputs */}
    <form id="add-product-form" onSubmit={handleAddProduct} className="px-6 py-6 space-y-5 bg-black">
      {/* Error message styling for dark theme */}
      {addError && (
        <div className="p-3 bg-red-900 border border-red-700 text-red-100 rounded-md text-sm font-medium">
          {addError}
        </div>
      )}

      {/* Field: Product Name - dark input with light text */}
      <div>
        <Label htmlFor="product_name_add" className="block text-sm font-medium text-gray-200 mb-1">
          Name <span className="text-red-400">*</span>
        </Label>
        <Input
          id="product_name_add"
          name="product_name"
          value={newProduct.product_name}
          onChange={handleInputChange}
          className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400"
          required
        />
      </div>

      {/* Field: Description - dark input with light text */}
      <div>
        <Label htmlFor="description_add" className="block text-sm font-medium text-gray-200 mb-1">
          Description
        </Label>
        <Input
          id="description_add"
          name="description"
          placeholder="Optional product description"
          value={newProduct.description}
          onChange={handleInputChange}
          className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400"
        />
      </div>

      {/* Field: Category - dark select with light text */}
      <div>
        <Label htmlFor="category_id_add" className="block text-sm font-medium text-gray-200 mb-1">
          Category <span className="text-red-400">*</span>
        </Label>
        <select
          id="category_id_add"
          name="category_id"
          value={newProduct.category_id}
          onChange={handleInputChange}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
          required
        >
          <option value="" disabled>Select Category...</option>
          {categories.length > 0 ? categories.map((category) => (
            <option key={category.category_id} value={category.category_id}>
              {category.category_name}
            </option>
          )) : <option value="" disabled>Loading categories...</option>}
        </select>
      </div>

      {/* Fields: Price and Stock - dark inputs with light text */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="unit_price_add" className="block text-sm font-medium text-gray-200 mb-1">
            Price ($) <span className="text-red-400">*</span>
          </Label>
          <Input
            id="unit_price_add"
            name="unit_price"
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={newProduct.unit_price}
            onChange={handleInputChange}
            className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400"
            required
          />
        </div>
        <div>
          <Label htmlFor="current_stock_add" className="block text-sm font-medium text-gray-200 mb-1">
            Stock <span className="text-red-400">*</span>
          </Label>
          <Input
            id="current_stock_add"
            name="current_stock"
            type="number"
            placeholder="0"
            min="0"
            step="1"
            value={newProduct.current_stock}
            onChange={handleInputChange}
            className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400"
            required
          />
        </div>
      </div>
    </form>

    {/* Footer with properly colored buttons */}
    <DialogFooter className="px-6 py-4 bg-gray-900 border-t border-gray-700 flex justify-end space-x-3">
      <DialogClose asChild>
        <Button
          type="button"
          variant="outline"
          className="border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-gray-500"
        >
          Cancel
        </Button>
      </DialogClose>
      <Button
        type="submit"
        form="add-product-form"
        disabled={isAdding}
        className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-gray-400 disabled:opacity-50"
      >
        {isAdding && <FiLoader className="mr-2 h-4 w-4 animate-spin" />}
        {isAdding ? "Adding..." : "Add Product"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* Set Threshold Modal - Dark Mode */}
<Dialog open={showThresholdModal} onOpenChange={setShowThresholdModal}>
  <DialogContent className="sm:max-w-md bg-black rounded-lg shadow-lg border border-gray-700 overflow-hidden">
    <DialogHeader className="px-6 py-5 bg-gray-900 border-b border-gray-700">
      <DialogTitle className="text-lg font-semibold leading-6 text-white">
        Set Low Stock Threshold
      </DialogTitle>
      <DialogDescription className="mt-1 text-sm text-gray-300">
        Set the stock level for "<strong className="text-white">{editingProduct?.product_name}</strong>" (ID: {editingProduct?.product_id}) below which an alert should be generated.
      </DialogDescription>
    </DialogHeader>
    
    {/* Form for setting threshold */}
    <form id="set-threshold-form" onSubmit={handleUpdateThreshold} className="px-6 py-6 space-y-5 bg-black">
      {thresholdError && (
        <div className="p-3 bg-red-900 border border-red-700 text-red-100 rounded-md text-sm font-medium">
          {thresholdError}
        </div>
      )}
      
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="threshold_update" className="text-right text-gray-200">
          Threshold
        </Label>
        <Input
          id="threshold_update"
          name="threshold_update"
          type="number"
          min="0"
          step="1"
          placeholder={`Current: ${editingProduct?.currentThreshold ?? 'Not Set'}`}
          value={newThreshold}
          onChange={handleThresholdChange}
          className="col-span-3 border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400"
        />
      </div>
    </form>
    
    <DialogFooter className="px-6 py-4 bg-gray-900 border-t border-gray-700 flex justify-end space-x-3">
      {/* Cancel Button */}
      <DialogClose asChild>
        <Button 
          type="button" 
          variant="outline"
          className="border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-gray-500"
        >
          Cancel
        </Button>
      </DialogClose>
      
      {/* Save Button */}
      <Button 
        type="submit" 
        form="set-threshold-form" 
        disabled={isUpdatingThreshold}
        className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-gray-400 disabled:opacity-50"
      >
        {isUpdatingThreshold ? (
          <FiLoader className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FiSave className="mr-2 h-4 w-4" />
        )}
        {isUpdatingThreshold ? "Saving..." : "Save Threshold"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

    </div>
  );
};

export default Products;