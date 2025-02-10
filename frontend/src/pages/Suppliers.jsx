import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../components/ui/Dialog";

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    supplier_name: "",
    supplier_email: "",
    supplier_phone: ""
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("http://localhost:5000/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      const data = await response.json();
      setSuppliers(data);
      setFilteredSuppliers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilteredSuppliers(
      suppliers.filter((supplier) =>
        supplier.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:5000/suppliers/${id}`, { method: "DELETE" });
      setSuppliers(suppliers.filter((supplier) => supplier.supplier_id !== id));
      setFilteredSuppliers(filteredSuppliers.filter((supplier) => supplier.supplier_id !== id));
    } catch (error) {
      console.error("Error deleting supplier:", error);
    }
  };

  const handleEdit = (id) => {
    alert(`Edit supplier with ID: ${id}`);
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.supplier_name.trim()) {
      alert("Supplier name is required!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_name: newSupplier.supplier_name,
          supplier_email: newSupplier.supplier_email,
          supplier_phone: newSupplier.supplier_phone
        })
      });

      if (!response.ok) throw new Error("Failed to add supplier");

      const addedSupplier = await response.json();
      setSuppliers([...suppliers, addedSupplier]);
      setFilteredSuppliers([...filteredSuppliers, addedSupplier]);
      setShowModal(false);
      setNewSupplier({ supplier_name: "", supplier_email: "", supplier_phone: "" });
    } catch (error) {
      console.error("Error adding supplier:", error);
    }
  };

  if (loading) return <p>Loading suppliers...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Supplier Tracking</h1>
        <Button onClick={() => setShowModal(true)}>Add New Supplier</Button>
      </div>
      <div className="flex space-x-2">
        <Input
          className="max-w-sm"
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button variant="outline" onClick={handleSearch}>Search</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((supplier) => (
              <TableRow key={supplier.supplier_id}>
                <TableCell>{supplier.supplier_id}</TableCell>
                <TableCell>{supplier.supplier_name}</TableCell>
                <TableCell>{supplier.supplier_email || "N/A"}</TableCell>
                <TableCell>{supplier.supplier_phone || "N/A"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(supplier.supplier_id)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(supplier.supplier_id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan="5" className="text-center py-4">
                No suppliers found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Supplier Name"
                value={newSupplier.supplier_name}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplier_name: e.target.value })}
              />
              <Input
                type="email"
                placeholder="Email"
                value={newSupplier.supplier_email}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplier_email: e.target.value })}
              />
              <Input
                type="tel"
                placeholder="Phone Number"
                value={newSupplier.supplier_phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, supplier_phone: e.target.value })}
              />
              <div className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddSupplier}>Add Supplier</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Suppliers;
