import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { auth, db } from "../../config/firebase";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, serverTimestamp, addDoc, getDoc, onSnapshot } from "firebase/firestore";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { toast } from "sonner";
import { 
  MessageCircle,
  FileText,
  User,
  Clock,
  Pencil,
  Trash2,
  Reply,
  ThumbsUp,
  ThumbsDown,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2
} from "lucide-react";

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

// Comment Card Component
const CommentCard = ({ comment, onEdit, onDelete, onReply, onReaction, isReceived }) => {
  const formattedDate = format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a");
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border p-4 space-y-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{comment.commentByEmail}</p>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="h-4 w-4 text-gray-400" />
              <p className="text-sm text-gray-500">{comment.department}</p>
            </div>
          </div>
        </div>
        <Badge 
          variant="secondary" 
          className={isReceived ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}
        >
          {isReceived ? "Received" : "Sent"}
        </Badge>
      </div>

      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <FileText className="h-4 w-4 text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Regarding file:</p>
          <p className="text-sm text-gray-900">{comment.fileName}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => onReaction(comment.id, 'like')}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            {comment.likes || 0}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onReaction(comment.id, 'dislike')}
          >
            <ThumbsDown className="h-4 w-4 mr-1" />
            {comment.dislikes || 0}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {!isReceived && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                onClick={() => onEdit(comment)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => onDelete(comment)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => onReply(comment)}
          >
            <Reply className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default function Comments() {
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalReceived: 0,
    recentComments: 0,
    pendingResponses: 0
  });
  const [activeTab, setActiveTab] = useState("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let unsubscribe;

    const setupCommentsListener = async () => {
      try {
        let commentsQuery;
        const commentsRef = collection(db, "file_comments");

        switch (activeTab) {
          case "sent":
            commentsQuery = query(
              commentsRef,
              where("commentBy", "==", auth.currentUser.uid),
              orderBy("createdAt", "desc")
            );
            break;
          case "received":
            commentsQuery = query(
              commentsRef,
              where("commentTo", "==", auth.currentUser.uid),
              orderBy("createdAt", "desc")
            );
            break;
          default:
            commentsQuery = query(
              commentsRef,
              where("commentBy", "in", [auth.currentUser.uid, auth.currentUser.uid]),
              orderBy("createdAt", "desc")
            );
        }

        // Set up real-time listener
        unsubscribe = onSnapshot(commentsQuery, async (snapshot) => {
          try {
            const commentsPromises = snapshot.docs.map(async (docSnapshot) => {
              const commentData = docSnapshot.data();
              
              // Fetch user's department
              const userDoc = await getDoc(doc(db, "users", commentData.commentBy));
              const department = userDoc.exists() ? userDoc.data().department : "Unknown Department";
              
              return {
                id: docSnapshot.id,
                ...commentData,
                department,
                createdAt: commentData.createdAt?.toDate?.() || new Date()
              };
            });

            const fetchedComments = await Promise.all(commentsPromises);
            setComments(fetchedComments);

            // Calculate stats
            const now = new Date();
            const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));

            setStats({
              totalSent: fetchedComments.filter(c => c.commentBy === auth.currentUser.uid).length,
              totalReceived: fetchedComments.filter(c => c.commentTo === auth.currentUser.uid).length,
              recentComments: fetchedComments.filter(c => c.createdAt > sevenDaysAgo).length,
              pendingResponses: fetchedComments.filter(c => 
                c.commentTo === auth.currentUser.uid && !c.hasResponse
              ).length
            });
          } catch (error) {
            console.error("Error processing comments update:", error);
            toast.error("Failed to process comments update");
          }
        }, (error) => {
          console.error("Error in comments listener:", error);
          toast.error("Failed to listen to comments updates");
        });
      } catch (error) {
        console.error("Error setting up comments listener:", error);
        toast.error("Failed to setup comments listener");
      }
    };

    setupCommentsListener();

    // Cleanup function to unsubscribe from the listener when component unmounts
    // or when activeTab changes
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeTab]); // Re-run when activeTab changes

  const handleEdit = (comment) => {
    setSelectedComment(comment);
    setCommentText(comment.comment);
    setEditDialogOpen(true);
  };

  const handleDelete = (comment) => {
    setSelectedComment(comment);
    setDeleteDialogOpen(true);
  };

  const handleReply = (comment) => {
    setSelectedComment(comment);
    setCommentText("");
    setReplyDialogOpen(true);
  };

  const handleReaction = async (commentId, type) => {
    try {
      const commentRef = doc(db, "file_comments", commentId);
      const field = type === 'like' ? 'likes' : 'dislikes';
      
      await updateDoc(commentRef, {
        [field]: (comments.find(c => c.id === commentId)[field] || 0) + 1
      });

      toast.success(`${type === 'like' ? 'Liked' : 'Disliked'} comment`);
      // No need to call fetchComments() as the listener will update automatically
    } catch (error) {
      console.error("Error updating reaction:", error);
      toast.error("Failed to update reaction");
    }
  };

  const handleEditSubmit = async () => {
    if (!commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "file_comments", selectedComment.id), {
        comment: commentText.trim(),
        editedAt: serverTimestamp()
      });

      toast.success("Comment updated successfully");
      setEditDialogOpen(false);
      setCommentText("");
      setSelectedComment(null);
      // No need to call fetchComments() as the listener will update automatically
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteDoc(doc(db, "file_comments", selectedComment.id));
      toast.success("Comment deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedComment(null);
      // No need to call fetchComments() as the listener will update automatically
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const handleReplySubmit = async () => {
    if (!commentText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user's department
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const department = userDoc.exists() ? userDoc.data().department : "Unknown Department";

      await addDoc(collection(db, "file_comments"), {
        fileId: selectedComment.fileId,
        fileName: selectedComment.fileName,
        commentBy: auth.currentUser.uid,
        commentByEmail: auth.currentUser.email,
        department,
        commentTo: selectedComment.commentBy,
        comment: commentText.trim(),
        createdAt: serverTimestamp(),
        replyTo: selectedComment.id
      });

      // Mark original comment as responded
      await updateDoc(doc(db, "file_comments", selectedComment.id), {
        hasResponse: true
      });

      toast.success("Reply sent successfully");
      setReplyDialogOpen(false);
      setCommentText("");
      setSelectedComment(null);
      // No need to call fetchComments() as the listener will update automatically
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setIsSubmitting(false);
    }
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
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
                Comments
              </h1>
              <p className="text-white/80">
                Manage and track your file comments and discussions
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
          icon={<MessageCircle className="w-6 h-6 text-blue-500" />}
          title="Total Comments"
          value={comments.length}
          description="All comments and replies"
          gradient="bg-gradient-to-br from-blue-500/20 to-purple-500/20"
        />
        <StatsCard
          icon={<Reply className="w-6 h-6 text-green-500" />}
          title="Comments Sent"
          value={stats.totalSent}
          description="Comments you've made"
          gradient="bg-gradient-to-br from-green-500/20 to-emerald-500/20"
        />
        <StatsCard
          icon={<AlertCircle className="w-6 h-6 text-orange-500" />}
          title="Pending Responses"
          value={stats.pendingResponses}
          description="Comments awaiting your reply"
          gradient="bg-gradient-to-br from-orange-500/20 to-red-500/20"
        />
        <StatsCard
          icon={<Clock className="w-6 h-6 text-purple-500" />}
          title="Recent Activity"
          value={stats.recentComments}
          description="Comments in the last 7 days"
          gradient="bg-gradient-to-br from-purple-500/20 to-pink-500/20"
        />
      </div>

      {/* Comments Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border bg-gradient-to-br from-white to-primary/5 shadow-sm overflow-hidden"
      >
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid w-[400px] grid-cols-3">
                <TabsTrigger value="all">All Comments</TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
                <TabsTrigger value="received">Received</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No comments yet</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {comments.map((comment) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onReply={handleReply}
                      onReaction={handleReaction}
                      isReceived={comment.commentTo === auth.currentUser.uid}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent" className="space-y-4">
              {comments.filter(c => c.commentBy === auth.currentUser.uid).length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Reply className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">You haven't sent any comments yet</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {comments
                    .filter(c => c.commentBy === auth.currentUser.uid)
                    .map((comment) => (
                      <CommentCard
                        key={comment.id}
                        comment={comment}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReply={handleReply}
                        onReaction={handleReaction}
                        isReceived={false}
                      />
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="received" className="space-y-4">
              {comments.filter(c => c.commentTo === auth.currentUser.uid).length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No comments received yet</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {comments
                    .filter(c => c.commentTo === auth.currentUser.uid)
                    .map((comment) => (
                      <CommentCard
                        key={comment.id}
                        comment={comment}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onReply={handleReply}
                        onReaction={handleReaction}
                        isReceived={true}
                      />
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Pencil className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Edit Comment</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Edit your comment on "{selectedComment?.fileName}"
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="mt-4">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Edit your comment..."
              className="min-h-[120px] resize-none"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setCommentText("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!commentText.trim() || isSubmitting}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmitting ? (
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
                  Saving...
                </div>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Comment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Reply className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Reply to Comment</DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-1">
                  Reply to {selectedComment?.commentByEmail}'s comment
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500 mb-2">Original comment:</p>
              <p className="text-sm text-gray-700">{selectedComment?.comment}</p>
            </div>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write your reply..."
              className="min-h-[120px] resize-none"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setReplyDialogOpen(false);
                setCommentText("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReplySubmit}
              disabled={!commentText.trim() || isSubmitting}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmitting ? (
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
                "Send Reply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 