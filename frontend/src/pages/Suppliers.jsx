import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "../components/ui/Dialog";
import { FiUserPlus, FiTrash2, FiLoader, FiAlertCircle, FiSearch, FiEdit } from "react-icons/fi"; // Added FiEdit

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Add Supplier Modal State ---
  const [showAddModal, setShowAddModal] = useState(false); // Renamed for clarity
  const [addError, setAddError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const initialNewSupplierState = {
    supplier_name: "", contact_person: "", email: "", phone_number: "", address: "",
  };
  const [newSupplier, setNewSupplier] = useState(initialNewSupplierState);

  // --- Edit Supplier Modal State ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null); // To store the supplier being edited
  const [isUpdatingSupplier, setIsUpdatingSupplier] = useState(false);
  const [editError, setEditError] = useState(null);


  const [isDeleting, setIsDeleting] = useState(null);


  useEffect(() => {
    fetchSuppliers();
  }, []);

  // --- Fetching Logic ---
  const fetchSuppliers = async () => {
    setLoading(true); setError(null);
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

  // --- Add Supplier Logic ---
  const handleAddInputChange = (e) => { // Renamed for clarity
    const { name, value } = e.target;
    setNewSupplier({ ...newSupplier, [name]: value });
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault(); setAddError(null); setIsAdding(true);
    if (!newSupplier.supplier_name.trim() || !newSupplier.email.trim()) { // Keep existing validation or adjust
      setAddError("Supplier Name and Email are required.");
      setIsAdding(false); return;
    }
    try {
      const response = await fetch("http://localhost:5000/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier), // newSupplier includes contact_person, phone_number
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to add supplier: ${response.status}`);
      }
      // Instead of just pushing, refetch to get the fully joined data from backend if it returns it
      // Or, if backend returns the new supplier with joined contact, update more intelligently
      setSuppliers(prev => [...prev, responseData]); // Assuming backend returns the new supplier with contact info
      setShowAddModal(false);
      setNewSupplier(initialNewSupplierState);
    } catch (error) {
      console.error("Error adding supplier:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally {
      setIsAdding(false);
    }
  };

  const openAddModal = () => {
       setNewSupplier(initialNewSupplierState);
       setAddError(null);
       setShowAddModal(true); // Use dedicated state
   };

  // --- Edit Supplier Logic ---
  const openEditModal = (supplierToEdit) => {
    setEditingSupplier({ // Pre-fill form with current supplier data
        supplier_id: supplierToEdit.supplier_id,
        supplier_name: supplierToEdit.supplier_name,
        contact_person: supplierToEdit.contact_person || "", // Handle null values
        email: supplierToEdit.email || "",
        phone_number: supplierToEdit.phone_number || "",
        address: supplierToEdit.address || "",
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingSupplier(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setEditError(null);
    setIsUpdatingSupplier(true);

    const { supplier_id, supplier_name, email, address, contact_person, phone_number } = editingSupplier;

    if (!supplier_name.trim()) { // Email might be optional in SUPPLIERS but required by contact
        setEditError("Supplier Name is required.");
        setIsUpdatingSupplier(false);
        return;
    }
    // The backend will handle creating/updating supplier_contacts separately
    const supplierDataToUpdate = { supplier_name, email, address, contact_person, phone_number };

    try {
        const response = await fetch(`http://localhost:5000/api/suppliers/${supplier_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(supplierDataToUpdate),
        });
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.error || `Failed to update supplier: ${response.status}`);
        }
        // Refetch or update local state more intelligently
        // For simplicity, refetching:
        await fetchSuppliers();
        setShowEditModal(false);
        setEditingSupplier(null);
    } catch (error) {
        console.error("Error updating supplier:", error);
        setEditError(error.message || "An unexpected error occurred during update.");
    } finally {
        setIsUpdatingSupplier(false);
    }
  };


  // --- Delete Supplier Logic ---
  const handleDeleteSupplier = async (supplierId, supplierName) => { /* ... remains the same ... */
     if (!window.confirm(`Are you sure you want to delete supplier "${supplierName}" (ID: ${supplierId})? This might fail if they are linked to purchase orders.`)) {
         return;
     }
     setIsDeleting(supplierId);
     setError(null); 
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

  // --- Filtering ---
  const filteredSuppliers = suppliers.filter((supplier) => /* ... remains the same ... */
    supplier.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  // --- Loading / Error States ---
   if (loading) { /* ... */
    return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading suppliers...</span></div>;
  }
  if (error && !suppliers.length) { /* ... */
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error loading suppliers: {error}</div>;
  }

  // --- Main Render ---
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Supplier Management</h1>
        <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <FiUserPlus className="mr-2 h-4 w-4" /> Add New Supplier
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
           <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
           <Input
             className="pl-10 pr-4 py-2 w-full bg-gray-700 text-white border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-gray-400"
             placeholder="Search by name, contact, or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {error && suppliers.length > 0 && ( /* ... */
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
              <TableHead>Name</TableHead> <TableHead>Contact Person</TableHead> <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead> <TableHead>Address</TableHead>
              <TableHead className="w-[120px] px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead> {/* Adjusted width for two buttons */}
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.supplier_id} className="hover:bg-gray-50">
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.supplier_id}</TableCell>
                  <TableCell>{supplier.supplier_name}</TableCell>
                  <TableCell>{supplier.contact_person || "N/A"}</TableCell>
                  <TableCell>{supplier.email || "N/A"}</TableCell>
                  <TableCell>{supplier.phone_number || "N/A"}</TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs truncate" title={supplier.address}>{supplier.address || "N/A"}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium space-x-2"> {/* Added space-x-2 */}
                       <Button
                           variant="outline" // Changed to outline for Edit
                           size="icon"
                           className="text-blue-600 border-blue-300 hover:bg-blue-50 rounded-full" // Blue for edit
                           onClick={() => openEditModal(supplier)}
                           title="Edit Supplier"
                       >
                           <FiEdit className="h-4 w-4" />
                       </Button>
                       <Button
                           variant="ghost" size="icon"
                           className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full disabled:opacity-50"
                           onClick={() => handleDeleteSupplier(supplier.supplier_id, supplier.supplier_name)}
                           disabled={isDeleting === supplier.supplier_id} title="Delete Supplier">
                           {isDeleting === supplier.supplier_id ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiTrash2 className="h-4 w-4" />}
                       </Button>
                  </TableCell>
                </TableRow>
            ))}
            {filteredSuppliers.length === 0 && (
              <TableRow><TableCell colSpan="7" className="text-center py-10 text-gray-500">
                   {suppliers.length === 0 ? "No suppliers available." : "No suppliers match your search."}
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Supplier Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg bg-gray-800 text-white rounded-lg shadow-xl overflow-hidden">
          <DialogHeader className="px-6 py-5 bg-gray-800 border-b border-gray-600">
            <DialogTitle className="text-lg font-medium leading-6 text-white">Add New Supplier</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-300">Enter details. Name and Email are required.</DialogDescription>
          </DialogHeader>
          <form id="add-supplier-form" onSubmit={handleAddSupplier} className="px-6 py-6 space-y-4">
            {addError && ( /* ... error display ... */
                <div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md text-sm font-medium">
                    {addError}
                </div>
            )}
            <div><Label htmlFor="add_supplier_name" className="block text-sm font-medium text-gray-200 mb-1">Name <span className="text-red-400">*</span></Label><Input id="add_supplier_name" name="supplier_name" value={newSupplier.supplier_name} onChange={handleAddInputChange} className="input-dark-theme" required /></div>
            <div><Label htmlFor="add_contact_person" className="block text-sm font-medium text-gray-200 mb-1">Contact Person</Label><Input id="add_contact_person" name="contact_person" value={newSupplier.contact_person} onChange={handleAddInputChange} className="input-dark-theme" /></div>
            <div><Label htmlFor="add_email" className="block text-sm font-medium text-gray-200 mb-1">Email <span className="text-red-400">*</span></Label><Input id="add_email" name="email" type="email" placeholder="supplier@example.com" value={newSupplier.email} onChange={handleAddInputChange} className="input-dark-theme" required /></div>
            <div><Label htmlFor="add_phone_number" className="block text-sm font-medium text-gray-200 mb-1">Phone</Label><Input id="add_phone_number" name="phone_number" type="tel" placeholder="+1 123 456 7890" value={newSupplier.phone_number} onChange={handleAddInputChange} className="input-dark-theme" /></div>
            <div><Label htmlFor="add_address" className="block text-sm font-medium text-gray-200 mb-1">Address</Label><Input id="add_address" name="address" placeholder="Supplier address" value={newSupplier.address} onChange={handleAddInputChange} className="input-dark-theme" /></div>
          </form>
          <DialogFooter className="px-6 py-4 bg-gray-700 border-t border-gray-600 flex justify-end space-x-3">
            <DialogClose asChild><Button type="button" variant="outline" className="btn-dark-outline">Cancel</Button></DialogClose>
            <Button type="submit" form="add-supplier-form" disabled={isAdding} className="btn-dark-primary">
              {isAdding ? <><FiLoader className="mr-2 h-4 w-4 animate-spin" />Adding...</> : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Modal - Dark Theme */}
      {editingSupplier && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-lg bg-gray-800 text-white rounded-lg shadow-xl overflow-hidden">
            <DialogHeader className="px-6 py-5 bg-gray-800 border-b border-gray-600">
              <DialogTitle className="text-lg font-medium leading-6 text-white">
                Edit Supplier (ID: {editingSupplier.supplier_id})
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-gray-300">
                Update the supplier's details.
              </DialogDescription>
            </DialogHeader>
            <form id="edit-supplier-form" onSubmit={handleUpdateSupplier} className="px-6 py-6 space-y-4">
              {editError && (
                  <div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md text-sm font-medium">
                      {editError}
                  </div>
              )}
              <div><Label htmlFor="edit_supplier_name" className="block text-sm font-medium text-gray-200 mb-1">Name <span className="text-red-400">*</span></Label><Input id="edit_supplier_name" name="supplier_name" value={editingSupplier.supplier_name} onChange={handleEditInputChange} className="input-dark-theme" required /></div>
              <div><Label htmlFor="edit_contact_person" className="block text-sm font-medium text-gray-200 mb-1">Contact Person</Label><Input id="edit_contact_person" name="contact_person" value={editingSupplier.contact_person} onChange={handleEditInputChange} className="input-dark-theme" /></div>
              <div><Label htmlFor="edit_email" className="block text-sm font-medium text-gray-200 mb-1">Email <span className="text-red-400">*</span></Label><Input id="edit_email" name="email" type="email" value={editingSupplier.email} onChange={handleEditInputChange} className="input-dark-theme" required /></div>
              <div><Label htmlFor="edit_phone_number" className="block text-sm font-medium text-gray-200 mb-1">Phone</Label><Input id="edit_phone_number" name="phone_number" type="tel" value={editingSupplier.phone_number} onChange={handleEditInputChange} className="input-dark-theme" /></div>
              <div><Label htmlFor="edit_address" className="block text-sm font-medium text-gray-200 mb-1">Address</Label><Input id="edit_address" name="address" value={editingSupplier.address} onChange={handleEditInputChange} className="input-dark-theme" /></div>
            </form>
            <DialogFooter className="px-6 py-4 bg-gray-700 border-t border-gray-600 flex justify-end space-x-3 mt-2">
              <DialogClose asChild><Button type="button" variant="outline" className="btn-dark-outline" onClick={() => setEditingSupplier(null)}>Cancel</Button></DialogClose>
              <Button type="submit" form="edit-supplier-form" disabled={isUpdatingSupplier} className="btn-dark-primary">
                {isUpdatingSupplier ? <><FiLoader className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Update Supplier"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
// Helper for dark theme input classes (define globally or in a utils file if used often)
const inputDarkTheme = "block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400";
const btnDarkPrimary = "inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50";
const btnDarkOutline = "border-gray-500 bg-transparent text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500";

// Replace className="input-dark-theme" with actual classes or use the constants
// For brevity, I used placeholders like "input-dark-theme", "btn-dark-primary", "btn-dark-outline".
// You'll need to replace these with the full Tailwind class strings as defined above (or your actual classes).
// Example for Input: className={inputDarkTheme}
// Example for Primary Button: className={btnDarkPrimary}
// Example for Outline Button: className={btnDarkOutline}


export default Suppliers;