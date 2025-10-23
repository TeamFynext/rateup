// import React, { useState } from 'react';
// import { Card } from '../ui/card';
// import { Button } from '../ui/button';
// import { Input } from '../ui/input';
// import { Badge } from '../ui/badge';
// import { Avatar, AvatarFallback } from '../ui/avatar';
// import { CreativeAvatar } from '../ui/creative-avatar';
// import { Textarea } from '../ui/textarea';
// import { ScrollArea } from '../ui/scroll-area';
// import { Separator } from '../ui/separator';
// import { getCountryFromPhone } from '../../utils/countryDetection';
// import { StaffChatPopup } from './StaffChatPopup';
// import {
//   MessageSquare,
//   Search,
//   Filter,
//   Send,
//   Paperclip,
//   MoreVertical,
//   Phone,
//   Video,
//   Star,
//   Archive,
//   Trash2,
//   Clock,
//   CheckCheck,
//   Check,
//   User,
//   MapPin,
//   Calendar,
//   Tag,
//   Smile,
//   Image,
//   ExternalLink,
//   RefreshCw,
//   Zap,
//   Circle,
//   ChevronDown,
//   ChevronRight,
//   Settings,
//   UserPlus,
//   AlertCircle,
//   MessageCircle,
//   X,
//   Plus,
//   Sparkles,
//   Mail,
//   Building,
//   ShoppingBag,
//   DollarSign,
//   Activity,
//   PhoneCall,
//   Inbox,
//   PanelLeftClose,
//   PanelLeft,
//   UserCheck,
//   Flame,
//   CheckCircle,
//   Hash,
//   Link,
//   FileText,
//   Mic,
//   LayoutTemplate,
//   TrendingUp,
//   Bot,
//   Megaphone,
//   BarChart3,
//   Copy,
//   Instagram
// } from 'lucide-react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
// import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
// import { Switch } from '../ui/switch';
// import { Label } from '../ui/label';

// // WhatsApp Icon Component
// const WhatsAppIcon = ({ className }: { className?: string }) => (
//   <svg
//     viewBox="0 0 24 24"
//     fill="currentColor"
//     className={className}
//     xmlns="http://www.w3.org/2000/svg"
//   >
//     <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
//   </svg>
// );

// // Helper function to truncate message to first 5 words
// const truncateToWords = (text: string, wordCount: number = 5): string => {
//   const words = text.trim().split(/\s+/);
//   if (words.length <= wordCount) {
//     return text;
//   }
//   return words.slice(0, wordCount).join(' ') + '...';
// };

// interface Conversation {
//   id: string;
//   customerName: string;
//   customerInitials: string;
//   lastMessage: string;
//   timestamp: string;
//   unreadCount: number;
//   status: 'active' | 'resolved' | 'pending';
//   priority: 'high' | 'normal' | 'low';
//   assignedTo?: string;
//   isOnline?: boolean;
//   isTyping?: boolean;
//   lifecycle: 'new-lead' | 'good-lead' | 'hot-lead' | 'customer' | 'converted';
//   channel: 'whatsapp' | 'instagram' | 'webchat';
//   customerInfo: {
//     phone?: string;
//     email?: string;
//     location?: string;
//     company?: string;
//     tags: string[];
//     totalOrders: number;
//     customerSince: string;
//     lifetimeValue?: string;
//     lastOrderDate?: string;
//   };
//   messages: Array<{
//     id: string;
//     sender: 'customer' | 'agent';
//     content: string;
//     timestamp: string;
//     type: 'text' | 'image' | 'file' | 'template';
//     status?: 'sent' | 'delivered' | 'read';
//   }>;
// }

// interface Call {
//   id: string;
//   customerName: string;
//   customerInitials: string;
//   phone: string;
//   type: 'incoming' | 'outgoing' | 'missed';
//   duration: string;
//   timestamp: string;
//   lifecycle: 'new-lead' | 'good-lead' | 'hot-lead' | 'customer' | 'converted';
//   tags: string[];
// }

// // Generate 100 mock conversations
// const generateMockConversations = (): Conversation[] => {
//   const firstNames = ['Sarah', 'Mike', 'Emma', 'James', 'Olivia', 'William', 'Sophia', 'Benjamin', 'Ava', 'Lucas', 'Isabella', 'Henry', 'Mia', 'Alexander', 'Charlotte', 'Daniel', 'Amelia', 'Matthew', 'Harper', 'David', 'Evelyn', 'Joseph', 'Abigail', 'Samuel', 'Emily', 'Jackson', 'Elizabeth', 'Sebastian', 'Sofia', 'Jack', 'Avery', 'Aiden', 'Ella', 'Owen', 'Scarlett', 'Muhammad', 'Grace', 'Liam', 'Chloe', 'Noah', 'Victoria', 'Ethan', 'Riley', 'Mason', 'Aria', 'Logan', 'Lily', 'Jacob', 'Zoey', 'Oliver'];
//   const lastNames = ['Johnson', 'Chen', 'Wilson', 'Rodriguez', 'Martinez', 'Garcia', 'Brown', 'Davis', 'Miller', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Hall', 'Allen', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Morris', 'Rogers', 'Reed'];
//   const statuses: ('active' | 'resolved' | 'pending')[] = ['active', 'resolved', 'pending'];
//   const priorities: ('high' | 'normal' | 'low')[] = ['high', 'normal', 'low'];
//   const lifecycles: ('new-lead' | 'good-lead' | 'hot-lead' | 'customer' | 'converted')[] = ['new-lead', 'good-lead', 'hot-lead', 'customer', 'converted'];
//   const cities = ['New York, NY', 'San Francisco, CA', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'Austin, TX', 'Seattle, WA', 'Boston, MA', 'Denver, CO', 'Miami, FL', 'Atlanta, GA', 'Portland, OR', 'Las Vegas, NV', 'Detroit, MI', 'Nashville, TN'];
//   const companies = ['Tech Solutions Inc.', 'Digital Marketing Co.', 'E-Commerce Plus', 'Retail Innovations', 'Global Ventures', 'Smart Systems LLC', 'Creative Agency', 'Finance Group', 'Healthcare Partners', 'Education Hub'];
//   const tags = [['VIP', 'Frequent Buyer'], ['New Customer'], ['Returning Customer'], ['Premium Member'], ['Early Adopter'], ['Referral'], ['Wholesale'], ['Enterprise'], ['Influencer'], ['Partner']];
//   const whatsappMessages = [
//     'Thank you for the quick response! When will my order be shipped?',
//     'Love the new product! Can I get more details about the warranty?',
//     'Perfect! I\'ll proceed with the purchase then.',
//     'Could you share the pricing for bulk orders?',
//     'Is this item still in stock?',
//     'I need help with my recent purchase.',
//     'Can you provide more information about your services?',
//     'When will you have new inventory?',
//     'I\'m interested in upgrading my plan.',
//     'What payment methods do you accept?',
//     'Do you offer international shipping?',
//     'How long does delivery usually take?',
//     'I have a question about the return policy.',
//     'Can I schedule a demo?',
//     'Is there a discount for annual subscriptions?'
//   ];

//   const instagramMessages = [
//     'Love your latest post! 😍 Where can I buy this?',
//     'Just sent you a DM about the product featured in your story',
//     'Hi! I saw your reel and I\'m interested in learning more',
//     'Do you ship internationally? Your products look amazing!',
//     'Thanks for the quick reply! Can you send me the link?',
//     'Is this still available? I want to order it now',
//     'Your content is awesome! Do you have a discount code?',
//     'I tagged you in my story, check it out!',
//     'Can I collaborate with your brand? I have 50k followers',
//     'Just placed an order! When does it ship?',
//     'Absolutely love the quality! Will order again soon',
//     'Do you have more colors available for this item?',
//     'Your Instagram feed is goals! 🔥',
//     'Sent payment! Please confirm my order',
//     'Can you create a custom order for me?'
//   ];

//   const webChatMessages = [
//     'Hi, I need help with placing an order on your website',
//     'Is there a live agent available to assist me?',
//     'I\'m having trouble completing the checkout process',
//     'Can you help me find a specific product?',
//     'What are your shipping options and delivery times?',
//     'I\'d like to know more about your return policy',
//     'Do you offer customer support via phone as well?',
//     'Can I track my order that I placed yesterday?',
//     'I have a question about product specifications',
//     'Are there any ongoing promotions or discounts?'
//   ];

//   const timestamps = ['Just now', '1 min ago', '2 min ago', '5 min ago', '15 min ago', '30 min ago', '1 hour ago', '2 hours ago', '3 hours ago', '5 hours ago', 'Yesterday', '2 days ago', '3 days ago', '1 week ago', '2 weeks ago'];

//   const conversations: Conversation[] = [];

//   // Generate 160 total conversations: 100 WhatsApp, 50 Instagram, 10 Web Chat
//   for (let i = 0; i < 160; i++) {
//     const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
//     const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
//     const fullName = `${firstName} ${lastName}`;
//     const initials = `${firstName[0]}${lastName[0]}`;
//     const status = statuses[Math.floor(Math.random() * statuses.length)];
//     const priority = priorities[Math.floor(Math.random() * priorities.length)];
//     const lifecycle = lifecycles[Math.floor(Math.random() * lifecycles.length)];
//     const unreadCount = status === 'active' ? Math.floor(Math.random() * 5) : 0;
//     const isOnline = Math.random() > 0.7;
//     const totalOrders = Math.floor(Math.random() * 50) + 1;
//     const lifetimeValue = Math.floor(Math.random() * 10000) + 100;
//     const customerTag = tags[Math.floor(Math.random() * tags.length)];

