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
// Added FiEdit2 for general product edit, FiTrash2 for potential delete later
import { FiLoader, FiAlertCircle, FiEdit, FiEdit2, FiSave, FiPlusCircle, FiXCircle, FiTrash2 } from "react-icons/fi";

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

  // State for Edit Product Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editError, setEditError] = useState(null);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [editingProductDetails, setEditingProductDetails] = useState(null); // To store full product for edit

  // State for Set/Delete Threshold Modal
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdError, setThresholdError] = useState(null);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);
  const [productForThreshold, setProductForThreshold] = useState(null); // Renamed from editingProduct
  const [newThreshold, setNewThreshold] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true); setError(null);
      try {
        await Promise.all([fetchProducts(), fetchCategories()]);
      } catch (err) { console.error("Error loading initial data:", err); }
      finally { setLoading(false); }
    };
    loadData();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/products");
      if (!response.ok) { /* ... error handling ... */ throw new Error('Failed to fetch products'); }
      const data = await response.json();
      setProducts(data); setError(null);
    } catch (err) { /* ... error handling ... */ console.error("Fetch Products Error:", err); setError(prev => `${prev || ''}\nFailed to fetch products.`); setProducts([]); }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/product-categories");
      if (!response.ok) { /* ... error handling ... */ console.warn('Failed to fetch categories'); setError(prev => `${prev || ''}\nCould not load categories.`); setCategories([]); return; }
      const data = await response.json();
      setCategories(data);
    } catch (err) { /* ... error handling ... */ console.error("Error fetching categories:", err); setError(prev => `${prev || ''}\nError fetching categories.`); setCategories([]); }
  };

  // --- Add Product ---
  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault(); setAddError(null); setIsAdding(true);
    if (!newProduct.product_name || !newProduct.category_id || !newProduct.unit_price || !newProduct.current_stock) {
      setAddError("Please fill in all required fields."); setIsAdding(false); return;
    }
    try {
      const response = await fetch("http://localhost:5000/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: newProduct.product_name, description: newProduct.description,
          category_id: parseInt(newProduct.category_id, 10), unit_price: parseFloat(newProduct.unit_price),
          current_stock: parseInt(newProduct.current_stock, 10)
        }),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || `Failed to add product: ${response.status}`);
      setProducts(currentProducts => [...currentProducts, responseData]); // Optimistic update or refetch
      setShowAddModal(false); setNewProduct(initialNewProductState);
    } catch (error) { console.error("Error adding product:", error); setAddError(error.message || "An unexpected error occurred.");
    } finally { setIsAdding(false); }
  };

  // --- Edit Product ---
  const openEditModal = (product) => {
    setEditingProductDetails({ // Set the full product object for editing
        ...product,
        // Ensure category_id is a string for the select input
        category_id: product.category_id ? String(product.category_id) : "",
        unit_price: product.unit_price ? String(product.unit_price) : "",
        current_stock: product.current_stock ? String(product.current_stock) : ""
    });
    setShowEditModal(true);
    setEditError(null);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingProductDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProductDetails) return;
    setEditError(null); setIsUpdatingProduct(true);

    const { product_id, product_name, description, category_id, unit_price, current_stock } = editingProductDetails;

    if (!product_name || !category_id || !unit_price || !current_stock) {
      setEditError("Name, Category, Price, and Stock are required.");
      setIsUpdatingProduct(false); return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/products/${product_id}`, { // Assuming PUT to /api/products/:id
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name, description,
          category_id: parseInt(category_id, 10),
          unit_price: parseFloat(unit_price),
          current_stock: parseInt(current_stock, 10)
        }),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || `Failed to update product: ${response.status}`);

      // Update product in local state
      setProducts(currentProducts =>
        currentProducts.map(p => (p.product_id === product_id ? responseData : p))
      );
      setShowEditModal(false); setEditingProductDetails(null);
    } catch (error) {
      console.error("Error updating product:", error);
      setEditError(error.message || "An unexpected error occurred during update.");
    } finally { setIsUpdatingProduct(false); }
  };


  // --- Threshold Modal Logic ---
  const openThresholdModal = (product) => {
    setProductForThreshold({ // Use new state variable
      product_id: product.product_id,
      product_name: product.product_name,
      currentThreshold: product.threshold_quantity
    });
    setNewThreshold(product.threshold_quantity !== null && product.threshold_quantity !== undefined ? String(product.threshold_quantity) : "");
    setThresholdError(null); setShowThresholdModal(true);
  };

  const handleThresholdChange = (e) => { setNewThreshold(e.target.value); };

  const handleUpdateThreshold = async (e) => {
    e.preventDefault(); if (!productForThreshold) return;
    const thresholdValueStr = newThreshold.trim();
    const thresholdValue = thresholdValueStr === "" ? 0 : parseInt(thresholdValueStr, 10);
    if (isNaN(thresholdValue) || thresholdValue < 0) {
      setThresholdError("Please enter a valid non-negative number."); return;
    }
    setIsUpdatingThreshold(true); setThresholdError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/inventory-alerts/threshold/${productForThreshold.product_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold_quantity: thresholdValue })
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || `Failed to update threshold: ${response.status}`);
      setProducts(currentProducts =>
        currentProducts.map(p =>
          p.product_id === productForThreshold.product_id ? { ...p, threshold_quantity: thresholdValue } : p
        )
      );
      setShowThresholdModal(false); setProductForThreshold(null); setNewThreshold("");
    } catch (err) { console.error("Error updating threshold:", err); setThresholdError(err.message || "An unexpected error occurred.");
    } finally { setIsUpdatingThreshold(false); }
  };

  const handleDeleteThreshold = async () => {
    if (!productForThreshold) return;
    setIsUpdatingThreshold(true); setThresholdError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/inventory-alerts/threshold/${productForThreshold.product_id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold_quantity: null })
      });
      if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || `Failed to clear threshold`); }
      setProducts(currentProducts =>
        currentProducts.map(p =>
          p.product_id === productForThreshold.product_id ? { ...p, threshold_quantity: null } : p
        )
      );
      setShowThresholdModal(false); setProductForThreshold(null); setNewThreshold("");
    } catch (err) { console.error("Error clearing threshold:", err); setThresholdError(err.message || "An unexpected error occurred.");
    } finally { setIsUpdatingThreshold(false); }
  };

  // Filter products
  const filteredProducts = products.filter((product) =>
    product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Render Logic ---
  if (loading) { /* ... loading spinner ... */ return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading products...</span></div>;}
  if (error && !products.length && !categories.length) { /* ... critical error ... */ return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;}

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-black">Product Management</h1> {/* Light text for dark theme */}
        <Button
            onClick={() => { setShowAddModal(true); setAddError(null); setNewProduct(initialNewProductState); }}
            className="bg-white text-black hover:bg-gray-200" // Contrasting Add button
        >
          <FiPlusCircle className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      {error && (products.length > 0 || categories.length > 0) && (
        <div className="p-3 bg-yellow-700 border border-yellow-600 text-yellow-100 rounded flex items-center text-sm"> {/* Darker warning */}
          <FiAlertCircle className="h-4 w-4 mr-2" /> Warning: {error}
        </div>
      )}

      <Input
        className="max-w-sm text-white bg-gray-700 placeholder:text-gray-400 border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
        placeholder="Search by product name or category..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="border border-gray-700 rounded-lg overflow-hidden shadow-md"> {/* Darker border */}
        <Table>
          <TableHeader className="bg-gray-800"> {/* Darker header */}
            <TableRow>
              <TableHead className="w-[80px] text-gray-300">ID</TableHead>
              <TableHead className="text-gray-300">Name</TableHead>
              <TableHead className="text-gray-300">Category</TableHead>
              <TableHead className="text-gray-300">Description</TableHead>
              <TableHead className="w-[100px] text-right text-gray-300">Stock</TableHead>
              <TableHead className="w-[100px] text-right text-gray-300">Threshold</TableHead>
              <TableHead className="w-[120px] text-right text-gray-300">Price</TableHead>
              <TableHead className="w-[160px] text-center text-gray-300">Actions</TableHead> {/* Increased width for two buttons */}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-700"> {/* Darker divider */}
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <TableRow key={product.product_id} className="hover:bg-gray-800/50"> {/* Darker hover */}
                  <TableCell className="font-medium text-black">{product.product_id}</TableCell>
                  <TableCell className="text-black">{product.product_name}</TableCell>
                  <TableCell className="text-black">{product.category_name || "N/A"}</TableCell>
                  <TableCell className="text-sm text-black max-w-xs truncate" title={product.description}>{product.description || "-"}</TableCell>
                  <TableCell className="text-right text-black">{product.current_stock}</TableCell>
                  <TableCell className="text-right text-black">
                    {product.threshold_quantity !== null && product.threshold_quantity !== undefined
                      ? product.threshold_quantity
                      : <span className="text-xs text-gray-500 italic">Not Set</span>}
                  </TableCell>
                  <TableCell className="text-right text-black">${Number(product.unit_price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center space-x-2"> {/* Added space-x-2 */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(product)} // Open Edit Modal
                      title="Edit Product Details"
                      className="border-blue-500 text-blue-400 hover:bg-blue-700 hover:text-white"
                    >
                      <FiEdit2 className="h-4 w-4" /> {/* General Edit Icon */}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openThresholdModal(product)}
                      title="Set Low Stock Threshold"
                      className="border-yellow-500 text-yellow-400 hover:bg-yellow-700 hover:text-white"
                    >
                      <FiEdit className="h-4 w-4" /> {/* Threshold Edit Icon */}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : ( /* ... no products message ... */ <TableRow><TableCell colSpan="8" className="text-center py-10 text-gray-500">{products.length === 0 ? "No products available." : "No products match."}</TableCell></TableRow> )}
          </TableBody>
        </Table>
      </div>

    {/* Add Product Modal (Dark Mode) */}
    <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg bg-black rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <DialogHeader className="px-6 py-5 bg-gray-900 border-b border-gray-700">
            <DialogTitle className="text-lg font-semibold leading-6 text-white">Add New Product</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-300">Fill in product details. * required.</DialogDescription>
        </DialogHeader>
        <form id="add-product-form" onSubmit={handleAddProduct} className="px-6 py-6 space-y-5 bg-black">
            {addError && (<div className="p-3 bg-red-900 border border-red-700 text-red-100 rounded-md text-sm font-medium">{addError}</div>)}
            <div>
                <Label htmlFor="product_name_add" className="block text-sm font-medium text-gray-200 mb-1">Name <span className="text-red-400">*</span></Label>
                <Input id="product_name_add" name="product_name" value={newProduct.product_name} onChange={handleAddInputChange} className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400" required />
            </div>
            <div>
                <Label htmlFor="description_add" className="block text-sm font-medium text-gray-200 mb-1">Description</Label>
                <Input id="description_add" name="description" placeholder="Optional product description" value={newProduct.description} onChange={handleAddInputChange} className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400" />
            </div>
            <div>
                <Label htmlFor="category_id_add" className="block text-sm font-medium text-gray-200 mb-1">Category <span className="text-red-400">*</span></Label>
                <select id="category_id_add" name="category_id" value={newProduct.category_id} onChange={handleAddInputChange} className="block w-full pl-3 pr-10 py-2 text-base border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md" required>
                    <option value="" disabled>Select Category...</option>
                    {categories.map(c => (<option key={c.category_id} value={c.category_id}>{c.category_name}</option>))}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="unit_price_add" className="block text-sm font-medium text-gray-200 mb-1">Price ($) <span className="text-red-400">*</span></Label>
                    <Input id="unit_price_add" name="unit_price" type="number" placeholder="0.00" step="0.01" min="0" value={newProduct.unit_price} onChange={handleAddInputChange} className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400" required />
                </div>
                <div>
                    <Label htmlFor="current_stock_add" className="block text-sm font-medium text-gray-200 mb-1">Stock <span className="text-red-400">*</span></Label>
                    <Input id="current_stock_add" name="current_stock" type="number" placeholder="0" min="0" step="1" value={newProduct.current_stock} onChange={handleAddInputChange} className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400" required />
                </div>
            </div>
        </form>
        <DialogFooter className="px-6 py-4 bg-gray-900 border-t border-gray-700 flex justify-end space-x-3">
            <DialogClose asChild><Button type="button" variant="outline" className="border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700">Cancel</Button></DialogClose>
            <Button type="submit" form="add-product-form" disabled={isAdding} className="text-black bg-white hover:bg-gray-200">
                {isAdding && <FiLoader className="mr-2 h-4 w-4 animate-spin" />} {isAdding ? "Adding..." : "Add Product"}
            </Button>
        </DialogFooter>
        </DialogContent>
    </Dialog>

    {/* --- Edit Product Modal (Dark Mode) --- */}
    <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-lg bg-black rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <DialogHeader className="px-6 py-5 bg-gray-900 border-b border-gray-700">
            <DialogTitle className="text-lg font-semibold leading-6 text-white">
                Edit Product: {editingProductDetails?.product_name}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-300">
                Modify the product details below. * required.
            </DialogDescription>
        </DialogHeader>
        {/* Ensure editingProductDetails is not null before rendering form */}
        {editingProductDetails && (
            <form id="edit-product-form" onSubmit={handleUpdateProduct} className="px-6 py-6 space-y-5 bg-black">
                {editError && (<div className="p-3 bg-red-900 border border-red-700 text-red-100 rounded-md text-sm font-medium">{editError}</div>)}
                {/* Hidden Product ID - not typically shown but needed for submission */}
                {/* <input type="hidden" name="product_id" value={editingProductDetails.product_id} /> */}
                <div>
                    <Label htmlFor="product_name_edit" className="block text-sm font-medium text-gray-200 mb-1">Name <span className="text-red-400">*</span></Label>
                    <Input id="product_name_edit" name="product_name" value={editingProductDetails.product_name} onChange={handleEditInputChange} className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400" required />
                </div>
                <div>
                    <Label htmlFor="description_edit" className="block text-sm font-medium text-gray-200 mb-1">Description</Label>
                    <Input id="description_edit" name="description" placeholder="Optional product description" value={editingProductDetails.description} onChange={handleEditInputChange} className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400" />
                </div>
                <div>
                    <Label htmlFor="category_id_edit" className="block text-sm font-medium text-gray-200 mb-1">Category <span className="text-red-400">*</span></Label>
                    <select id="category_id_edit" name="category_id" value={editingProductDetails.category_id} onChange={handleEditInputChange} className="block w-full pl-3 pr-10 py-2 text-base border-gray-700 bg-gray-800 text-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md" required>
                        <option value="" disabled>Select Category...</option>
                        {categories.map(c => (<option key={c.category_id} value={c.category_id}>{c.category_name}</option>))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="unit_price_edit" className="block text-sm font-medium text-gray-200 mb-1">Price ($) <span className="text-red-400">*</span></Label>
                        <Input id="unit_price_edit" name="unit_price" type="number" placeholder="0.00" step="0.01" min="0" value={editingProductDetails.unit_price} onChange={handleEditInputChange} className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400" required />
                    </div>
                    <div>
                        <Label htmlFor="current_stock_edit" className="block text-sm font-medium text-gray-200 mb-1">Stock <span className="text-red-400">*</span></Label>
                        <Input id="current_stock_edit" name="current_stock" type="number" placeholder="0" min="0" step="1" value={editingProductDetails.current_stock} onChange={handleEditInputChange} className="block w-full border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400" required />
                    </div>
                </div>
            </form>
        )}
        <DialogFooter className="px-6 py-4 bg-gray-900 border-t border-gray-700 flex justify-end space-x-3">
            <DialogClose asChild><Button type="button" variant="outline" className="border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700">Cancel</Button></DialogClose>
            <Button type="submit" form="edit-product-form" disabled={isUpdatingProduct} className="text-black bg-white hover:bg-gray-200">
                {isUpdatingProduct && <FiLoader className="mr-2 h-4 w-4 animate-spin" />} {isUpdatingProduct ? "Saving..." : "Save Changes"}
            </Button>
        </DialogFooter>
        </DialogContent>
    </Dialog>


    {/* Set Threshold Modal (Dark Mode) */}
    <Dialog open={showThresholdModal} onOpenChange={setShowThresholdModal}>
        <DialogContent className="sm:max-w-md bg-black rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <DialogHeader className="px-6 py-5 bg-gray-900 border-b border-gray-700">
            <DialogTitle className="text-lg font-semibold leading-6 text-white">Set Low Stock Threshold</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-300">
                Set stock level for "<strong className="text-white">{productForThreshold?.product_name}</strong>" (ID: {productForThreshold?.product_id}).
            </DialogDescription>
        </DialogHeader>
        <form id="set-threshold-form" onSubmit={handleUpdateThreshold} className="px-6 py-6 space-y-5 bg-black">
            {thresholdError && (<div className="p-3 bg-red-900 border border-red-700 text-red-100 rounded-md text-sm font-medium">{thresholdError}</div>)}
            <div className="grid grid-cols-4 items-center gap-4"> {/* Keep grid for label-input alignment if preferred */}
                <Label htmlFor="threshold_update" className="text-right text-gray-200 col-span-1">Threshold</Label> {/* Adjusted col-span */}
                <Input id="threshold_update" name="threshold_update" type="number" min="0" step="1" placeholder={`Current: ${productForThreshold?.currentThreshold ?? 'Not Set'}`} value={newThreshold} onChange={handleThresholdChange} className="col-span-3 border-gray-700 bg-gray-800 text-white rounded-md shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm placeholder:text-gray-400" />
            </div>
        </form>
        <DialogFooter className="px-6 py-4 bg-gray-900 border-t border-gray-700 flex justify-between items-center"> {/* justify-between */}
            <div> {/* Wrapper for delete button */}
                {productForThreshold?.currentThreshold !== null && productForThreshold?.currentThreshold !== undefined && (
                    <Button type="button" variant="destructive" onClick={handleDeleteThreshold} disabled={isUpdatingThreshold} className="bg-red-700 hover:bg-red-800 text-white">
                        {isUpdatingThreshold && newThreshold === '' ? (<FiLoader className="mr-2 h-4 w-4 animate-spin" />) : (<FiXCircle className="mr-2 h-4 w-4" />)}
                        {isUpdatingThreshold && newThreshold === '' ? "Clearing..." : "Clear"}
                    </Button>
                )}
            </div>
            <div className="space-x-3"> {/* Wrapper for cancel/save */}
                <DialogClose asChild><Button type="button" variant="outline" className="border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700">Cancel</Button></DialogClose>
                <Button type="submit" form="set-threshold-form" disabled={isUpdatingThreshold} className="text-black bg-white hover:bg-gray-200">
                    {isUpdatingThreshold && newThreshold !== '' ? (<FiLoader className="mr-2 h-4 w-4 animate-spin" />) : (<FiSave className="mr-2 h-4 w-4" />)}
                    {isUpdatingThreshold && newThreshold !== '' ? "Saving..." : "Save"}
                 </Button>
            </div>
        </DialogFooter>
        </DialogContent>
    </Dialog>

    </div>
  );
};

export default Products;