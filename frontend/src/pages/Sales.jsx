import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "../components/ui/Dialog";

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [searchDate, setSearchDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newSale, setNewSale] = useState({
    product_id: "",
    quantity_sold: "",
    total_price: "",
    sold_by_user_id: ""
  });

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await fetch("http://localhost:5000/sales");
      if (!response.ok) throw new Error("Failed to fetch sales data");
      const data = await response.json();
      setSales(data);
      setFilteredSales(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    if (!searchDate) {
      setFilteredSales(sales);
      return;
    }
    const filtered = sales.filter(sale => sale.sale_date.startsWith(searchDate));
    setFilteredSales(filtered);
  };

  const handleAddSale = async () => {
    if (!newSale.product_id || !newSale.quantity_sold || !newSale.total_price) {
      alert("Please fill all required fields!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSale)
      });

      if (!response.ok) throw new Error("Failed to add sale");

      const addedSale = await response.json();
      setSales([...sales, addedSale]);
      setFilteredSales([...filteredSales, addedSale]);
      setShowModal(false);
      setNewSale({ product_id: "", quantity_sold: "", total_price: "", sold_by_user_id: "" });
    } catch (error) {
      console.error("Error adding sale:", error);
    }
  };

  const handleExportCSV = () => {
    const csvData = [
      ["Sales ID", "Sale Date", "Product ID", "Quantity Sold", "Total Price", "Sold By"],
      ...filteredSales.map(sale => [
        sale.sales_id,
        sale.sale_date,
        sale.product_id,
        sale.quantity_sold,
        `$${Number(sale.total_price).toFixed(2)}`,
        sale.sold_by_user_id || "N/A"
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvData.map(row => row.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sales_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <p>Loading sales...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Records</h1>
        <Button onClick={() => setShowModal(true)}>Add Sale</Button>
      </div>
      <div className="flex space-x-2">
        <Input
          className="max-w-sm bg-gray-800 text-white placeholder-white"
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
        />
        <Button variant="outline" onClick={handleFilter}>Filter</Button>
        <Button onClick={handleExportCSV}>Export to CSV</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Product ID</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Total Price</TableHead>
            <TableHead>Sold By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
  {filteredSales.length > 0 ? (
    filteredSales.map((sale) => (
      <TableRow key={sale.sales_id}>
        <TableCell>{sale.sales_id}</TableCell>
        <TableCell>{new Date(sale.sale_date).toLocaleDateString("en-GB")}</TableCell>
        <TableCell>{sale.product_id}</TableCell>
        <TableCell>{sale.quantity_sold}</TableCell>
        <TableCell>${Number(sale.total_price).toFixed(2)}</TableCell>
        <TableCell>{sale.sold_by_user_id || "N/A"}</TableCell>
      </TableRow>
    ))
  ) : (
    <TableRow>
      <TableCell colSpan="6" className="text-center py-4">
        No sales records found.
      </TableCell>
    </TableRow>
  )}
</TableBody>

      </Table>

      {/* Add New Sale Modal */}
      {showModal && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Sale</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="number"
                placeholder="Product ID"
                value={newSale.product_id}
                onChange={(e) => setNewSale({ ...newSale, product_id: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Quantity Sold"
                value={newSale.quantity_sold}
                onChange={(e) => setNewSale({ ...newSale, quantity_sold: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Total Price"
                value={newSale.total_price}
                onChange={(e) => setNewSale({ ...newSale, total_price: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Sold By (User ID)"
                value={newSale.sold_by_user_id}
                onChange={(e) => setNewSale({ ...newSale, sold_by_user_id: e.target.value })}
              />
              <div className="flex justify-end space-x-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddSale}>Add Sale</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Sales;