//     // Determine channel based on index: 0-99 = WhatsApp, 100-149 = Instagram, 150-159 = Web Chat
//     let channel: 'whatsapp' | 'instagram' | 'webchat';
//     let messagePool: string[];

//     if (i < 100) {
//       channel = 'whatsapp';
//       messagePool = whatsappMessages;
//     } else if (i < 150) {
//       channel = 'instagram';
//       messagePool = instagramMessages;
//     } else {
//       channel = 'webchat';
//       messagePool = webChatMessages;
//     }

//     conversations.push({
//       id: `${i + 1}`,
//       customerName: fullName,
//       customerInitials: initials,
//       lastMessage: messagePool[Math.floor(Math.random() * messagePool.length)],
//       timestamp: timestamps[Math.floor(Math.random() * timestamps.length)],
//       unreadCount,
//       status,
//       priority,
//       assignedTo: i < 10 ? 'You' : undefined,
//       isOnline,
//       lifecycle,
//       channel,
//       customerInfo: {
//         phone: `+1 (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
//         email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
//         location: cities[Math.floor(Math.random() * cities.length)],
//         company: Math.random() > 0.5 ? companies[Math.floor(Math.random() * companies.length)] : undefined,
//         tags: customerTag,
//         totalOrders,
//         customerSince: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Math.floor(Math.random() * 12)]} ${2020 + Math.floor(Math.random() * 5)}`,
//         lifetimeValue: `${lifetimeValue.toLocaleString()}`,
//         lastOrderDate: timestamps[Math.floor(Math.random() * timestamps.length)]
//       },
//       messages: [
//         {
//           id: '1',
//           sender: 'customer',
//           content: messagePool[Math.floor(Math.random() * messagePool.length)],
//           timestamp: '10:30 AM',
//           type: 'text'
//         }
//       ]
//     });
//   }

//   return conversations;
// };

// const mockConversations: Conversation[] = generateMockConversations();

// // Generate mock calls
// const generateMockCalls = (): Call[] => {
//   const firstNames = ['Sarah', 'Mike', 'Emma', 'James', 'Olivia', 'William', 'Sophia', 'Benjamin', 'Ava', 'Lucas', 'Isabella', 'Henry', 'Mia', 'Alexander', 'Charlotte', 'Daniel', 'Amelia', 'Matthew', 'Harper', 'David'];
//   const lastNames = ['Johnson', 'Chen', 'Wilson', 'Rodriguez', 'Martinez', 'Garcia', 'Brown', 'Davis', 'Miller', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark'];
//   const callTypes: ('incoming' | 'outgoing' | 'missed')[] = ['incoming', 'outgoing', 'missed'];
//   const lifecycles: ('new-lead' | 'good-lead' | 'hot-lead' | 'customer' | 'converted')[] = ['new-lead', 'good-lead', 'hot-lead', 'customer', 'converted'];
//   const tags = [['VIP'], ['New Customer'], ['Returning'], ['Premium'], ['Referral']];
//   const timestamps = ['Just now', '5 min ago', '15 min ago', '30 min ago', '1 hour ago', '2 hours ago', '3 hours ago', 'Yesterday', '2 days ago', '1 week ago'];

//   const calls: Call[] = [];

//   for (let i = 0; i < 50; i++) {
//     const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
//     const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
//     const fullName = `${firstName} ${lastName}`;
//     const initials = `${firstName[0]}${lastName[0]}`;
//     const type = callTypes[Math.floor(Math.random() * callTypes.length)];
//     const lifecycle = lifecycles[Math.floor(Math.random() * lifecycles.length)];

//     // Generate duration only for non-missed calls
//     let duration = '0:00';
//     if (type !== 'missed') {
//       const minutes = Math.floor(Math.random() * 15);
//       const seconds = Math.floor(Math.random() * 60);
//       duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
//     }

//     calls.push({
//       id: `call-${i + 1}`,
//       customerName: fullName,
//       customerInitials: initials,
//       phone: `+1 (${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
//       type,
//       duration,
//       timestamp: timestamps[Math.floor(Math.random() * timestamps.length)],
//       lifecycle,
//       tags: tags[Math.floor(Math.random() * tags.length)],
//     });
//   }

//   return calls;
// };

// const mockCalls = generateMockCalls();

// const quickReplies = [
//   "Thanks for reaching out! How can I help you today?",
//   "Let me check that for you right away.",
//   "Your order has been confirmed and will ship within 24 hours.",
//   "I understand your concern. Let me assist you with this.",
//   "Could you provide more details so I can better assist you?"
// ];

// const lifecycleCategories = [
//   { id: 'new-lead', label: 'New Lead', icon: Sparkles, color: 'text-cyan-600', bgColor: 'bg-cyan-50', count: 1 },
//   { id: 'good-lead', label: 'Good Lead', icon: TrendingUp, color: 'text-blue-600', bgColor: 'bg-blue-50', count: 1 },
//   { id: 'hot-lead', label: 'Hot Lead', icon: Flame, color: 'text-orange-600', bgColor: 'bg-orange-50', count: 1 },
//   { id: 'customer', label: 'Customer', icon: UserCheck, color: 'text-green-600', bgColor: 'bg-green-50', count: 1 },
//   { id: 'converted', label: 'Converted', icon: CheckCircle, color: 'text-purple-600', bgColor: 'bg-purple-50', count: 0 }
// ];

// const inboxCategories = [
//   { id: 'conversations', label: 'Conversations', icon: MessageCircle, count: 4 },
//   { id: 'campaigns', label: 'Campaigns', icon: Megaphone, count: 3 },
//   { id: 'broadcasts', label: 'Broadcasts', icon: Send, count: 5 },
//   { id: 'automation', label: 'Automation', icon: Bot, count: 8 },
// ];

// // Staff members
// const staffMembers = [
//   { id: '1', name: 'Jishnu N', initials: 'JN', isOnline: true, color: 'bg-blue-500' },
//   { id: '2', name: 'Abhilash S', initials: 'AS', isOnline: true, color: 'bg-green-500' },
//   { id: '3', name: 'Visal K', initials: 'VK', isOnline: false, color: 'bg-purple-500' },
//   { id: '4', name: 'Megha', initials: 'MG', isOnline: true, color: 'bg-orange-500' },
//   { id: '5', name: 'Abhinav', initials: 'AB', isOnline: true, color: 'bg-pink-500' },
//   { id: '6', name: 'Prabin', initials: 'PR', isOnline: false, color: 'bg-indigo-500' },
// ];

// export function WhatsAppSection() {
//   const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0]);
//   const [newMessage, setNewMessage] = useState('');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [activeTab, setActiveTab] = useState('chats');
//   const [activeFilter, setActiveFilter] = useState('all');
//   const [selectedCategory, setSelectedCategory] = useState<string | null>('conversations');
//   const [showUnrepliedOnly, setShowUnrepliedOnly] = useState(false);
//   const [selectedLifecycle, setSelectedLifecycle] = useState<string | null>(null);
//   const [showQuickReplies, setShowQuickReplies] = useState(false);
//   const [showCustomerInfo, setShowCustomerInfo] = useState(false);
//   const [isLifecycleOpen, setIsLifecycleOpen] = useState(true);
//   const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
//   const [showSearchBar, setShowSearchBar] = useState(false);
//   const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
//   const [showCallHistory, setShowCallHistory] = useState(false);
//   const [callTypeFilter, setCallTypeFilter] = useState<'all' | 'incoming' | 'missed' | 'outgoing' | 'ended' | 'noanswer'>('all');
//   const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'instagram' | 'webchat'>('all');
//   const [conversationSearchQuery, setConversationSearchQuery] = useState('');
//   const [isConversationSearchExpanded, setIsConversationSearchExpanded] = useState(false);

//   // Initialize assignedStaff based on first conversation's assignment
//   const getInitialAssignedStaff = () => {
//     const firstConv = mockConversations[0];
//     if (firstConv?.assignedTo) {
//       const assignedName = firstConv.assignedTo === 'You' ? 'Visal K' : firstConv.assignedTo;
//       return staffMembers.find(s => s.name === assignedName) || staffMembers[0];
//     }
//     return staffMembers[0];
//   };

//   const [assignedStaff, setAssignedStaff] = useState(getInitialAssignedStaff());
//   const [currentLifecycle, setCurrentLifecycle] = useState(selectedConversation?.lifecycle || 'new-lead');
//   const [activeStaffChat, setActiveStaffChat] = useState<typeof staffMembers[0] | null>(null);

//   const getLifecycleInfo = (lifecycle: string) => {
//     const category = lifecycleCategories.find(c => c.id === lifecycle);
//     return category || lifecycleCategories[0];
//   };

//   const handleSendMessage = () => {
//     if (!newMessage.trim() || !selectedConversation) return;

//     const newMsg = {
//       id: Date.now().toString(),
//       sender: 'agent' as const,
//       content: newMessage,
//       timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//       type: 'text' as const,
//       status: 'sent' as const
//     };

