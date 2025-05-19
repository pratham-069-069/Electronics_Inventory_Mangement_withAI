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

      {/* Add New User Modal - Dark Theme */}
<Dialog open={showModal} onOpenChange={setShowModal}>
  {/* Dark background for the entire modal content */}
  <DialogContent className="sm:max-w-md bg-gray-900 text-gray-200 rounded-lg shadow-xl overflow-hidden"> {/* Changed max-width slightly */}

    {/* Header with dark background, slightly lighter border */}
    <DialogHeader className="px-6 py-5 bg-gray-800 border-b border-gray-700">
      <DialogTitle className="text-lg font-medium leading-6 text-white">
        Add New User
      </DialogTitle>
      <DialogDescription className="mt-1 text-sm text-gray-400">
        Enter user details. Email must be unique. Password is required.
      </DialogDescription>
    </DialogHeader>

    {/* Form with specific styling for dark theme */}
    {/* Using space-y for simpler vertical layout */}
    <form id="add-user-form" onSubmit={handleAddUser} className="px-6 py-6 space-y-5">

      {/* Error Message for dark theme */}
      {addError && (
          <div className="p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded-md text-sm font-medium">
              {addError}
          </div>
      )}

      {/* Field: Full Name */}
      <div>
        <Label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-1"> {/* Lighter label */}
          Name <span className="text-red-400">*</span> {/* Lighter required star */}
        </Label>
        <Input
          id="full_name"
          name="full_name"
          value={newUser.full_name}
          onChange={handleInputChange}
          // Dark input style
          className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
          required
        />
      </div>

      {/* Field: Email */}
      <div>
        <Label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
          Email <span className="text-red-400">*</span>
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="user@example.com"
          value={newUser.email}
          onChange={handleInputChange}
          className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
          required
        />
      </div>

      {/* Field: Password */}
      <div>
        <Label htmlFor="password_hash" className="block text-sm font-medium text-gray-300 mb-1">
          Password <span className="text-red-400">*</span>
        </Label>
        <Input
          id="password_hash"
          name="password_hash"
          type="password"
          placeholder="Enter initial password"
          value={newUser.password_hash}
          onChange={handleInputChange}
          className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
          required
        />
      </div>

      {/* Field: Phone Number */}
      <div>
        <Label htmlFor="phone_number" className="block text-sm font-medium text-gray-300 mb-1">
          Phone
        </Label>
        <Input
          id="phone_number"
          name="phone_number"
          type="tel"
          placeholder="+1 123 456 7890"
          value={newUser.phone_number}
          onChange={handleInputChange}
          className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder:text-gray-400"
        />
      </div>

      {/* Field: Role */}
      <div>
        <Label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">
          Role <span className="text-red-400">*</span>
        </Label>
        <select
          id="role"
          name="role"
          value={newUser.role}
          onChange={handleInputChange}
          // Dark theme select styling
          className="block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          required
        >
          {/* Style options for dark theme */}
          <option value="employee" className="text-white bg-gray-700">Employee</option>
          <option value="manager" className="text-white bg-gray-700">Manager</option>
          <option value="admin" className="text-white bg-gray-700">Admin</option>
        </select>
      </div>

      {/* Footer outside the main form content, within the DialogContent */}
      <DialogFooter className="px-6 py-4 bg-gray-800 border-t border-gray-700 flex justify-end space-x-3 mt-6"> {/* Added margin-top */}
        <DialogClose asChild>
          {/* Outline button styled for dark theme */}
          <Button
            type="button"
            variant="outline"
            className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
          >
            Cancel
          </Button>
        </DialogClose>
        {/* Primary button */}
        <Button
          type="submit"
          form="add-user-form" // Link button to the form
          disabled={isAdding}
          className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isAdding && <FiLoader className="mr-2 h-4 w-4 animate-spin" />}
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