import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";


const Suppliers = () => {
  const suppliers = [
    { id: 1, name: "Supplier A", contact: "John Doe", email: "john@suppliera.com", phone: "123-456-7890" },
    { id: 2, name: "Supplier B", contact: "Jane Smith", email: "jane@supplierb.com", phone: "987-654-3210" },
    { id: 3, name: "Supplier C", contact: "Bob Johnson", email: "bob@supplierc.com", phone: "456-789-0123" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Supplier Tracking</h1>
        <Button>Add New Supplier</Button>
      </div>
      <div className="flex space-x-2">
        <Input className="max-w-sm" placeholder="Search suppliers..." />
        <Button variant="outline">Search</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell>{supplier.id}</TableCell>
              <TableCell>{supplier.name}</TableCell>
              <TableCell>{supplier.contact}</TableCell>
              <TableCell>{supplier.email}</TableCell>
              <TableCell>{supplier.phone}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600">
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default Suppliers

