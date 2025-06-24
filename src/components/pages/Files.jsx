import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../../config/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { 
  FileText, 
  Upload, 
  HardDrive, 
  Clock,
  Download,
  Share2,
  Trash2,
  Search,
  Plus,
  CheckCircle2,
  X,
  User
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination"

// Stats Card Component
const StatsCard = ({ icon, title, value, description, gradient }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`relative overflow-hidden rounded-2xl ${gradient} p-[1px]`}
  >
    <div className="relative bg-white dark:bg-gray-900 rounded-[11px] p-6 h-full">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-white/[0.12]">
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400">
            {value}
          </p>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent" />
    </div>
  </motion.div>
);

// File Icon Component
const FileIcon = ({ type }) => {
  const getIconConfig = () => {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return { bg: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/20', text: 'text-red-600 dark:text-red-400' };
      case 'doc':
      case 'docx':
        return { bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20', text: 'text-blue-600 dark:text-blue-400' };
      case 'xls':
      case 'xlsx':
        return { bg: 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20', text: 'text-green-600 dark:text-green-400' };
      case 'jpg':
      case 'jpeg':
      case 'png':
        return { bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20', text: 'text-purple-600 dark:text-purple-400' };
      default:
        return { bg: 'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/20 dark:to-gray-700/20', text: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const { bg, text } = getIconConfig();

  return (
    <div className={`w-12 h-12 flex items-center justify-center ${bg} rounded-xl shadow-sm`}>
      <FileText className={`w-6 h-6 ${text}`} />
    </div>
  );
};

export default function Files() {
  const [files, setFiles] = useState([]);
  const [totalSize, setTotalSize] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentUsers, setDepartmentUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const itemsPerPage = 5;
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ fileName: "", size: 0 });

  useEffect(() => {
    fetchFiles();
    fetchDepartments();
  }, []);

  const fetchFiles = async () => {
    try {
      const q = query(
        collection(db, "files"),
        where("userId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const fetchedFiles = [];
      let total = 0;
      
      querySnapshot.forEach((doc) => {
        const fileData = { id: doc.id, ...doc.data() };
        fetchedFiles.push(fileData);
        total += fileData.size || 0;
      });

      setFiles(fetchedFiles);
      setTotalSize(total);
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Failed to fetch files");
    }
  };

  const fetchDepartments = async () => {
    try {
      // Since departments are stored as a field in users collection
      const usersSnapshot = await getDocs(collection(db, "users"));
      const departments = new Set();
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.department) {
          departments.add(userData.department);
        }
      });

      const departmentsList = Array.from(departments).map(dept => ({
        id: dept,
        name: dept
      }));

      setDepartments(departmentsList);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to fetch departments");
    }
  };

  const fetchDepartmentUsers = async (departmentName) => {
    try {
      const usersSnapshot = await getDocs(
        query(collection(db, "users"), where("department", "==", departmentName))
      );
      
      const usersList = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => user.id !== auth.currentUser.uid); // Exclude current user
      
      setDepartmentUsers(usersList);
    } catch (error) {
      console.error("Error fetching department users:", error);
      toast.error("Failed to fetch users");
      setDepartmentUsers([]);
    }
  };

  const handleDepartmentChange = async (value) => {
    setSelectedDepartment(value);
    setSelectedUsers([]); // Clear selected users when department changes
    await fetchDepartmentUsers(value);
  };

  const handleUserSelection = (userId, checked) => {
    setSelectedUsers(prev => 
      checked 
        ? [...prev, userId]
        : prev.filter(id => id !== userId)
    );
  };

  const handleShareSubmit = async () => {
    if (!selectedUsers.length) {
      toast.error("Please select at least one user");
      return;
    }

    setIsSharing(true);
    try {
      const sharePromises = selectedUsers.map(userId => 
        addDoc(collection(db, "shared_files"), {
          fileId: selectedFile.id,
          fileName: selectedFile.name,
          fileUrl: selectedFile.url,
          sharedBy: auth.currentUser.uid,
          sharedWith: userId,
          sharedAt: new Date().toISOString(),
          departmentId: selectedDepartment
        })
      );

      await Promise.all(sharePromises);
      toast.success("File shared successfully");
      setIsShareSheetOpen(false);
      setSelectedDepartment("");
      setSelectedUsers([]);
      setDepartmentUsers([]);
    } catch (error) {
      console.error("Error sharing file:", error);
      toast.error("Failed to share file");
    } finally {
      setIsSharing(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus({
      fileName: file.name,
      size: file.size
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'files_upload');
      formData.append('api_key', '193495561563881');

      const cloudinaryUrl = 'https://api.cloudinary.com/v1_1/djvwuaoja/auto/upload';
      
      // Create a promise to handle the upload
      const uploadPromise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Configure the request
        xhr.open('POST', cloudinaryUrl, true);
        
        // Set up progress tracking
        let lastProgress = 0;
        let progressUpdateTimeout;
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            // Calculate actual upload progress
            const currentProgress = Math.round((event.loaded / event.total) * 90); // Max 90% during upload
            
            // Only update if progress has increased by at least 1%
            if (currentProgress > lastProgress) {
              clearTimeout(progressUpdateTimeout);
              progressUpdateTimeout = setTimeout(() => {
                setUploadProgress(currentProgress);
                lastProgress = currentProgress;
              }, 100); // Throttle updates to every 100ms
            }
          }
        };

        // Handle the response
        xhr.onload = () => {
          if (xhr.status === 200) {
            setUploadProgress(95); // Processing stage
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error occurred during upload'));
        };

        // Send the formData
        xhr.send(formData);
      });

      // Wait for upload to complete
      const data = await uploadPromise;
      
      // Set progress to 98% while saving to Firestore
      setUploadProgress(98);

      // Get standardized file type
      const getFileType = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        switch(ext) {
          case 'pdf': return 'PDF';
          case 'doc':
          case 'docx': return 'DOCX';
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif': return 'IMG';
          case 'xls':
          case 'xlsx': return 'EXCEL';
          case 'ppt':
          case 'pptx': return 'PPT';
          case 'txt': return 'TXT';
          default: return ext.toUpperCase();
        }
      };

      // Save file metadata to Firestore
      await addDoc(collection(db, "files"), {
        name: file.name,
        size: file.size,
        type: getFileType(file.name),
        extension: file.name.split('.').pop().toLowerCase(),
        url: data.secure_url,
        public_id: data.public_id,
        userId: auth.currentUser.uid,
        uploadedAt: new Date().toISOString()
      });

      // Set progress to 100% only after everything is complete
      setUploadProgress(100);
      
      // Short delay before closing the dialog to show 100%
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success("File uploaded successfully");
      fetchFiles();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus({ fileName: "", size: 0 });
      event.target.value = '';
    }
  };

  const handleDeleteClick = (file) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    try {
      await deleteDoc(doc(db, "files", fileToDelete.id));
      
      // Update local state immediately
      setFiles(prevFiles => {
        const updatedFiles = prevFiles.filter(file => file.id !== fileToDelete.id);
        
        // Update total size
        const newTotalSize = updatedFiles.reduce((total, file) => total + (file.size || 0), 0);
        setTotalSize(newTotalSize);

        // Check if current page will be empty after deletion
        const filteredFiles = updatedFiles.filter((file) =>
          file.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
        
        // If current page would be empty and it's not the first page, go to previous page
        if (currentPage > 1 && currentPage > totalPages) {
          setCurrentPage(Math.max(1, totalPages));
        }

        return updatedFiles;
      });

      toast.success("File deleted successfully");
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const handleShare = (file) => {
    setSelectedFile(file);
    setIsShareSheetOpen(true);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSelectAll = (checked) => {
    setIsAllSelected(checked);
    if (checked) {
      setSelectedRows(paginatedFiles.map(file => file.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (fileId) => {
    setSelectedRows(prev => {
      const isSelected = prev.includes(fileId);
      if (isSelected) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRows.map(fileId => 
        deleteDoc(doc(db, "files", fileId))
      ));

      // Update local state immediately
      setFiles(prevFiles => {
        const updatedFiles = prevFiles.filter(file => !selectedRows.includes(file.id));
        
        // Update total size
        const newTotalSize = updatedFiles.reduce((total, file) => total + (file.size || 0), 0);
        setTotalSize(newTotalSize);

        // Check if current page will be empty after deletion
        const filteredFiles = updatedFiles.filter((file) =>
          file.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
        
        // If current page would be empty and it's not the first page, go to previous page
        if (currentPage > 1 && currentPage > totalPages) {
          setCurrentPage(Math.max(1, totalPages));
        }

        return updatedFiles;
      });

      toast.success("Selected files deleted successfully");
      setSelectedRows([]);
      setIsAllSelected(false);
      setBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting files:", error);
      toast.error("Failed to delete selected files");
    }
  };

  // Update the filtered and paginated files calculation
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
  
  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const paginatedFiles = filteredFiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-8"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="relative z-10 max-w-4xl"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
                My Files
              </h1>
              <p className="text-white/80">
                Manage and organize your documents securely
              </p>
            </div>
          </div>
        </motion.div>
        <div className="absolute inset-0 w-full h-full">
          <svg className="absolute right-0 top-0 h-full w-1/2 translate-x-1/2" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100V0l100 0v100ZM0 100V0l50 50Z" fill="white" fillOpacity="0.05" />
          </svg>
          <svg className="absolute left-0 bottom-0 h-full w-1/2 -translate-x-1/2" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100 0v100H0V0ZM100 0v100L50 50Z" fill="white" fillOpacity="0.05" />
          </svg>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatsCard
          icon={<FileText className="w-6 h-6 text-blue-500" />}
          title="Total Files"
          value={files.length}
          description={`${files.length} file${files.length === 1 ? '' : 's'} in total`}
          gradient="bg-gradient-to-br from-blue-500/20 to-purple-500/20"
        />
        <StatsCard
          icon={<HardDrive className="w-6 h-6 text-green-500" />}
          title="Storage Used"
          value={formatBytes(totalSize)}
          description={`${Math.round((totalSize / (1024 * 1024 * 1024)) * 100)}% of 1GB used`}
          gradient="bg-gradient-to-br from-green-500/20 to-emerald-500/20"
        />
        <StatsCard
          icon={<Clock className="w-6 h-6 text-orange-500" />}
          title="Recent Files"
          value={files.filter(f => {
            const date = new Date(f.uploadedAt);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            return diffDays < 7;
          }).length}
          description="Uploaded in the last 7 days"
          gradient="bg-gradient-to-br from-orange-500/20 to-red-500/20"
        />
      </div>

      {/* Files Table Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border bg-white shadow-sm overflow-hidden"
      >
        {/* Search and Upload Controls */}
        <div className="p-6 border-b bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white border-gray-200"
              />
            </div>
            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-primary hover:bg-primary/90 text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                Upload File
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Files Banner */}
        {selectedRows.length > 0 && (
          <div className="bg-gray-50 px-6 py-3 border-b flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {selectedRows.length} {selectedRows.length === 1 ? 'file' : 'files'} selected
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        )}

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[300px]">Name</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[150px]">Size</TableHead>
              <TableHead className="w-[150px]">Uploaded</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-2">
                      {searchTerm ? "No files match your search" : "No files uploaded yet"}
                    </p>
                    {!searchTerm && (
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Upload your first file
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedFiles.map((file) => (
                <TableRow key={file.id} className="border-b">
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(file.id)}
                      onCheckedChange={() => handleSelectRow(file.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FileIcon type={file.type} />
                      <p className="font-medium text-gray-900">{file.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20">
                      {file.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{formatBytes(file.size)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{format(new Date(file.uploadedAt), "MMM d, yyyy")}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, "_blank")}
                        className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShare(file)}
                        className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                        title="Share"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(file)}
                        className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filteredFiles.length > itemsPerPage && (
          <div className="py-4 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i + 1}>
                    <PaginationLink
                      onClick={() => setCurrentPage(i + 1)}
                      isActive={currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </motion.div>

      {/* Share Sheet */}
      <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="pb-6 border-b text-center">
            <div className="flex justify-center mb-3">
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
                <Share2 className="h-7 w-7 text-blue-600" />
              </div>
            </div>
            <SheetTitle className="text-xl font-semibold mb-1">Share File</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Share "{selectedFile?.name}" with other users
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 px-4">
            <div className="space-y-6">
              {/* Department Selection */}
              <div className="space-y-3">
                <div className="text-center">
                  <label htmlFor="department" className="text-base font-semibold text-gray-900 block">
                    Select Department
                  </label>
                </div>
                <Select 
                  value={selectedDepartment} 
                  onValueChange={handleDepartmentChange}
                >
                  <SelectTrigger className="w-full h-10 text-base">
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent className="w-full min-w-[300px]">
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name} className="py-2">
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Users Selection */}
              {departmentUsers.length > 0 && (
                <div className="space-y-3">
                  <label className="text-base font-semibold text-gray-900 block text-center">
                    Select Users to Share With
                  </label>
                  <div className="border rounded-lg overflow-hidden">
                    <ScrollArea className="h-[200px] p-3">
                      <div className="space-y-2">
                        {departmentUsers.map((user) => (
                          <div
                            key={user.id}
                            className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                              selectedUsers.includes(user.id)
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            <Checkbox
                              id={user.id}
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                                }
                              }}
                              className="h-4 w-4"
                            />
                            <label
                              htmlFor={user.id}
                              className="flex-1 flex items-center cursor-pointer"
                            >
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-2">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{user.email}</p>
                                <p className="text-xs text-gray-500">{user.department}</p>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsShareSheetOpen(false);
                  setSelectedDepartment("");
                  setSelectedUsers([]);
                }}
                className="px-4 h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={handleShareSubmit}
                disabled={!selectedUsers.length || isSharing}
                className="px-4 h-9 bg-primary hover:bg-primary/90"
              >
                {isSharing ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sharing...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </div>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Files</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRows.length} {selectedRows.length === 1 ? 'file' : 'files'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete {selectedRows.length} {selectedRows.length === 1 ? 'file' : 'files'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-medium">{fileToDelete?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Progress Modal */}
      <Dialog open={isUploading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-between mb-2">
            <DialogTitle className="text-lg font-semibold">Uploading File</DialogTitle>
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }} 
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DialogDescription className="text-sm text-gray-500 mb-6">
            Please wait while your file is being uploaded...
          </DialogDescription>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Upload className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 break-all">
                  {uploadStatus.fileName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatBytes(uploadStatus.size)}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress 
                value={uploadProgress} 
                className="h-1.5 bg-gray-100"
              />
            </div>

            <p className="text-xs text-gray-500 text-center pt-2">
              Please don't close this window while uploading
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 