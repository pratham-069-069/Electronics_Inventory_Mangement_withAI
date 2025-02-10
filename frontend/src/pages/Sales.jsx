import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";


const Sales = () => {
  const sales = [
    { id: 1, date: "2023-05-01", product: "Product A", quantity: 5, total: 999.95 },
    { id: 2, date: "2023-05-02", product: "Product B", quantity: 3, total: 149.97 },
    { id: 3, date: "2023-05-03", product: "Product C", quantity: 2, total: 259.98 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Records</h1>
        <Button>Export to CSV</Button>
      </div>
      <div className="flex space-x-2">
        <Input className="max-w-sm" type="date" />
        <Button variant="outline">Filter</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell>{sale.id}</TableCell>
              <TableCell>{sale.date}</TableCell>
              <TableCell>{sale.product}</TableCell>
              <TableCell>{sale.quantity}</TableCell>
              <TableCell>${sale.total.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default Sales

