import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Markdown from 'react-markdown';
import {
 Send,
 Users,
 Image as ImageIcon,
 Smile,
 Trash2,
 X,
 MessageSquare,
  MessagesSquare, Coffee,
  Hash,
 ShieldAlert,
 Zap,
 ChevronRight,
 MoreVertical,
 CheckCircle2,
 ImagePlus,
 BookOpen,
 FileText,
 FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
 id: string;
 username: string;
 text: string;
 timestamp: string;
 ip?: string;
 type?: "chat" | "system";
 isPrivate?: boolean;
 toId?: string;
 fromId?: string;
 isRead?: boolean;
 imageUrl?: string;
 fileUrl?: string;
 fileName?: string;
 profile?: any;
}

interface UserPresence {
 username: string;
 ip: string;
 status: string;
 socketId?: string;
 profile?: any;
}

class LocalErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
 constructor(props: {children: React.ReactNode}) {
 super(props);
 this.state = { hasError: false, error: null };
 }
 static getDerivedStateFromError(error: Error) {
 return { hasError: true, error };
 }
 render() {
 if (this.state.hasError) {
 return <div className="p-10 light:text-slate-900 text-white bg-red-900 overflow-auto h-full w-full">Error: {this.state.error?.message}<br/>{this.state.error?.stack}</div>;
 }
 return this.props.children;
 }
}

