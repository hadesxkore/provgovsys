import { useState, useEffect, useMemo, useCallback, forwardRef } from "react";
import { auth, db } from "../config/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { getDepartmentFullName } from "../lib/utils";
import Files from "./pages/Files";
import SharedFiles from "./pages/SharedFiles";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { 
  LayoutDashboard, 
  FileText, 
  Share2, 
  Clock, 
  Trash2,
  Menu,
  User,
  LogOut,
  Building2,
  Users,
  ArrowRightLeft,
  CheckCircle2,
  MessageSquare
} from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import Comments from "./pages/Comments";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const ActivityIcon = ({ type }) => {
  switch (type) {
    case 'upload':
      return (
        <div className="p-2 bg-blue-100 rounded-full">
          <FileText className="w-4 h-4 text-blue-600" />
        </div>
      );
    case 'share':
      return (
        <div className="p-2 bg-green-100 rounded-full">
          <Share2 className="w-4 h-4 text-green-600" />
        </div>
      );
    case 'delete':
      return (
        <div className="p-2 bg-red-100 rounded-full">
          <Trash2 className="w-4 h-4 text-red-600" />
        </div>
      );
    default:
      return null;
  }
};

// Create a forwardRef wrapper for the Button component
const TooltipButton = forwardRef(({ children, ...props }, ref) => (
  <Button ref={ref} {...props}>
    {children}
  </Button>
));
TooltipButton.displayName = "TooltipButton";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [recentActivities, setRecentActivities] = useState([]);
  const [fileCounts, setFileCounts] = useState({
    myFiles: 0,
    sharedFiles: 0,
    comments: 0,
    sentComments: 0,
    receivedComments: 0
  });
  const [departmentStats, setDepartmentStats] = useState({
    totalCollaborations: 0,
    activeUsers: 0,
    recentShares: [],
    departments: new Set(),
    topDepartments: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [sharedFilesData, setSharedFilesData] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [notifications, setNotifications] = useState({
    newComments: 0,
    newSentComments: 0,
    newReceivedComments: 0
  });

  const navigate = useNavigate();

  // Separate useEffect for user data to load it faster
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      // Set up real-time listener for user data
      const userDocRef = doc(db, "users", currentUser.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          setUserData(docSnapshot.data());
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching user data:", error);
        toast.error("Failed to fetch user data");
        setIsLoading(false);
      });

      return () => unsubscribeUser();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // Single useEffect for all initial data fetching
  useEffect(() => {
    const initializeData = async () => {
      try {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
          if (!currentUser) {
            navigate("/login");
            return;
          }

          setUser(currentUser);

          try {
            // Fetch all data in parallel
            const [userDocSnapshot, filesSnapshot, sharedByMeSnapshot, sharedWithMeSnapshot, commentsSnapshot] = await Promise.all([
              getDoc(doc(db, "users", currentUser.uid)),
              getDocs(query(collection(db, "files"), where("userId", "==", currentUser.uid))),
              getDocs(query(collection(db, "shared_files"), where("sharedBy", "==", currentUser.uid))),
              getDocs(query(collection(db, "shared_files"), where("sharedWith", "==", currentUser.uid))),
              getDocs(query(collection(db, "file_comments"), where("userId", "==", currentUser.uid)))
            ]);

            // Update all state at once
            if (userDocSnapshot.exists()) {
              setUserData(userDocSnapshot.data());
            }

            setFileCounts({
              myFiles: filesSnapshot.size,
              sharedFiles: sharedByMeSnapshot.size + sharedWithMeSnapshot.size,
              comments: commentsSnapshot.size
            });

            // Fetch recent shared files with user data
            const sharedFilesQuery = query(
              collection(db, "shared_files"),
              orderBy("sharedAt", "desc"),
              limit(3)
            );
            
            const sharedFilesSnapshot = await getDocs(sharedFilesQuery);
            const sharedFiles = sharedFilesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            // Get unique user IDs from shared files
            const userIds = new Set();
            sharedFiles.forEach(file => {
              userIds.add(file.sharedBy);
              userIds.add(file.sharedWith);
            });

            // Fetch user data for all involved users
            const usersDataObj = {};
            await Promise.all(
              Array.from(userIds).map(async (userId) => {
                const userDoc = await getDoc(doc(db, "users", userId));
                if (userDoc.exists()) {
                  usersDataObj[userId] = userDoc.data();
                }
              })
            );

            setUsersData(usersDataObj);
            setSharedFilesData(sharedFiles);

            // Calculate dashboard stats
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            
            const departments = new Set();
            const collaborators = new Set();
            const recentSharesArray = [];

            [...sharedByMeSnapshot.docs, ...sharedWithMeSnapshot.docs].forEach(doc => {
              const data = doc.data();
              if (data.departmentId) departments.add(data.departmentId);
              if (data.sharedBy) collaborators.add(data.sharedBy);
              if (data.sharedWith) collaborators.add(data.sharedWith);
              
              // Add to recent shares array if within last 7 days
              const sharedAt = data.sharedAt?.toDate?.() || new Date(data.sharedAt);
              if (sharedAt && sharedAt > sevenDaysAgo) {
                recentSharesArray.push({
                  id: doc.id,
                  ...data,
                  sharedAt: sharedAt.toISOString() // Store as ISO string for consistent formatting
                });
              }
            });

            // Sort recent shares by date and take only 3 most recent
            const sortedRecentShares = recentSharesArray
              .sort((a, b) => new Date(b.sharedAt) - new Date(a.sharedAt))
              .slice(0, 3);

            setDepartmentStats({
              totalCollaborations: sharedByMeSnapshot.size + sharedWithMeSnapshot.size,
              activeUsers: collaborators.size,
              recentShares: sortedRecentShares,
              departments,
              topDepartments: []
            });

            // Fetch recent activities
            const activitiesQuery = query(
              collection(db, "activities"),
              where("userId", "==", currentUser.uid),
              orderBy("timestamp", "desc"),
              limit(5)
            );
            const activitiesSnapshot = await getDocs(activitiesQuery);
            setRecentActivities(activitiesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })));

          } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch data");
          } finally {
            setIsLoading(false);
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error in initialization:", error);
        setIsLoading(false);
      }
    };

    initializeData();
  }, [navigate]);

  // Update the comments listener
  useEffect(() => {
    if (!userData?.uid) return;

    const commentsRef = collection(db, "file_comments");
    
    // Query for all comments (both sent and received)
    const allCommentsQuery = query(
      commentsRef,
      where("commentBy", "in", [userData.uid, userData.uid]),
      orderBy("createdAt", "desc")
    );

    // Query for sent comments
    const sentQuery = query(
      commentsRef,
      where("commentBy", "==", userData.uid),
      orderBy("createdAt", "desc")
    );

    // Query for received comments
    const receivedQuery = query(
      commentsRef,
      where("commentTo", "==", userData.uid),
      orderBy("createdAt", "desc")
    );

    // Listen for all comments to get total count
    const unsubscribeAll = onSnapshot(allCommentsQuery, (snapshot) => {
      const totalCount = snapshot.docs.length;
      setFileCounts(prev => ({ ...prev, comments: totalCount }));
    });

    // Listen for sent comments
    const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
      const sentCount = snapshot.docs.length;
      const newSentCount = snapshot.docs.filter(doc => {
        const data = doc.data();
        const commentDate = data.createdAt?.toDate();
        const lastCheck = userData.lastCommentCheck?.toDate() || new Date(0);
        return commentDate && commentDate > lastCheck;
      }).length;

      setFileCounts(prev => ({ ...prev, sentComments: sentCount }));
      setNotifications(prev => ({ ...prev, newSentComments: newSentCount }));
    });

    // Listen for received comments
    const unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
      const receivedCount = snapshot.docs.length;
      const newReceivedCount = snapshot.docs.filter(doc => {
        const data = doc.data();
        const commentDate = data.createdAt?.toDate();
        const lastCheck = userData.lastCommentCheck?.toDate() || new Date(0);
        return commentDate && commentDate > lastCheck;
      }).length;

      setFileCounts(prev => ({ ...prev, receivedComments: receivedCount }));
      setNotifications(prev => ({ 
        ...prev, 
        newReceivedComments: newReceivedCount,
        newComments: newReceivedCount + prev.newSentComments
      }));
    });

    return () => {
      unsubscribeAll();
      unsubscribeSent();
      unsubscribeReceived();
    };
  }, [userData?.uid]);

  // Update the handleMarkAsRead function
  const handleMarkAsRead = useCallback(async () => {
    if (!userData?.uid) return;

    try {
      const userRef = doc(db, "users", userData.uid);
      await updateDoc(userRef, {
        lastCommentCheck: serverTimestamp()
      });

      setNotifications({
        newComments: 0,
        newSentComments: 0,
        newReceivedComments: 0
      });
    } catch (error) {
      console.error("Error marking comments as read:", error);
      toast.error("Failed to mark comments as read");
    }
  }, [userData?.uid]);

  // Memoize the handlers to prevent unnecessary re-renders
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    
    if (tab === "comments") {
      const now = new Date();
      localStorage.setItem('lastCommentCheck', now.toISOString());
      setNotifications(prev => ({
        ...prev,
        newComments: 0,
        newSentComments: 0,
        newReceivedComments: 0
      }));
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  }, [navigate]);

  // Add a function to handle View All click
  const handleViewAllShares = useCallback(() => {
    setActiveTab("shared");
  }, []);

  // Memoize the SidebarContent component
  const SidebarContent = useMemo(() => {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          {/* Logo and Title */}
          <div className="flex flex-col items-center justify-center px-4 mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3"
            >
              <img 
                src={import.meta.env.BASE_URL + 'images/logo.png'}
                alt="Bataan Logo" 
                className="h-16 w-16 object-contain"
              />
              <h1 className="text-xl font-bold text-primary tracking-tight text-center">
                Provincial Government of Bataan
              </h1>
            </motion.div>
          </div>

          {/* User Profile */}
          <div className="px-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center space-x-4 p-4 rounded-lg bg-gray-50/50 border border-primary/10 hover:bg-gray-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : userData ? (
                  <>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userData.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {getDepartmentFullName(userData.department)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Failed to load user data</p>
                )}
              </div>
            </motion.div>
            {/* Solid line under user profile */}
            <div className="h-px bg-gray-200 mt-4"></div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <TooltipButton
                    variant={activeTab === "overview" ? "secondary" : "ghost"}
                    className={`w-full justify-start h-11 ${
                      activeTab === "overview" ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleTabChange("overview")}
                  >
                    <LayoutDashboard className="mr-3 h-5 w-5" />
                    Overview
                  </TooltipButton>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Dashboard Overview</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TooltipButton
                    variant={activeTab === "myfiles" ? "secondary" : "ghost"}
                    className={`w-full justify-start h-11 ${
                      activeTab === "myfiles" ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleTabChange("myfiles")}
                  >
                    <FileText className="mr-3 h-5 w-5" />
                    My Files
                    {fileCounts.myFiles > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {fileCounts.myFiles}
                      </Badge>
                    )}
                  </TooltipButton>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{fileCounts.myFiles} files uploaded</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TooltipButton
                    variant={activeTab === "shared" ? "secondary" : "ghost"}
                    className={`w-full justify-start h-11 ${
                      activeTab === "shared" ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleTabChange("shared")}
                  >
                    <Share2 className="mr-3 h-5 w-5" />
                    Shared Files
                    {fileCounts.sharedFiles > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {fileCounts.sharedFiles}
                      </Badge>
                    )}
                  </TooltipButton>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{fileCounts.sharedFiles} files shared with you</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TooltipButton
                    variant={activeTab === "comments" ? "secondary" : "ghost"}
                    className={`w-full justify-start h-11 relative ${
                      activeTab === "comments" ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleTabChange("comments")}
                  >
                    <div className="flex items-center w-full">
                      <MessageSquare className="mr-3 h-5 w-5" />
                      <span>Comments</span>
                      {notifications.newComments > 0 && (
                        <div className="flex items-center ml-auto">
                          <Badge 
                            variant="secondary" 
                            className="bg-red-100 text-red-700 animate-pulse"
                          >
                            {notifications.newComments} new
                          </Badge>
                          {notifications.newReceivedComments > 0 && (
                            <div className="w-2 h-2 bg-red-500 rounded-full absolute -top-1 -right-1 animate-ping" />
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipButton>
                </TooltipTrigger>
                <TooltipContent 
                  side="right"
                  align="center"
                  className="bg-white border shadow-md"
                >
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b">
                      <span className="font-medium">Comments Activity</span>
                      <Badge variant="outline" className="ml-2">
                        {fileCounts.comments} total
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-muted-foreground">Sent</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{fileCounts.sentComments}</span>
                          {notifications.newSentComments > 0 && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 animate-pulse">
                              +{notifications.newSentComments}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-muted-foreground">Received</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{fileCounts.receivedComments}</span>
                          {notifications.newReceivedComments > 0 && (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 animate-pulse">
                              +{notifications.newReceivedComments}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TooltipButton
                    variant={activeTab === "trash" ? "secondary" : "ghost"}
                    className={`w-full justify-start h-11 ${
                      activeTab === "trash" ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-gray-100"
                    }`}
                    onClick={() => handleTabChange("trash")}
                  >
                    <Trash2 className="mr-3 h-5 w-5" />
                    Trash
                  </TooltipButton>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Deleted files</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          </nav>

          {/* Sign Out Button */}
          <div className="px-6 py-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <TooltipButton
                  variant="outline"
                  className="w-full justify-center text-gray-700 hover:text-gray-900 border-primary/10 hover:bg-primary/5"
                  onClick={handleSignOut}
                  disabled={isLoading}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </TooltipButton>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sign out of your account</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    );
  }, [
    activeTab,
    fileCounts,
    notifications,
    handleTabChange,
    isLoading,
    userData
  ]);

  const renderContent = () => {
    switch (activeTab) {
      case "myfiles":
        return <Files />;
      case "shared":
        return <SharedFiles />;
      case "comments":
        return <Comments />;
      case "overview":
        return (
          <div className="space-y-5">
            {/* Welcome Section */}
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
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
                      Welcome back, {user?.email?.split('@')[0] || 'User'} 👋
                    </h1>
                    {userData && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="bg-white/10 text-white border-none backdrop-blur-sm px-2 py-0.5 text-xs">
                          {user?.email}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/10 text-white border-none backdrop-blur-sm px-2 py-0.5 text-xs">
                          {getDepartmentFullName(userData.department)}
                        </Badge>
                      </div>
                    )}
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

            {/* Stats Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid gap-4 grid-cols-2 md:grid-cols-4"
            >
              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader className="pb-2 space-y-0 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">My Files</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">{fileCounts.myFiles}</h2>
                    <span className="text-sm text-gray-500">files</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-white">
                <CardHeader className="pb-2 space-y-0 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                      <Share2 className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Shared</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">{fileCounts.sharedFiles}</h2>
                    <span className="text-sm text-gray-500">shared</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-white">
                <CardHeader className="pb-2 space-y-0 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Comments</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">{fileCounts.comments}</h2>
                    <span className="text-sm text-gray-500">total</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-white">
                <CardHeader className="pb-2 space-y-0 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                      <Users className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">{departmentStats.activeUsers}</h2>
                    <span className="text-sm text-gray-500">users</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              {/* Recent Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-gray-50 to-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                        <p className="text-sm text-gray-500">Your latest file interactions</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-medium">
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentActivities.length > 0 ? (
                        recentActivities.map((activity) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-colors"
                          >
                            <div className="shrink-0">
                              <ActivityIcon type={activity.type} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-gray-900">
                                  {activity.type === 'upload' && 'Uploaded'}
                                  {activity.type === 'share' && 'Shared'}
                                  {activity.type === 'delete' && 'Deleted'}
                                </p>
                                <p className="text-sm text-gray-500 truncate flex-1">
                                  {activity.fileName}
                                </p>
                              </div>
                              <p className="text-xs text-gray-400">
                                {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Details
                            </Button>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-3">
                            <Clock className="w-5 h-5 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-500">No recent activity</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Shares */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-gray-50 to-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-semibold">Recent Shares</CardTitle>
                        <p className="text-sm text-gray-500">Latest shared files</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-xs font-medium"
                        onClick={handleViewAllShares}
                      >
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {departmentStats.recentShares.length > 0 ? (
                        departmentStats.recentShares.map((share, index) => {
                          const sharedByUser = usersData[share.sharedBy] || {};
                          const sharedWithUser = usersData[share.sharedWith] || {};
                          
                          return (
                            <motion.div
                              key={share.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="group p-4 rounded-xl hover:bg-gray-50/80 transition-colors space-y-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                                  <Share2 className="w-5 h-5 text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-base font-medium text-gray-900 truncate">
                                    {share.fileName}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {format(new Date(share.sharedAt), 'MMM d, h:mm a')}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="space-y-2.5 pl-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-400 w-8">From:</span>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 flex-1 min-w-0">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium truncate">{sharedByUser.email || 'Unknown'}</span>
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 px-2 py-0.5 text-xs">
                                      {getDepartmentFullName(sharedByUser.department)}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-400 w-8">To:</span>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 flex-1 min-w-0">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium truncate">{sharedWithUser.email || 'Unknown'}</span>
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 px-2 py-0.5 text-xs">
                                      {getDepartmentFullName(sharedWithUser.department)}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No recent shares
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-[60vh]">
            <p className="text-gray-500">This section is under development</p>
          </div>
        );
    }
  };

  const renderSidebar = () => {
    return (
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="lg:hidden"
            size="icon"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[300px] p-0 bg-white border-r"
        >
          {SidebarContent}
        </SheetContent>

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0">
          <div className="w-[300px] flex-1 flex flex-col min-h-0 bg-white border-r">
            {SidebarContent}
          </div>
        </div>
      </Sheet>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {renderSidebar()}
      
      {/* Main Content */}
      <main className="lg:pl-[300px] p-8">
        {renderContent()}
      </main>
    </div>
  );
} 