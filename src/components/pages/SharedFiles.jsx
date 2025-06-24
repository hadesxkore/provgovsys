import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { auth, db } from "../../config/firebase";
import { collection, query, where, getDocs, getDoc, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { 
  Share2, 
  Users, 
  Clock, 
  Building2,
  FileText,
  Download,
  Eye,
  Trash2,
  User,
  ArrowRightLeft,
  MessageCircle
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";

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

export default function SharedFiles() {
  const [sharedWithMe, setSharedWithMe] = useState([]);
  const [sharedByMe, setSharedByMe] = useState([]);
  const [activeTab, setActiveTab] = useState("shared-with-me");
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalShared: 0,
    recentShares: 0,
    departments: new Set(),
    collaborators: new Set()
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedFileForComment, setSelectedFileForComment] = useState(null);
  const [comment, setComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    fetchSharedFiles();
  }, []);

  const handleDeleteClick = (file) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    
    try {
      await deleteDoc(doc(db, "shared_files", fileToDelete.id));
      toast.success("Share removed successfully");
      fetchSharedFiles();
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error("Error removing share:", error);
      toast.error("Failed to remove share");
    }
  };

  const handleCommentClick = (file) => {
    setSelectedFileForComment(file);
    setCommentDialogOpen(true);
    setComment("");
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, "file_comments"), {
        fileId: selectedFileForComment.fileId,
        fileName: selectedFileForComment.fileName,
        commentBy: auth.currentUser.uid,
        commentByEmail: auth.currentUser.email,
        commentTo: selectedFileForComment.sharedBy,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });

      toast.success("Comment sent successfully");
      setCommentDialogOpen(false);
      setComment("");
      setSelectedFileForComment(null);
    } catch (error) {
      console.error("Error sending comment:", error);
      toast.error("Failed to send comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      const fileName = file.fileName || file.fileUrl.split('/').pop();
      const fileExtension = fileName.split('.').pop().toLowerCase();
      
      // Modify the Cloudinary URL to force download
      let downloadUrl = file.fileUrl;
      if (downloadUrl.includes('cloudinary.com')) {
        const urlParts = downloadUrl.split('/upload/');
        downloadUrl = urlParts[0] + '/upload/fl_attachment/' + urlParts[1];
      }

      // Special handling for PDF files
      if (fileExtension === 'pdf') {
        const loadingToast = toast.loading(`Preparing ${fileName} for download...`);
        
        try {
          // Fetch the PDF file as a blob
          const response = await fetch(downloadUrl);
          const blob = await response.blob();
          
          // Create a blob URL
          const blobUrl = window.URL.createObjectURL(blob);
          
          // Create a temporary anchor element
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName; // Set the file name
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          
          // Dismiss loading toast and show success
          toast.dismiss(loadingToast);
          toast.success(`Successfully started download: ${fileName}`);
        } catch (error) {
          // Dismiss loading toast and show error
          toast.dismiss(loadingToast);
          throw error; // Re-throw to be caught by outer catch
        }
      } else {
        // For other file types, use the regular download method
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.setAttribute('download', fileName);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`Successfully started download: ${fileName}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error(`Failed to download ${file.fileName}: ${error.message}`);
    }
  };

  const fetchSharedFiles = async () => {
    try {
      // Fetch files shared with me
      const sharedWithMeQuery = query(
        collection(db, "shared_files"),
        where("sharedWith", "==", auth.currentUser.uid)
      );
      const sharedWithMeSnapshot = await getDocs(sharedWithMeQuery);
      const sharedWithMeFiles = await Promise.all(
        sharedWithMeSnapshot.docs.map(async (docSnapshot) => {
          const fileData = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          };
          
          // Fetch the shared by user's email
          const userDoc = await getDoc(doc(db, "users", fileData.sharedBy));
          if (userDoc.exists()) {
            fileData.sharedByEmail = userDoc.data().email;
            fileData.sharedByDepartment = userDoc.data().department;
          }
          
          return fileData;
        })
      );

      // Fetch files shared by me
      const sharedByMeQuery = query(
        collection(db, "shared_files"),
        where("sharedBy", "==", auth.currentUser.uid)
      );
      const sharedByMeSnapshot = await getDocs(sharedByMeQuery);
      const sharedByMeFiles = await Promise.all(
        sharedByMeSnapshot.docs.map(async (docSnapshot) => {
          const fileData = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          };
          
          // Fetch the shared with user's email
          const userDoc = await getDoc(doc(db, "users", fileData.sharedWith));
          if (userDoc.exists()) {
            fileData.sharedWithEmail = userDoc.data().email;
            fileData.sharedWithDepartment = userDoc.data().department;
          }
          
          return fileData;
        })
      );

      setSharedWithMe(sharedWithMeFiles);
      setSharedByMe(sharedByMeFiles);

      // Calculate stats
      const now = new Date();
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
      
      const departments = new Set();
      const collaborators = new Set();
      let recentShares = 0;

      [...sharedWithMeFiles, ...sharedByMeFiles].forEach(file => {
        if (file.departmentId) departments.add(file.departmentId);
        if (file.sharedBy) collaborators.add(file.sharedBy);
        if (file.sharedWith) collaborators.add(file.sharedWith);
        
        // Add to recent shares array if within last 7 days
        const sharedAt = file.sharedAt?.toDate?.() || new Date(file.sharedAt);
        if (sharedAt && sharedAt > sevenDaysAgo) {
          recentShares++;
        }
      });

      setStats({
        totalReceived: sharedWithMeFiles.length,
        totalShared: sharedByMeFiles.length,
        recentShares,
        departments,
        collaborators: new Set([...collaborators].filter(id => id !== auth.currentUser.uid))
      });

    } catch (error) {
      console.error("Error fetching shared files:", error);
      toast.error("Failed to fetch shared files");
    }
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };

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
              <Share2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
                Shared Files
              </h1>
              <p className="text-white/80">
                Manage and track your file sharing activities
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
      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard
          icon={<Share2 className="w-6 h-6 text-blue-500" />}
          title="Total Received"
          value={stats.totalReceived}
          description="Files shared with you"
          gradient="bg-gradient-to-br from-blue-500/20 to-purple-500/20"
        />
        <StatsCard
          icon={<ArrowRightLeft className="w-6 h-6 text-green-500" />}
          title="Total Shared"
          value={stats.totalShared}
          description="Files you've shared"
          gradient="bg-gradient-to-br from-green-500/20 to-emerald-500/20"
        />
        <StatsCard
          icon={<Users className="w-6 h-6 text-orange-500" />}
          title="Collaborators"
          value={stats.collaborators.size}
          description="Active collaborators"
          gradient="bg-gradient-to-br from-orange-500/20 to-red-500/20"
        />
        <StatsCard
          icon={<Building2 className="w-6 h-6 text-purple-500" />}
          title="Departments"
          value={stats.departments.size}
          description="Connected departments"
          gradient="bg-gradient-to-br from-purple-500/20 to-pink-500/20"
        />
      </div>

      {/* Tabs and Tables */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border bg-gradient-to-br from-white to-primary/5 shadow-sm overflow-hidden"
      >
        <div className="p-6">
          <Tabs defaultValue="shared-with-me" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="shared-with-me">Shared with Me</TabsTrigger>
              <TabsTrigger value="shared-by-me">Shared by Me</TabsTrigger>
            </TabsList>
            <TabsContent value="shared-with-me">
              <div className="rounded-xl overflow-hidden border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="w-[250px]">File Name</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[200px]">Shared By</TableHead>
                      <TableHead className="w-[150px]">Department</TableHead>
                      <TableHead className="w-[150px]">Date</TableHead>
                      <TableHead className="w-[180px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sharedWithMe.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                              <Share2 className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500">No files have been shared with you yet</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sharedWithMe.map((file) => (
                        <TableRow key={file.id} className="group border-b hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <FileIcon type={file.fileName.split('.').pop()} />
                              <p className="font-medium text-gray-900">{file.fileName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200 font-medium">
                              {file.fileName.split('.').pop().toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{file.sharedByEmail || "Unknown User"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">
                              {file.sharedByDepartment || "No Department"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{formatDate(file.sharedAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(file)}
                                className="h-8 px-3 border-gray-200 hover:bg-blue-50 transition-colors"
                                title="Download"
                              >
                                <Download className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(file.fileUrl, "_blank")}
                                className="h-8 px-3 border-gray-200 hover:bg-green-50 transition-colors"
                                title="View"
                              >
                                <Eye className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCommentClick(file)}
                                className="h-8 px-3 border-gray-200 hover:bg-purple-50 transition-colors"
                                title="Add Comment"
                              >
                                <MessageCircle className="h-4 w-4 text-purple-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="shared-by-me">
              <div className="rounded-xl overflow-hidden border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="w-[250px]">File Name</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[200px]">Shared With</TableHead>
                      <TableHead className="w-[150px]">Department</TableHead>
                      <TableHead className="w-[150px]">Date</TableHead>
                      <TableHead className="w-[150px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sharedByMe.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                              <Share2 className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500">You haven't shared any files yet</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sharedByMe.map((file) => (
                        <TableRow key={file.id} className="group border-b hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <FileIcon type={file.fileName.split('.').pop()} />
                              <p className="font-medium text-gray-900">{file.fileName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200 font-medium">
                              {file.fileName.split('.').pop().toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{file.sharedWithEmail || "Unknown User"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">
                              {file.sharedWithDepartment || "No Department"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{formatDate(file.sharedAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(file.fileUrl, "_blank")}
                                className="h-8 px-3 border-gray-200 hover:bg-blue-50"
                                title="Download"
                              >
                                <Download className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(file.fileUrl, "_blank")}
                                className="h-8 px-3 border-gray-200 hover:bg-green-50"
                                title="View"
                              >
                                <Eye className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(file)}
                                className="h-8 px-3 border-gray-200 hover:bg-red-50"
                                title="Remove Share"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Add Comment</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Send a comment about "{selectedFileForComment?.fileName}"
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Your Comment
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your comment here..."
              className="min-h-[120px] resize-none"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setCommentDialogOpen(false);
                setComment("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCommentSubmit}
              disabled={!comment.trim() || isSubmittingComment}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmittingComment ? (
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
                  Sending...
                </div>
              ) : (
                "Send Comment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Share Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove share access for "{fileToDelete?.fileName}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 