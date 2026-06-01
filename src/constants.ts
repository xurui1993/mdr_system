import { Theme } from "./types";

export const MUTTERINGS = [
  "服务节点正常运行中...",
  "正在同步数据核心...",
  "校验计算节点中...",
  "所有子系统运行正常",
  "正在扫描数据异常点...",
  "服务节点状态正常"
];

export const THEMES: Theme[] = [
  {
    name: "Aegis", runner: "▰", target: "▰",
    spin_frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    icon: "🧮", title: "AEGIS 薪资核算中枢", logo: "薪资组内部系统", sub: "",
    kite: "◈",
    term_head: "系统运行日志 // 实时监控", log_init: "AEGIS 引擎已初始化。准备接受任务指令...\n",
    footer: "系统状态: 最佳 // 上行链路加密",
    lbl_city: "业务城市", lbl_type: "业务周期", lbl_config: "配置文件", lbl_source: "数据目录", lbl_workspace: "存放目录",
    btn_config: "选择文件", btn_source: "选择目录", btn_workspace: "指定目录", btn_run: "启动核算任务", btn_run_ing: "正在执行计算...",
    btn_success: "任务已完成", btn_error: "系统故障",
    tab_task: "执行队列", tab_output: "输出结果",
    btn_add_root: "挂载新卷",
  }
];