//     setSelectedConversation({
//       ...selectedConversation,
//       messages: [...selectedConversation.messages, newMsg]
//     });

//     setNewMessage('');
//     setShowQuickReplies(false);
//   };

//   const handleQuickReply = (reply: string) => {
//     setNewMessage(reply);
//     setShowQuickReplies(false);
//   };

//   const handleAssignStaff = (staff: typeof staffMembers[0]) => {
//     setAssignedStaff(staff);

//     // Update the selected conversation's assignedTo field
//     if (selectedConversation) {
//       setSelectedConversation({
//         ...selectedConversation,
//         assignedTo: staff.name
//       });

//       // Also update in the mockConversations array (for persistence in the list)
//       const conversationIndex = mockConversations.findIndex(c => c.id === selectedConversation.id);
//       if (conversationIndex !== -1) {
//         mockConversations[conversationIndex].assignedTo = staff.name;
//       }
//     }
//   };

//   const handleLifecycleChange = (lifecycleId: string) => {
//     setCurrentLifecycle(lifecycleId);

//     // Update the selected conversation's lifecycle field
//     if (selectedConversation) {
//       setSelectedConversation({
//         ...selectedConversation,
//         lifecycle: lifecycleId
//       });

//       // Also update in the mockConversations array (for persistence in the list)
//       const conversationIndex = mockConversations.findIndex(c => c.id === selectedConversation.id);
//       if (conversationIndex !== -1) {
//         mockConversations[conversationIndex].lifecycle = lifecycleId;
//       }
//     }
//   };

//   const filteredConversations = mockConversations.filter(conv => {
//     const matchesSearch = conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                          conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
//     const matchesConversationSearch = conversationSearchQuery === '' ||
//                                      conv.customerName.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
//                                      conv.lastMessage.toLowerCase().includes(conversationSearchQuery.toLowerCase()) ||
//                                      conv.messages.some(msg => msg.content.toLowerCase().includes(conversationSearchQuery.toLowerCase()));
//     const matchesFilter = activeFilter === 'all' ||
//                          (activeFilter === 'mine' && conv.assignedTo === 'You') ||
//                          (activeFilter === 'unassigned' && !conv.assignedTo) ||
//                          (activeFilter === 'unread' && conv.unreadCount > 0);
//     const matchesLifecycle = !selectedLifecycle || conv.lifecycle === selectedLifecycle;
//     const matchesUnreplied = !showUnrepliedOnly || conv.unreadCount > 0;
//     const matchesChannelFilter = channelFilter === 'all' || conv.channel === channelFilter;
//     return matchesSearch && matchesConversationSearch && matchesFilter && matchesLifecycle && matchesUnreplied && matchesChannelFilter;
//   });

//   const filteredCalls = mockCalls.filter(call => {
//     const matchesSearch = call.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
//                          call.phone.includes(searchQuery);
//     const matchesLifecycle = !selectedLifecycle || call.lifecycle === selectedLifecycle;
//     const matchesCallType = callTypeFilter === 'all' || call.type === callTypeFilter;
//     return matchesSearch && matchesLifecycle && matchesCallType;
//   });

//   const totalUnread = mockConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

//   return (
//     <div className="h-full flex bg-background overflow-hidden">
//       {/* Left Sidebar - Filters & Categories */}
//       {!isLeftSidebarCollapsed && (
//         <div className="w-52 border-r bg-card flex flex-col h-full">
//           {/* Sidebar Header */}
//           <div className="p-3 border-b flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <Inbox className="w-5 h-5 text-muted-foreground" />
//               <h3 className="text-lg font-bold">Inbox</h3>
//             </div>
//             <Button
//               size="sm"
//               variant="ghost"
//               className="h-8 w-8 p-0"
//               onClick={() => setIsLeftSidebarCollapsed(true)}
//             >
//               <PanelLeftClose className="w-4 h-4" />
//             </Button>
//           </div>

//           {/* Filter Categories */}
//           <ScrollArea className="flex-1">
//           <div className="p-2 space-y-1">
//             {/* Quick Filters */}
//             <div className="space-y-0.5">
//               <Button
//                 variant={activeFilter === 'all' ? 'secondary' : 'ghost'}
//                 className="w-full justify-start text-sm h-9"
//                 onClick={() => { setActiveFilter('all'); setSelectedLifecycle(null); }}
//               >
//                 <Inbox className="w-4 h-4 mr-2" />
//                 All
//                 <Badge variant="secondary" className="ml-auto text-xs">
//                   {mockConversations.length}
//                 </Badge>
//               </Button>

//               <Button
//                 variant={activeFilter === 'mine' ? 'secondary' : 'ghost'}
//                 className="w-full justify-start text-sm h-9"
//                 onClick={() => { setActiveFilter('mine'); setSelectedLifecycle(null); }}
//               >
//                 <User className="w-4 h-4 mr-2" />
//                 Mine
//                 <Badge variant="secondary" className="ml-auto text-xs">
//                   {mockConversations.filter(c => c.assignedTo === 'You').length}
//                 </Badge>
//               </Button>

//               <Button
//                 variant={activeFilter === 'unassigned' ? 'secondary' : 'ghost'}
//                 className="w-full justify-start text-sm h-9"
//                 onClick={() => { setActiveFilter('unassigned'); setSelectedLifecycle(null); }}
//               >
//                 <UserPlus className="w-4 h-4 mr-2" />
//                 Unassigned
//                 <Badge variant="secondary" className="ml-auto text-xs">
//                   {mockConversations.filter(c => !c.assignedTo).length}
//                 </Badge>
//               </Button>

//               <Button
//                 variant={activeFilter === 'unread' ? 'secondary' : 'ghost'}
//                 className="w-full justify-start text-sm h-9"
//                 onClick={() => { setActiveFilter('unread'); setSelectedLifecycle(null); }}
//               >
//                 <MessageCircle className="w-4 h-4 mr-2" />
//                 Unread
//                 {totalUnread > 0 && (
//                   <Badge className="ml-auto text-xs bg-green-600">
//                     {totalUnread}
//                   </Badge>
//                 )}
//               </Button>
//             </div>

//             <Separator className="my-2" />

//             {/* WhatsApp Categories */}
//             <Collapsible open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen}>
//               <CollapsibleTrigger asChild>
//                 <Button variant="ghost" className="w-full justify-between text-sm h-9 px-2">
//                   <span className="text-xs uppercase tracking-wide text-muted-foreground">Categories</span>
//                   {isCategoriesOpen ? (
//                     <ChevronDown className="w-4 h-4" />
//                   ) : (
//                     <ChevronRight className="w-4 h-4" />
//                   )}
//                 </Button>
//               </CollapsibleTrigger>
//               <CollapsibleContent className="space-y-0.5 pt-1">
//                 {inboxCategories.map((category) => (
//                   <Button
//                     key={category.id}
//                     variant={selectedCategory === category.id ? 'secondary' : 'ghost'}
//                     className="w-full justify-start text-sm h-9"
//                     onClick={() => {
//                       setSelectedCategory(selectedCategory === category.id ? null : category.id);
//                     }}
//                   >
//                     <category.icon className="w-4 h-4 mr-2 text-green-600" />
//                     {category.label}
//                     {category.count > 0 && (
//                       <Badge variant="secondary" className="ml-auto text-xs">
//                         {category.count}
//                       </Badge>
//                     )}
//                   </Button>
//                 ))}
//               </CollapsibleContent>
//             </Collapsible>

//             <Separator className="my-2" />

//             {/* Lifecycle Categories */}
//             <Collapsible open={isLifecycleOpen} onOpenChange={setIsLifecycleOpen}>
//               <CollapsibleTrigger asChild>
//                 <Button variant="ghost" className="w-full justify-between text-sm h-9 px-2">
//                   <span className="text-xs uppercase tracking-wide text-muted-foreground">Lifecycle</span>
//                   {isLifecycleOpen ? (
//                     <ChevronDown className="w-4 h-4" />
//                   ) : (
//                     <ChevronRight className="w-4 h-4" />
//                   )}
//                 </Button>
//               </CollapsibleTrigger>
//               <CollapsibleContent className="space-y-0.5 pt-1">
//                 {lifecycleCategories.map((category) => (
//                   <Button
//                     key={category.id}
//                     variant={selectedLifecycle === category.id ? 'secondary' : 'ghost'}
//                     className="w-full justify-start text-sm h-9"
//                     onClick={() => {
//                       setSelectedLifecycle(selectedLifecycle === category.id ? null : category.id);
//                       setActiveFilter('all');
//                     }}
//                   >
//                     <category.icon className={`w-4 h-4 mr-2 ${category.color}`} />
//                     {category.label}
//                     {category.count > 0 && (
//                       <Badge variant="secondary" className="ml-auto text-xs">
//                         {category.count}
//                       </Badge>
//                     )}
//                   </Button>
//                 ))}
//               </CollapsibleContent>
//             </Collapsible>
//           </div>
//         </ScrollArea>

//         {/* Bottom Actions */}
//         <div className="p-3 border-t space-y-2 flex-shrink-0">
//           <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
//             <Plus className="w-4 h-4 mr-2" />
//             New Conversation
//           </Button>
//           <Button variant="outline" size="sm" className="w-full">
//             <Megaphone className="w-4 h-4 mr-2" />
//             New Campaign
//           </Button>
//         </div>
//         </div>
//       )}

