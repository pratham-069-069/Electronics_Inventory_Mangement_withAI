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
// import { Textarea } from "../components/ui/Textarea"; // REMOVED this import
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Import DialogDescription
  DialogFooter, // Import DialogFooter
  DialogClose,
} from "../components/ui/Dialog"; // Adjust paths if needed
import { FiUserPlus, FiTrash2, FiLoader, FiAlertCircle, FiSearch } from "react-icons/fi"; // Import icons

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [addError, setAddError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);

  const initialNewSupplierState = {
    supplier_name: "",
    contact_person: "",
    email: "",
    phone_number: "",
    address: "",
  };
  const [newSupplier, setNewSupplier] = useState(initialNewSupplierState);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/api/suppliers");
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch suppliers: ${response.status} ${errText}`);
      }
      const data = await response.json();
      setSuppliers(data);
    } catch (err) {
      console.error("Fetch Suppliers Error:", err);
      setError(err.message);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewSupplier({ ...newSupplier, [name]: value });
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);

    if (!newSupplier.supplier_name.trim() || !newSupplier.email.trim()) {
      setAddError("Supplier Name and Email are required.");
      setIsAdding(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to add supplier: ${response.status}`);
      }
      setSuppliers(prev => [...prev, responseData]);
      setShowModal(false);
      setNewSupplier(initialNewSupplierState);
    } catch (error) {
      console.error("Error adding supplier:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSupplier = async (supplierId, supplierName) => {
     if (!window.confirm(`Are you sure you want to delete supplier "${supplierName}" (ID: ${supplierId})? This might fail if they are linked to purchase orders.`)) {
         return;
     }
     setIsDeleting(supplierId);
     setError(null);

     try {
        const response = await fetch(`http://localhost:5000/api/suppliers/${supplierId}`, {
             method: 'DELETE',
         });
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
             throw new Error(responseData.error || `Failed to delete supplier: ${response.status}`);
         }
         setSuppliers(prev => prev.filter(s => s.supplier_id !== supplierId));
         console.log(`Supplier ${supplierId} deleted.`);
     } catch (err) {
         console.error(`Error deleting supplier ${supplierId}:`, err);
         setError(`Delete failed: ${err.message}`);
     } finally {
         setIsDeleting(null);
     }
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
       setNewSupplier(initialNewSupplierState);
       setAddError(null);
       setShowModal(true);
   }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading suppliers...</span></div>;
  }

  if (error && !suppliers.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Supplier Management</h1>
        <Button onClick={openAddModal}>
          <FiUserPlus className="mr-2 h-4 w-4" /> Add New Supplier
        </Button>
      </div>

      <div className="relative max-w-sm">
           <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
           <Input
             className="pl-10"
             placeholder="Search by name, contact, or email..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
      </div>

      {error && (
           <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded flex items-center text-sm">
               <FiAlertCircle className="h-4 w-4 mr-2" /> Error: {error}
           </div>
       )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.supplier_id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{supplier.supplier_id}</TableCell>
                  <TableCell>{supplier.supplier_name}</TableCell>
                  <TableCell>{supplier.contact_person || "N/A"}</TableCell>
                  <TableCell>{supplier.email || "N/A"}</TableCell>
                  <TableCell>{supplier.phone_number || "N/A"}</TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={supplier.address}>{supplier.address || "N/A"}</TableCell>
                  <TableCell className="text-center">
                       <Button
                           variant="ghost"
                           size="sm"
                           className="text-red-600 hover:bg-red-100"
                           onClick={() => handleDeleteSupplier(supplier.supplier_id, supplier.supplier_name)}
                           disabled={isDeleting === supplier.supplier_id}
                           title="Delete Supplier"
                       >
                           {isDeleting === supplier.supplier_id ? (
                               <FiLoader className="h-4 w-4 animate-spin" />
                           ) : (
                               <FiTrash2 className="h-4 w-4" />
                           )}
                       </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan="7" className="text-center py-10 text-gray-500">
                   {suppliers.length === 0 ? "No suppliers available." : "No suppliers match your search."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Enter the details for the new supplier. Name and Email are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSupplier} className="grid gap-4 py-4">
            {addError && (
                <div className="col-span-2 p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
                    {addError}
                </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="supplier_name" className="text-right">Name *</Label>
              <Input id="supplier_name" name="supplier_name" value={newSupplier.supplier_name} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact_person" className="text-right">Contact</Label>
              <Input id="contact_person" name="contact_person" value={newSupplier.contact_person} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="supplier@example.com" value={newSupplier.email} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone_number" className="text-right">Phone</Label>
              <Input id="phone_number" name="phone_number" type="tel" placeholder="+1 123 456 7890" value={newSupplier.phone_number} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="address" className="text-right pt-2">Address</Label>
              {/* ✅ *** Replaced Textarea with Input *** */}
              <Input id="address" name="address" placeholder="Optional supplier address" value={newSupplier.address} onChange={handleInputChange} className="col-span-3" />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? <FiLoader className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isAdding ? "Adding..." : "Add Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers;