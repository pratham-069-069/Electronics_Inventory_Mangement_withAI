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
// import { Textarea } from "../components/ui/Textarea"; // <-- REMOVED/COMMENTED OUT
import { Label } from "../components/ui/Label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "../components/ui/Dialog";
import { FiLoader, FiAlertCircle } from "react-icons/fi";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchProducts(), fetchCategories()]);
      } catch (err) {
         console.error("Error loading initial data:", err);
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
    } catch (err) {
       console.error(err);
       setError(err.message);
       // Optionally re-throw if Promise.all needs to catch it
       // throw err;
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

      setProducts(prev => [...prev, responseData]); // Use functional update
      setShowModal(false);
      setNewProduct(initialNewProductState);

    } catch (error) {
      console.error("Error adding product:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally {
        setIsAdding(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
      return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading products...</span></div>;
  }

  if (error && !products.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Product Management</h1>
        <Button onClick={() => { setShowModal(true); setAddError(null); setNewProduct(initialNewProductState); }}>Add New Product</Button>
      </div>

      {error && products.length > 0 && (
          <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded flex items-center text-sm">
              <FiAlertCircle className="h-4 w-4 mr-2" /> Warning: {error}
          </div>
      )}

      <Input
        className="max-w-sm"
        placeholder="Search by product name or category..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px] text-right">Stock</TableHead>
              <TableHead className="w-[120px] text-right">Price</TableHead>
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
                  <TableCell className="text-right">${Number(product.unit_price || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan="6" className="text-center py-10 text-gray-500">
                  {products.length === 0 ? "No products available." : "No products match your search."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Product Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Fill in the details for the new product.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="grid gap-4 py-4">
             {addError && (
                <div className="col-span-full p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm"> {/* Adjusted col-span */}
                    {addError}
                </div>
             )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="product_name" className="text-right">Name</Label>
              <Input id="product_name" name="product_name" value={newProduct.product_name} onChange={handleInputChange} className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              {/* ✅ *** Replaced Textarea with Input *** */}
              <Input id="description" name="description" placeholder="Optional product description" value={newProduct.description} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category_id" className="text-right">Category</Label>
              <select
                 id="category_id"
                 name="category_id"
                 value={newProduct.category_id}
                 onChange={handleInputChange}
                 className="col-span-3 border rounded px-3 py-2 bg-white" // Added bg-white
                 required
              >
                <option value="" disabled>Select Category</option>
                {categories.length > 0 ? (
                    categories.map((category) => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </option>
                    ))
                ) : (
                    <option value="" disabled>Loading categories...</option>
                )}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit_price" className="text-right">Price ($)</Label>
              <Input id="unit_price" name="unit_price" type="number" placeholder="0.00" step="0.01" min="0" value={newProduct.unit_price} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="current_stock" className="text-right">Stock</Label>
              <Input id="current_stock" name="current_stock" type="number" placeholder="0" min="0" step="1" value={newProduct.current_stock} onChange={handleInputChange} className="col-span-3" required />
            </div>
             <DialogFooter>
                <DialogClose asChild>
                   <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isAdding}>
                   {isAdding ? <FiLoader className="mr-2 h-4 w-4 animate-spin" /> : null}
                   {isAdding ? "Adding..." : "Add Product"}
                 </Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;