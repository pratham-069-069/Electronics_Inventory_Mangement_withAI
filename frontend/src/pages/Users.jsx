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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Import DialogDescription
  DialogFooter, // Import DialogFooter
  DialogClose,
} from "../components/ui/Dialog"; // Adjust paths if needed
import { FiUserPlus, FiTrash2, FiLoader, FiAlertCircle } from "react-icons/fi"; // Import icons

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [addError, setAddError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null); // Store ID being deleted

  const initialNewUserState = {
    full_name: "",
    email: "",
    password_hash: "",
    phone_number: "",
    role: "employee",
  };
  const [newUser, setNewUser] = useState(initialNewUserState);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/api/users");
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch users: ${response.status} ${errText}`);
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Fetch Users Error:", err);
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);

    if (!newUser.full_name || !newUser.email || !newUser.password_hash || !newUser.role) {
      setAddError("Full Name, Email, Password, and Role are required.");
      setIsAdding(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to add user: ${response.status}`);
      }
      setUsers(prev => [...prev, responseData]);
      setShowModal(false);
      setNewUser(initialNewUserState);
    } catch (error) {
      console.error("Error adding user:", error);
      setAddError(error.message || "An unexpected error occurred.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}" (ID: ${userId})? This might fail if the user is linked to sales or reports.`)) {
        return;
    }
    setIsDeleting(userId);
    setError(null);

    try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
            method: 'DELETE',
        });
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(responseData.error || responseData.message || `Failed to delete user: ${response.status}`);
        }
        setUsers(prev => prev.filter(u => u.user_id !== userId));
        console.log(`User ${userId} deleted successfully.`);
    } catch (err) {
        console.error(`Error deleting user ${userId}:`, err);
        setError(`Delete failed for user ${userName}: ${err.message}`);
    } finally {
        setIsDeleting(null);
    }
  };

  const openAddModal = () => {
      setNewUser(initialNewUserState);
      setAddError(null);
      setShowModal(true);
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><FiLoader className="h-8 w-8 animate-spin text-gray-500" /> <span className="ml-2">Loading users...</span></div>;
  }

  if (error && !users.length) {
      return <div className="m-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded flex items-center"><FiAlertCircle className="h-5 w-5 mr-2" /> Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
        <Button onClick={openAddModal}>
            <FiUserPlus className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </div>

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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.user_id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{user.user_id}</TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone_number || "N/A"}</TableCell>
                  <TableCell>
                     <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                         user.role === 'admin' ? 'bg-red-100 text-red-800' :
                         user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                         'bg-gray-100 text-gray-800'
                     }`}>
                         {user.role}
                     </span>
                  </TableCell>
                  <TableCell className="text-center">
                      <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-100"
                          onClick={() => handleDeleteUser(user.user_id, user.full_name)}
                          disabled={isDeleting === user.user_id}
                          title="Delete User"
                      >
                          {isDeleting === user.user_id ? (
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
                <TableCell colSpan="6" className="text-center py-10 text-gray-500">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Enter user details. Email must be unique. Password is required.
            </DialogDescription>
          </DialogHeader>
          {/* Form starts here */}
          <form onSubmit={handleAddUser} className="grid gap-4 py-4">
             {addError && (
                <div className="col-span-2 p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
                    {addError}
                </div>
             )}
             {/* Grid layout for form fields */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="full_name" className="text-right">Name *</Label>
              <Input id="full_name" name="full_name" value={newUser.full_name} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="user@example.com" value={newUser.email} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password_hash" className="text-right">Password *</Label>
              <Input id="password_hash" name="password_hash" type="password" placeholder="Enter initial password" value={newUser.password_hash} onChange={handleInputChange} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone_number" className="text-right">Phone</Label>
              <Input id="phone_number" name="phone_number" type="tel" value={newUser.phone_number} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="role" className="text-right">Role *</Label>
               <select
                 id="role"
                 name="role"
                 value={newUser.role}
                 onChange={handleInputChange}
                 className="col-span-3 border rounded px-3 py-2 bg-white"
                 required
               >
                 <option value="employee">Employee</option>
                 <option value="manager">Manager</option>
                 <option value="admin">Admin</option>
               </select>
             </div>
            {/* Footer with buttons inside the form */}
            <DialogFooter className="col-span-full"> {/* Ensure footer spans columns if needed, or place after form grid */}
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? <FiLoader className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isAdding ? "Adding..." : "Add User"}
              </Button>
            </DialogFooter>
          </form> {/* Form ends here */}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;