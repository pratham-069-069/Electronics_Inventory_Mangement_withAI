import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/Table"; // Adjust path if needed
import { Button } from "../components/ui/Button";
// Import Input, Label, Dialog components if/when adding "Process Return" modal
// import { Input } from "../components/ui/Input";
// import { Label } from "../components/ui/Label";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../components/ui/Dialog";
import { FiLoader, FiAlertCircle, FiPlusCircle } from "react-icons/fi"; // Added FiPlusCircle

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add state for modal later if implementing add return
  // const [showModal, setShowModal] = useState(false);
  // const [addError, setAddError] = useState(null);
  // const [isAdding, setIsAdding] = useState(false);
  // const initialNewReturnState = { sales_item_id: "", quantity_returned: "", return_reason: "" };
  // const [newReturn, setNewReturn] = useState(initialNewReturnState);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/api/returns"); // Call the new backend endpoint
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch returns: ${response.status} ${errText}`);
      }
      const data = await response.json();
      setReturns(data);
    } catch (err) {
      console.error("Fetch Returns Error:", err);
      setError(err.message);
      setReturns([]); // Clear data on error
    } finally {
      setLoading(false);
    }
  };

  // Placeholder for add return handler - implement later
  // const handleAddReturn = async (e) => { /* ... */ };

  // Placeholder for opening the add modal
  const openAddModal = () => {
      alert("Functionality to process new returns is not yet implemented.");
      // setShowModal(true);
      // setAddError(null);
      // setNewReturn(initialNewReturnState);
  };

  // Render Logic
  if (loading) {
    return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading returns...</span></div>;
  }

  // Show critical error only if initial load failed completely
  if (error && !returns.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">Product Returns</h1>
            {/* Button to eventually open the 'Add Return' modal */}
            <Button onClick={openAddModal} disabled> {/* Disabled until implemented */}
                <FiPlusCircle className="mr-2 h-4 w-4" /> Process New Return
            </Button>
       </div>

       {/* Display general errors (e.g., if fetch failed but table might show old data) */}
       {error && (
           <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded flex items-center text-sm">
               <FiAlertCircle className="h-4 w-4 mr-2" /> Error: {error}
           </div>
       )}

      {/* Returns Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[100px]">Return ID</TableHead>
              <TableHead className="w-[180px]">Return Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="w-[80px] text-center">Qty</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Refund Amt.</TableHead>
              <TableHead className="w-[100px]">Sale ID</TableHead>
              <TableHead>Customer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.length > 0 ? (
              returns.map((ret) => (
                <TableRow key={ret.return_id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{ret.return_id}</TableCell>
                  <TableCell>{new Date(ret.return_date).toLocaleString()}</TableCell>
                  <TableCell>{ret.product_name || 'N/A'} ({ret.product_id})</TableCell>
                  <TableCell className="text-center">{ret.quantity_returned}</TableCell>
                  <TableCell className="max-w-xs truncate" title={ret.return_reason}>{ret.return_reason || "-"}</TableCell>
                  <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ret.return_status === 'completed' ? 'bg-green-100 text-green-800' :
                          ret.return_status === 'pending_refund' ? 'bg-yellow-100 text-yellow-800' :
                          ret.return_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                          {ret.return_status || 'N/A'}
                      </span>
                  </TableCell>
                  <TableCell className="text-right">${Number(ret.refund_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>{ret.sales_id}</TableCell>
                  <TableCell>{ret.customer_name || 'N/A'}</TableCell>
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

       {/* Add Return Modal (Placeholder for later implementation) */}
       {/* <Dialog open={showModal} onOpenChange={setShowModal}>
           <DialogContent> ... Form for sales_item_id, quantity, reason ... </DialogContent>
       </Dialog> */}

    </div>
  );
};

export default Returns;