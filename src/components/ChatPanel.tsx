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
}

interface UserPresence {
 username: string;
 ip: string;
 status: string;
 socketId?: string;
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

function ChatPanelInner({ workspaceId }: { workspaceId: string }) {
 const LOGIC_PHRASES = [
 "为什么团队名称修改后蓝橙无单价？",
 "安全基金表出勤天数生成逻辑？",
 "价格档案匹配逻辑是怎样的？",
 "出勤天数异常怎么处理？",
 "违规单和问题单怎么处理？",
 "配送所得基础工资怎么算？",
 "为什么会有跨站合并的情况？"
 ];

 const LOGIC_ANSWERS: Record<string, string> = {
 "为什么团队名称修改后蓝橙无单价？": `**关于团队名称同步与匹配蓝橙单价的问题排查**\n您好，关于此问题，系统确实已经将**“团队名称”**全面同步到了整个蓝橙单价甚至全局的匹配逻辑中。导致现在全部显示“无单价”的原因并非没同步，而是**数据本身存在字符串匹配差异**。\n\n* **旧版逻辑（兼容团队ID）**：之前系统对“团队”关键词抓取时没有过滤掉 \`id\` 字符，这就导致如果列名为“团队id”，系统会默认抓取到两个表的【团队ID】进行数值比对（例如 \`123456\` == \`123456\`），因为数字ID高度一致不会带有多余空格字眼，所以能够成功匹配出单价。\n* **当前逻辑（强制匹配团队名称）**：为了响应您对于“日单量表直接匹配团队名称而不是团队ID”的需求，系统现已全面排除了 \`id\`，强制提取【团队名称】。一旦系统使用这种方式，您的“日单量表（业务明细）”中“团队名称”列的中文文本，与您存放在 \`兼职价格档案\` 等配置文件中填写的“团队名称”一旦存在**任何微小差异**（如包含多余空格、或者简称“南山一队”对照“南山区一站”等没有严格对齐），就会导致查无此站，触发默认价格“无”。\n* **解决方案建议**：由于中文团队名称极其容易出现数据源填报差异（导致无法精确命中索引字典），建议您排查工资业务表和价格档案两端是否存在团队名称文本不统一或含有不可见字符的问题。如果您希望恢复此前精准的匹配体验，可以再次告知我：**“帮我把兼职和蓝橙的匹配基准回滚为团队ID”** 或者您核对一下价格表及明细表的团队名称确切保持100%中文一致来解决。`,
 "安全基金表出勤天数生成逻辑？": `**安全基金中出勤天数的计算逻辑**\n系统中的安全基金/非蜂卡的考勤扣减依据如下：\n\n* **有效计算**：读取处理后的发薪详单，剔除掉标红的“欺诈单（值为0不核算）”后，统计每一位骑手在不同“账单时间”（自然日）下产生过完单的不重复天数。\n* **合并主站点规则**：有些骑手可能会在同个月内横跨跑了多个团队站点。为了避免同一个骑手多份挂靠扣费，代码会计算他**单量最多**的那个团队作为“主站”。所有出勤天数将会全部汇总合并展示在他的主站明细下；其他辅助站点其名下的出勤天均标记为 0，以此避免对同一个骑手重复叠加扣取安全基金。\n* **梯度天数逻辑**：由 \`calc_deduction_new\` 控制算法。若汇总的出勤天不足 15 天，按“（对应金额 ÷ 当月天数）× 实际出勤天数”折算出安全基金；如果出勤满 15 天及以上，则直接按满月正常天数直接扣整额。`,
 "价格档案匹配逻辑是怎样的？": `**关于价格匹配逻辑（蓝橙单价/兼职单价）**\n目前系统的单价核心匹配逻辑是一套严格的三重主键比对机制：\n\n* **数据预处理：** 当系统读取「兼职价格档案」和「日单量日结表」时，会自动精准匹配抓取核心字段。\n* **精准匹配：** 根据日期、站点、风神骑手ID等组合进行绝对匹配。`,
 "全勤出勤天数计算逻辑是什么？": `**出勤天数计算引擎**\n核算系统同时参考两大数据源，以确保数据公正并防止作弊。`,
 "配送所得基础工资怎么算？": `**配送所得的基本核算公式**\n系统执行的核心价值在于将庞大繁琐的运单最终转化为实际金额。生成逻辑：\n\n* **基础匹配公式**： \`单笔配送费 = 有效完成单 × 命中单价\`\n* **有效单筛选**：在实际相乘之前，会预先剔除被标记为“取消单”、“欺诈单”的数据。只有【完成单】可以进入基数。\n* **阶梯激励计算**：部分团队或城市如果开启了超量阶梯配置（如，月累计超过800单后，每单额外补0.5元）。处理器会统计个人的该月累计单量 \`sum_orders\`，当超过特定阈值段时，自动为超过的部分赋予高阶价格并差额补贴。\n* **输出写入**：计算后的结果会通过预制的公式或者数值写入到最终工资表的 \`【配送所得】\` 栏位中，作为加项金额。`,
 "蓝橙单价反写到配送所得表备注中匹配逻辑是怎样的？": `**单价反写至“配送所得表”备注的逻辑规则**\n为了能在此表中直观看到骑手该月经历的单价变动，系统会执行一套回写匹配：\n\n* **核心关联主键**：程序在读取到“配送所得表”时，会逐行提取当前行的 **【团队名称】** 和 **【风神骑手ID】**。\n* **追溯历史单价**：随后使用这一对复合主键 \`团队名称 + 骑手ID\`，去庞大的“日单量”表底表记录字典中查找该名骑手在整个计算周期内的“每天对应的单价值”。\n* **高级聚合与备注生成**：\n * **单一价格：** 如果该骑手整个周期内价格自始至终没变，备注栏会被**自动清空**以保持版面整洁，并在专设的“蓝橙单价”列单独填入具体价格数字。\n * **多重价格变动：** 当骑手被匹配到多个不同日期的有效价格时，程序会按自然日对价格进行连续性折叠聚合，将变动记录按日期回写到 \`备注\` 栏位（生成形如 \`1日-15日单价5.5元；16日-30日单价6元\` 的字符串记录）。并在“蓝橙单价”专属列打上分号分割的标记（如 \`5.5;6\`）。\n * **无单价记录：** 如果该骑手在某些天份未能获取到价格（判定为无单价），系统一定会重点将其断带日期强制注入备注（如 \`4日-7日无单价\`），以警示复核人员。\n\n**总结**：配送所得表反写单价的基础是严格依赖 **团队名称 + 骑手ID**，只要这两个字段与日单量表里的该员工所属团队及ID相同，备注及价格变动记录必会成功反写。`,
 "为什么会有跨站合并的情况？": `**跨站（多团队挂靠）的数据合并初衷**\n实际运营中，因为运力调度或兼职骑手活跃区域变动，常常引发一个骑手当月归属于多个不同网格站：\n\n* **唯一主键整合**：为了避免同一员工因为跑了不同的站，最终收到支离破碎的多次小额发薪或被**重复扣除安全基金卡费**。计算系统始终以 \`唯一骑手身份证ID/系统ID\` 作为聚合主键。\n* **提取与汇总**：代码会自动跨所有的站点分表，提取该主键产生过的所有单量、额外津贴及扣除款项。\n* **主从关系输出**：它将判断哪个网格站的完成单量占比最高（即“主站”），并将汇总后“一整条合并且完整的流水记录”全部归并展示在主站。辅站仅仅保留基础业务痕迹，但薪资金额标记为 \`[已合并至主站]\`，最终实发呈现出整齐唯一的结果。`
 };

 const [logicMessages, setLogicMessages] = useState<Message[]>([
 {
 id: "welcome_logic",
 username: "系统智能助手",
 text: "**欢迎来到薪资核算解读频道！**\n\n你可以点击下方的闪电⚡图标，通过提问了解工资表各个项目的生成逻辑。大王我知无不言！",
 timestamp: new Date().toISOString(),
 type: "chat",
 }
 ]);
 const [messages, setMessages] = useState<Message[]>([]);
 const [usersOnline, setUsersOnline] = useState<UserPresence[]>([]);
 const [inputText, setInputText] = useState("");
 const [username, setUsername] = useState("");
 const [socket, setSocket] = useState<Socket | null>(null);
 const [hasSignedIn, setHasSignedIn] = useState(false);
 const [privateTarget, setPrivateTarget] = useState<{
 socketId: string;
 username: string;
 } | null>(null);
 const [activeChannel, setActiveChannel] = useState<"general" | "logic">("general");
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
 const file = e.target.files?.[0];
 if (!file || !socket) return;
 try {
 const formData = new FormData();
 formData.append("file", file);
 formData.append("targetPath", "uploads/" + file.name);
 const res = await fetch("/api/upload_file", {
 method: "POST",
 body: formData
 });
 const data = await res.json();
 if (data.success) {
 socket.emit("chat_message", {
 text: `🔗 我分享了一个文件：**${file.name}**`,
 isPrivate: !!privateTarget,
 toId: privateTarget?.socketId,
 imageUrl: undefined,
 fileUrl: `/api/download?path=${encodeURIComponent("uploads/" + file.name)}`,
 fileName: file.name
 });
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

 const QUICK_PHRASES = [
 "后台数据同步有延迟吗？",
 "今天的蓝橙单价更新了吗？",
 "发现个别兼职运单核对不上。",
 "有没有最新版的操作手册？",
 "这批问题单生成耗时比昨天长。",
 "跨站合并流水确认完毕。",
 "请帮我刷新一下缓存。",
 ];

 const handleClearChat = () => {
 if (activeChannel === "logic") {
 setLogicMessages([{
 id: "welcome_logic",
 username: "系统智能助手",
 text: "**您好，欢迎进入系统解答频道！**\n\n您可以点击下方的常见问题，或直接输入问题，我将为您解答各个模块的核算逻辑和系统使用规则。",
 timestamp: new Date().toISOString(),
 type: "chat",
 }]);
 } else {
 setMessages([]);
 }
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

 const MONSTER_EMOJIS: Record<string, string> = {
 小猪妖: "🐷",
 乌鸦怪: "🐦‍⬛",
 野乌鸦: "🐦‍⬛",
 蛤蟆精: "🐸",
 猩猩怪: "🦍",
 黄鼠狼: "🦦",
 熊教头: "🐻",
 狼大人: "🐺",
 牛妖: "🐮",
 狐狸精: "🦊",
 蝙蝠怪: "🦇",
 };

 const getAvatar = (name?: string) => {
 if (!name) return "👺";
 for (const [key, value] of Object.entries(MONSTER_EMOJIS)) {
 if (typeof name === 'string' && name.includes(key)) return value;
 }
 return "👺";
 };

 useEffect(() => {
 let storedName = localStorage.getItem("chat_username");
 const MONSTER_NAMES = [
 "小猪妖","野乌鸦","蛤蟆精","狐狸精","乌鸦怪",
 "猩猩怪","黄鼠狼","熊教头","狼大人","牛妖","蝙蝠怪",
 ];

 if (!storedName || storedName.startsWith("妖怪")) {
 storedName = MONSTER_NAMES[Math.floor(Math.random() * MONSTER_NAMES.length)];
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
 });
 });

 newSocket.on("presence", (users: UserPresence[]) => {
 setUsersOnline(users);
 });

 newSocket.on("message", (msg: Message) => {
 setMessages((prev) => [...prev, msg]);
 });

 newSocket.on("private_message", (msg: Message) => {
 setMessages((prev) => [
 ...prev,
 { ...msg, type: "chat", isPrivate: true },
 ]);
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
 msg.username !== username &&
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

 const WELCOME_MESSAGES = [
 "操作员已成功进入系统！",
 "今日业务准备就绪，准时打卡！",
 "安全校验通过，已签到登录。",
 "各项服务状态良好，签到完毕。",
 "开启高效核算的一天！",
 ];

 const randomMsg = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
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
 
 if (activeChannel === "logic") {
 const userMsg: Message = {
 id: Date.now().toString(),
 username,
 text: textToSend,
 imageUrl: selectedImage || undefined,
 timestamp: new Date().toISOString(),
 type: "chat"
 };
 setLogicMessages(prev => [...prev, userMsg]);
 
 if (LOGIC_ANSWERS[textToSend]) {
 setTimeout(() => {
 setLogicMessages(prev => [...prev, {
 id: Date.now().toString(),
 username: "系统智能助手",
 text: LOGIC_ANSWERS[textToSend],
 timestamp: new Date().toISOString(),
 type: "chat"
 }]);
 }, 500);
 }
 } else {
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

 const visibleMessages = activeChannel === "logic"
 ? logicMessages
 : privateTarget
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
 if (msg.isPrivate && !msg.isRead && msg.username !== username && msg.fromId) {
 acc[msg.fromId] = (acc[msg.fromId] || 0) + 1;
 }
 return acc;
 },
 {} as Record<string, number>,
 );

 return (
 <div className="flex-1 flex w-full h-full light:bg-slate-50 bg-[#0a0f18] rounded-2xl overflow-hidden border light:border-slate-200 border-white/5 light:shadow-sm shadow-2xl relative">
 <div className="absolute inset-0 pointer-events-none overflow-hidden">
 <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
 <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sky-500/5 rounded-full blur-[120px]" />
 </div>

 <AnimatePresence>
 {isSidebarOpen && (
 <motion.div 
 initial={{ width: 0, opacity: 0 }}
 animate={{ width: 280, opacity: 1 }}
 exit={{ width: 0, opacity: 0 }}
 className="flex flex-col bg-slate-900/40 border-r light:border-slate-200 border-white/5 z-20 shrink-0"
 >
 <div className="p-5 border-b light:border-slate-200 border-white/5 flex flex-col gap-5 bg-gradient-to-b from-white/[0.02] to-transparent">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-emerald-500/20 to-sky-500/10 flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-3xl">
 {getAvatar(username)}
 </div>
 <div className="flex flex-col flex-1 min-w-0 pb-1">
 <input
 type="text"
 value={username}
 onChange={handleUsernameChange}
 maxLength={15}
 placeholder="你的大名"
 className="bg-transparent text-[15px] font-bold light:text-slate-900 text-slate-100 font-medium outline-none placeholder:text-slate-600 w-full focus:bg-white/5 px-1 py-0.5 rounded transition-all truncate"
 spellCheck={false}
 />
 <div className="flex items-center gap-1.5 px-1 mt-1">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
 </span>
 <span className="text-[10px] text-emerald-500/70 font-mono font-medium tracking-widest uppercase">Online</span>
 </div>
 </div>
 </div>
 <button
 onClick={handleSignIn}
 disabled={hasSignedIn}
 className={`w-full py-2.5 rounded-xl text-xs font-bold tracking-widest transition-all flex items-center justify-center gap-2 relative overflow-hidden group ${
 hasSignedIn
 ? "bg-slate-800/50 light:text-slate-600 text-slate-500 cursor-not-allowed border light:border-slate-200 border-white/5"
 : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 hover:text-emerald-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
 }`}
 >
 {hasSignedIn ? <><CheckCircle2 size={14} /> 今日已签到</> : <><Zap size={14} /> 控制台签到</>}
 </button>
 </div>

 <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-4 space-y-6">
 
 <div className="space-y-2">
 <h3 className="text-[10px] font-bold light:text-slate-600 text-slate-500 uppercase tracking-widest px-2 pl-3">公共频道</h3>
 <button
 onClick={() => {
 setPrivateTarget(null);
 setActiveChannel("general");
 }}
 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
 !privateTarget && activeChannel === "general"
 ? "bg-white/10 text-emerald-300 shadow-sm border border-emerald-400/20" 
 : "light:text-slate-700 text-slate-400 light:hover:bg-black/5 hover:bg-white/5 hover:text-slate-200 border border-transparent"
 }`}
 >
 <Hash size={16} className={!privateTarget && activeChannel === "general" ? "text-emerald-400" : "light:text-slate-600 text-slate-500"} />
 <span className="text-sm font-medium tracking-wide">系统公共大厅</span>
 </button>
 <button
 onClick={() => {
 setPrivateTarget(null);
 setActiveChannel("logic");
 }}
 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
 !privateTarget && activeChannel === "logic"
 ? "bg-white/10 light:text-sky-700 text-sky-300 shadow-sm border light:border-slate-200 border-sky-500/20" 
 : "light:text-slate-700 text-slate-400 light:hover:bg-black/5 hover:bg-white/5 hover:text-slate-200 border border-transparent"
 }`}
 >
 <BookOpen size={16} className={!privateTarget && activeChannel === "logic" ? "light:text-sky-600 text-sky-400" : "light:text-slate-600 text-slate-500"} />
 <span className="text-sm font-medium tracking-wide">薪资核算解读</span>
 </button>
 </div>

 <div className="space-y-2">
 <h3 className="text-[10px] font-bold light:text-slate-600 text-slate-500 uppercase tracking-widest px-2 pl-3 flex items-center justify-between">
 <span>当前在线成员</span>
 <span className="bg-slate-800/80 border light:border-slate-200 light:border-slate-200 border-slate-700/50 px-2 py-0.5 rounded-full light:text-slate-700 text-slate-400 font-mono">{usersOnline.length}</span>
 </h3>
 <div className="space-y-1">
 {usersOnline.map((user) => {
 const isMe = user.username === username;
 const isSelected = privateTarget?.username === user.username;
 const unread = unreadCounts[user.socketId || ""] || 0;
 
 return (
 <button
 key={user.socketId || user.username}
 onClick={() => {
 if (!isMe && user.socketId) {
 setPrivateTarget({ socketId: user.socketId, username: user.username });
 }
 }}
 className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left ${
 isSelected 
 ? "bg-sky-500/15 text-sky-200 border border-sky-500/30 shadow-sm" 
 : "light:text-slate-700 text-slate-400 light:hover:bg-black/5 hover:bg-white/5 hover:text-slate-200 border border-transparent"
 } ${isMe ? "opacity-50 cursor-default" : ""}`}
 >
 <div className="relative shrink-0">
 <span className="text-xl inline-block w-8 text-center">{getAvatar(user.username)}</span>
 {/* Online dot */}
 <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 bg-emerald-500"></span>
 </div>
 <div className="flex-1 truncate text-[13px] font-medium tracking-wide">
 {user.username} {isMe && "(我)"}
 </div>
 {unread > 0 && (
 <div className="px-1.5 min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-sky-500 light:text-slate-900 text-white text-[10px] font-bold shadow-lg shadow-sky-500/20">
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
 <div className="flex-1 flex flex-col relative z-10 min-w-0 bg-slate-950/20 ">
 
 {/* Header */}
 <div className="h-[76px] shrink-0 border-b light:border-slate-200 border-white/5 flex items-center justify-between px-6 bg-slate-900/40">
 <div className="flex items-center gap-4">
 <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 rounded-xl light:hover:bg-black/10 hover:bg-white/10 light:text-slate-700 text-slate-400 transition-colors md:hidden">
 <Users size={20} />
 </button>
 <div className="flex flex-col">
 <h2 className="text-lg font-bold light:text-slate-900 text-slate-100 font-medium flex items-center gap-2.5 tracking-wide">
 {privateTarget ? (
 <>
 <span className="text-2xl drop-shadow-md">{getAvatar(privateTarget.username)}</span>
 {privateTarget.username}
 <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full ml-2 lowercase tracking-wider">Private</span>
 </>
 ) : (
 <>
 <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner"><Hash size={16}/></div>
 系统公共大厅
 </>
 )}
 </h2>
 <p className="text-xs light:text-slate-600 text-slate-500 font-mono mt-0.5 flex items-center gap-2">
 {privateTarget ? "加密传输中..." : "“输入操作指令或系统问题...”"} 
 </p>
 </div>
 </div>
 
 <button
 onClick={handleClearChat}
 className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest light:text-slate-700 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 border border-transparent hover:border-rose-500/20"
 title="清空记录"
 >
 <Trash2 size={14} /> 清空
 </button>
 </div>

 <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent scroll-smooth">
 {visibleMessages.length === 0 && (
 <div className="h-full flex flex-col items-center justify-center light:text-slate-600 text-slate-500/80 space-y-4 select-none">
 <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-5xl mb-2 drop-shadow-xl border light:border-slate-200 border-white/5">💬</div>
 <p className="text-[13px] tracking-widest font-medium">暂无消息记录</p>
 <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-3 py-1 rounded-full border light:border-slate-200 border-white/5">Waiting for messages...</span>
 </div>
 )}

 {visibleMessages.map((msg) => {
 if (msg.type === "system") {
 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 key={msg.id}
 className="flex justify-center my-6"
 >
 <div className="px-5 py-2 rounded-full bg-slate-900/80 border light:border-slate-200 border-white/5 text-[11px] light:text-slate-700 text-slate-400 shadow-sm ring-1 ring-white/5 flex items-center gap-2 tracking-wide font-medium">
 <ShieldAlert size={12} className="text-emerald-500/60" /> {msg.text}
 </div>
 </motion.div>
 );
 }

 const isMe = msg.username === username;
 return (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 key={msg.id}
 className={`flex gap-4 w-full ${isMe ? "justify-end" : "justify-start"}`}
 >
 {!isMe && (
 <div 
 className="w-10 h-10 shrink-0 text-xl flex items-center justify-center rounded-[14px] bg-slate-800/80 border light:border-slate-200 border-white/5 shadow-sm cursor-pointer light:hover:bg-slate-200 hover:bg-slate-700/80 hover:scale-105 transition-all mt-auto"
 onClick={() => {
 const targetUser = usersOnline.find((u) => u.username === msg.username);
 if (targetUser?.socketId) {
 setPrivateTarget({ socketId: targetUser.socketId, username: targetUser.username });
 }
 }}
 >
 {getAvatar(msg.username)}
 </div>
 )}
 
 <div className={`flex flex-col max-w-[75%] lg:max-w-[65%] ${isMe ? "items-end" : "items-start"}`}>
 <div className="flex items-center gap-2 mb-1.5 px-1.5">
 {!isMe && <span className="text-xs font-bold light:text-slate-800 text-slate-300 light:font-medium tracking-wide">{msg.username}</span>}
 {msg.ip && !isMe && <span className="text-[9px] font-mono text-sky-500/70 bg-sky-500/10 px-1.5 py-0.5 rounded border light:border-slate-200 border-sky-500/20">IP: {msg.ip}</span>}
 <span className="text-[10px] text-slate-600 font-mono font-medium">
 {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>

 <div 
 className={`relative flex flex-col px-5 py-3.5 shadow-md text-[14px] leading-relaxed break-words ${
 isMe 
 ? "bg-gradient-to-br from-sky-500 to-blue-500 border-none text-[#ffffff] rounded-2xl rounded-br-sm shadow-[0_4px_15px_rgba(14,165,233,0.3)] light:shadow-[0_4px_10px_rgba(14,165,233,0.2)]" 
 : "bg-slate-800/90 light:bg-white border light:border-slate-200 border-slate-700/50 text-[#e2e8f0] light:text-[#1e293b] rounded-2xl rounded-bl-sm "
 }`}
 style={isMe ? { color: '#ffffff' } : {}}
 >
 {msg.imageUrl && (
 <div className="mb-3 -mx-2 -mt-1 overflow-hidden rounded-xl bg-black/40 border light:border-slate-200 border-white/5">
 <img
 src={msg.imageUrl}
 alt="uploaded"
 className="max-w-[240px] sm:max-w-[320px] h-auto cursor-zoom-in hover:opacity-90 transition-opacity"
 referrerPolicy="no-referrer"
 onClick={() => setPreviewImage(msg.imageUrl || null)}
 />
 </div>
 )}
 {msg.fileUrl && (
 <div className="mb-3 mt-1 flex items-center gap-3 bg-white/5 light:hover:bg-black/10 hover:bg-white/10 transition-colors border border-white/10 rounded-xl p-3 max-w-[280px] shadow-sm">
 <div className="w-10 h-10 rounded-lg bg-sky-500/20 light:text-sky-600 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
 <FileText className="w-5 h-5"/>
 </div>
 <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center">
 <div className="text-[13px] font-medium light:text-slate-900 text-slate-100 font-medium truncate" title={msg.fileName}>{msg.fileName || "未知文件"}</div>
 <a href={msg.fileUrl} download className="text-[11px] font-mono light:text-sky-600 text-sky-400 hover:light:text-sky-700 text-sky-300 mt-1 inline-flex items-center gap-1 w-max">
 点击下载文件
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
 <div className={`mt-2 flex items-center gap-1.5 text-[10px] ${isMe ? "light:text-sky-700 text-sky-300" : "light:text-sky-600 text-sky-400"}`}>
 <ShieldAlert size={10} /> 悄悄话
 {isMe && <span className="ml-1 opacity-70 border-l border-white/20 pl-2">{msg.isRead ? "已读" : "未读"}</span>}
 </div>
 )}
 </div>
 </div>

 {isMe && (
 <div className="w-10 h-10 shrink-0 text-xl flex items-center justify-center rounded-[14px] bg-slate-800/80 border light:border-slate-200 border-white/5 shadow-sm mt-auto">
 {getAvatar(username)}
 </div>
 )}
 </motion.div>
 );
 })}

 {activeTypers.filter((t) => t !== username).map((typer) => (
 <motion.div key={typer} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y:0 }} className="flex gap-4">
 <div className="w-10 h-10 shrink-0 text-xl flex items-center justify-center rounded-[14px] bg-slate-800/80 border light:border-slate-200 border-white/5 mt-auto">
 {getAvatar(typer)}
 </div>
 <div className="bg-slate-800/80 border light:border-slate-200 light:border-slate-200 border-slate-700/50 rounded-2xl rounded-bl-sm px-5 py-4 flex items-center gap-1.5 shadow-sm h-fit mt-auto ">
 <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }}></span>
 <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }}></span>
 <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }}></span>
 </div>
 </motion.div>
 ))}
 <div ref={messagesEndRef} className="h-2" />
 </div>

 {/* INPUT AREA */}
 <div className="p-4 sm:p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-12 relative z-20">
 <div className="max-w-4xl mx-auto relative">
 <AnimatePresence>
 {showQuickPhrases && (
 <motion.div 
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 className="absolute bottom-full left-0 mb-4 bg-slate-900/90 border border-white/10 rounded-2xl p-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-50 flex flex-col gap-1 min-w-[220px]"
 >
 <div className={`px-3 py-2 text-[10px] font-bold ${activeChannel === 'logic' ? 'text-sky-500' : 'text-emerald-500'} uppercase tracking-widest flex items-center gap-2`}>
 <Zap size={12}/> {activeChannel === 'logic' ? '核算逻辑提问' : '系统支持'}
 </div>
 <div className="h-px bg-white/5 mx-2 mb-1" />
 {(activeChannel === 'logic' ? LOGIC_PHRASES : QUICK_PHRASES).map(p => (
 <button 
 key={p} 
 onClick={() => { sendDirectMessage(p); }}
 className={`px-4 py-2.5 rounded-xl text-left text-[13px] light:text-slate-800 text-slate-300 light:font-medium transition-colors font-medium ${activeChannel === 'logic' ? 'hover:bg-sky-500/10 hover:light:text-sky-700 text-sky-300' : 'hover:bg-emerald-500/10 hover:text-emerald-300'}`}
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
 className="absolute bottom-full right-0 mb-4 bg-slate-900/90 border border-white/10 rounded-3xl p-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-50 w-[300px]"
 >
 <div className="flex flex-wrap gap-1.5 justify-center">
 {EMOJI_LIST.map(emoji => (
 <button
 key={emoji}
 onClick={() => { setInputText(prev => prev + emoji); textInputRef.current?.focus(); }}
 className="w-10 h-10 flex items-center justify-center text-2xl light:hover:bg-black/10 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-95"
 >
 {emoji}
 </button>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 <div className="bg-slate-900/80 light:bg-slate-50/50 light:shadow-sm shadow-2xl border border-white/10 light:border-slate-200 rounded-3xl p-2 flex flex-col gap-2 transition-all focus-within:border-emerald-500/50 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.1)] focus-within:bg-slate-900 light:focus-within:bg-white overflow-hidden relative group">
 
 {selectedImage && (
 <div className="relative inline-block w-max mt-2 ml-4 mb-1">
 <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-lg">
 <img src={selectedImage} alt="preview" className="w-full h-full object-cover" />
 </div>
 <button
 onClick={() => setSelectedImage(null)}
 className="absolute -top-2 -right-2 w-7 h-7 bg-slate-800 border-2 border-slate-900 rounded-full flex items-center justify-center light:text-slate-800 text-slate-300 light:font-medium hover:light:text-slate-900 text-white hover:bg-rose-500 shadow-xl transition-colors"
 >
 <X size={14} />
 </button>
 </div>
 )}

 <form onSubmit={handleSend} className="flex items-center gap-2 w-full pl-2 pr-1 py-1">
 <button 
 type="button"
 onClick={() => setShowQuickPhrases(!showQuickPhrases)}
 className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${showQuickPhrases ? (activeChannel === 'logic' ? 'bg-sky-500/20 light:text-sky-600 text-sky-400' : 'bg-emerald-500/20 text-emerald-400') : `light:text-slate-700 text-slate-400 light:hover:bg-black/5 hover:bg-white/5 ${activeChannel === 'logic' ? 'hover:light:text-sky-600 text-sky-400' : 'hover:text-emerald-400'}`}`}
 title={activeChannel === 'logic' ? "核算逻辑提问" : "快捷指令"}
 >
 <Zap size={20} />
 </button>

 <input
 ref={textInputRef}
 type="text"
 value={inputText}
 onChange={handleInputChange}
 placeholder={activeChannel === 'logic' ? "请点击左侧闪电⚡提问了解薪资核算逻辑..." : (privateTarget ? `正在私下给 ${privateTarget.username} 传音...` : "想跟妖界兄弟们说点什么...")}
 className={`flex-1 bg-transparent placeholder:light:text-slate-500 placeholder:text-slate-500 outline-none text-[15px] px-2 h-10 font-medium tracking-wide ${activeChannel === 'logic' ? 'text-sky-200 light:text-sky-800' : 'text-slate-200 light:text-slate-800'}`}
 autoComplete="off"
 />
 
 <div className="flex items-center gap-1.5 shrink-0">
 <button 
 type="button"
 onClick={() => setShowEmojiPicker(!showEmojiPicker)}
 className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showEmojiPicker ? 'bg-sky-500/20 light:text-sky-600 text-sky-400' : 'light:text-slate-700 text-slate-400 light:hover:bg-black/5 hover:bg-white/5 hover:light:text-sky-600 text-sky-400'}`}
 >
 <Smile size={20} />
 </button>
 
 <button 
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="w-10 h-10 rounded-xl flex items-center justify-center light:text-slate-700 text-slate-400 light:hover:bg-black/5 hover:bg-white/5 hover:text-indigo-400 transition-all"
 title="发送图片"
 >
 <ImagePlus size={20} />
 </button>
 <input
 type="file"
 ref={fileInputRef}
 className="hidden"
 accept="image/*"
 onChange={handleImageSelect}
 />

 <button 
 type="button"
 onClick={() => fileAttachmentRef.current?.click()}
 className="w-10 h-10 rounded-xl flex items-center justify-center light:text-slate-700 text-slate-400 light:hover:bg-black/5 hover:bg-white/5 hover:light:text-cyan-600 text-cyan-400 light:font-bold transition-all"
 title="分享文件"
 >
 <FolderOpen size={20} />
 </button>
 <input
 type="file"
 ref={fileAttachmentRef}
 className="hidden"
 onChange={handleFileShare}
 />

 <button 
 type="submit"
 disabled={!inputText.trim() && !selectedImage}
 className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 light:text-slate-900 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 ml-1"
 >
 <Send size={18} className="translate-x-[1px] translate-y-[1px]" />
 </button>
 </div>
 </form>
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
 className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-6"
 onClick={() => setPreviewImage(null)}
 >
 <button
 className="absolute top-6 right-6 light:text-slate-700 text-slate-400 hover:light:text-slate-900 text-white bg-white/5 hover:bg-rose-500/80 p-3 rounded-full transition-colors border border-white/10"
 onClick={() => setPreviewImage(null)}
 >
 <X size={24} />
 </button>
 <motion.img
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 src={previewImage}
 alt="preview full"
 className="max-w-full max-h-[90vh] object-contain rounded-2xl light:shadow-sm shadow-2xl border light:border-slate-200 border-white/5"
 onClick={(e) => e.stopPropagation()}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}

export function ChatPanel(props: { workspaceId: string }) {
 return (
 <LocalErrorBoundary>
 <ChatPanelInner {...props} />
 </LocalErrorBoundary>
 );
}
