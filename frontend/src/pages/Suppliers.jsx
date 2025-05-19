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
// Textarea import was correctly removed
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../components/ui/Dialog"; // Adjust paths if needed
import { FiUserPlus, FiTrash2, FiLoader, FiAlertCircle, FiSearch } from "react-icons/fi";

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

  // --- Fetching and State Logic (remains the same) ---
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
     setError(null); // Clear previous general errors before delete attempt

     try {
        const response = await fetch(`http://localhost:5000/api/suppliers/${supplierId}`, {
             method: 'DELETE',
         });
        const responseData = response.status !== 204 ? await response.json().catch(() => ({})) : {};
        if (!response.ok) {
             throw new Error(responseData.error || `Failed to delete supplier: ${response.status} ${response.statusText}`);
         }
         setSuppliers(prev => prev.filter(s => s.supplier_id !== supplierId));
         console.log(`Supplier ${supplierId} deleted.`);
     } catch (err) {
         console.error(`Error deleting supplier ${supplierId}:`, err);
         setError(`Delete failed for supplier ${supplierId}: ${err.message}`);
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

  // --- Loading / Error States ---
   if (loading) {
    return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading suppliers...</span></div>;
  }
  if (error && !suppliers.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error loading suppliers: {error}</div>;
  }

  // --- Main Render ---
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Supplier Management</h1>
        <Button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <FiUserPlus className="mr-2 h-4 w-4" /> Add New Supplier
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
           <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
           <Input
             className="pl-10 pr-4 py-2 w-full bg-gray-700 text-white border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
             placeholder="Search by name, contact, or email..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
      </div>

      {/* Display non-critical errors */}
      {error && suppliers.length > 0 && (
           <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-md flex items-center text-sm">
               <FiAlertCircle className="h-4 w-4 mr-2 flex-shrink-0" /> {error}
           </div>
       )}

      {/* Suppliers Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
                <TableHead className="w-[80px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Person</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</TableHead>
              <TableHead className="w-[100px] px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.supplier_id} className="hover:bg-gray-50">
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.supplier_id}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{supplier.supplier_name}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{supplier.contact_person || "N/A"}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{supplier.email || "N/A"}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{supplier.phone_number || "N/A"}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={supplier.address}>{supplier.address || "N/A"}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                       <Button
                           variant="ghost"
                           size="icon"
                           className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full disabled:opacity-50"
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

      {/* Add Supplier Modal - Dark Theme with White Text */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg bg-gray-800 text-white rounded-lg shadow-xl overflow-hidden">
          <DialogHeader className="px-6 py-5 bg-gray-800 border-b border-gray-600">
            <DialogTitle className="text-lg font-medium leading-6 text-white">
              Add New Supplier
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-300">
              Enter the details for the new supplier. Name and Email are required.
            </DialogDescription>
          </DialogHeader>

          {/* ✅ *** Added id="add-supplier-form" to the form element *** */}
          <form id="add-supplier-form" onSubmit={handleAddSupplier} className="px-6 py-6 space-y-4">
            {addError && (
                <div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md text-sm font-medium">
                    {addError}
                </div>
            )}

            {/* Fields remain the same */}
             <div>
              <Label htmlFor="supplier_name" className="block text-sm font-medium text-gray-200 mb-1">
                Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="supplier_name" name="supplier_name" value={newSupplier.supplier_name} onChange={handleInputChange}
                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
                required
              />
            </div>
            <div>
              <Label htmlFor="contact_person" className="block text-sm font-medium text-gray-200 mb-1">
                Contact Person
              </Label>
              <Input
                id="contact_person" name="contact_person" value={newSupplier.contact_person} onChange={handleInputChange}
                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                Email <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email" name="email" type="email" placeholder="supplier@example.com" value={newSupplier.email} onChange={handleInputChange}
                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone_number" className="block text-sm font-medium text-gray-200 mb-1">
                Phone
              </Label>
              <Input
                id="phone_number" name="phone_number" type="tel" placeholder="+1 123 456 7890" value={newSupplier.phone_number} onChange={handleInputChange}
                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label htmlFor="address" className="block text-sm font-medium text-gray-200 mb-1">
                Address
              </Label>
              <Input
                id="address" name="address" placeholder="Optional supplier address" value={newSupplier.address} onChange={handleInputChange}
                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
              />
            </div>
          </form> {/* Form ends, but footer is separate */}

          {/* Footer with correct button linking */}
          <DialogFooter className="px-6 py-4 bg-gray-700 border-t border-gray-600 flex justify-end space-x-3">
            <DialogClose asChild>
              <Button
                type="button" variant="outline"
                className="border-gray-500 bg-transparent text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="add-supplier-form" // This now correctly links to the form's ID
              disabled={isAdding}
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isAdding ? <FiLoader className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isAdding ? "Adding..." : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers;