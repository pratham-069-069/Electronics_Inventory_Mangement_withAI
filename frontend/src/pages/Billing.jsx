import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/Table"; // Adjust path if needed
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label"; // Adjust path if needed
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "../components/ui/Dialog"; // Adjust path if needed
import { FiLoader, FiAlertCircle, FiEye, FiPrinter } from "react-icons/fi";

// Component to display prettified JSON (Helper for modal)
const JsonViewer = ({ data }) => {
  let formattedJson = "Invalid JSON data";
  try {
    const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
    formattedJson = JSON.stringify(jsonData, null, 2); // Pretty print
  } catch (e) {
    console.error("Error parsing/stringifying report data:", e);
    if (typeof data === 'object' && data !== null) {
      try { formattedJson = JSON.stringify(data, null, 2); }
      catch (stringifyError) { formattedJson = "Could not display data."; }
    } else { formattedJson = String(data); }
  }
  return (
    <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-[60vh]">
      <code>{formattedJson}</code>
    </pre>
  );
};

// Define tax rate (consider moving to a config file or fetching)
const TAX_RATE = 0.05; // Example: 5%

const Billing = () => {
  const [sales, setSales] = useState([]); // List of sales for the main table
  const [filteredSales, setFilteredSales] = useState([]); // Filtered list
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDate, setFilterDate] = useState(""); // For filtering sales list

  // State for Invoice Detail Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null); // Holds data for the selected invoice
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);

  // Fetch initial sales list on mount
  useEffect(() => {
    fetchSalesList();
  }, []);

  // Update filtered sales whenever the main sales data or search date changes
  useEffect(() => {
    handleFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, filterDate]); // Dependencies: sales list and filter date


  // Fetch the main list of sales (from existing /api/sales endpoint)
  const fetchSalesList = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch("http://localhost:5000/api/sales");
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch sales list: ${response.status} ${errText}`);
      }
      const data = await response.json();
      setSales(data);
      setFilteredSales(data); // Initialize filtered list
    } catch (err) {
      console.error("Fetch Sales List Error:", err);
      setError(err.message);
      setSales([]); setFilteredSales([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter sales list by date client-side
  const handleFilter = () => {
    if (!filterDate) {
      setFilteredSales(sales); // Show all if no date selected
      return;
    }
    const filtered = sales.filter((sale) => {
      try {
        // Compare only the date part (YYYY-MM-DD)
        return new Date(sale.sale_date).toISOString().split('T')[0] === filterDate;
      } catch (e) {
        console.warn("Invalid sale date format:", sale.sale_date);
        return false;
      }
    });
    setFilteredSales(filtered);
  };

  // Fetch detailed data for a single invoice from the new backend endpoint
  const fetchInvoiceDetails = async (salesId) => {
    if (!salesId) return;
    setInvoiceLoading(true); setInvoiceError(null); setInvoiceDetails(null);
    setShowInvoiceModal(true); // Show modal immediately with loading state
    try {
      const response = await fetch(`http://localhost:5000/api/billing/invoice/${salesId}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({})); // Try getting JSON error
        throw new Error(errData.error || `Failed to fetch invoice details: ${response.status}`);
      }
      const data = await response.json();
      setInvoiceDetails(data); // Set data on success
    } catch (err) {
      console.error(`Error fetching invoice ${salesId}:`, err);
      setInvoiceError(err.message); // Set error message
      // Keep modal open to show error
    } finally {
      setInvoiceLoading(false); // Stop loading indicator
    }
  };

  // Function to handle printing the invoice modal content
  const handlePrint = () => {
    // This uses the browser's print functionality.
    // More advanced printing might involve libraries like jsPDF or print-specific CSS.
    // You might need to add a specific class to the printable area and use @media print CSS.
    window.print();
  };

  // --- Render Logic ---

  // Main page loading state
  if (loading && !error) { // Show loader only if no error yet
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2">Loading billing data...</span>
      </div>
    );
  }

  // Show critical error only if initial data load failed completely
  if (error && !sales.length) {
    return (
      <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center">
        <FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Billing / Invoices</h1>

      {/* Filter Section */}
      <div className="flex flex-wrap items-end gap-4 p-4 border rounded bg-gray-50">
        <div>
          <Label htmlFor="filterDate" className="block text-sm font-medium mb-1">Filter by Sale Date</Label>
          <Input
            id="filterDate"
            className="max-w-xs mt-1 py-1.5" // Adjusted padding/max-width
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        {filterDate && (
          <Button variant="ghost" size="sm" onClick={() => setFilterDate("")} className="self-end">
            Clear Filter
          </Button>
        )}
      </div>

      {/* Display non-critical errors (e.g., if filtering fails but list loaded) */}
      {error && sales.length > 0 && (
        <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded flex items-center text-sm">
          <FiAlertCircle className="h-4 w-4 mr-2" /> Warning: {error}
        </div>
      )}

      {/* Sales List Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[120px]">Invoice #</TableHead>
              <TableHead className="w-[150px]">Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Show loading indicator within table body if needed, though main loading handles initial */}
            {/* {loading && <TableRow><TableCell colSpan="6" className="text-center py-10"><FiLoader className="h-6 w-6 animate-spin mx-auto text-gray-500" /></TableCell></TableRow>} */}

            {!loading && filteredSales.length > 0 ? (
              filteredSales.map((sale) => (
                <TableRow key={sale.sales_id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{sale.sales_id}</TableCell>
                  <TableCell>{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{sale.customer_name || "N/A"}</TableCell>
                  <TableCell className="text-right font-semibold">${Number(sale.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${sale.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                        sale.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          sale.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                      }`}>
                      {sale.payment_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchInvoiceDetails(sale.sales_id)}
                      title="View Invoice Details"
                    >
                      <FiEye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan="6" className="text-center py-10 text-gray-500">
                  {/* Differentiate between no sales at all vs. no results for filter */}
                  {loading ? 'Loading...' : (sales.length === 0 ? 'No sales records found.' : 'No sales found for this date.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Invoice Detail Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-3xl print:max-w-full print:shadow-none print:border-none">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>Review the details of the selected sale.</DialogDescription>
          </DialogHeader>

          {invoiceLoading && (
            <div className="flex justify-center items-center h-60">
              <FiLoader className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          )}
          {invoiceError && !invoiceLoading && (
            <div className="p-4 my-4 bg-red-100 text-red-700 rounded">
              <p className="font-semibold">Error loading details:</p>
              <p>{invoiceError}</p>
              <Button
                variant="outline"
                size="sm"
                // Provide sales_id if available for retry, otherwise null
                onClick={() => fetchInvoiceDetails(invoiceDetails?.sales_id || null)}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          )}

          {invoiceDetails && !invoiceLoading && !invoiceError && (
            // Added ID for potential print styling targeting
            <div className="space-y-6 py-4 print:space-y-4" id="invoice-content">
              {/* Header Section */}
              <div className="flex justify-between items-start border-b pb-4 print:flex-row">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">INVOICE</h2>
                  <p className="text-gray-500">Invoice #: {invoiceDetails.sales_id}</p>
                  <p className="text-gray-500">Date: {invoiceDetails.sale_date ? new Date(invoiceDetails.sale_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p className="font-semibold">Smart Inventory Inc.</p>
                  <p>123 Inventory Lane</p>
                  <p>Stocksville, ST 54321</p>
                </div>
              </div>

              {/* Customer Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Bill To:</h3>
                  <p>{invoiceDetails.customer_name || 'N/A'}</p>
                  <p>{invoiceDetails.customer_email || ''}</p>
                  <p>{invoiceDetails.customer_phone || ''}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-semibold text-gray-700 mb-1">Sold By:</h3>
                  <p>{invoiceDetails.sold_by_user_name || 'N/A'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border rounded-lg">
                <Table className="min-w-full text-sm">
                  <TableHeader>
                    <TableRow className="bg-gray-100 print:bg-gray-100">
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-center w-20">Quantity</TableHead>
                      <TableHead className="text-right w-28">Unit Price</TableHead>
                      <TableHead className="text-right w-28">Item Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceDetails.items?.length > 0 ? invoiceDetails.items.map(item => (
                      <TableRow key={item.sales_item_id}>
                        <TableCell className="py-2 px-3">{item.product_name || 'N/A'}</TableCell>
                        <TableCell className="text-center py-2 px-3">{item.quantity_sold}</TableCell>
                        <TableCell className="text-right py-2 px-3">${Number(item.unit_price || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right py-2 px-3">${Number(item.item_total || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-4">No items found for this sale.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end pt-4">
                <div className="w-full max-w-xs space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${Number(invoiceDetails.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({TAX_RATE * 100}%):</span>
                    <span>${Number(invoiceDetails.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
                    <span>Total Amount:</span>
                    <span>${Number(invoiceDetails.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="text-sm border-t pt-4 mt-4">
                <p><strong>Payment Method:</strong> {invoiceDetails.payment_method}</p>
                <p><strong>Payment Status:</strong> {invoiceDetails.payment_status}</p>
              </div>

            </div> // End of invoiceDetails div
          )}

          {/* Footer is outside the main content div */}
          <DialogFooter className="print:hidden"> {/* Hide footer when printing */}
            {/* Print button only makes sense if details loaded successfully */}
            {invoiceDetails && !invoiceLoading && !invoiceError && (
              <Button variant="outline" onClick={handlePrint} title="Print Invoice">
                <FiPrinter className="mr-2 h-4 w-4" /> Print
              </Button>
            )}
            <DialogClose asChild>
              <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div> // End of main component div
  );
};

// Define TAX_RATE if needed for display consistency
// (Ensure this matches the rate used in the backend sale.controller.js)
// Note: This is defined twice in the original code. Keeping both for strict formatting request.
// const TAX_RATE = 0.05;

export default Billing;