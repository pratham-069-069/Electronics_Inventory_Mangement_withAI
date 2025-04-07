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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Import DialogDescription
  DialogFooter, // Import DialogFooter
  DialogClose,
} from "../components/ui/Dialog"; // Adjust paths if needed
import { FiEye, FiTrash2, FiLoader, FiAlertCircle } from "react-icons/fi"; // Import icons

// Component to display prettified JSON
const JsonViewer = ({ data }) => {
    let formattedJson = "Invalid JSON data";
    try {
        // Attempt to parse if it's a string, otherwise format directly
        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
        formattedJson = JSON.stringify(jsonData, null, 2); // Pretty print with 2 spaces
    } catch (e) {
        console.error("Error parsing report data:", e);
         // If parsing fails but it's an object/array, try stringifying it anyway
         if (typeof data === 'object' && data !== null) {
             try {
                formattedJson = JSON.stringify(data, null, 2);
             } catch (stringifyError) {
                 console.error("Error stringifying report data:", stringifyError);
                 formattedJson = "Could not display report data.";
             }
         } else {
            // Fallback for non-JSON string data or other types
            formattedJson = String(data);
         }
    }
    return (
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-[60vh]">
            <code>{formattedJson}</code>
        </pre>
    );
};


const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for viewing report details
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingReport, setViewingReport] = useState(null); // Holds the full report data
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState(null);

  // State for deleting
  const [isDeleting, setIsDeleting] = useState(null); // Store ID of report being deleted


  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ *** UPDATED URL HERE ***
      const response = await fetch("http://localhost:5000/api/reports");
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch reports: ${response.status} ${errText}`);
      }
      const data = await response.json();
      setReports(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full details for a single report
  const fetchReportDetails = async (reportId) => {
      setViewLoading(true);
      setViewError(null);
      setViewingReport(null); // Clear previous data
      try {
          // ✅ *** Use specific report endpoint ***
          const response = await fetch(`http://localhost:5000/api/reports/${reportId}`);
           if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Failed to fetch report details: ${response.status} ${errText}`);
            }
            const data = await response.json();
            setViewingReport(data); // Store the full report object
      } catch (err) {
          console.error(`Error fetching report ${reportId}:`, err);
          setViewError(err.message);
      } finally {
          setViewLoading(false);
      }
  }

  // Handle opening the view modal
  const handleViewReport = (reportId) => {
      fetchReportDetails(reportId);
      setShowViewModal(true);
  }

  // Handle deleting a report
  const handleDeleteReport = async (reportId) => {
      // Basic confirmation
      if (!window.confirm(`Are you sure you want to delete report ID ${reportId}? This cannot be undone.`)) {
          return;
      }

      setIsDeleting(reportId); // Set loading state for this specific report
      setError(null); // Clear previous general errors

      try {
          // ✅ *** Use delete endpoint ***
          const response = await fetch(`http://localhost:5000/api/reports/${reportId}`, {
              method: 'DELETE',
          });

           if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Try to parse JSON error
                throw new Error(errorData.error || `Failed to delete report: ${response.status}`);
            }

            // If successful, remove the report from the local state
            setReports(currentReports => currentReports.filter(report => report.report_id !== reportId));
            console.log(`Report ${reportId} deleted successfully.`);

      } catch (err) {
          console.error(`Error deleting report ${reportId}:`, err);
          setError(`Failed to delete report ${reportId}: ${err.message}`); // Show error specific to delete action
      } finally {
          setIsDeleting(null); // Clear loading state
      }
  };

  // Main page loading state
  if (loading) {
    return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading reports...</span></div>;
  }

  // Main page error state
  if (error && !reports.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Reports Management</h1>
        {/* Add Button to Generate Report if needed */}
        {/* <Button>Generate New Report</Button> */}
      </div>

       {/* Display general errors that occurred after initial load */}
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
              <TableHead>Report Name</TableHead>
              <TableHead>Generated By</TableHead>
              <TableHead className="w-[150px]">Date Generated</TableHead>
              <TableHead className="w-[180px] text-center">Actions</TableHead> {/* Added Actions column */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length > 0 ? (
              reports.map((report) => (
                <TableRow key={report.report_id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{report.report_id}</TableCell>
                  <TableCell>{report.report_name}</TableCell>
                  {/* ✅ *** Display User Name *** */}
                  <TableCell>{report.generated_by_user_name || `User ID: ${report.generated_by_user_id}` || "N/A"}</TableCell>
                  <TableCell>{new Date(report.created_at).toLocaleString()}</TableCell> {/* Use localeString for date+time */}
                  <TableCell className="text-center space-x-2">
                      {/* View Button */}
                      <Button variant="outline" size="sm" onClick={() => handleViewReport(report.report_id)} title="View Report Data">
                          <FiEye className="h-4 w-4 mr-1" /> View
                      </Button>
                      {/* Delete Button */}
                      <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteReport(report.report_id)}
                          disabled={isDeleting === report.report_id} // Disable only the button being clicked
                          title="Delete Report"
                      >
                          {isDeleting === report.report_id ? (
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
                <TableCell colSpan="5" className="text-center py-10 text-gray-500">
                  No reports found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Report Data Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="sm:max-w-lg md:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Report Details (ID: {viewingReport?.report_id})</DialogTitle>
                  <DialogDescription>
                    Viewing data for report: {viewingReport?.report_name}
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  {viewLoading && <div className="flex justify-center items-center h-40"><FiLoader className="h-6 w-6 animate-spin text-gray-500" /></div>}
                  {viewError && <div className="p-3 bg-red-100 text-red-700 rounded text-sm">Error loading details: {viewError}</div>}
                  {viewingReport && !viewLoading && !viewError && (
                     <div>
                        <h4 className="font-semibold mb-2">Report Data:</h4>
                        {/* Use the JsonViewer component */}
                        <JsonViewer data={viewingReport.report_data} />
                     </div>
                  )}
              </div>
               <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
};

export default Reports;