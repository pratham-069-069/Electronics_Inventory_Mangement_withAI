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

// JsonViewer component is not used in the main flow, keeping it light is fine
// const JsonViewer = ({ data }) => { ... };

// Define tax rate
const TAX_RATE = 0.05;

// --- Billing Component ---
const Billing = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDate, setFilterDate] = useState("");

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);

  // --- useEffects and Fetching Logic (remains the same) ---
  useEffect(() => {
    fetchSalesList();
  }, []);

  useEffect(() => {
    handleFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, filterDate]);

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
    } catch (err) {
      console.error("Fetch Sales List Error:", err);
      setError(err.message);
      setSales([]); setFilteredSales([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    if (!filterDate) {
      setFilteredSales(sales);
      return;
    }
    const filtered = sales.filter((sale) => {
      try {
        return new Date(sale.sale_date).toISOString().split('T')[0] === filterDate;
      } catch (e) {
        console.warn("Invalid sale date format:", sale.sale_date);
        return false;
      }
    });
    setFilteredSales(filtered);
  };

  const fetchInvoiceDetails = async (salesId) => {
    if (!salesId) return;
    setInvoiceLoading(true); setInvoiceError(null); setInvoiceDetails(null);
    setShowInvoiceModal(true);
    try {
      const response = await fetch(`http://localhost:5000/api/billing/invoice/${salesId}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch invoice details: ${response.status}`);
      }
      const data = await response.json();
      setInvoiceDetails(data);
    } catch (err) {
      console.error(`Error fetching invoice ${salesId}:`, err);
      setInvoiceError(err.message);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handlePrint = () => {
    // Temporarily switch to light theme for printing if needed, or use @media print styles
    // This basic implementation just prints the current view
    window.print();
  };

  // --- Render Logic ---

  if (loading && !error) {
    return ( /* ... loading spinner ... */
      <div className="flex justify-center items-center h-64">
        <FiLoader className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2">Loading billing data...</span>
      </div>
    );
  }

  if (error && !sales.length) {
    return ( /* ... critical error display ... */
      <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center">
        <FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Billing / Invoices</h1>

      {/* Filter Section - Dark Theme */}
      <div className="flex flex-wrap items-end gap-4 p-4 border border-gray-700 rounded bg-gray-800 shadow">
        <div>
          <Label htmlFor="filterDate" className="block text-sm font-medium text-gray-200 mb-1">Filter by Sale Date</Label>
          <Input
            id="filterDate"
            className="block w-full max-w-xs bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
        </div>
        {filterDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterDate("")}
            className="self-end text-indigo-400 hover:bg-gray-700 hover:text-indigo-300"
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* Non-critical errors */}
      {error && sales.length > 0 && ( /* ... error display ... */
        <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded flex items-center text-sm">
          <FiAlertCircle className="h-4 w-4 mr-2" /> Warning: {error}
        </div>
      )}

      {/* Sales List Table - Light Theme */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <Table>
          {/* ... Table Header/Body for sales list (remains light themed) ... */}
          <TableHeader className="bg-gray-50">
             <TableRow>
               <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">Invoice #</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px]">Date</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</TableHead>
              <TableHead className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</TableHead>
              <TableHead className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-200">
            {!loading && filteredSales.length > 0 ? (
              filteredSales.map((sale) => (
                <TableRow key={sale.sales_id} className="hover:bg-gray-50">
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{sale.sales_id}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{sale.customer_name || "N/A"}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-gray-900">${Number(sale.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        sale.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                        sale.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        sale.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                      {sale.payment_status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchInvoiceDetails(sale.sales_id)}
                      title="View Invoice Details"
                      className="border-gray-300 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <FiEye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan="6" className="text-center py-10 text-gray-500">
                   {loading ? 'Loading...' : (sales.length === 0 ? 'No sales records found.' : 'No sales found for this date.')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- Invoice Detail Modal - Dark Theme Applied --- */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent
          // Apply dark background, responsive width, flex structure
          className="bg-gray-900 text-gray-200 rounded-lg shadow-xl overflow-hidden print:bg-transparent print:text-black print:shadow-none print:border-none
                     w-[95vw] max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col"
        >
          {/* Header (Fixed, Dark) */}
          <DialogHeader className="px-6 py-4 border-b border-gray-700 print:hidden flex-shrink-0"> {/* Dark border */}
            <DialogTitle className="text-lg font-medium text-white">Invoice Details</DialogTitle> {/* White title */}
            <DialogDescription className="mt-1 text-sm text-gray-400">Review the details of the selected sale.</DialogDescription> {/* Lighter gray description */}
          </DialogHeader>

          {/* Loading state (Dark) */}
          {invoiceLoading && (
            <div className="flex justify-center items-center h-60 px-6 py-6 flex-grow">
              {/* Use a lighter spinner color for dark background */}
              <FiLoader className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {/* Error state (Dark) */}
          {invoiceError && !invoiceLoading && (
             <div className="p-4 m-6 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md flex-grow overflow-y-auto"> {/* Dark error style */}
              <p className="font-semibold">Error loading details:</p>
              <p>{invoiceError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchInvoiceDetails(invoiceDetails?.sales_id || null)}
                className="mt-2 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white" // Dark outline button
              >
                Retry
              </Button>
            </div>
          )}

          {/* Invoice Content Area (Scrollable, Dark Theme) */}
          {invoiceDetails && !invoiceLoading && !invoiceError && (
            <div
              className="flex-grow overflow-y-auto space-y-6 px-6 py-6 print:space-y-4 print:p-0 print:overflow-visible print:text-black" // Set print text to black
              id="invoice-content"
              style={{ maxHeight: '75vh' }} // Limit height for scroll
            >
              {/* Header Section (Dark) */}
              <div className="flex justify-between items-start border-b border-gray-700 pb-4 print:border-gray-300"> {/* Dark border */}
                 <div>
                  <h2 className="text-2xl font-bold text-white print:text-black">INVOICE</h2> {/* White text */}
                  <p className="text-gray-400 print:text-gray-600">Invoice #: {invoiceDetails.sales_id}</p> {/* Light gray text */}
                  <p className="text-gray-400 print:text-gray-600">Date: {invoiceDetails.sale_date ? new Date(invoiceDetails.sale_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="text-right text-sm text-gray-400 print:text-gray-600"> {/* Light gray text */}
                  <p className="font-semibold text-gray-300 print:text-gray-700">Smart Inventory Inc.</p>
                  <p>123 Inventory Lane</p>
                  <p>Stocksville, ST 54321</p>
                </div>
              </div>

              {/* Customer Section (Dark) */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-300 mb-1 print:text-gray-700">Bill To:</h3> {/* Lighter heading */}
                    <p className="text-gray-100 print:text-black">{invoiceDetails.customer_name || 'N/A'}</p> {/* Bright text */}
                    <p className="text-gray-400 print:text-gray-600">{invoiceDetails.customer_email || ''}</p> {/* Lighter gray */}
                    <p className="text-gray-400 print:text-gray-600">{invoiceDetails.customer_phone || ''}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-gray-300 mb-1 print:text-gray-700">Sold By:</h3> {/* Lighter heading */}
                    <p className="text-gray-100 print:text-black">{invoiceDetails.sold_by_user_name || 'N/A'}</p> {/* Bright text */}
                  </div>
              </div>

              {/* Items Table (Dark) */}
              <div className="overflow-x-auto border border-gray-700 rounded-lg print:border-gray-300"> {/* Dark border */}
                <Table className="min-w-full text-sm">
                  <TableHeader className="bg-gray-800 print:bg-gray-100"> {/* Dark header BG */}
                    <TableRow>
                      <TableHead className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider print:text-gray-500">Product Name</TableHead>
                      <TableHead className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-20 print:text-gray-500">Quantity</TableHead>
                      <TableHead className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-28 print:text-gray-500">Unit Price</TableHead>
                      <TableHead className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-28 print:text-gray-500">Item Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  {/* Dark table body */}
                  <TableBody className="bg-transparent divide-y divide-gray-700 print:bg-white print:divide-gray-200">
                    {invoiceDetails.items?.length > 0 ? invoiceDetails.items.map(item => (
                      <TableRow key={item.sales_item_id} className="hover:bg-gray-800 print:hover:bg-gray-50"> {/* Dark hover */}
                        <TableCell className="px-3 py-2 whitespace-normal text-gray-100 print:text-black">{item.product_name || 'N/A'}</TableCell> {/* Light text */}
                        <TableCell className="px-3 py-2 whitespace-nowrap text-center text-gray-300 print:text-gray-600">{item.quantity_sold}</TableCell> {/* Lighter text */}
                        <TableCell className="px-3 py-2 whitespace-nowrap text-right text-gray-300 print:text-gray-600">${Number(item.unit_price || 0).toFixed(2)}</TableCell>
                        <TableCell className="px-3 py-2 whitespace-nowrap text-right font-medium text-white print:text-black">${Number(item.item_total || 0).toFixed(2)}</TableCell> {/* White text */}
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-4 print:text-gray-500">No items found for this sale.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals Section (Dark) */}
              <div className="flex justify-end pt-4">
                 <div className="w-full max-w-xs space-y-1 text-sm text-gray-300 print:text-gray-700"> {/* Lighter text */}
                  <div className="flex justify-between"><span>Subtotal:</span><span>${Number(invoiceDetails.subtotal || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Tax ({TAX_RATE * 100}%):</span><span>${Number(invoiceDetails.tax_amount || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold text-base text-white border-t border-gray-700 pt-1 mt-1 print:text-black print:border-gray-300"> {/* White text, dark border */}
                    <span>Total Amount:</span><span>${Number(invoiceDetails.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info (Dark) */}
               <div className="text-sm border-t border-gray-700 pt-4 mt-4 text-gray-400 print:text-gray-600 print:border-gray-300"> {/* Light gray text, dark border */}
                   <p><strong className="text-gray-200 print:text-gray-700">Payment Method:</strong> {invoiceDetails.payment_method}</p>
                   <p><strong className="text-gray-200 print:text-gray-700">Payment Status:</strong> {invoiceDetails.payment_status}</p>
               </div>

            </div> // End of scrollable invoice content div
          )}

          {/* Footer (Fixed, Dark) */}
          <DialogFooter className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex justify-end space-x-3 print:hidden flex-shrink-0"> {/* Dark BG/border */}
            {invoiceDetails && !invoiceLoading && !invoiceError && (
              <Button
                  variant="outline"
                  onClick={handlePrint}
                  title="Print Invoice"
                  // Explicit dark theme outline button style + fixed hover
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
              >
                <FiPrinter className="mr-2 h-4 w-4" /> Print
              </Button>
            )}
            <DialogClose asChild>
              <Button
                  type="button"
                  variant="secondary" // Using secondary which might need specific dark styling
                  // Explicit dark theme secondary button style
                  className="bg-gray-700 text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
               >
                   Close
               </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div> // End of main component div
  );
};

export default Billing;