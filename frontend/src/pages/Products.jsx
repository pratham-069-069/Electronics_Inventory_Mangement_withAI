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
import { FiLoader, FiAlertCircle, FiEdit, FiSave, FiPlusCircle } from "react-icons/fi"; // Added FiPlusCircle

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

  // State for Set Threshold Modal
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdError, setThresholdError] = useState(null);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // To store { id, name, currentThreshold }
  const [newThreshold, setNewThreshold] = useState(""); // Input value for threshold

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchProducts(), fetchCategories()]);
      } catch (err) {
         console.error("Error loading initial data:", err);
         // Errors are set within individual fetch functions
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
      setError(null); // Clear error on success
    } catch (err) {
       console.error("Fetch Products Error:", err);
       setError(err.message); // Set error
       setProducts([]); // Reset products on error
       // Do not re-throw if called by Promise.all, let it handle overall loading
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/product-categories");
      if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Failed to fetch categories (backend endpoint might be missing): ${response.status} ${errorText}`);
          setError(prev => prev ? `${prev}\nCould not load categories.` : 'Could not load categories.');
          setCategories([]);
          return;
       }
      const data = await response.json();
      setCategories(data);
    } catch (err) {
       console.error("Error fetching categories:", err);
       setError(prev => prev ? `${prev}\nError fetching categories.` : 'Error fetching categories.');
       setCategories([]);
    }
  };


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

      await fetchProducts(); // Refetch for consistency

      setShowAddModal(false);
      setNewProduct(initialNewProductState);

    } catch (error) {
      console.error("Error adding product:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally {
        setIsAdding(false);
    }
  };


  // --- Open Threshold Modal ---
  const openThresholdModal = (product) => {
      setEditingProduct({
          product_id: product.product_id,
          product_name: product.product_name,
          currentThreshold: product.threshold_quantity
      });
      setNewThreshold(product.threshold_quantity !== null && product.threshold_quantity !== undefined ? String(product.threshold_quantity) : "");
      setThresholdError(null);
      setShowThresholdModal(true);
  };

  // --- Handle Threshold Input Change ---
  const handleThresholdChange = (e) => {
      setNewThreshold(e.target.value);
  };

  // --- Handle Saving Threshold ---
  const handleUpdateThreshold = async (e) => {
      e.preventDefault();
      if (!editingProduct) return;

      const thresholdValueStr = newThreshold.trim();
      const thresholdValue = thresholdValueStr === "" ? 0 : parseInt(thresholdValueStr, 10);

      if (isNaN(thresholdValue) || thresholdValue < 0) {
          setThresholdError("Please enter a valid non-negative number (or leave blank for 0).");
          return;
      }

      setIsUpdatingThreshold(true);
      setThresholdError(null);

      try {
          const response = await fetch(`http://localhost:5000/api/inventory-alerts/threshold/${editingProduct.product_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ threshold_quantity: thresholdValue })
          });

          const responseData = await response.json();
          if (!response.ok) {
              throw new Error(responseData.error || `Failed to update threshold: ${response.status}`);
          }

          // Update local state
          setProducts(currentProducts =>
              currentProducts.map(p =>
                  p.product_id === editingProduct.product_id
                      ? { ...p, threshold_quantity: thresholdValue }
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


  // Filter products based on search term (case-insensitive)
  const filteredProducts = products.filter((product) =>
    product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Main loading state for the page
  if (loading) {
      return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading products...</span></div>;
  }

  // Main error state for the page (only show if initial load failed)
  if (error && !products.length) {
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

      {/* Display general errors that occurred after initial load */}
      {error && products.length > 0 && (
          <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded flex items-center text-sm">
              <FiAlertCircle className="h-4 w-4 mr-2" /> Warning: {error}
          </div>
      )}

      {/* Search Input */}
      <Input
        className="max-w-sm"
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
                       <Button
                           variant="outline"
                           size="sm"
                           onClick={() => openThresholdModal(product)}
                           title="Set Low Stock Threshold"
                       >
                           <FiEdit className="h-4 w-4" />
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

      {/* Add Product Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Fill in the details for the new product.</DialogDescription>
            </DialogHeader>
            {/* Form with ID */}
            <form id="add-product-form" onSubmit={handleAddProduct} className="grid gap-4 pt-4">
                {addError && ( <div className="col-span-full p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">{addError}</div> )}
                <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="product_name_add" className="text-right">Name *</Label> <Input id="product_name_add" name="product_name" value={newProduct.product_name} onChange={handleInputChange} className="col-span-3" required /> </div>
                <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="description_add" className="text-right">Description</Label> <Input id="description_add" name="description" placeholder="Optional product description" value={newProduct.description} onChange={handleInputChange} className="col-span-3" /> </div>
                <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="category_id_add" className="text-right">Category *</Label> <select id="category_id_add" name="category_id" value={newProduct.category_id} onChange={handleInputChange} className="col-span-3 border rounded px-3 py-2 bg-white" required> <option value="" disabled>Select Category</option> {categories.length > 0 ? categories.map((category) => (<option key={category.category_id} value={category.category_id}>{category.category_name}</option>)) : <option value="" disabled>Loading...</option>} </select> </div>
                <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="unit_price_add" className="text-right">Price ($) *</Label> <Input id="unit_price_add" name="unit_price" type="number" placeholder="0.00" step="0.01" min="0" value={newProduct.unit_price} onChange={handleInputChange} className="col-span-3" required /> </div>
                <div className="grid grid-cols-4 items-center gap-4"> <Label htmlFor="current_stock_add" className="text-right">Stock *</Label> <Input id="current_stock_add" name="current_stock" type="number" placeholder="0" min="0" step="1" value={newProduct.current_stock} onChange={handleInputChange} className="col-span-3" required /> </div>
            </form>
            {/* Footer outside form */}
            <DialogFooter className="pt-4">
                 {/* ✅ Removed asChild */}
                <DialogClose>
                   <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" form="add-product-form" disabled={isAdding}>
                   {isAdding && <FiLoader className="mr-2 h-4 w-4 animate-spin" />}
                   {isAdding ? "Adding..." : "Add Product"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Threshold Modal */}
      <Dialog open={showThresholdModal} onOpenChange={setShowThresholdModal}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader> <DialogTitle>Set Low Stock Threshold</DialogTitle> <DialogDescription>Set the stock level for "<strong>{editingProduct?.product_name}</strong>" (ID: {editingProduct?.product_id}) below which an alert should be generated.</DialogDescription> </DialogHeader>
              {/* Form with ID */}
              <form id="set-threshold-form" onSubmit={handleUpdateThreshold} className="grid gap-4 py-4">
                 {thresholdError && ( <div className="col-span-full p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">{thresholdError}</div> )}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="threshold_update" className="text-right">Threshold</Label>
                    <Input id="threshold_update" name="threshold_update" type="number" min="0" step="1" placeholder={`Current: ${editingProduct?.currentThreshold ?? 'Not Set'}`} value={newThreshold} onChange={handleThresholdChange} className="col-span-3" required />
                </div>
              </form>
              {/* Footer outside form */}
              <DialogFooter className="pt-4">
                    {/* ✅ Removed asChild */}
                    <DialogClose>
                       <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    {/* Linked button to form */}
                    <Button type="submit" form="set-threshold-form" disabled={isUpdatingThreshold}>
                        {isUpdatingThreshold ? ( <FiLoader className="mr-2 h-4 w-4 animate-spin" /> ) : ( <FiSave className="mr-2 h-4 w-4" /> )}
                        {isUpdatingThreshold ? "Saving..." : "Save Threshold"}
                     </Button>
                 </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
};

export default Products;