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
    contact_person: "",
    supplier_email: "",
    supplier_phone: "",
    address: "",
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

  const handleAddSupplier = async () => {
    if (!newSupplier.supplier_name.trim()) {
      alert("Supplier name is required!");
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });

      if (!response.ok) throw new Error("Failed to add supplier");

      const addedSupplier = await response.json();
      setSuppliers([...suppliers, addedSupplier]);
      setFilteredSuppliers([...filteredSuppliers, addedSupplier]);
      setShowModal(false);
      setNewSupplier({ supplier_name: "", contact_person: "", supplier_email: "", supplier_phone: "", address: "" });
    } catch (error) {
      console.error("Error adding supplier:", error);
    }
  };

  if (loading) return <p>Loading suppliers...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Supplier Management</h1>
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
            <TableHead>Contact Person</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((supplier) => (
              <TableRow key={supplier.supplier_id}>
                <TableCell>{supplier.supplier_id}</TableCell>
                <TableCell>{supplier.supplier_name}</TableCell>
                <TableCell>{supplier.contact_person || "N/A"}</TableCell>
                <TableCell>{supplier.supplier_email || "N/A"}</TableCell>
                <TableCell>{supplier.supplier_phone || "N/A"}</TableCell>
                <TableCell>{supplier.address || "N/A"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan="6" className="text-center py-4">
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
              <Input placeholder="Supplier Name" value={newSupplier.supplier_name} onChange={(e) => setNewSupplier({ ...newSupplier, supplier_name: e.target.value })} />
              <Input placeholder="Contact Person" value={newSupplier.contact_person} onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })} />
              <Input type="email" placeholder="Email" value={newSupplier.supplier_email} onChange={(e) => setNewSupplier({ ...newSupplier, supplier_email: e.target.value })} />
              <Input type="tel" placeholder="Phone Number" value={newSupplier.supplier_phone} onChange={(e) => setNewSupplier({ ...newSupplier, supplier_phone: e.target.value })} />
              <Input placeholder="Address" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} />
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
