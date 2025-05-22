import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/Table"; // Adjust path if needed
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input"; // Uncommented
import { Label } from "../components/ui/Label"; // Uncommented
// import { Textarea } from "../components/ui/Textarea"; // REMOVED THIS IMPORT
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "../components/ui/Dialog"; // Uncommented
import { FiLoader, FiAlertCircle, FiPlusCircle } from "react-icons/fi";

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Add Return Modal
  const [showModal, setShowModal] = useState(false);
  const [addError, setAddError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const initialNewReturnState = {
    sales_item_id: "",
    quantity_returned: "",
    return_reason: "",
    refund_amount: "",
  };
  const [newReturn, setNewReturn] = useState(initialNewReturnState);
  const [eligibleSalesItems, setEligibleSalesItems] = useState([]);
  const [selectedSalesItemDetails, setSelectedSalesItemDetails] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchReturns(), fetchEligibleSalesItems()]);
      } catch (err) {
        console.error("Error loading initial returns data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/returns");
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch returns: ${response.status} ${errText}`);
      }
      const data = await response.json();
      setReturns(data);
      setError(null);
    } catch (err) {
      console.error("Fetch Returns Error:", err);
      setError(err.message);
      setReturns([]);
    }
  };

  const fetchEligibleSalesItems = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/sales-items/for-return");
      if (!response.ok) {
        throw new Error("Failed to fetch eligible sales items");
      }
      const data = await response.json();
      setEligibleSalesItems(data);
    } catch (err) {
      console.error("Error fetching eligible sales items:", err);
      setError(prev => prev ? `${prev}\nCould not load items for return.` : 'Could not load items for return.');
      setEligibleSalesItems([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReturn(prev => ({ ...prev, [name]: value }));

    if (name === "sales_item_id") {
      const selectedItem = eligibleSalesItems.find(item => item.sales_item_id.toString() === value);
      setSelectedSalesItemDetails(selectedItem || null);
      if (selectedItem) {
        setNewReturn(prev => ({
          ...prev,
          quantity_returned: "",
        }));
      } else {
         setNewReturn(prev => ({ ...prev, quantity_returned: "", refund_amount: "" }));
      }
    }
  };

  const handleAddReturn = async (e) => {
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);

    const { sales_item_id, quantity_returned, return_reason, refund_amount } = newReturn;
    const quantity = parseInt(quantity_returned, 10);

    if (!sales_item_id || !quantity_returned || quantity <= 0 || !return_reason.trim()) {
      setAddError("Please select an item, enter a valid quantity, and provide a reason for return.");
      setIsAdding(false);
      return;
    }

    if (selectedSalesItemDetails && quantity > selectedSalesItemDetails.original_quantity_sold) {
        setAddError(`Return quantity (${quantity}) cannot exceed original quantity sold (${selectedSalesItemDetails.original_quantity_sold}).`);
        setIsAdding(false);
        return;
    }

    const returnData = {
      sales_item_id: parseInt(sales_item_id),
      quantity_returned: quantity,
      return_reason: return_reason.trim(),
      ...(refund_amount && !isNaN(parseFloat(refund_amount)) && { refund_amount: parseFloat(refund_amount) }),
    };

    try {
      const response = await fetch("http://localhost:5000/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(returnData),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to process return: ${response.status}`);
      }
      await fetchReturns();
      setShowModal(false);
      setNewReturn(initialNewReturnState);
      setSelectedSalesItemDetails(null);
    } catch (error) {
      console.error("Error processing return:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally {
      setIsAdding(false);
    }
  };

  const openAddModal = () => {
      setShowModal(true);
      setAddError(null);
      setNewReturn(initialNewReturnState);
      setSelectedSalesItemDetails(null);
      fetchEligibleSalesItems();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading returns...</span></div>;
  }

  if (error && !returns.length && !eligibleSalesItems.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Product Returns</h1>
            <Button
              onClick={openAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
                <FiPlusCircle className="mr-2 h-4 w-4" /> Process New Return
            </Button>
       </div>

       {error && (returns.length > 0 || eligibleSalesItems.length > 0) && (
           <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md flex items-center text-sm">
               <FiAlertCircle className="h-4 w-4 mr-2 flex-shrink-0" /> {error}
           </div>
       )}

      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">Return ID</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[180px]">Return Date</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</TableHead>
              <TableHead className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">Qty</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Amt.</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">Sale ID</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {returns.length > 0 ? (
              returns.map((ret) => (
                <TableRow key={ret.return_id} className="hover:bg-gray-50">
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{ret.return_id}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{new Date(ret.return_date).toLocaleString()}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">{ret.product_name || 'N/A'} <span className="text-xs text-gray-500">(ID: {ret.product_id})</span></TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600">{ret.quantity_returned}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={ret.return_reason}>{ret.return_reason || "-"}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          ret.return_status === 'completed' || ret.return_status === 'refunded' ? 'bg-green-100 text-green-800' :
                          ret.return_status === 'pending_refund' || ret.return_status === 'pending_inspection' ? 'bg-yellow-100 text-yellow-800' :
                          ret.return_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                          {ret.return_status || 'N/A'}
                      </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">${Number(ret.refund_amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{ret.sales_id}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{ret.customer_name || 'N/A'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan="9" className="text-center py-10 text-gray-500">
                  No return records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

       {/* Add Return Modal - Dark Theme */}
       <Dialog open={showModal} onOpenChange={setShowModal}>
           <DialogContent className="sm:max-w-lg bg-gray-900 text-gray-200 rounded-lg shadow-xl overflow-hidden">
               <DialogHeader className="px-6 py-5 bg-gray-800 border-b border-gray-700">
                   <DialogTitle className="text-lg font-medium leading-6 text-white">Process New Return</DialogTitle>
                   <DialogDescription className="mt-1 text-sm text-gray-400">
                       Select the sales item being returned and provide details.
                   </DialogDescription>
               </DialogHeader>

               <form id="add-return-form" onSubmit={handleAddReturn} className="px-6 py-6 space-y-5">
                   {addError && (
                       <div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md text-sm font-medium">
                           {addError}
                       </div>
                   )}

                   <div>
                       <Label htmlFor="sales_item_id" className="block text-sm font-medium text-gray-300 mb-1">
                           Original Sales Item <span className="text-red-400">*</span>
                       </Label>
                       <select
                           id="sales_item_id"
                           name="sales_item_id"
                           value={newReturn.sales_item_id}
                           onChange={handleInputChange}
                           className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                           required
                       >
                           <option value="" disabled className="text-gray-500">Select Item from Sale...</option>
                           {eligibleSalesItems.length > 0 ? eligibleSalesItems.map(item => (
                               <option key={item.sales_item_id} value={item.sales_item_id} className="text-white bg-gray-700">
                                   Sale #{item.sales_id} - {item.product_name} (Qty: {item.original_quantity_sold})
                               </option>
                           )) : <option disabled className="text-gray-500">Loading eligible items...</option>}
                       </select>
                       {selectedSalesItemDetails && (
                           <p className="mt-1 text-xs text-gray-400">
                               Sale Date: {new Date(selectedSalesItemDetails.sale_date).toLocaleDateString()},
                               Unit Price: ${Number(selectedSalesItemDetails.unit_price).toFixed(2)}
                           </p>
                       )}
                   </div>

                   <div>
                       <Label htmlFor="quantity_returned" className="block text-sm font-medium text-gray-300 mb-1">
                           Quantity Returned <span className="text-red-400">*</span>
                       </Label>
                       <Input
                           id="quantity_returned"
                           name="quantity_returned"
                           type="number"
                           placeholder="0"
                           min="1"
                           max={selectedSalesItemDetails ? selectedSalesItemDetails.original_quantity_sold : undefined}
                           step="1"
                           value={newReturn.quantity_returned}
                           onChange={handleInputChange}
                           className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
                           required
                           disabled={!newReturn.sales_item_id}
                       />
                   </div>

                   <div>
                       <Label htmlFor="return_reason" className="block text-sm font-medium text-gray-300 mb-1">
                           Reason for Return <span className="text-red-400">*</span>
                       </Label>
                       {/* ✅ Replaced custom Textarea with standard HTML textarea */}
                       <textarea
                           id="return_reason"
                           name="return_reason"
                           rows={3}
                           placeholder="e.g., Defective item, Wrong size, etc."
                           value={newReturn.return_reason}
                           onChange={handleInputChange}
                           className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
                           required
                       />
                   </div>
                    <div>
                       <Label htmlFor="refund_amount" className="block text-sm font-medium text-gray-300 mb-1">
                           Refund Amount (Optional)
                       </Label>
                       <Input
                           id="refund_amount"
                           name="refund_amount"
                           type="number"
                           placeholder="e.g., 25.99 (Backend may calculate)"
                           min="0"
                           step="0.01"
                           value={newReturn.refund_amount}
                           onChange={handleInputChange}
                           className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
                       />
                   </div>
               </form>
                <DialogFooter className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex justify-end space-x-3">
                   <DialogClose asChild>
                       <Button
                           type="button"
                           variant="outline"
                           className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                       >
                           Cancel
                       </Button>
                   </DialogClose>
                   <Button
                       type="submit"
                       form="add-return-form"
                       disabled={isAdding}
                       className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-50"
                   >
                       {isAdding && <FiLoader className="mr-2 h-4 w-4 animate-spin" />}
                       {isAdding ? "Processing..." : "Process Return"}
                   </Button>
               </DialogFooter>
           </DialogContent>
       </Dialog>
    </div>
  );
};

export default Returns;