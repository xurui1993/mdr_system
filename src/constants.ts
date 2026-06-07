import { Theme } from "./types";

export const MUTTERINGS = [
  "“天行健，君子以自强不息。”",
  "“宝剑锋从磨砺出，梅花香自苦寒来。”",
  "“行百里者半九十，坚持就是胜利！”",
  "“不积跬步，无以至千里。”",
  "“星光不问赶路人，时光不负有心人。”",
  "“乘风破浪会有时，直挂云帆济沧海。”",
  "“百尺竿头，更进一步！”",
  "“努力不一定有回报，但不努力一定没有。”",
  "“道阻且长，行则将至。”",
  "“业精于勤荒于嬉，行成于思毁于随。”"
];

export const THEMES: Theme[] = [
  {
    name: "Aegis", runner: "▰", target: "▰",
    spin_frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    icon: "🧮", title: "AEGIS 薪资核算中枢", logo: "核算内部系统", sub: "",
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