//       {/* Show Sidebar Button - When Collapsed */}
//       {isLeftSidebarCollapsed && (
//         <div className="border-r bg-card flex flex-col h-full">
//           {/* Collapsed Header */}
//           <div className="p-2 border-b flex items-center justify-center">
//             <TooltipProvider>
//               <Tooltip>
//                 <TooltipTrigger asChild>
//                   <Button
//                     size="sm"
//                     variant="ghost"
//                     className="h-8 w-8 p-0"
//                     onClick={() => setIsLeftSidebarCollapsed(false)}
//                   >
//                     <PanelLeft className="w-4 h-4" />
//                   </Button>
//                 </TooltipTrigger>
//                 <TooltipContent side="right">
//                   <p>Hide bar</p>
//                 </TooltipContent>
//               </Tooltip>
//             </TooltipProvider>
//           </div>

//           {/* Collapsed Filter Icons */}
//           <ScrollArea className="flex-1">
//             <div className="p-2 space-y-1 flex flex-col items-center">
//               {/* Quick Filters */}
//               <TooltipProvider>
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <Button
//                       variant={activeFilter === 'all' ? 'secondary' : 'ghost'}
//                       className="h-9 w-9 p-0"
//                       onClick={() => { setActiveFilter('all'); setSelectedLifecycle(null); }}
//                     >
//                       <Inbox className="w-4 h-4" />
//                     </Button>
//                   </TooltipTrigger>
//                   <TooltipContent side="right">
//                     <p>All ({mockConversations.length})</p>
//                   </TooltipContent>
//                 </Tooltip>
//               </TooltipProvider>

//               <TooltipProvider>
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <Button
//                       variant={activeFilter === 'mine' ? 'secondary' : 'ghost'}
//                       className="h-9 w-9 p-0"
//                       onClick={() => { setActiveFilter('mine'); setSelectedLifecycle(null); }}
//                     >
//                       <User className="w-4 h-4" />
//                     </Button>
//                   </TooltipTrigger>
//                   <TooltipContent side="right">
//                     <p>Mine ({mockConversations.filter(c => c.assignedTo === 'You').length})</p>
//                   </TooltipContent>
//                 </Tooltip>
//               </TooltipProvider>

//               <TooltipProvider>
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <Button
//                       variant={activeFilter === 'unassigned' ? 'secondary' : 'ghost'}
//                       className="h-9 w-9 p-0"
//                       onClick={() => { setActiveFilter('unassigned'); setSelectedLifecycle(null); }}
//                     >
//                       <UserPlus className="w-4 h-4" />
//                     </Button>
//                   </TooltipTrigger>
//                   <TooltipContent side="right">
//                     <p>Unassigned ({mockConversations.filter(c => !c.assignedTo).length})</p>
//                   </TooltipContent>
//                 </Tooltip>
//               </TooltipProvider>

//               <TooltipProvider>
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <Button
//                       variant={activeFilter === 'unread' ? 'secondary' : 'ghost'}
//                       className="h-9 w-9 p-0 relative"
//                       onClick={() => { setActiveFilter('unread'); setSelectedLifecycle(null); }}
//                     >
//                       <MessageCircle className="w-4 h-4" />
//                       {totalUnread > 0 && (
//                         <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center">
//                           {totalUnread > 9 ? '9+' : totalUnread}
//                         </span>
//                       )}
//                     </Button>
//                   </TooltipTrigger>
//                   <TooltipContent side="right">
//                     <p>Unread {totalUnread > 0 ? `(${totalUnread})` : ''}</p>
//                   </TooltipContent>
//                 </Tooltip>
//               </TooltipProvider>

//               <Separator className="my-2" />

//               {/* Lifecycle Categories */}
//               {lifecycleCategories.map((category) => (
//                 <TooltipProvider key={category.id}>
//                   <Tooltip>
//                     <TooltipTrigger asChild>
//                       <Button
//                         variant={selectedLifecycle === category.id ? 'secondary' : 'ghost'}
//                         className="h-9 w-9 p-0"
//                         onClick={() => {
//                           setSelectedLifecycle(selectedLifecycle === category.id ? null : category.id);
//                           setActiveFilter('all');
//                         }}
//                       >
//                         <category.icon className={`w-4 h-4 ${category.color}`} />
//                       </Button>
//                     </TooltipTrigger>
//                     <TooltipContent side="right">
//                       <p>{category.label} {category.count > 0 ? `(${category.count})` : ''}</p>
//                     </TooltipContent>
//                   </Tooltip>
//                 </TooltipProvider>
//               ))}
//             </div>
//           </ScrollArea>
//         </div>
//       )}

//       {/* Middle Panel - Conversations List */}
//       <div className="w-80 border-r bg-card flex flex-col h-full">
//         {/* Conversation Header */}
//         <div className="p-3 border-b space-y-3 flex-shrink-0 relative">
//           {/* Expanded Search Overlay */}
//           {showSearchBar && (
//             <div className="absolute inset-0 bg-card z-50 flex items-center px-3 animate-in fade-in duration-200">
//               <div className="relative flex-1">
//                 <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
//                 <Input
//                   placeholder="Search conversations..."
//                   className="pl-8 pr-8 h-8 text-xs w-full"
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   autoFocus
//                 />
//                 <Button
//                   size="sm"
//                   variant="ghost"
//                   className="absolute right-0.5 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
//                   onClick={() => {
//                     setShowSearchBar(false);
//                     setSearchQuery('');
//                   }}
//                 >
//                   <X className="w-3 h-3" />
//                 </Button>
//               </div>
//             </div>
//           )}

//           {/* Tabs and Actions on Same Line */}
//           <div className="flex items-center justify-between gap-2">
//             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
//               <TabsList className="h-8">
//                 <TabsTrigger value="chats" className="text-xs px-3 h-7">
//                   <MessageSquare className="w-3 h-3 mr-1" />
//                   Chats
//                 </TabsTrigger>
//                 <TabsTrigger value="calls" className="text-xs px-3 h-7">
//                   <PhoneCall className="w-3 h-3 mr-1" />
//                   Calls
//                 </TabsTrigger>
//               </TabsList>
//             </Tabs>

//             <div className="flex items-center gap-2">
//               <TooltipProvider>
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <Button size="sm" variant="outline" className="h-8 w-8 p-0">
//                       <UserPlus className="w-3.5 h-3.5" />
//                     </Button>
//                   </TooltipTrigger>
//                   <TooltipContent>
//                     <p>New Contact</p>
//                   </TooltipContent>
//                 </Tooltip>
//               </TooltipProvider>
//               <TooltipProvider>
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <Button
//                       size="sm"
//                       variant="outline"
//                       className="h-8 w-8 p-0"
//                       onClick={() => setShowSearchBar(true)}
//                     >
//                       <Search className="w-3.5 h-3.5" />
//                     </Button>
//                   </TooltipTrigger>
//                   <TooltipContent>
//                     <p>Search</p>
//                   </TooltipContent>
//                 </Tooltip>
//               </TooltipProvider>
//               <TooltipProvider>
//                 <Tooltip>
//                   <TooltipTrigger asChild>
//                     <Button size="sm" variant="outline" className="h-8 w-8 p-0">
//                       <Filter className="w-3.5 h-3.5" />
//                     </Button>
//                   </TooltipTrigger>
//                   <TooltipContent>
//                     <p>Advanced Filters</p>
//                   </TooltipContent>
//                 </Tooltip>
//               </TooltipProvider>
//             </div>
//           </div>

//           {/* Filter & Sort Options */}
//           <div className="flex items-center text-xs">
//             {activeTab === 'chats' && (
//               <div className="flex items-center gap-2">
//                 <Switch
//                   id="unreplied-filter"
//                   checked={showUnrepliedOnly}
//                   onCheckedChange={setShowUnrepliedOnly}
//                   className="scale-75"
//                 />
//                 <Label htmlFor="unreplied-filter" className="text-xs cursor-pointer text-muted-foreground">
//                   Unreplied
//                 </Label>
//               </div>
//             )}
//             <div className="ml-auto">
//               {activeTab === 'calls' ? (
//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild>
//                     <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
//                       <Phone className="w-3 h-3 mr-1" />
//                       {callTypeFilter === 'all' && 'All Calls'}
//                       {callTypeFilter === 'incoming' && 'Incoming'}
//                       {callTypeFilter === 'missed' && 'Missed'}
//                       {callTypeFilter === 'outgoing' && 'Outgoing'}
//                       {callTypeFilter === 'ended' && 'Ended'}
//                       {callTypeFilter === 'noanswer' && 'No Answer'}
//                       <ChevronDown className="w-3 h-3 ml-1" />
//                     </Button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent align="end">
//                     <DropdownMenuItem onClick={() => setCallTypeFilter('all')}>
//                       All Calls
//                     </DropdownMenuItem>
//                     <DropdownMenuSeparator />
//                     <DropdownMenuItem onClick={() => setCallTypeFilter('incoming')}>
//                       Incoming
//                     </DropdownMenuItem>
//                     <DropdownMenuItem onClick={() => setCallTypeFilter('missed')}>
//                       Missed
//                     </DropdownMenuItem>
//                     <DropdownMenuItem onClick={() => setCallTypeFilter('outgoing')}>
//                       Outgoing
//                     </DropdownMenuItem>
//                     <DropdownMenuItem onClick={() => setCallTypeFilter('ended')}>
//                       Ended
//                     </DropdownMenuItem>
//                     <DropdownMenuItem onClick={() => setCallTypeFilter('noanswer')}>
//                       No Answer
//                     </DropdownMenuItem>
//                   </DropdownMenuContent>
//                 </DropdownMenu>
//               ) : (
//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild>
//                     <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
//                       <Clock className="w-3 h-3 mr-1" />
//                       Newest
//                       <ChevronDown className="w-3 h-3 ml-1" />
//                     </Button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent align="end">
//                     <DropdownMenuItem>Newest First</DropdownMenuItem>
//                     <DropdownMenuItem>Oldest First</DropdownMenuItem>
//                     <DropdownMenuItem>Most Active</DropdownMenuItem>
//                     <DropdownMenuItem>By Priority</DropdownMenuItem>
//                   </DropdownMenuContent>
//                 </DropdownMenu>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Conversations/Calls List */}
//         <div className="flex-1 overflow-hidden">
//           <ScrollArea className="h-full">
//             <div className="divide-y">
//             {activeTab === 'chats' ? (
//               filteredConversations.length === 0 ? (
//                 <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
//                   <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
//                   <h3 className="text-sm mb-1">No conversations found</h3>
//                   <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
//                 </div>
//               ) : (
//                 filteredConversations.map((conversation) => {
//                 const lifecycleInfo = getLifecycleInfo(conversation.lifecycle);
//                 return (
//                   <div
//                     key={conversation.id}
//                     onClick={() => {
//                       setSelectedConversation(conversation);
//                       setCurrentLifecycle(conversation.lifecycle);

//                       // Sync assigned staff with conversation
//                       if (conversation.assignedTo) {
//                         const assignedName = conversation.assignedTo === 'You' ? 'Visal K' : conversation.assignedTo;
//                         const staff = staffMembers.find(s => s.name === assignedName);
//                         if (staff) {
//                           setAssignedStaff(staff);
//                         }
//                       } else {
//                         // Default to first staff member if unassigned
//                         setAssignedStaff(staffMembers[0]);
//                       }
//                     }}
//                     className={`p-3 cursor-pointer transition-all hover:bg-accent/50 ${
//                       selectedConversation?.id === conversation.id
//                         ? `bg-accent border-l-2 ${
//                             conversation.channel === 'whatsapp'
//                               ? 'border-green-600'
//                               : conversation.channel === 'instagram'
//                               ? 'border-pink-500'
//                               : 'border-blue-600'
//                           }`
//                         : ''
//                     } ${
//                       conversation.unreadCount > 0
//                         ? conversation.channel === 'whatsapp'
//                           ? 'bg-green-50/30'
//                           : conversation.channel === 'instagram'
//                           ? 'bg-pink-50/30'
//                           : 'bg-blue-50/30'
//                         : ''
//                     }`}
//                   >
//                     <div className="flex items-start space-x-2">
//                       {/* Avatar */}
//                       <div className="relative flex-shrink-0">
//                         <CreativeAvatar
//                           name={conversation.customerName}
//                           size="md"
//                           className={
//                             conversation.unreadCount > 0
//                               ? conversation.channel === 'whatsapp'
//                                 ? 'ring-2 ring-green-600 rounded-full'
//                                 : conversation.channel === 'instagram'
//                                 ? 'ring-2 ring-pink-500 rounded-full'
//                                 : 'ring-2 ring-blue-500 rounded-full'
//                               : ''
//                           }
//                         />
//                         <div className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 ${
//                           conversation.channel === 'whatsapp'
//                             ? 'bg-green-600'
//                             : conversation.channel === 'instagram'
//                             ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500'
//                             : 'bg-blue-600'
//                         }`}>
//                           {conversation.channel === 'whatsapp' ? (
//                             <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
//                           ) : conversation.channel === 'instagram' ? (
//                             <Instagram className="w-3.5 h-3.5 text-white" />
//                           ) : (
//                             <MessageCircle className="w-3.5 h-3.5 text-white" />
//                           )}
//                         </div>
//                         {conversation.isOnline && (
//                           <span className={`absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white ${
//                             conversation.channel === 'whatsapp'
//                               ? 'bg-green-500'
//                               : conversation.channel === 'instagram'
//                               ? 'bg-green-500'
//                               : 'bg-blue-500'
//                           }`} />
//                         )}
//                       </div>

//                       {/* Content */}
//                       <div className="flex-1 min-w-0">
//                         {/* Header */}
//                         <div className="flex items-start justify-between mb-0.5">
//                           <div className="flex items-center gap-1.5 flex-1 min-w-0">
//                             <p className={`truncate text-sm ${conversation.unreadCount > 0 ? 'font-semibold' : 'font-medium'}`}>
//                               {conversation.customerName}
//                             </p>
//                           </div>
//                           <div className="flex items-center gap-2 flex-shrink-0">
//                             <span className="text-xs text-muted-foreground whitespace-nowrap">
//                               {conversation.timestamp}
//                             </span>
//                           </div>
//                         </div>

//                         {/* Last Message */}
//                         <div className="flex items-center justify-between gap-2 mb-2">
//                           <p className={`text-xs flex-1 ${conversation.unreadCount > 0 ? 'text-black dark:text-white font-medium' : 'text-muted-foreground'}`}>
//                             {conversation.isTyping ? (
//                               <span className="italic text-green-600">typing...</span>
//                             ) : (
//                               truncateToWords(conversation.lastMessage, 5)
//                             )}
//                           </p>
//                           {conversation.unreadCount > 0 && (
//                             <Badge className={`text-white text-[10px] h-4 min-w-[20px] px-1.5 rounded-full flex-shrink-0 ${
//                               conversation.channel === 'whatsapp'
//                                 ? 'bg-green-600'
//                                 : conversation.channel === 'instagram'
//                                 ? 'bg-pink-500'
//                                 : 'bg-blue-600'
//                             }`}>
//                               {conversation.unreadCount}
//                             </Badge>
//                           )}
//                         </div>

//                         {/* Tags & Badges */}
//                         <div className="flex items-center justify-between gap-1">
//                           <div className="flex items-center gap-1 flex-wrap">
//                             <Badge
//                               variant="outline"
//                               className={`text-[10px] h-5 px-1.5 ${lifecycleInfo.bgColor} ${lifecycleInfo.color} border-transparent`}
//                             >
//                               {lifecycleInfo.label}
//                             </Badge>
//                           </div>
//                           {conversation.assignedTo && (() => {
//                             // Map "You" to "Visal K" or find the matching staff member
//                             const assignedName = conversation.assignedTo === 'You' ? 'Visal K' : conversation.assignedTo;
//                             const staff = staffMembers.find(s => s.name === assignedName);
//                             const staffDisplay = staff || {
//                               initials: assignedName.split(' ').map(n => n[0]).join(''),
//                               color: 'bg-gray-500',
//                               isOnline: false
//                             };
//                             return (
//                               <TooltipProvider>
//                                 <Tooltip>
//                                   <TooltipTrigger asChild>
//                                     <div
//                                       className="relative flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
//                                       onClick={(e) => {
//                                         e.stopPropagation();
//                                         if (staff) {
//                                           setActiveStaffChat(staff);
//                                         }
//                                       }}
//                                     >
//                                       <Avatar className="w-5 h-5">
//                                         <AvatarFallback className={`${staffDisplay.color} text-white text-[10px]`}>
//                                           {staffDisplay.initials}
//                                         </AvatarFallback>
//                                       </Avatar>
//                                       {staffDisplay.isOnline && (
//                                         <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
//                                       )}
//                                     </div>
//                                   </TooltipTrigger>
//                                   <TooltipContent>
//                                     <p>Chat with {assignedName}</p>
//                                   </TooltipContent>
//                                 </Tooltip>
//                               </TooltipProvider>
//                             );
//                           })()}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })
//             )
//             ) : (
//               filteredCalls.length === 0 ? (
//                 <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
//                   <Phone className="w-12 h-12 text-muted-foreground mb-3" />
//                   <h3 className="text-sm mb-1">No calls found</h3>
//                   <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
//                 </div>
//               ) : (
//                 filteredCalls.map((call) => {
//                   const lifecycleInfo = getLifecycleInfo(call.lifecycle);
//                   const getCallIcon = () => {
//                     if (call.type === 'missed') return <Phone className="w-3.5 h-3.5 text-red-600" />;
//                     if (call.type === 'noanswer') return <Phone className="w-3.5 h-3.5 text-orange-600" />;
//                     if (call.type === 'ended') return <Phone className="w-3.5 h-3.5 text-gray-600" />;
//                     if (call.type === 'incoming') return <Phone className="w-3.5 h-3.5 text-green-600 rotate-180" />;
//                     return <Phone className="w-3.5 h-3.5 text-blue-600" />;
//                   };

//                   return (
//                     <div
//                       key={call.id}
//                       className="p-3 cursor-pointer transition-all hover:bg-accent/50"
//                     >
//                       <div className="flex items-start space-x-2">
//                         {/* Avatar */}
//                         <div className="relative flex-shrink-0">
//                           <Avatar className="w-10 h-10">
//                             <AvatarFallback>
//                               {call.customerInitials}
//                             </AvatarFallback>
//                           </Avatar>
//                           <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
//                             {getCallIcon()}
//                           </div>
//                         </div>

//                         {/* Content */}
//                         <div className="flex-1 min-w-0">
//                           {/* Header */}
//                           <div className="flex items-start justify-between mb-0.5">
//                             <div className="flex items-center space-x-1.5 flex-1 min-w-0">
//                               <p className="truncate text-sm font-medium">
//                                 {call.customerName}
//                               </p>
//                             </div>
//                             <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
//                               {call.timestamp}
//                             </span>
//                           </div>

//                           {/* Call Details */}
//                           <p className="text-xs text-muted-foreground mb-2">
//                             {call.phone} • {call.type === 'missed' ? 'Missed call' : call.duration}
//                           </p>

//                           {/* Tags & Badges */}
//                           <div className="flex items-center gap-1 flex-wrap">
//                             <Badge
//                               variant="outline"
//                               className={`text-[10px] h-5 px-1.5 ${lifecycleInfo.bgColor} ${lifecycleInfo.color} border-transparent`}
//                             >
//                               {lifecycleInfo.label}
//                             </Badge>
//                             {call.tags.map((tag, idx) => (
//                               <Badge key={idx} variant="outline" className="text-[10px] h-5 px-1.5">
//                                 {tag}
//                               </Badge>
//                             ))}
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })
//               )
//             )}
//             </div>
//           </ScrollArea>
//         </div>
//       </div>

//       {/* Right Panel - Chat Area */}
//       {selectedConversation ? (
//         <div className={`flex min-w-0 h-full ${showCustomerInfo ? 'flex-1' : 'flex-[2.2]'}`}>
//           {/* Chat Section */}
//           <div className="flex-1 flex flex-col min-w-0">
//             {/* Chat Header */}
//     <div className="p-3 border-b bg-card flex-shrink-0">
//       <div className="flex items-center justify-between gap-2">
//         <div className="flex items-center gap-2 min-w-0 flex-shrink">
//           <div className="relative flex-shrink-0">
//             <CreativeAvatar
//               name={selectedConversation.customerName}
//               size="md"
//               showOnlineStatus={selectedConversation.isOnline}
//               isOnline={selectedConversation.isOnline}
//             />
//             <div className={`absolute -bottom-0.5 -right-0.5 rounded-full p-0.5 shadow-sm ${
//               selectedConversation.channel === 'whatsapp'
//                 ? 'bg-green-600'
//                 : selectedConversation.channel === 'instagram'
//                 ? 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500'
//                 : 'bg-blue-600'
//             }`}>
//               {selectedConversation.channel === 'whatsapp' ? (
//                 <WhatsAppIcon className="w-3 h-3 text-white" />
//               ) : selectedConversation.channel === 'instagram' ? (
//                 <Instagram className="w-3 h-3 text-white" />
//               ) : (
//                 <MessageCircle className="w-3 h-3 text-white" />
//               )}
//             </div>
//           </div>
//           <div className="min-w-0 flex-shrink">
//             <div className="flex items-center gap-2 flex-wrap">
//               <h3 className="truncate">{selectedConversation.customerName}</h3>
//               {selectedConversation.customerInfo.tags.includes('VIP') && (
//                 <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-[10px] h-4 px-1.5 flex-shrink-0">
//                   <Star className="w-2.5 h-2.5 mr-0.5 fill-white" />
//                   VIP
//                 </Badge>
//               )}

//               {/* Lifecycle Stage Dropdown */}
//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5">
//                     {(() => {
//                       const lifecycleInfo = getLifecycleInfo(currentLifecycle);
//                       const IconComponent = lifecycleInfo.icon;
//                       return (
//                         <>
//                           <div className={`w-4 h-4 rounded-full ${lifecycleInfo.bgColor} flex items-center justify-center`}>
//                             <IconComponent className={`w-2.5 h-2.5 ${lifecycleInfo.color}`} />
//                           </div>
//                           <span className="text-xs max-w-[80px] truncate">{lifecycleInfo.label}</span>
//                           <ChevronDown className="w-3 h-3 text-muted-foreground" />
//                         </>
//                       );
//                     })()}
//                   </Button>
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent align="start" className="w-52">
//                   <div className="px-2 py-1.5 text-xs text-muted-foreground">
//                     Lifecycle Stage
//                   </div>
//                   <DropdownMenuSeparator />
//                   {lifecycleCategories.map((lifecycle) => {
//                     const IconComponent = lifecycle.icon;
//                     return (
//                       <DropdownMenuItem
//                         key={lifecycle.id}
//                         onClick={() => handleLifecycleChange(lifecycle.id)}
//                         className="gap-2"
//                       >
//                         <div className={`w-7 h-7 rounded-full ${lifecycle.bgColor} flex items-center justify-center`}>
//                           <IconComponent className={`w-4 h-4 ${lifecycle.color}`} />
//                         </div>
//                         <div className="flex-1">
//                           <div className="text-sm">{lifecycle.label}</div>
//                         </div>
//                         {currentLifecycle === lifecycle.id && (
//                           <CheckCheck className="w-4 h-4 text-green-600" />
//                         )}
//                       </DropdownMenuItem>
//                     );
//                   })}
//                 </DropdownMenuContent>
//               </DropdownMenu>
//             </div>
//           </div>
//         </div>

//       <div className="flex items-center gap-0.5 flex-shrink-0">
//         {/* Assigned Staff Dropdown */}
//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
//               <div className="relative">
//                 <Avatar className="w-5 h-5">
//                   <AvatarFallback className={`${assignedStaff.color} text-white text-[10px]`}>
//                     {assignedStaff.initials}
//                   </AvatarFallback>
//                 </Avatar>
//                 {assignedStaff.isOnline && (
//                   <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
//                 )}
//               </div>
//               <span className="text-xs max-w-[80px] truncate">{assignedStaff.name}</span>
//               <ChevronDown className="w-3 h-3 text-muted-foreground" />
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="start" className="w-52">
//             <div className="px-2 py-1.5 text-xs text-muted-foreground">
//               Assign to
//             </div>
//             <DropdownMenuSeparator />
//             {staffMembers.map((staff) => (
//               <DropdownMenuItem
//                 key={staff.id}
//                 onClick={() => handleAssignStaff(staff)}
//                 className="gap-2 group"
//               >
//                 <CreativeAvatar
//                   name={staff.name}
//                   size="xs"
//                   showOnlineStatus={true}
//                   isOnline={staff.isOnline}
//                 />
//                 <div className="flex-1">
//                   <div className="text-sm">{staff.name}</div>
//                   <div className="text-xs text-muted-foreground">
//                     {staff.isOnline ? 'Online' : 'Offline'}
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-1">
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       setActiveStaffChat(staff);
//                     }}
//                   >
//                     <MessageCircle className="w-3.5 h-3.5 text-rateup-blue" />
//                   </Button>
//                   {assignedStaff.id === staff.id && (
//                     <CheckCheck className="w-4 h-4 text-green-600" />
//                   )}
//                 </div>
//               </DropdownMenuItem>
//             ))}
//           </DropdownMenuContent>
//         </DropdownMenu>

//         {/* Quick Chat Button */}
//         <TooltipProvider>
//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className="h-8 w-8 p-0"
//                 onClick={() => setActiveStaffChat(assignedStaff)}
//               >
//                 <MessageCircle className="w-4 h-4 text-rateup-blue" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent>
//               <p>Chat with {assignedStaff.name}</p>
//             </TooltipContent>
//           </Tooltip>
//         </TooltipProvider>

//         <TooltipProvider>
//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                 <Phone className="w-3.5 h-3.5" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent><p>Call</p></TooltipContent>
//           </Tooltip>
//         </TooltipProvider>

//         <TooltipProvider>
//           <Tooltip>
//             <TooltipTrigger asChild>
//               <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                 <Star className="w-3.5 h-3.5" />
//               </Button>
//             </TooltipTrigger>
//             <TooltipContent><p>Priority</p></TooltipContent>
//           </Tooltip>
//         </TooltipProvider>

//         {/* Expandable Search */}
//         {isConversationSearchExpanded ? (
//           <div className="relative flex items-center animate-in slide-in-from-right-5 duration-200">
//             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
//             <Input
//               type="text"
//               placeholder="Search in conversation..."
//               value={conversationSearchQuery}
//               onChange={(e) => setConversationSearchQuery(e.target.value)}
//               className="h-8 w-56 pl-8 pr-8 text-xs"
//               autoFocus
//             />
//             <Button
//               variant="ghost"
//               size="sm"
//               className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
//               onClick={() => {
//                 setConversationSearchQuery('');
//                 setIsConversationSearchExpanded(false);
//               }}
//             >
//               <X className="w-3 h-3" />
//             </Button>
//           </div>
//         ) : (
//           <TooltipProvider>
//             <Tooltip>
//               <TooltipTrigger asChild>
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   className="h-8 w-8 p-0"
//                   onClick={() => setIsConversationSearchExpanded(true)}
//                 >
//                   <Search className="w-3.5 h-3.5" />
//                 </Button>
//               </TooltipTrigger>
//               <TooltipContent><p>Search</p></TooltipContent>
//             </Tooltip>
//           </TooltipProvider>
//         )}

//         <Separator orientation="vertical" className="h-5 mx-0.5" />

//         <DropdownMenu>
//           <DropdownMenuTrigger asChild>
//             <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//               <MoreVertical className="w-3.5 h-3.5" />
//             </Button>
//           </DropdownMenuTrigger>
//           <DropdownMenuContent align="end">
//             <DropdownMenuItem>
//               <CheckCheck className="w-4 h-4 mr-2" />
//               Mark as Resolved
//             </DropdownMenuItem>
//             <DropdownMenuItem>
//               <Archive className="w-4 h-4 mr-2" />
//               Archive
//             </DropdownMenuItem>
//             <DropdownMenuItem>
//               <Tag className="w-4 h-4 mr-2" />
//               Add Tags
//             </DropdownMenuItem>
//             <DropdownMenuSeparator />
//             <DropdownMenuItem className="text-destructive">
//               <Trash2 className="w-4 h-4 mr-2" />
//               Delete
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>
//       </div>
//     </div>
//   </div>

//           {/* Messages Area */}
//           <div className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/10 to-background">
//             <div className="p-6 space-y-4 max-w-3xl mx-auto">
//               {selectedConversation.messages.map((message) => (
//                 <div
//                   key={message.id}
//                   className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
//                 >
//                   <div className="flex items-end space-x-2 max-w-[75%]">
//                     {message.sender === 'customer' && (
//                       <div className="mb-1">
//                         <CreativeAvatar
//                           name={selectedConversation.customerName}
//                           size="sm"
//                         />
//                       </div>
//                     )}

//                     <div>
//                       <div
//                         className={`px-4 py-2.5 rounded-2xl shadow-sm ${
//                           message.sender === 'agent'
//                             ? 'bg-green-600 text-white rounded-br-sm'
//                             : 'bg-card border border-border rounded-bl-sm'
//                         }`}
//                       >
//                         <p className="text-sm leading-relaxed">{message.content}</p>
//                       </div>

//                       <div className={`flex items-center space-x-2 mt-1 px-2 ${
//                         message.sender === 'agent' ? 'justify-end' : 'justify-start'
//                       }`}>
//                         <span className="text-xs text-muted-foreground">
//                           {message.timestamp}
//                         </span>
//                         {message.sender === 'agent' && message.status && (
//                           <div>
//                             {message.status === 'read' && (
//                               <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
//                             )}
//                             {message.status === 'delivered' && (
//                               <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
//                             )}
//                             {message.status === 'sent' && (
//                               <Check className="w-3.5 h-3.5 text-muted-foreground" />
//                             )}
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Quick Replies */}
//           {showQuickReplies && (
//             <div className="border-t bg-card p-3 flex-shrink-0">
//               <div className="flex items-center justify-between mb-2">
//                 <span className="text-xs text-muted-foreground">Quick Replies</span>
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   className="h-6 text-xs"
//                   onClick={() => setShowQuickReplies(false)}
//                 >
//                   <X className="w-3 h-3" />
//                 </Button>
//               </div>
//               <div className="grid grid-cols-2 gap-2">
//                 {quickReplies.map((reply, index) => (
//                   <Button
//                     key={index}
//                     variant="outline"
//                     size="sm"
//                     className="text-xs h-auto py-2 text-left justify-start whitespace-normal"
//                     onClick={() => handleQuickReply(reply)}
//                   >
//                     <Zap className="w-3 h-3 mr-1.5 flex-shrink-0 text-green-600" />
//                     <span className="line-clamp-2">{reply}</span>
//                   </Button>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Message Input */}
//           <div className="border-t bg-card p-4 flex-shrink-0">
//             <div className="flex items-start space-x-2">
//               <div className="flex-1">
//                 <div className="relative">
//                   <Textarea
//                     placeholder="Type your message... (Use '/' for snippets, '@' for mentions, ':' for emoji)"
//                     className="min-h-[60px] max-h-[120px] pr-12 resize-none"
//                     value={newMessage}
//                     onChange={(e) => setNewMessage(e.target.value)}
//                     onKeyDown={(e) => {
//                       if (e.key === 'Enter' && !e.shiftKey) {
//                         e.preventDefault();
//                         handleSendMessage();
//                       }
//                     }}
//                   />
//                   <div className="absolute bottom-2 right-2 flex items-center space-x-1">
//                     <TooltipProvider>
//                       <Tooltip>
//                         <TooltipTrigger asChild>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             className="h-7 w-7 p-0"
//                             onClick={() => setShowQuickReplies(!showQuickReplies)}
//                           >
//                             <Zap className="w-4 h-4 text-green-600" />
//                           </Button>
//                         </TooltipTrigger>
//                         <TooltipContent><p>Quick Replies</p></TooltipContent>
//                       </Tooltip>
//                     </TooltipProvider>
//                   </div>
//                 </div>

//                 {/* Formatting Toolbar */}
//                 <div className="flex items-center justify-between mt-2">
//                   <div className="flex items-center space-x-1">
//                     <TooltipProvider>
//                       <Tooltip>
//                         <TooltipTrigger asChild>
//                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                             <Smile className="w-4 h-4" />
//                           </Button>
//                         </TooltipTrigger>
//                         <TooltipContent><p>Emoji</p></TooltipContent>
//                       </Tooltip>
//                     </TooltipProvider>

//                     <TooltipProvider>
//                       <Tooltip>
//                         <TooltipTrigger asChild>
//                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                             <Mic className="w-4 h-4" />
//                           </Button>
//                         </TooltipTrigger>
//                         <TooltipContent><p>Voice Message</p></TooltipContent>
//                       </Tooltip>
//                     </TooltipProvider>

//                     <TooltipProvider>
//                       <Tooltip>
//                         <TooltipTrigger asChild>
//                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                             <Paperclip className="w-4 h-4" />
//                           </Button>
//                         </TooltipTrigger>
//                         <TooltipContent><p>Attach File</p></TooltipContent>
//                       </Tooltip>
//                     </TooltipProvider>

//                     <TooltipProvider>
//                       <Tooltip>
//                         <TooltipTrigger asChild>
//                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                             <Image className="w-4 h-4" />
//                           </Button>
//                         </TooltipTrigger>
//                         <TooltipContent><p>Add Image</p></TooltipContent>
//                       </Tooltip>
//                     </TooltipProvider>

//                     <Separator orientation="vertical" className="h-5 mx-1" />

//                     <TooltipProvider>
//                       <Tooltip>
//                         <TooltipTrigger asChild>
//                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                             <LayoutTemplate className="w-4 h-4" />
//                           </Button>
//                         </TooltipTrigger>
//                         <TooltipContent><p>Message Template</p></TooltipContent>
//                       </Tooltip>
//                     </TooltipProvider>

//                     <TooltipProvider>
//                       <Tooltip>
//                         <TooltipTrigger asChild>
//                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                             <FileText className="w-4 h-4" />
//                           </Button>
//                         </TooltipTrigger>
//                         <TooltipContent><p>Snippet</p></TooltipContent>
//                       </Tooltip>
//                     </TooltipProvider>

//                     <TooltipProvider>
//                       <Tooltip>
//                         <TooltipTrigger asChild>
//                           <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
//                             <Hash className="w-4 h-4" />
//                           </Button>
//                         </TooltipTrigger>
//                         <TooltipContent><p>Add Variable</p></TooltipContent>
//                       </Tooltip>
//                     </TooltipProvider>
//                   </div>

//                   <div className="flex items-center space-x-2">
//                     <span className="text-xs text-muted-foreground">
//                       WhatsApp Business - to: {selectedConversation.customerInfo.phone}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               <Button
//                 size="sm"
//                 className="bg-green-600 hover:bg-green-700 h-[60px] px-6"
//                 onClick={handleSendMessage}
//                 disabled={!newMessage.trim()}
//               >
//                 <Send className="w-4 h-4" />
//               </Button>
//             </div>

//             {/* Add Comment & Summarize */}
//             <div className="flex items-center space-x-3 mt-3 pt-3 border-t">
//               <Button variant="ghost" size="sm" className="text-xs h-7">
//                 <MessageCircle className="w-3 h-3 mr-1.5" />
//                 Add comment
//               </Button>
//               <Button variant="ghost" size="sm" className="text-xs h-7">
//                 <Sparkles className="w-3 h-3 mr-1.5 text-green-600" />
//                 AI Summarize
//               </Button>
//             </div>
//           </div>
//           </div>

//           {/* Icon Sidebar - Quick Actions */}
//           <div className="w-14 border-l bg-card flex flex-col items-center py-4 space-y-3 flex-shrink-0">
//             <TooltipProvider>
//               <Tooltip>
//                 <TooltipTrigger asChild>
//                   <Button
//                     variant={showCustomerInfo ? "secondary" : "ghost"}
//                     size="sm"
//                     className="w-10 h-10 p-0"
//                     onClick={() => setShowCustomerInfo(!showCustomerInfo)}
//                   >
//                     <User className="w-5 h-5" />
//                   </Button>
//                 </TooltipTrigger>
//                 <TooltipContent side="left">
//                   <p>Contact Details</p>
//                 </TooltipContent>
//               </Tooltip>
//             </TooltipProvider>

//             <Separator className="w-8" />

