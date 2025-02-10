import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "../components/ui/Dialog";


<DialogContent>
  <DialogHeader>
    <DialogTitle>Add New Product</DialogTitle>
    <DialogDescription>Enter product details below:</DialogDescription>
  </DialogHeader>
</DialogContent>



const Products = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    product_name: "",
    product_category: "",
    product_price: "",
    stock_quantity: ""
  });

  // Fetch products from backend API
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://localhost:5000/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter((product) =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:5000/products/${id}`, { method: "DELETE" });
      setProducts(products.filter((product) => product.product_id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleEdit = (id) => {
    alert(`Edit product with ID: ${id}`);
  };

  const handleAddProduct = async () => {
    try {
      const response = await fetch("http://localhost:5000/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct)
      });

      if (!response.ok) throw new Error("Failed to add product");
      
      const addedProduct = await response.json();
      setProducts([...products, addedProduct]); // Update UI
      setShowModal(false);
      setNewProduct({ product_name: "", product_category: "", product_price: "", stock_quantity: "" });
    } catch (error) {
      console.error("Error adding product:", error);
    }
  };

  if (loading) return <p>Loading products...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Product Management</h1>
        <Button onClick={() => setShowModal(true)}>Add New Product</Button>
      </div>
      <div className="flex space-x-2">
        <Input
          className="max-w-sm"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button variant="outline">Search</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <TableRow key={product.product_id}>
                <TableCell>{product.product_id}</TableCell>
                <TableCell>{product.product_name}</TableCell>
                <TableCell>{product.product_category || "N/A"}</TableCell>
                <TableCell>{product.stock_quantity}</TableCell>
                <TableCell>${Number(product.product_price).toFixed(2)}</TableCell>

                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(product.product_id)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(product.product_id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan="6" className="text-center py-4">
                No products found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Add New Product Modal */}
      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Product Name"
                value={newProduct.product_name}
                onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
              />
              <Input
                placeholder="Category"
                value={newProduct.product_category}
                onChange={(e) => setNewProduct({ ...newProduct, product_category: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Price"
                value={newProduct.product_price}
                onChange={(e) => setNewProduct({ ...newProduct, product_price: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Stock Quantity"
                value={newProduct.stock_quantity}
                onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
              />
              <div className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddProduct}>Add Product</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Products;