function ChatPanelInner({ workspaceId, userProfile, onEditProfile }: { workspaceId: string, userProfile?: any, onEditProfile?: () => void }) {
 

 const LOGIC_ANSWERS: Record<string, string> = {
 "为什么团队名称修改后蓝橙无单价？": `**关于团队名称同步与匹配蓝橙单价的问题排查**\n您好，关于此问题，系统确实已经将**“团队名称”**全面同步到了整个蓝橙单价甚至全局的匹配逻辑中。导致现在全部显示“无单价”的原因并非没同步，而是**数据本身存在字符串匹配差异**。\n\n* **旧版逻辑（兼容团队ID）**：之前系统对“团队”关键词抓取时没有过滤掉 \`id\` 字符，这就导致如果列名为“团队id”，系统会默认抓取到两个表的【团队ID】进行数值比对（例如 \`123456\` == \`123456\`），因为数字ID高度一致不会带有多余空格字眼，所以能够成功匹配出单价。\n* **当前逻辑（强制匹配团队名称）**：为了响应您对于“日单量表直接匹配团队名称而不是团队ID”的需求，系统现已全面排除了 \`id\`，强制提取【团队名称】。一旦系统使用这种方式，您的“日单量表（业务明细）”中“团队名称”列的中文文本，与您存放在 \`兼职价格档案\` 等配置文件中填写的“团队名称”一旦存在**任何微小差异**（如包含多余空格、或者简称“南山一队”对照“南山区一站”等没有严格对齐），就会导致查无此站，触发默认价格“无”。\n* **解决方案建议**：由于中文团队名称极其容易出现数据源填报差异（导致无法精确命中索引字典），建议您排查工资业务表和价格档案两端是否存在团队名称文本不统一或含有不可见字符的问题。如果您希望恢复此前精准的匹配体验，可以再次告知我：**“帮我把兼职和蓝橙的匹配基准回滚为团队ID”** 或者您核对一下价格表及明细表的团队名称确切保持100%中文一致来解决。`,
 "安全基金表出勤天数生成逻辑？": `**安全基金中出勤天数的计算逻辑**\n系统中的安全基金/非蜂卡的考勤扣减依据如下：\n\n* **有效计算**：读取处理后的发薪详单，剔除掉标红的“欺诈单（值为0不核算）”后，统计每一位骑手在不同“账单时间”（自然日）下产生过完单的不重复天数。\n* **合并主站点规则**：有些骑手可能会在同个月内横跨跑了多个团队站点。为了避免同一个骑手多份挂靠扣费，代码会计算他**单量最多**的那个团队作为“主站”。所有出勤天数将会全部汇总合并展示在他的主站明细下；其他辅助站点其名下的出勤天均标记为 0，以此避免对同一个骑手重复叠加扣取安全基金。\n* **梯度天数逻辑**：由 \`calc_deduction_new\` 控制算法。若汇总的出勤天不足 15 天，按“（对应金额 ÷ 当月天数）× 实际出勤天数”折算出安全基金；如果出勤满 15 天及以上，则直接按满月正常天数直接扣整额。`,
 "价格档案匹配逻辑是怎样的？": `**关于价格匹配逻辑（蓝橙单价/兼职单价）**\n目前系统的单价核心匹配逻辑是一套严格的三重主键比对机制：\n\n* **数据预处理：** 当系统读取「兼职价格档案」和「日单量日结表」时，会自动精准匹配抓取核心字段。\n* **精准匹配：** 根据日期、站点、风神骑手ID等组合进行绝对匹配。`,
 "全勤出勤天数计算逻辑是什么？": `**出勤天数计算引擎**\n核算系统同时参考两大数据源，以确保数据公正并防止作弊。`,
 "配送所得基础工资怎么算？": `**配送所得的基本核算公式**\n系统执行的核心价值在于将庞大繁琐的运单最终转化为实际金额。生成逻辑：\n\n* **基础匹配公式**： \`单笔配送费 = 有效完成单 × 命中单价\`\n* **有效单筛选**：在实际相乘之前，会预先剔除被标记为“取消单”、“欺诈单”的数据。只有【完成单】可以进入基数。\n* **阶梯激励计算**：部分团队或城市如果开启了超量阶梯配置（如，月累计超过800单后，每单额外补0.5元）。处理器会统计个人的该月累计单量 \`sum_orders\`，当超过特定阈值段时，自动为超过的部分赋予高阶价格并差额补贴。\n* **输出写入**：计算后的结果会通过预制的公式或者数值写入到最终工资表的 \`【配送所得】\` 栏位中，作为加项金额。`,
 "蓝橙单价反写到配送所得表备注中匹配逻辑是怎样的？": `**单价反写至“配送所得表”备注的逻辑规则**\n为了能在此表中直观看到骑手该月经历的单价变动，系统会执行一套回写匹配：\n\n* **核心关联主键**：程序在读取到“配送所得表”时，会逐行提取当前行的 **【团队名称】** 和 **【风神骑手ID】**。\n* **追溯历史单价**：随后使用这一对复合主键 \`团队名称 + 骑手ID\`，去庞大的“日单量”表底表记录字典中查找该名骑手在整个计算周期内的“每天对应的单价值”。\n* **高级聚合与备注生成**：\n * **单一价格：** 如果该骑手整个周期内价格自始至终没变，备注栏会被**自动清空**以保持版面整洁，并在专设的“蓝橙单价”列单独填入具体价格数字。\n * **多重价格变动：** 当骑手被匹配到多个不同日期的有效价格时，程序会按自然日对价格进行连续性折叠聚合，将变动记录按日期回写到 \`备注\` 栏位（生成形如 \`1日-15日单价5.5元；16日-30日单价6元\` 的字符串记录）。并在“蓝橙单价”专属列打上分号分割的标记（如 \`5.5;6\`）。\n * **无单价记录：** 如果该骑手在某些天份未能获取到价格（判定为无单价），系统一定会重点将其断带日期强制注入备注（如 \`4日-7日无单价\`），以警示复核人员。\n\n**总结**：配送所得表反写单价的基础是严格依赖 **团队名称 + 骑手ID**，只要这两个字段与日单量表里的该员工所属团队及ID相同，备注及价格变动记录必会成功反写。`,
 "为什么会有跨站合并的情况？": `**跨站（多团队挂靠）的数据合并初衷**\n实际运营中，因为运力调度或兼职骑手活跃区域变动，常常引发一个骑手当月归属于多个不同网格站：\n\n* **唯一主键整合**：为了避免同一员工因为跑了不同的站，最终收到支离破碎的多次小额发薪或被**重复扣除安全基金卡费**。计算系统始终以 \`唯一骑手身份证ID/系统ID\` 作为聚合主键。\n* **提取与汇总**：代码会自动跨所有的站点分表，提取该主键产生过的所有单量、额外津贴及扣除款项。\n* **主从关系输出**：它将判断哪个网格站的完成单量占比最高（即“主站”），并将汇总后“一整条合并且完整的流水记录”全部归并展示在主站。辅站仅仅保留基础业务痕迹，但薪资金额标记为 \`[已合并至主站]\`，最终实发呈现出整齐唯一的结果。`
 };

 const [messages, setMessages] = useState<Message[]>([]);
 
  const [groupName, setGroupName] = useState("全员广场");
  const [welcomeMessages, setWelcomeMessages] = useState<string[]>([
    "大家辛苦了！喝杯茶休息一下吧~ 🍵",
    "今天又是充满希望的一天！✨",
    "欢迎来到带薪摸鱼区，大家畅所欲言！🎉",
    "滴滴！您的摸鱼卡已刷成功~ 🚀"
  ]);
  const [quickPhrases, setQuickPhrases] = useState<string[]>([]);
  const [logicAnswers, setLogicAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/chat/config")
      .then(r => r.json())
      .then(data => {
        if (data.groupName) setGroupName(data.groupName);
        if (data.welcomeMessages) setWelcomeMessages(data.welcomeMessages);
        if (data.quickPhrases) setQuickPhrases(data.quickPhrases);
        if (data.logicAnswers) setLogicAnswers(data.logicAnswers);
      })
      .catch(() => {});
  }, []);

  const [usersOnline, setUsersOnline] = useState<UserPresence[]>([]);
 const [inputText, setInputText] = useState("");
 const [username, setUsername] = useState("");
 const [socket, setSocket] = useState<Socket | null>(null);
 const [hasSignedIn, setHasSignedIn] = useState(false);
 const [privateTarget, setPrivateTarget] = useState<{
 socketId: string;
 username: string;
 } | null>(null);
 const [isTyping, setIsTyping] = useState(false);
 const [showEmojiPicker, setShowEmojiPicker] = useState(false);
 const [showQuickPhrases, setShowQuickPhrases] = useState(false);
 const [selectedImage, setSelectedImage] = useState<string | null>(null);
 const [previewImage, setPreviewImage] = useState<string | null>(null);
 const [activeTypers, setActiveTypers] = useState<string[]>([]);
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);

 const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);
 const fileAttachmentRef = useRef<HTMLInputElement>(null);
 const textInputRef = useRef<HTMLInputElement>(null);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (privateTarget) {
 textInputRef.current?.focus();
 }
 }, [privateTarget]);

 const handleFileShare = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || files.length === 0 || !socket) return;
 try {
 const formData = new FormData();
 const paths = [];
 let isDirectory = false;
 for (let i = 0; i < files.length; i++) {
 formData.append("files", files[i]);
 const relativePath = files[i].webkitRelativePath || files[i].name;
 paths.push(relativePath);
 if (files[i].webkitRelativePath) {
 isDirectory = true;
 }
 }
 formData.append("paths", JSON.stringify(paths));
 const res = await fetch("/api/upload/chat_file", {
 method: "POST",
 headers: { "x-workspace-id": workspaceId },
 body: formData
 });
 const data = await res.json();
 if (data.success) {
 const textDesc = isDirectory ? `📁 分享了目录：**${paths[0].split('/')[0]}** (共 ${files.length} 个文件)` : (files.length > 1 ? `🔗 分享了 ${files.length} 个文件` : `🔗 分享了文件：**${files[0].name}**`);
 const fileLinks = data.files.map((f: any) => `[${f.name}](${f.url})`).join('\\n');
 const msgData = {
 workspaceId,
 username: userProfile?.name || username,
 profile: userProfile,
 text: `${textDesc}\\n${fileLinks}`,
 toId: privateTarget?.socketId,
 };
 if (privateTarget) {
 socket.emit("private_message", msgData);
 } else {
 socket.emit("message", msgData);
 }
 } else {
 alert("文件分享失败：" + data.error);
 }
 } catch(err) {
 alert("文件分享异常");
 }
 if (fileAttachmentRef.current) fileAttachmentRef.current.value = "";
 };

 const EMOJI_LIST = [
 "😀","😂","😅","🥰","😎","🤔","🙄","😴","🥳","😭",
 "🤯","😡","👻","👹","👺","👽","💀","👀","👍","👏",
 "🙏","💪","🔥","✨","🌟",
 ];

 

 const handleClearChat = () => {
 setMessages([]);
 };

 const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = (event) => {
 setSelectedImage(event.target?.result as string);
 };
 reader.readAsDataURL(file);
 e.target.value = "";
 };

 
const AVATAR_TRAITS: Record<string, string> = {
  "🐏": "白羊座：热情活力",
  "🐂": "金牛座：稳健踏实",
  "👯": "双子座：机智灵活",
  "🦀": "巨蟹座：温和体贴",
  "🦁": "狮子座：自信耀眼",
  "🧚": "处女座：严谨细腻",
  "⚖️": "天秤座：优雅和谐",
  "🦂": "天蝎座：深沉敏锐",
  "🏹": "射手座：自由奔放",
  "🐐": "摩羯座：坚韧沉稳",
  "🏺": "水瓶座：独立创新",
  "🐟": "双鱼座：浪漫梦幻",
};

const MODERN_AVATARS = ["🐏", "🐂", "👯", "🦀", "🦁", "🧚", "⚖️", "🦂", "🏹", "🐐", "🏺", "🐟"];
 
 const getAvatar = (name?: string, msgProfile?: any) => {
 if (msgProfile && msgProfile.avatar) return msgProfile.avatar;
 if (userProfile && name === userProfile.name) return userProfile.avatar;
 if (!name) return "🐏";
 // Deterministic avatar based on name length or chars
 const sum = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
 return MODERN_AVATARS[sum % MODERN_AVATARS.length];
 };

 useEffect(() => {
 if (socket && userProfile) {
 socket.emit("update_profile", userProfile);
 }
 }, [userProfile, socket]);

 useEffect(() => {
 let storedName = userProfile ? userProfile.name : localStorage.getItem("chat_username");
 const DEFAULT_NAMES = ["极客先锋", "星际旅人", "次元行者", "灵动大师", "暗夜游侠"];

 if (!userProfile && (!storedName || storedName.includes("妖"))) {
 storedName = DEFAULT_NAMES[Math.floor(Math.random() * DEFAULT_NAMES.length)];
 localStorage.setItem("chat_username", storedName);
 }
 setUsername(storedName);

 const newSocket = io(window.location.origin, {
 reconnectionAttempts: 10,
 reconnectionDelay: 5000,
 reconnectionDelayMax: 10000,
 });
 setSocket(newSocket);

 newSocket.on("connect", () => {
 newSocket.emit("join", {
 workspaceId: "system_global",
 username: storedName,
 profile: userProfile
 });
 });

 newSocket.on("history", (history: Message[]) => {
 setMessages(history);
 });

 newSocket.on("presence", (users: UserPresence[]) => {
 setUsersOnline(users);
 });

 newSocket.on("message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

 newSocket.on("private_message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [
          ...prev,
          { ...msg, type: "chat", isPrivate: true },
        ];
      });
    });

 newSocket.on("message_read", ({ messageId, readerId }: { messageId: string; readerId: string }) => {
 setMessages((prev) => prev.map((msg) => msg.id === messageId ? { ...msg, isRead: true } : msg));
 });

 newSocket.on("typing", ({ username: typingUsername, isTyping }: { username: string; isTyping: boolean; }) => {
 if (isTyping) {
 setActiveTypers((prev) => prev.includes(typingUsername) ? prev : [...prev, typingUsername]);
 } else {
 setActiveTypers((prev) => prev.filter((u) => u !== typingUsername));
 }
 });

 return () => {
 newSocket.disconnect();
 };
 }, [workspaceId]);

 useEffect(() => {
 messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
 }, [messages]);

 useEffect(() => {
 if (!socket || !privateTarget) return;

 messages.forEach((msg) => {
 if (
 msg.isPrivate &&
 msg.fromId === privateTarget.socketId &&
 msg.fromId !== socket?.id &&
        !msg.isRead
 ) {
 socket.emit("read_receipt", {
 messageId: msg.id,
 senderId: msg.fromId,
 });

 setMessages((prev) =>
 prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m)),
 );
 }
 });
 }, [messages, privateTarget, socket, username]);

 useEffect(() => {
 const today = new Date().toLocaleDateString();
 const signedInDate = localStorage.getItem("chat_daily_signin");
 if (signedInDate === today) {
 setHasSignedIn(true);
 }
 }, []);

 const handleSignIn = () => {
 if (!socket || hasSignedIn || privateTarget) return;

 

 const randomMsg = welcomeMessages.length > 0 ? welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)] : "操作员已成功进入系统！";
 socket.emit("message", {
 workspaceId: "system_global",
 username,
 text: randomMsg,
 });

 const today = new Date().toLocaleDateString();
 localStorage.setItem("chat_daily_signin", today);
 setHasSignedIn(true);
 };

 const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 setInputText(e.target.value);

 if (socket) {
 if (typingTimeoutRef.current) {
 clearTimeout(typingTimeoutRef.current);
 } else {
 socket.emit("typing", {
 workspaceId: "system_global",
 isTyping: true,
 toId: privateTarget?.socketId,
 });
 }

 typingTimeoutRef.current = setTimeout(() => {
 socket.emit("typing", {
 workspaceId: "system_global",
 isTyping: false,
 toId: privateTarget?.socketId,
 });
 typingTimeoutRef.current = null;
 }, 1500);
 }
 };

 const sendDirectMessage = (textToSend: string) => {
 if (!textToSend.trim() && !selectedImage) return;
 
 if (!socket) return;
 if (privateTarget) {
 socket.emit("private_message", {
 toId: privateTarget.socketId,
 text: textToSend,
 imageUrl: selectedImage,
 });
 } else {
 socket.emit("message", {
 workspaceId: "system_global",
 username,
 text: textToSend,
 imageUrl: selectedImage,
 });
 }

 if (logicAnswers[textToSend]) {
 setTimeout(() => {
 socket.emit("message", {
 workspaceId: "system_global",
 username: "系统智能助手",
 text: logicAnswers[textToSend],
 });
 }, 500);
 }

 setInputText("");
 setSelectedImage(null);
 setShowEmojiPicker(false);
 setShowQuickPhrases(false);

 if (typingTimeoutRef.current) {
 clearTimeout(typingTimeoutRef.current);
 typingTimeoutRef.current = null;
 }
 socket?.emit("typing", {
 workspaceId: "system_global",
 isTyping: false,
 toId: privateTarget?.socketId,
 });
 };

 const handleSend = (e?: React.FormEvent) => {
 if (e) e.preventDefault();
 if (!inputText.trim() && !selectedImage) return;
 sendDirectMessage(inputText.trim());
 };

 const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 setUsername(e.target.value);
 localStorage.setItem("chat_username", e.target.value);
 };

 const visibleMessages = privateTarget
 ? messages.filter(
 (msg) =>
 msg.type === "system" ||
 (msg.isPrivate &&
 (msg.fromId === privateTarget.socketId ||
 msg.toId === privateTarget.socketId)),
 )
 : messages.filter((msg) => !msg.isPrivate);

 const unreadCounts = messages.reduce(
 (acc, msg) => {
 if (msg.isPrivate && !msg.isRead && msg.fromId !== socket?.id && msg.fromId) {
 acc[msg.fromId] = (acc[msg.fromId] || 0) + 1;
 }
 return acc;
 },
 {} as Record<string, number>,
 );

 return (
 <div className="flex-1 flex w-full h-full bg-[#0a0f18] light:bg-[#f5f5f5] overflow-hidden relative font-sans text-slate-200 light:text-slate-200 light:text-gray-900 border border-white/10 light:border-white/10 light:border-gray-300">
 <AnimatePresence>
 {isSidebarOpen && (
 <motion.div 
 initial={{ width: 0, opacity: 0 }}
 animate={{ width: 280, opacity: 1 }}
 exit={{ width: 0, opacity: 0 }}
 className="flex flex-col bg-[#0c1424]/95 light:bg-[#f8fafc] border-r border-white/5 light:border-slate-200/80 z-20 shrink-0"
 >
 <div className="p-4 border-b border-white/5 light:border-slate-200/80 flex flex-col gap-4">
 <div className="group flex items-center gap-3 p-2 -m-2 rounded-xl transition-all hover:bg-white/5 light:hover:bg-gray-100 cursor-pointer border border-transparent hover:border-white/10 light:hover:border-gray-200" onClick={onEditProfile} title="编辑资料">
 <div className="w-10 h-10 rounded-full bg-slate-800/80 light:bg-white flex items-center justify-center text-2xl overflow-hidden shrink-0 border border-white/5 light:border-slate-200 group-hover:scale-105 transition-transform duration-300 shadow-sm">
 {getAvatar(username)}
 </div>
 <div className="flex flex-1 items-center justify-between min-w-0">
 <div className="flex items-center gap-2 truncate">
 <span className="text-[14px] font-medium text-slate-200 light:text-gray-900 truncate" title={userProfile ? userProfile.name : username}>
 {userProfile ? userProfile.name : username}
 </span>
 {userProfile?.department && (
 <span className="text-[11px] text-slate-400 light:text-gray-500 truncate px-1.5 py-0.5 bg-white/5 light:bg-gray-200/60 rounded-md" title={userProfile.department}>
 {userProfile.department}
 </span>
 )}
 </div>
 <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
 <select
 value={userProfile?.status || "在线"}
 onChange={(e) => {
 if (onEditProfile && userProfile) {
 const event = new CustomEvent("app:updateStatus", { detail: e.target.value });
 window.dispatchEvent(event);
 }
 }}
 className="text-[12px] text-slate-300 light:text-gray-600 bg-transparent border border-transparent hover:border-white/10 light:border-gray-300 hover:bg-slate-800/80 light:bg-white rounded px-1.5 py-1 cursor-pointer outline-none appearance-none pr-4 transition-all"
 title={userProfile?.status || "在线"}
 >
 <option value="在线">🟢 在线</option>
 <option value="开会">🗓️ 开会</option>
 <option value="摸鱼">🐟 摸鱼</option>
 <option value="离开">⏳ 离开</option>
 <option value="勿扰">⛔ 勿扰</option>
 </select>
 <div className="absolute right-1 top-[8px] pointer-events-none text-slate-500 light:text-gray-400">
 <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
 </div>
 </div>
 </div>
 </div>
 </div>

  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 light:scrollbar-thumb-gray-400 scrollbar-track-transparent">
 
 <div className="py-2">
 <button
 onClick={() => setPrivateTarget(null)}
 className={`group/plaza mx-2 w-[calc(100%-16px)] flex items-center gap-3 px-4 py-3 transition-all rounded-xl border border-transparent ${!privateTarget ? "bg-sky-500/10 light:bg-white shadow-sm light:shadow-md light:border-gray-200/60" : "hover:bg-white/5 light:hover:bg-gray-100/50"}`}
 >
 <div className="relative w-10 h-10 rounded-xl bg-white/5 light:bg-sky-100 text-sky-400 light:text-sky-500 flex items-center justify-center shrink-0 shadow-sm border border-white/10 light:border-sky-200/50 group-hover/plaza:scale-105 transition-transform duration-300">
  <Coffee size={18} className="text-sky-400 light:text-sky-500 group-hover/plaza:-rotate-12 transition-transform duration-300" />
    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-sky-500 text-white text-[11px] rounded shadow-xl opacity-0 invisible group-hover/plaza:opacity-100 group-hover/plaza:visible whitespace-nowrap z-50 pointer-events-none transition-all duration-200 translate-x-[-5px] group-hover/plaza:translate-x-0 font-medium">
      摸鱼基地：畅所欲言
      <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[4px] border-transparent border-r-sky-500"></div>
    </div>
  </div>
 <span className={`text-[14px] font-medium truncate ${!privateTarget ? "text-sky-400 light:text-sky-600" : "text-slate-300 light:text-gray-600"}`}>{groupName}</span>
 </button>
 </div>

 <div className="mt-4 pb-4">
 <div className="px-4 py-1 text-xs text-slate-400 light:text-gray-500 mb-1">
 当前在线 ({usersOnline.length})
 </div>
 <div>
 {usersOnline.map((user) => {
 const isMe = user.socketId === socket?.id;
 const isSelected = privateTarget?.username === user.username;
 const unread = unreadCounts[user.socketId || ""] || 0;
 
 return (
 <button
 key={user.socketId || user.username}
 onClick={() => { if (user.socketId) setPrivateTarget({ socketId: user.socketId, username: user.username }); }}
 className={`mx-2 w-[calc(100%-16px)] flex items-center gap-3 px-4 py-3 transition-all rounded-xl text-left border border-transparent ${isSelected ? "bg-sky-500/10 light:bg-white shadow-sm light:shadow-md light:border-gray-200/60" : "hover:bg-white/5 light:hover:bg-gray-100/50"}`}
 >
 <div className="group/avatar relative shrink-0 w-10 h-10 rounded-md bg-slate-800/80 light:bg-white flex items-center justify-center border border-white/5 light:border-gray-100">
    <span className="text-2xl inline-block w-full text-center transition-all duration-300 group-hover/avatar:scale-125 group-hover/avatar:rotate-12 group-hover/avatar:drop-shadow-md">{getAvatar(user.username, user.profile)}</span>
    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-slate-100 text-[11px] rounded shadow-xl opacity-0 invisible group-hover/avatar:opacity-100 group-hover/avatar:visible whitespace-nowrap z-50 pointer-events-none transition-all duration-200 translate-x-[-5px] group-hover/avatar:translate-x-0">
      {AVATAR_TRAITS[getAvatar(user.username, user.profile)] || "个性头像"}
      <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-[4px] border-transparent border-r-slate-800"></div>
    </div>
  </div>
 <div className="flex-1 min-w-0">
 <div className="truncate text-[14px] font-medium text-slate-200 light:text-gray-900">
 {user.username} {isMe && "(我)"}
 </div>
 <div className="truncate text-[12px] text-slate-400 light:text-gray-500 mt-0.5 flex items-center gap-1">
   <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${user.status === '摸鱼' ? 'bg-sky-400' : user.status === '离开' ? 'bg-amber-400' : user.status === '勿扰' ? 'bg-rose-400' : 'bg-emerald-400'}`}></div>
   {user.status || "在线"}
 </div>
 </div>
 {unread > 0 && (
 <div className="px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
 {unread}
 </div>
 )}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* MAIN CHAT */}
 <div className="flex-1 flex flex-col relative z-10 min-w-0 bg-[#0a0f18] light:bg-[#f5f5f5] ">
 
 {/* Header */}
 <div className="h-[60px] shrink-0 flex items-center justify-between px-6 border-b border-white/5 light:border-white/10 light:border-gray-200">
 <div className="flex items-center gap-4">
 <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 rounded-md hover:bg-white/10 light:hover:bg-gray-200 text-slate-300 light:text-gray-600 transition-colors md:hidden">
 <Users size={20} />
 </button>
 <div className="flex flex-col">
 <h2 className="text-[20px] text-slate-200 light:text-gray-900 font-medium flex items-center gap-2">
 {privateTarget ? privateTarget.username : groupName}
 </h2>
 </div>
 </div>
 
 <button
 onClick={handleClearChat}
 className="text-slate-400 light:text-gray-500 hover:text-slate-200 light:text-gray-800 transition-colors p-1"
 title="清空记录"
 >
 <Trash2 size={18} />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 light:scrollbar-thumb-gray-300 scrollbar-track-transparent scroll-smooth">
 {visibleMessages.length === 0 && (
 <div className="h-full flex flex-col items-center justify-center text-slate-500 light:text-gray-400 space-y-4 select-none">
 <MessageSquare size={48} className="text-slate-600 light:text-gray-300"/>
 <p className="text-[14px]">暂无消息记录</p>
 </div>
 )}

 {visibleMessages.map((msg) => {
 if (msg.type === "system") {
 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 key={msg.id}
 className="flex justify-center my-4"
 >
 <div className="px-3 py-1 rounded bg-gray-200/50 text-[12px] text-slate-400 light:text-gray-500">
 {msg.text}
 </div>
 </motion.div>
 );
 }

 const isMe = msg.fromId === socket?.id;
 return (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 key={msg.id}
 className={`flex gap-3 w-full ${isMe ? "justify-end" : "justify-start"} mb-4`}
 >
 {!isMe && (
 <div 
 className="w-10 h-10 shrink-0 bg-slate-800/80 light:bg-white rounded-md flex items-center justify-center text-2xl overflow-hidden cursor-pointer"
 onClick={() => {
 const targetUser = usersOnline.find((u) => u.username === msg.username);
 if (targetUser?.socketId) {
 setPrivateTarget({ socketId: targetUser.socketId, username: targetUser.username });
 }
 }}
 >
 {getAvatar(msg.username, msg.profile)}
 </div>
 )}
 
 <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
 {!isMe && <span className="text-[12px] text-slate-400 light:text-gray-500 mb-1 ml-1">{msg.username}</span>}
 
 <div className="relative group">
 {/* Chat Bubble */}
 <div 
 className={`relative flex flex-col px-4.5 py-3 text-[15px] leading-relaxed break-words shadow-sm transition-all duration-200 hover:shadow-md ${
  isMe 
  ? (msg.isPrivate 
      ? "bg-gradient-to-tr from-violet-500 to-fuchsia-600 text-white rounded-[18px] rounded-tr-[4px] shadow-fuchsia-500/10" 
      : "bg-gradient-to-tr from-sky-500 to-indigo-600 text-white rounded-[18px] rounded-tr-[4px] shadow-sky-500/10")
  : (msg.isPrivate
      ? "bg-violet-900/40 light:bg-fuchsia-50 border border-violet-500/20 light:border-fuchsia-200 text-slate-100 light:text-gray-900 rounded-[18px] rounded-tl-[4px]"
      : "bg-slate-800/60 light:bg-white border border-white/5 light:border-gray-200/60 text-slate-100 light:text-gray-900 rounded-[18px] rounded-tl-[4px]")
  }`}
 >
 

 {msg.imageUrl && (
 <div className="mb-2 -mx-2 -mt-1 overflow-hidden bg-slate-800/80 light:bg-white/5 light:bg-gray-100">
 <img
 src={msg.imageUrl}
 alt="uploaded"
 className="max-w-[240px] sm:max-w-[320px] h-auto cursor-zoom-in"
 referrerPolicy="no-referrer"
 onClick={() => setPreviewImage(msg.imageUrl || null)}
 />
 </div>
 )}
 {msg.fileUrl && (
 <div className="mb-2 mt-1 flex items-center gap-3 bg-slate-800/80 light:bg-slate-800/80 light:bg-white border border-white/5 light:border-white/10 light:border-gray-200 rounded p-3 max-w-[280px]">
 <div className="w-10 h-10 rounded bg-slate-800/80 light:bg-white/5 light:bg-gray-100 text-slate-400 light:text-gray-500 flex items-center justify-center shrink-0">
 <FileText className="w-6 h-6"/>
 </div>
 <div className="flex-1 min-w-0 pr-2">
 <div className="text-[14px] text-slate-200 light:text-gray-900 truncate">{msg.fileName || "未知文件"}</div>
 <a href={msg.fileUrl} download className="text-[12px] text-slate-400 light:text-gray-500 hover:text-blue-500 mt-1 inline-block">
 点击下载
 </a>
 </div>
 </div>
 )}
 {msg.text && (
 <div className="tracking-wide">
 <div className={`markdown-body ${isMe ? 'msg-me' : 'msg-other'}`}>
 <Markdown>{msg.text}</Markdown>
 </div>
 </div>
 )}
 
 {msg.isPrivate && (
                    <div className={`mt-1 flex items-center gap-1 text-[10.5px] font-medium tracking-wide ${isMe ? 'text-fuchsia-100' : 'text-fuchsia-500 light:text-fuchsia-600'}`}>
                      <ShieldAlert size={11} className={isMe ? 'text-fuchsia-200' : 'text-fuchsia-500 light:text-fuchsia-600'} />
                      <span>悄悄话</span>
                      {isMe && <span className={`ml-1 pl-1 border-l ${isMe ? 'border-fuchsia-300/40' : 'border-white/10 light:border-gray-300'}`}>{msg.isRead ? "已读" : "未读"}</span>}
                    </div>
                  )}
 </div>
 </div>
 </div>

 {isMe && (
 <div className="w-10 h-10 shrink-0 bg-slate-800/80 light:bg-white rounded-md flex items-center justify-center text-2xl overflow-hidden">
 {getAvatar(username)}
 </div>
 )}
 </motion.div>
 );
 })}

 {activeTypers.filter((t) => t !== username).map((typer) => (
 <motion.div key={typer} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y:0 }} className="flex gap-3 mb-4">
 <div className="w-10 h-10 shrink-0 bg-slate-800/80 light:bg-white rounded-md flex items-center justify-center text-2xl overflow-hidden">
 {getAvatar(typer)}
 </div>
 <div className="relative">
 <div className="bg-slate-800/60 light:bg-white px-4 py-3 rounded-[18px] rounded-tl-[4px] shadow-sm flex items-center gap-1.5 h-[40px] border border-white/5 light:border-gray-200/60">
 
 <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }}></span>
 <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
 <span className="w-1 h-1 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
 </div>
 </div>
 </motion.div>
 ))}
 <div ref={messagesEndRef} className="h-2" />
 </div>

 {/* INPUT AREA */}
 <div className="border-t border-white/10 light:border-gray-200 bg-[#0a0f18] light:bg-[#f5f5f5] flex flex-col relative">
 <div className="px-4 py-2 flex items-center gap-3 text-slate-300 light:text-gray-600">
 <button 
 type="button"
 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
 className="p-1 hover:bg-white/10 light:hover:bg-gray-200 rounded"
 title="表情"
 >
 <Smile size={20} />
 </button>
 <button 
 type="button"
 onClick={() => setShowQuickPhrases(!showQuickPhrases)}
 className="p-1 hover:bg-white/10 light:hover:bg-gray-200 rounded"
 title="快捷短语"
 >
 <Zap size={20} />
 </button>
 
 <input
 type="file"
 ref={fileInputRef}
 accept="image/*"
 className="hidden"
 onChange={handleImageSelect}
 />
 <button 
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="p-1 hover:bg-white/10 light:hover:bg-gray-200 rounded cursor-pointer"
 title="发送图片"
 >
 <ImagePlus size={20} />
 </button>

 <input
 type="file"
 ref={fileAttachmentRef}
 multiple
 className="hidden"
 onChange={handleFileShare}
 />
 <button 
 type="button"
 onClick={() => {
   if (fileAttachmentRef.current) {
     fileAttachmentRef.current.removeAttribute('webkitdirectory');
     fileAttachmentRef.current.removeAttribute('directory');
     fileAttachmentRef.current.click();
   }
 }}
 className="p-1 hover:bg-white/10 light:hover:bg-gray-200 rounded cursor-pointer"
 title="发送文件"
 >
 <FileText size={20} />
 </button>

 <button 
 type="button"
 onClick={() => {
   if (fileAttachmentRef.current) {
     fileAttachmentRef.current.setAttribute('webkitdirectory', 'true');
     fileAttachmentRef.current.setAttribute('directory', 'true');
     fileAttachmentRef.current.click();
   }
 }}
 className="p-1 hover:bg-white/10 light:hover:bg-gray-200 rounded cursor-pointer"
 title="发送目录"
 >
 <FolderOpen size={20} />
 </button>
  <button 
  type="button"
  onClick={handleSignIn}
  disabled={hasSignedIn}
  className={`p-1 px-2 hover:bg-white/10 light:hover:bg-gray-200 rounded cursor-pointer flex items-center gap-1 text-xs ${hasSignedIn ? "opacity-50 cursor-not-allowed" : ""}`}
  title={hasSignedIn ? "已签到" : "签到"}
  >
  {hasSignedIn ? <CheckCircle2 size={16} className="text-green-500"/> : <Zap size={16} className="text-yellow-500"/>}
  {hasSignedIn ? "已签到" : "签到"}
  </button>
 </div>
 
 <AnimatePresence>
 {showQuickPhrases && (
 <motion.div 
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 className="absolute bottom-[100%] left-4 mb-2 bg-slate-800/80 light:bg-slate-800/80 light:bg-white border border-white/5 light:border-white/10 light:border-gray-200 rounded shadow-lg z-50 flex flex-col min-w-[220px] max-h-[300px] overflow-y-auto"
 >
 {quickPhrases.map(p => (
 <button 
 key={p} 
 onClick={() => { sendDirectMessage(p); }}
 className="px-4 py-3 text-left text-[14px] hover:bg-slate-800/80 light:bg-white/5 light:bg-gray-100 border-b border-gray-100 last:border-0"
 >
 {p}
 </button>
 ))}
 </motion.div>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {showEmojiPicker && (
 <motion.div 
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 className="absolute bottom-[100%] left-4 mb-2 bg-slate-800/80 light:bg-slate-800/80 light:bg-white border border-white/5 light:border-white/10 light:border-gray-200 rounded shadow-lg z-50 w-[320px] p-2"
 >
 <div className="flex flex-wrap gap-1">
 {EMOJI_LIST.map(emoji => (
 <button
 key={emoji}
 onClick={() => { setInputText(prev => prev + emoji); textInputRef.current?.focus(); }}
 className="w-8 h-8 flex items-center justify-center text-xl hover:bg-slate-800/80 light:bg-white/5 light:bg-gray-100 rounded"
 >
 {emoji}
 </button>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <div className="px-4 pb-4 flex flex-col relative">
 {selectedImage && (
 <div className="relative inline-block w-max mb-2">
 <div className="w-16 h-16 border border-white/10 light:border-gray-200 bg-slate-800/80 light:bg-white shadow-sm p-1">
 <img src={selectedImage} alt="preview" className="w-full h-full object-cover" />
 </div>
 <button
 onClick={() => setSelectedImage(null)}
 className="absolute -top-2 -right-2 w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center text-white hover:bg-gray-600"
 >
 <X size={12} />
 </button>
 </div>
 )}

 <textarea
 ref={textInputRef as any}
 value={inputText}
 onChange={(e: any) => handleInputChange(e)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSend();
 }
 }}
 placeholder=""
 className="w-full h-[80px] bg-transparent resize-none outline-none text-[15px]"
 />
 
 <div className="flex justify-end mt-2">
 <button
 onClick={handleSend}
 disabled={(!inputText.trim() && !selectedImage)}
 className={`px-6 py-1.5 rounded-lg text-[14px] font-medium transition-all ${
  (!inputText.trim() && !selectedImage)
  ? "bg-slate-800/40 text-slate-500 light:bg-gray-100 light:text-gray-400 cursor-not-allowed" 
  : "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-indigo-500/10 hover:opacity-95 cursor-pointer"
  }`}
 >
 发送(S)
 </button>
 </div>
 </div>
 </div>
 
 </div>

 <AnimatePresence>
 {previewImage && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
 onClick={() => setPreviewImage(null)}
 >
 <img
 src={previewImage}
 alt="preview full"
 className="max-w-full max-h-[90vh] object-contain rounded"
 onClick={(e) => e.stopPropagation()}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}

export function ChatPanel(props: { workspaceId: string, userProfile?: any, onEditProfile?: () => void }) {
 return (
 <LocalErrorBoundary>
 <ChatPanelInner {...props} />
 </LocalErrorBoundary>
 );
}