//             <TooltipProvider>
//               <Tooltip>
//                 <TooltipTrigger asChild>
//                   <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
//                     <Zap className="w-5 h-5 text-green-600" />
//                   </Button>
//                 </TooltipTrigger>
//                 <TooltipContent side="left">
//                   <p>Automation</p>
//                 </TooltipContent>
//               </Tooltip>
//             </TooltipProvider>

//             <TooltipProvider>
//               <Tooltip>
//                 <TooltipTrigger asChild>
//                   <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
//                     <Tag className="w-5 h-5" />
//                   </Button>
//                 </TooltipTrigger>
//                 <TooltipContent side="left">
//                   <p>Tags</p>
//                 </TooltipContent>
//               </Tooltip>
//             </TooltipProvider>

//             <div className="flex-1" />

//             <TooltipProvider>
//               <Tooltip>
//                 <TooltipTrigger asChild>
//                   <Button variant="ghost" size="sm" className="w-10 h-10 p-0">
//                     <MessageCircle className="w-5 h-5 text-green-600" />
//                   </Button>
//                 </TooltipTrigger>
//                 <TooltipContent side="left">
//                   <p>WhatsApp Support</p>
//                 </TooltipContent>
//               </Tooltip>
//             </TooltipProvider>
//           </div>

//           {/* Customer Info Panel - Slides in from right */}
//           {showCustomerInfo && (
//             <div className={`border-l bg-card flex flex-col h-full animate-in slide-in-from-right duration-200 ${showCustomerInfo ? 'flex-[0.9]' : 'w-80'}`}>
//               {/* Customer Header */}
//               <div className="p-3.5 border-b flex-shrink-0">
//                 <div className="flex items-center justify-between mb-2.5">
//                   <h3 className="text-sm text-center flex-1">Contact Details</h3>
//                   <div className="flex items-center gap-2">
//                     <TooltipProvider>
//                       <Tooltip>
//                         <TooltipTrigger asChild>
//                           <Button
//                             variant="ghost"
//                             size="sm"
//                             className="h-7 w-7 p-0"
//                             onClick={() => setShowCustomerInfo(!showCustomerInfo)}
//                           >
//                             {showCustomerInfo ? (
//                               <ChevronRight className="w-3.5 h-3.5" />
//                             ) : (
//                               <PanelLeft className="w-3.5 h-3.5" />
//                             )}
//                           </Button>
//                         </TooltipTrigger>
//                         <TooltipContent>
//                           <p>{showCustomerInfo ? 'Collapse Panel' : 'Expand Panel'}</p>
//                         </TooltipContent>
//                       </Tooltip>
//                     </TooltipProvider>
//                   </div>
//                 </div>

//                 <div className="text-center">
//                   <div className="mx-auto mb-2.5 inline-block">
//                     <CreativeAvatar
//                       name={selectedConversation.customerName}
//                       size="lg"
//                     />
//                   </div>
//                   <h3 className="mb-1 text-sm">{selectedConversation.customerName}</h3>
//                   <div className="flex items-center justify-center space-x-2 mb-2.5">
//                     <Badge
//                       variant="outline"
//                       className={`text-[11px] ${getLifecycleInfo(selectedConversation.lifecycle).bgColor} ${getLifecycleInfo(selectedConversation.lifecycle).color}`}
//                     >
//                       {getLifecycleInfo(selectedConversation.lifecycle).label}
//                     </Badge>
//                   </div>

//                   <div className="flex items-center justify-center space-x-1.5">
//                     {selectedConversation.customerInfo.tags.map((tag, index) => (
//                       <Badge key={index} variant="secondary" className="text-[11px]">
//                         {tag}
//                       </Badge>
//                     ))}
//                   </div>
//                 </div>
//               </div>

//               {/* Customer Info */}
//               <ScrollArea className="flex-1">
//                 <div className="p-3.5 space-y-3.5">
//                   {/* Contact Information */}
//                   <div>
//                     <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
//                       Contact Information
//                     </h4>
//                     <div className="space-y-1.5">
//                       {selectedConversation.customerInfo.phone && (
//                         <div className="flex items-start space-x-1.5 group">
//                           <Phone className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
//                           <div className="flex-1 min-w-0">
//                             <p className="text-[11px] text-muted-foreground">Phone</p>
//                             <div className="flex items-center justify-between">
//                               <p className="text-xs">{selectedConversation.customerInfo.phone}</p>
//                               <Button
//                                 variant="ghost"
//                                 size="sm"
//                                 className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
//                                 onClick={() => {
//                                   navigator.clipboard.writeText(selectedConversation.customerInfo.phone || '');
//                                 }}
//                               >
//                                 <Copy className="w-3 h-3" />
//                               </Button>
//                             </div>
//                           </div>
//                         </div>
//                       )}
//                       {selectedConversation.customerInfo.email && (
//                         <div className="flex items-start space-x-1.5 group">
//                           <Mail className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
//                           <div className="flex-1 min-w-0">
//                             <p className="text-[11px] text-muted-foreground">Email</p>
//                             <div className="flex items-center justify-between">
//                               <p className="text-xs truncate">{selectedConversation.customerInfo.email}</p>
//                               <Button
//                                 variant="ghost"
//                                 size="sm"
//                                 className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
//                                 onClick={() => {
//                                   navigator.clipboard.writeText(selectedConversation.customerInfo.email || '');
//                                 }}
//                               >
//                                 <Copy className="w-3 h-3" />
//                               </Button>
//                             </div>
//                           </div>
//                         </div>
//                       )}
//                       {selectedConversation.customerInfo.phone && getCountryFromPhone(selectedConversation.customerInfo.phone) && (
//                         <div className="flex items-start space-x-1.5">
//                           <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
//                           <div className="flex-1">
//                             <p className="text-[11px] text-muted-foreground">Country</p>
//                             <p className="text-xs">{getCountryFromPhone(selectedConversation.customerInfo.phone)}</p>
//                           </div>
//                         </div>
//                       )}
//                       {selectedConversation.customerInfo.company && (
//                         <div className="flex items-start space-x-1.5">
//                           <Building className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
//                           <div className="flex-1">
//                             <p className="text-[11px] text-muted-foreground">Company</p>
//                             <p className="text-xs">{selectedConversation.customerInfo.company}</p>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   <Separator />

//                   {/* Customer Stats */}
//                   <div>
//                     <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
//                       Customer Stats
//                     </h4>
//                     <div className="space-y-2.5">
//                       <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
//                         <div className="flex items-center space-x-1.5">
//                           <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
//                           <span className="text-xs">Total Orders</span>
//                         </div>
//                         <span className="text-xs font-medium">{selectedConversation.customerInfo.totalOrders}</span>
//                       </div>

//                       {selectedConversation.customerInfo.lifetimeValue && (
//                         <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
//                           <div className="flex items-center space-x-1.5">
//                             <DollarSign className="w-3.5 h-3.5 text-green-600" />
//                             <span className="text-xs">Lifetime Value</span>
//                           </div>
//                           <span className="text-xs font-medium">{selectedConversation.customerInfo.lifetimeValue}</span>
//                         </div>
//                       )}

//                       <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
//                         <div className="flex items-center space-x-1.5">
//                           <Calendar className="w-3.5 h-3.5 text-purple-600" />
//                           <span className="text-xs">Customer Since</span>
//                         </div>
//                         <span className="text-[11px]">{selectedConversation.customerInfo.customerSince}</span>
//                       </div>

//                       {selectedConversation.customerInfo.lastOrderDate && (
//                         <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50">
//                           <div className="flex items-center space-x-1.5">
//                             <Clock className="w-3.5 h-3.5 text-orange-600" />
//                             <span className="text-xs">Last Order</span>
//                           </div>
//                           <span className="text-[11px]">{selectedConversation.customerInfo.lastOrderDate}</span>
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   <Separator />

//                   {/* Quick Actions */}
//                   <div>
//                     <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2.5">
//                       Quick Actions
//                     </h4>
//                     <div className="space-y-1.5">
//                       <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
//                         <Tag className="w-3.5 h-3.5 mr-1.5" />
//                         Manage Tags
//                       </Button>
//                       <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
//                         <User className="w-3.5 h-3.5 mr-1.5" />
//                         Edit Contact
//                       </Button>
//                       <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
//                         <Activity className="w-3.5 h-3.5 mr-1.5" />
//                         View Activity
//                       </Button>
//                       <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8 text-red-600 hover:text-red-700">
//                         <Trash2 className="w-3.5 h-3.5 mr-1.5" />
//                         Delete Contact
//                       </Button>
//                     </div>
//                   </div>
//                 </div>
//               </ScrollArea>
//             </div>
//           )}
//         </div>
//       ) : (
//         <div className="flex-1 flex items-center justify-center bg-muted/20">
//           <div className="text-center">
//             <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
//             <h3 className="mb-2">Select a conversation</h3>
//             <p className="text-sm text-muted-foreground">
//               Choose a conversation from the list to start messaging
//             </p>
//           </div>
//         </div>
//       )}

//       {/* Staff Chat Popup */}
//       {activeStaffChat && (
//         <StaffChatPopup
//           staff={{
//             id: activeStaffChat.id,
//             name: activeStaffChat.name,
//             initials: activeStaffChat.initials,
//             avatar: activeStaffChat.color,
//             isOnline: activeStaffChat.isOnline,
//           }}
//           onClose={() => setActiveStaffChat(null)}
//         />
//       )}
//     </div>
//   );
// }
