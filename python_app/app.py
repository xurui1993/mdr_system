# /python_app/app.py
import os
import glob
import time
import requests
import random
import json
import threading
from datetime import datetime
import customtkinter as ctk
from tkinter import filedialog

from constants import *
from utils import resource_path
from weather import get_weather_info
from processor import process_rider_data
from actions import run_remove_problem_orders, run_raise_price, run_summary_parttime

try:
    from zhdate import ZhDate
except ImportError:
    ZhDate = None


ctk.set_appearance_mode("Dark")

class UltimateRiderApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.theme = random.choice(THEMES)
        self.title(self.theme["title"])
        self.geometry("1150x850")
        self.minsize(1000, 700)
        self.configure(fg_color=BG_MAIN)
        try:
            self.iconbitmap(resource_path("icon.ico"))
        except:
            pass

        self.run_count_file = os.path.join(os.path.abspath("."), ".run_count.config")
        self.options_file = os.path.join(os.path.abspath("."), ".options.json")
        self.current_run_count = self.get_run_count()

        self.custom_cities = ["北京", "天津", "大连", "保定", "深圳", "泉州", "三亚", "东莞", "宁波", "广州", "上海"]
        self.custom_cycles = ["全职", "半月结", "周结", "日结", "人效号"]
        self.task_roots = []
        self.load_options()

        self.is_running = False
        self.start_time = 0
        self.kite_frame_idx = 0
        self.btn_breath_state = False
        self.current_tab_index = 0

        self.grid_rowconfigure(0, weight=0)
        self.grid_rowconfigure(1, weight=0)
        self.grid_rowconfigure(2, weight=1)
        self.grid_columnconfigure(0, weight=1)

        self.setup_header()
        self.setup_control_panel()
        self.setup_terminal()

        self.update()
        self.update_clock()
        self.fetch_weather_thread()
        self.animate_kite()
        self.animate_muttering()
        self.animate_button_breath()
        self.typewriter_log(self.theme["log_init"], "INFO")

    def get_run_count(self):
        try:
            if os.path.exists(self.run_count_file):
                with open(self.run_count_file, "r", encoding="utf-8") as f: return int(f.read().strip())
        except:
            pass
        return 0

    def save_run_count(self, count):
        try:
            with open(self.run_count_file, "w", encoding="utf-8") as f:
                f.write(str(count))
        except:
            pass

    def load_options(self):
        if os.path.exists(self.options_file):
            try:
                with open(self.options_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.custom_cities = data.get("cities", self.custom_cities)
                    self.custom_cycles = data.get("cycles", self.custom_cycles)
                    loaded_roots = data.get("task_roots", [])
                    if loaded_roots: self.task_roots = loaded_roots
            except Exception:
                pass

    def save_options(self):
        try:
            with open(self.options_file, "w", encoding="utf-8") as f:
                json.dump({"cities": self.custom_cities, "cycles": self.custom_cycles, "task_roots": self.task_roots},
                          f, ensure_ascii=False)
        except Exception:
            pass

    def setup_header(self):
        self.header_frame = ctk.CTkFrame(self, height=90, fg_color=BG_PANEL, corner_radius=0)
        self.header_frame.grid(row=0, column=0, sticky="ew")
        self.header_frame.grid_columnconfigure(1, weight=1)
        self.header_frame.grid_propagate(False)

        title_container = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        title_container.grid(row=0, column=0, padx=30, pady=18, sticky="w")
        self.lbl_icon = ctk.CTkLabel(title_container, text=self.theme["icon"], font=ctk.CTkFont(size=36),
                                     text_color=ACCENT)
        self.lbl_icon.pack(side="left", padx=(0, 10))
        self.lbl_logo = ctk.CTkLabel(title_container, text=self.theme["logo"],
                                     font=ctk.CTkFont(family="微软雅黑", size=28, weight="bold"), text_color=TEXT_MAIN)
        self.lbl_logo.pack(side="left")
        self.lbl_sub = ctk.CTkLabel(title_container, text=self.theme["sub"],
                                    font=ctk.CTkFont(family="微软雅黑", size=14, weight="bold"), text_color=SUCCESS)
        self.lbl_sub.pack(side="left", padx=(15, 0), pady=(10, 0))
        self.lbl_kite = ctk.CTkLabel(title_container, text=f" {self.theme['kite']} ⠋", font=ctk.CTkFont(size=15),
                                     text_color=ACCENT)
        self.lbl_kite.pack(side="left", padx=(5, 0), pady=(10, 0))
        self.btn_dice = ctk.CTkButton(title_container, text="🎲 摇盲盒换心情", width=120, height=32, corner_radius=16,
                                      fg_color=BG_INPUT, hover_color=ACCENT_HOVER, text_color=TEXT_MAIN,
                                      font=ctk.CTkFont(family="微软雅黑", size=13, weight="bold"), command=self.roll_theme)
        self.btn_dice.pack(side="left", padx=(25, 0), pady=(8, 0))

        self.status_container = ctk.CTkFrame(self.header_frame, fg_color="transparent")
        self.status_container.grid(row=0, column=2, padx=30, pady=15, sticky="e")
        self.top_info_frame = ctk.CTkFrame(self.status_container, fg_color="transparent")
        self.top_info_frame.pack(side="top", anchor="w", pady=(0, 4), fill="x")
        self.weather_label = ctk.CTkLabel(self.top_info_frame, text="正在打听天气...",
                                          font=ctk.CTkFont(family="Consolas", size=14), text_color=TEXT_DIM)
        self.weather_label.pack(side="left", padx=(0, 15))
        self.time_label = ctk.CTkLabel(self.top_info_frame, text="00:00:00 (全速运转)",
                                       font=ctk.CTkFont(family="Consolas", size=16, weight="bold"), text_color=ACCENT)
        self.time_label.pack(side="left")
        self.bottom_info_frame = ctk.CTkFrame(self.status_container, fg_color="transparent")
        self.bottom_info_frame.pack(side="top", anchor="w", fill="x")
        self.date_label = ctk.CTkLabel(self.bottom_info_frame, text="翻找日历...",
                                       font=ctk.CTkFont(family="Consolas", size=14), text_color=TEXT_DIM)
        self.date_label.pack(side="left", padx=(0, 10))
        self.btn_help = ctk.CTkButton(self.bottom_info_frame, text="📖 使用说明", width=76, height=24, corner_radius=12,
                                      fg_color=BG_INPUT, hover_color=ACCENT_HOVER, text_color=TEXT_MAIN,
                                      font=ctk.CTkFont(family="微软雅黑", size=12), command=self.show_help)
        self.btn_help.pack(side="left")

    def show_help(self):
        help_win = ctk.CTkToplevel(self)
        help_win.title(f"📖 {self.theme['logo']} - 全功能终极说明书")
        help_win.geometry("850x850")
        help_win.minsize(800, 750)
        help_win.configure(fg_color=BG_MAIN)
        help_win.transient(self)
        help_win.grab_set()

        lbl_title = ctk.CTkLabel(help_win, text=f"👑 {self.theme['logo']} - 全维度系统说明书",
                                 font=ctk.CTkFont(family="微软雅黑", size=24, weight="bold"), text_color=SUCCESS)
        lbl_title.pack(pady=(25, 10))
        scroll = ctk.CTkScrollableFrame(help_win, fg_color=BG_PANEL, corner_radius=10)
        scroll.pack(padx=25, pady=10, fill="both", expand=True)

        def add_block(title, content, color=TEXT_MAIN, title_color=ACCENT):
            if title:
                t_lbl = ctk.CTkLabel(scroll, text=title, font=ctk.CTkFont(family="微软雅黑", size=15, weight="bold"),
                                     text_color=title_color, justify="left")
                t_lbl.pack(anchor="w", padx=15, pady=(15, 5))
            if content:
                c_lbl = ctk.CTkLabel(scroll, text=content, font=ctk.CTkFont(family="微软雅黑", size=13), text_color=color,
                                     justify="left", wraplength=700)
                c_lbl.pack(anchor="w", padx=15, pady=(0, 5))

        ctk.CTkLabel(scroll, text="【 ⚠️ 郑重免责声明 (打工人护体神盾) 】", font=ctk.CTkFont(family="微软雅黑", size=18, weight="bold"),
                     text_color=LOG_ERR).pack(anchor="w", padx=10, pady=(15, 5))
        add_block("⚖️ 责任边界：", "本工具仅作为【辅助提效脚本】无偿提供，作者不对最终计算结果的绝对准确性作任何兜底担保。所有输出的报表及结算金额，【务必经由使用者人工抽查与复核】后，方可用于实际财务打款。",
                  color=WARNING, title_color=LOG_ERR)
        add_block("💸 风险承担：", "因业务规则变动、源文件格式异常、人员操作失误或不可预见的程序 Bug 导致的资金多发、漏发、错扣等一切经济损失及连带责任，均由使用者自行承担，本工具及原作者【概不负责】。",
                  color=WARNING, title_color=LOG_ERR)
        add_block("🤝 最终约定：", "使用本软件即代表您已充分理解并同意本免责声明。机器算得再快，最终拍板发钱的还是您自己哦！请务必保持对数据的敬畏之心。", color=TEXT_DIM,
                  title_color=LOG_ERR)

        divider = ctk.CTkFrame(scroll, height=1, fg_color=BG_INPUT)
        divider.pack(fill="x", padx=15, pady=(20, 10))

        ctk.CTkLabel(scroll, text="【 ✨ 核心痛点与硬核计算逻辑 】", font=ctk.CTkFont(family="微软雅黑", size=17, weight="bold"),
                     text_color=WARNING).pack(anchor="w", padx=10, pady=(15, 5))
        add_block("• 🚀 极速融合填表 (六大核心表一键吞吐)：", "程序可一键吞吐并无缝整合【配送费】、【问题单】、【违规扣款】、【欺诈单】、【支付绑定】以及【兼职价格档案】6 大核心业务数据源，彻底解放双手。")
        add_block("• 🎯 排班断层与团队智配：", "以《申请名单》为基准，采用“骑手ID + 具体日期”矩阵匹配，完美解决日期中断的复杂结算场景；同时依托《团队名称》表，自动为骑手匹配精准归属地。")
        add_block("• 🛡️ 史诗级防重雷达与集中拦截：", "每次启动将自动全盘扫描历史生成的结算工作簿。跨文件查重（运单号/问题单号），彻底杜绝重复打钱或扣款，异常数据统一押送至【拦截溯源】子表。")
        add_block("• ⚡ 蓝橙单价智配 & 历史薪资方案继承：",
                  "深度解析《兼职价格档案》精准赋价（支持ID/姓名多维匹配）。遇到缺价碎片自动合并日期，输出单独的【蓝橙无单价明细】，并在所得表中反写“无单价备注”与历史【薪资方案】。")
        add_block("• 💰 安全基金动态公式平移：", "现在直接从模板中读取第2行公式并自动向下填充所有关联数据行，安全无忧且便于手工随时调整。")
        add_block("• 🚨 发薪未绑精准拦截：", "底层直接将算薪结果与【骑手支付绑定】表碰撞，状态异常或未绑定的打工人将被直接抓取，单独生成并保存为《发薪工具未绑名单》文件。")
        add_block("• 🌟 COM 级纯净历史合表引擎 (终极绝杀)：",
                  "点击底部的兼职已发汇总按钮，系统会唤醒底层隐藏的 Excel 引擎，将目录下所有历史表格提取纯数值（无情剔除公式、死链和乱码），重新融合成一份带金装美化的【XX兼职已发汇总】大表。")

        ctk.CTkLabel(scroll, text="【 🎨 沉浸式 UI 与效率外设 】", font=ctk.CTkFont(family="微软雅黑", size=17, weight="bold"),
                     text_color=WARNING).pack(anchor="w", padx=10, pady=(20, 5))
        add_block("• 🎲 5 大盲盒沉浸主题：", "点击顶部【摇盲盒换心情】，从星际舰队到猫咪主子... 界面文案、图标、打工碎碎念全方位无缝切换。")
        add_block("• 📂 智能任务侧边栏：", "点击右侧 ➕ 可绑定多个城市的总目录，双击子文件夹直接锁定数据源；核算完成后，产出文件秒刷侧边栏，点击即看。")
        add_block("• ⚙️ 自定义参数体系：", "在城市和周期旁边点击 ⚙️ 小齿轮，即可随时增删你的专属城市列表和结算节奏，配置自动记忆。")

        ctk.CTkLabel(scroll, text="【 📁 文件夹与文件准备 】", font=ctk.CTkFont(family="微软雅黑", size=17, weight="bold"),
                     text_color=WARNING).pack(anchor="w", padx=10, pady=(20, 5))
        add_block("",
                  f"1️⃣ {self.theme['lbl_config'][:-1]} (配置表)：路径下需包含 `config.xlsx`，必须含有「申请名单」、「扣款标准」以及可选的「团队名称」子表。\n\n2️⃣ {self.theme['lbl_source'][:-1]} (数据源)：该文件夹下存放各类明细表 (csv/xlsx)。文件名须含关键字：配送费、问题单、违规、欺诈单、支付绑定、兼职价格档案。\n\n3️⃣ 模板文件：系统会在运行目录下的 `09.template` 文件夹中寻找 `城市名-template.xlsx`。")

        ctk.CTkLabel(scroll, text="【 🚀 动态操作流程 】", font=ctk.CTkFont(family="微软雅黑", size=17, weight="bold"),
                     text_color=WARNING).pack(anchor="w", padx=10, pady=(20, 5))
        add_block("",
                  f"第 1 步：在左侧或通过侧边栏选择【{self.theme['lbl_city'][:-1]}】以及【{self.theme['lbl_type'][:-1]}】。\n第 2 步：点击【 {self.theme['btn_config']} 】设定好配置表目录。\n第 3 步：点击【 {self.theme['btn_source']} 】选择今日待处理的数据源文件夹。\n第 4 步：点击大按钮【 {self.theme['btn_run']} 】！喝杯水，欣赏右侧终端炫酷的代码雨。\n第 5 步：查看播报台拦截警报与底部战绩，右侧【{self.theme['tab_output']}】直接点击打开鲜活出炉的报表！")

        btn_close = ctk.CTkButton(help_win, text="同意声明并开始搞钱！", width=220, height=42, corner_radius=21, fg_color=ACCENT,
                                  hover_color=ACCENT_HOVER, font=ctk.CTkFont(family="微软雅黑", size=15, weight="bold"),
                                  command=help_win.destroy)
        btn_close.pack(pady=(15, 20))

    def animate_kite(self):
        frames = self.theme.get("spin_frames", ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"])
        self.lbl_kite.configure(text=f" {self.theme['kite']} {frames[self.kite_frame_idx]}")
        self.kite_frame_idx = (self.kite_frame_idx + 1) % len(frames)
        self.after(150, self.animate_kite)

    def animate_muttering(self):
        if not self.is_running:
            self.lbl_mutter.configure(text=random.choice(MUTTERINGS))
        else:
            self.lbl_mutter.configure(text="💭 嘘... 别吵吵，我在疯狂搬砖中...")
        self.after(7000, self.animate_muttering)

    def animate_button_breath(self):
        if not self.is_running:
            if self.btn_breath_state:
                self.run_btn.configure(fg_color=ACCENT)
            else:
                self.run_btn.configure(fg_color="#0b4d7a")
            self.btn_breath_state = not self.btn_breath_state
        self.after(1500, self.animate_button_breath)

    def typewriter_log(self, text, level="INFO", index=0):
        if index == 0:
            self.log_box.configure(state="normal")
            self.log_box.insert("end", "\n")

        if index < len(text):
            self.log_box.configure(state="normal")
            self.log_box.insert("end", text[index], level)
            self.log_box.see("end")
            self.log_box.configure(state="disabled")
            self.after(30, self.typewriter_log, text, level, index + 1)
        else:
            self.log_box.configure(state="normal")
            self.log_box.insert("end", "\n")
            self.log_box.configure(state="disabled")

    def roll_theme(self):
        if self.is_running: return
        new_theme = random.choice([t for t in THEMES if t["name"] != self.theme["name"]])
        self.theme = new_theme

        self.title(self.theme["title"])
        self.lbl_icon.configure(text=self.theme["icon"])
        self.lbl_logo.configure(text=self.theme["logo"])
        self.lbl_sub.configure(text=self.theme["sub"])
        self.lbl_term_head.configure(text=self.theme["term_head"])
        self.lbl_footer.configure(text=self.theme["footer"])

        self.lbl_city_txt.configure(text=self.theme["lbl_city"])
        self.lbl_type_txt.configure(text=self.theme["lbl_type"])
        self.lbl_config_txt.configure(text=self.theme["lbl_config"])
        self.lbl_source_txt.configure(text=self.theme["lbl_source"])

        self.btn_config_btn.configure(text=self.theme["btn_config"])
        self.btn_source_btn.configure(text=self.theme["btn_source"])
        self.run_btn.configure(text=self.theme["btn_run"])

        self.tab_seg.configure(values=[self.theme["tab_task"], self.theme["tab_output"]])
        active_name = self.theme["tab_task"] if self.current_tab_index == 0 else self.theme["tab_output"]
        self.tab_seg.set(active_name)

        self.update_progress(0, f"已无缝切换至: {self.theme['name']}")
        self.typewriter_log(f">>> [盲盒时刻] 🎲 叮！画风突变，已切换至【{self.theme['name']}】\n{self.theme['log_init']}", "SYSTEM")
        self.fetch_weather_thread()

    def open_edit_dialog(self, title, current_values, callback, tip="多个选项请用逗号 ',' 分隔"):
        win = ctk.CTkToplevel(self)
        win.title(title)
        win.geometry("450x220")
        win.minsize(450, 220)
        win.configure(fg_color=BG_MAIN)
        win.transient(self)
        win.grab_set()

        lbl = ctk.CTkLabel(win, text=tip, font=ctk.CTkFont(family="微软雅黑", size=14), text_color=TEXT_MAIN)
        lbl.pack(pady=(25, 10), padx=25, anchor="w")
        entry = ctk.CTkEntry(win, width=400, fg_color=BG_INPUT, border_color=BG_INPUT, text_color=TEXT_MAIN,
                             font=ctk.CTkFont(family="Consolas", size=14))
        entry.insert(0, ",".join(current_values))
        entry.pack(padx=25, pady=10)

        def on_save():
            val = entry.get()
            new_list = [x.strip() for x in val.replace("，", ",").split(",") if x.strip()]
            if new_list: callback(new_list)
            win.destroy()

        btn = ctk.CTkButton(win, text="💾 保存并生效", width=120, height=36, corner_radius=18, fg_color=ACCENT,
                            hover_color=ACCENT_HOVER, font=ctk.CTkFont(family="微软雅黑", size=14, weight="bold"),
                            command=on_save)
        btn.pack(pady=20)

    def edit_cities(self):
        self.open_edit_dialog("⚙️ 自定义跑马场区 (城市)", self.custom_cities, self.save_cities)

    def save_cities(self, new_list):
        self.custom_cities = new_list
        self.save_options()
        self.city_combo.configure(values=self.custom_cities)
        if self.city_combo.get() not in self.custom_cities: self.city_combo.set(self.custom_cities[0])

    def edit_cycles(self):
        self.open_edit_dialog("⚙️ 自定义草料周期", self.custom_cycles, self.save_cycles, tip="多个选项用逗号分隔 (建议不超过 6 个，否则会拥挤)")

    def save_cycles(self, new_list):
        self.custom_cycles = new_list
        self.save_options()
        self.type_seg.configure(values=self.custom_cycles)
        if self.type_seg.get() not in self.custom_cycles: self.type_seg.set(self.custom_cycles[0])

    def setup_control_panel(self):
        self.middle_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.middle_frame.grid(row=1, column=0, sticky="ew", padx=20, pady=20)
        self.middle_frame.grid_columnconfigure(0, weight=6, uniform="a")
        self.middle_frame.grid_columnconfigure(1, weight=4, uniform="a")

        self.config_card = ctk.CTkFrame(self.middle_frame, fg_color=BG_PANEL, corner_radius=8)
        self.config_card.grid(row=0, column=0, sticky="nsew", padx=(0, 15))
        self.config_card.grid_columnconfigure(0, weight=0, minsize=110)
        self.config_card.grid_columnconfigure(1, weight=1)
        self.config_card.grid_columnconfigure(2, weight=0, minsize=100)
        self.config_card.grid_columnconfigure(3, weight=1)

        self.lbl_city_txt = ctk.CTkLabel(self.config_card, text=self.theme["lbl_city"],
                                         font=ctk.CTkFont(family="微软雅黑", size=13), text_color=TEXT_DIM)
        self.lbl_city_txt.grid(row=0, column=0, padx=(20, 5), pady=(25, 12), sticky="w")

        frame_city = ctk.CTkFrame(self.config_card, fg_color="transparent")
        frame_city.grid(row=0, column=1, padx=(10, 5), pady=(25, 12), sticky="ew")
        self.city_combo = ctk.CTkComboBox(frame_city, values=self.custom_cities, width=140, corner_radius=4,
                                          fg_color=BG_INPUT, border_color=BG_INPUT, button_color=BG_INPUT,
                                          button_hover_color=ACCENT, text_color=TEXT_MAIN, command=self.on_city_change)
        self.city_combo.set(self.custom_cities[4] if len(self.custom_cities) > 4 else self.custom_cities[0])
        self.city_combo.pack(side="left", fill="x", expand=True)
        btn_city_edit = ctk.CTkButton(frame_city, text="⚙️", width=28, height=28, fg_color="transparent",
                                      hover_color=BG_INPUT, command=self.edit_cities)
        btn_city_edit.pack(side="right", padx=(5, 0))

        self.lbl_type_txt = ctk.CTkLabel(self.config_card, text=self.theme["lbl_type"],
                                         font=ctk.CTkFont(family="微软雅黑", size=13), text_color=TEXT_DIM)
        self.lbl_type_txt.grid(row=0, column=2, padx=(10, 5), pady=(25, 12), sticky="w")

        frame_type = ctk.CTkFrame(self.config_card, fg_color="transparent")
        frame_type.grid(row=0, column=3, padx=(5, 20), pady=(25, 12), sticky="ew")
        self.type_seg = ctk.CTkSegmentedButton(frame_type, values=self.custom_cycles, width=140, corner_radius=4,
                                               fg_color=BG_INPUT, selected_color=ACCENT,
                                               selected_hover_color=ACCENT_HOVER, text_color=TEXT_MAIN)
        self.type_seg.set(self.custom_cycles[1] if len(self.custom_cycles) > 1 else self.custom_cycles[0])
        self.type_seg.pack(side="left", fill="x", expand=True)
        btn_type_edit = ctk.CTkButton(frame_type, text="⚙️", width=28, height=28, fg_color="transparent",
                                      hover_color=BG_INPUT, command=self.edit_cycles)
        btn_type_edit.pack(side="right", padx=(5, 0))

        self.lbl_config_txt = ctk.CTkLabel(self.config_card, text=self.theme["lbl_config"],
                                           font=ctk.CTkFont(family="微软雅黑", size=13), text_color=TEXT_DIM)
        self.lbl_config_txt.grid(row=1, column=0, padx=(20, 5), pady=(12, 12), sticky="w")

        self.entry_base = ctk.CTkEntry(self.config_card, fg_color=BG_INPUT, border_color=BG_INPUT, text_color=TEXT_MAIN,
                                       font=ctk.CTkFont(family="Consolas", size=13))
        self.entry_base.insert(0, os.getcwd())
        self.entry_base.grid(row=1, column=1, columnspan=2, padx=(10, 5), pady=(12, 12), sticky="ew")

        self.btn_config_btn = ctk.CTkButton(self.config_card, text=self.theme["btn_config"], width=130, corner_radius=6,
                                            fg_color=BG_INPUT, border_width=1, border_color=ACCENT, text_color=TEXT_DIM,
                                            hover_color=ACCENT, font=ctk.CTkFont(family="微软雅黑", size=13),
                                            command=self.open_config_excel)
        self.btn_config_btn.grid(row=1, column=3, padx=(5, 20), pady=(12, 12), sticky="ew")

        self.lbl_source_txt = ctk.CTkLabel(self.config_card, text=self.theme["lbl_source"],
                                           font=ctk.CTkFont(family="微软雅黑", size=13), text_color=TEXT_DIM)
        self.lbl_source_txt.grid(row=2, column=0, padx=(20, 5), pady=(12, 12), sticky="w")

        self.entry_source = ctk.CTkEntry(self.config_card, fg_color=BG_INPUT, border_color=BG_INPUT,
                                         text_color=TEXT_MAIN, font=ctk.CTkFont(family="Consolas", size=13))
        self.entry_source.insert(0, os.getcwd())
        self.entry_source.grid(row=2, column=1, columnspan=2, padx=(10, 5), pady=(12, 12), sticky="ew")

        self.btn_source_btn = ctk.CTkButton(self.config_card, text=self.theme["btn_source"], width=130, corner_radius=6,
                                            fg_color=BG_INPUT, border_width=1, border_color=ACCENT, text_color=TEXT_DIM,
                                            hover_color=ACCENT, font=ctk.CTkFont(family="微软雅黑", size=13),
                                            command=self.browse_source)
        self.btn_source_btn.grid(row=2, column=3, padx=(5, 20), pady=(12, 12), sticky="ew")

        self.post_action_frame = ctk.CTkFrame(self.config_card, fg_color="transparent")
        self.post_action_frame.grid(row=3, column=0, columnspan=4, padx=(20, 20), pady=(0, 20), sticky="ew")
        for i in range(4): self.post_action_frame.grid_columnconfigure(i, weight=1, uniform="post_btn")

        self.btn_post1 = ctk.CTkButton(self.post_action_frame, text="🗑️ 问题单剔除", height=32, corner_radius=6,
                                       fg_color=BG_INPUT, hover_color=ACCENT_HOVER, text_color=TEXT_MAIN,
                                       font=ctk.CTkFont(family="微软雅黑", size=13),
                                       command=self.action_remove_problem_orders)
        self.btn_post1.grid(row=0, column=0, padx=(0, 5), sticky="ew")

        self.btn_post2 = ctk.CTkButton(self.post_action_frame, text="💰 蓝橙价格提审", height=32, corner_radius=6,
                                       fg_color=BG_INPUT, hover_color=ACCENT_HOVER, text_color=TEXT_MAIN,
                                       font=ctk.CTkFont(family="微软雅黑", size=13), command=self.action_raise_price)
        self.btn_post2.grid(row=0, column=1, padx=(5, 5), sticky="ew")

        self.btn_post3 = ctk.CTkButton(self.post_action_frame, text="⏰ 蓝橙超期提审", height=32, corner_radius=6,
                                       fg_color=BG_INPUT, hover_color=ACCENT_HOVER, text_color=TEXT_MAIN,
                                       font=ctk.CTkFont(family="微软雅黑", size=13), command=self.action_overdue_review)
        self.btn_post3.grid(row=0, column=2, padx=(5, 5), sticky="ew")

        self.btn_post4 = ctk.CTkButton(self.post_action_frame, text="📊 兼职已发汇总", height=32, corner_radius=6,
                                       fg_color=BG_INPUT, hover_color=ACCENT_HOVER, text_color=TEXT_MAIN,
                                       font=ctk.CTkFont(family="微软雅黑", size=13), command=self.action_summary_parttime)
        self.btn_post4.grid(row=0, column=3, padx=(5, 0), sticky="ew")

        self.action_card = ctk.CTkFrame(self.middle_frame, fg_color=BG_PANEL, corner_radius=8)
        self.action_card.grid(row=0, column=1, sticky="nsew", padx=(10, 0))
        self.action_card.grid_columnconfigure(0, weight=1)
        self.action_card.grid_rowconfigure(0, weight=1)
        self.action_card.grid_rowconfigure(1, weight=1)

        self.run_btn = ctk.CTkButton(self.action_card, text=self.theme["btn_run"],
                                     font=ctk.CTkFont(family="微软雅黑", size=22, weight="bold"), height=55,
                                     corner_radius=6, fg_color=ACCENT, hover_color=ACCENT_HOVER, text_color="#FFFFFF",
                                     command=self.start_processing)
        self.run_btn.grid(row=0, column=0, sticky="ew", padx=25, pady=(25, 5))

        progress_inner = ctk.CTkFrame(self.action_card, fg_color="transparent")
        progress_inner.grid(row=1, column=0, sticky="ew", padx=25, pady=(10, 20))
        progress_inner.grid_columnconfigure(0, weight=1)
        progress_inner.grid_columnconfigure(1, weight=1)
        progress_inner.grid_columnconfigure(2, weight=1)

        self.lbl_status_text = ctk.CTkLabel(progress_inner, text="等待指令输入", font=ctk.CTkFont(family="微软雅黑", size=13),
                                            text_color=TEXT_DIM, anchor="w")
        self.lbl_status_text.grid(row=0, column=0, sticky="sw")
        self.lbl_timer = ctk.CTkLabel(progress_inner, text="00:00.0",
                                      font=ctk.CTkFont(family="Consolas", size=20, weight="bold"), text_color=TEXT_DIM)
        self.lbl_timer.grid(row=0, column=2, sticky="se")
        self.lbl_track = ctk.CTkLabel(progress_inner, text="", font=ctk.CTkFont(family="Consolas", size=15),
                                      text_color=SUCCESS, anchor="w")
        self.lbl_track.grid(row=1, column=0, columnspan=3, sticky="ew", pady=(8, 0))
        self.progress_bar = ctk.CTkProgressBar(progress_inner, height=8, corner_radius=4, fg_color=BG_INPUT,
                                               progress_color=SUCCESS)
        self.progress_bar.grid(row=2, column=0, columnspan=3, sticky="ew", pady=(2, 0))
        self.progress_bar.set(0)
        self.lbl_mutter = ctk.CTkLabel(progress_inner, text="", font=ctk.CTkFont(family="微软雅黑", size=12),
                                       text_color=TEXT_DIM)
        self.lbl_mutter.grid(row=3, column=0, columnspan=3, sticky="e", pady=(5, 0))

    def setup_terminal(self):
        self.terminal_frame = ctk.CTkFrame(self, fg_color=BG_PANEL, corner_radius=8)
        self.terminal_frame.grid(row=2, column=0, sticky="nsew", padx=20, pady=(0, 20))
        self.terminal_frame.grid_rowconfigure(1, weight=1)
        self.terminal_frame.grid_columnconfigure(0, weight=7, uniform="term")
        self.terminal_frame.grid_columnconfigure(1, weight=3, uniform="term")

        self.lbl_term_head = ctk.CTkLabel(self.terminal_frame, text=self.theme["term_head"],
                                          font=ctk.CTkFont(family="微软雅黑", size=13, weight="bold"), text_color=TEXT_DIM,
                                          anchor="w")
        self.lbl_term_head.grid(row=0, column=0, padx=20, pady=(15, 5), sticky="w")

        self.log_box = ctk.CTkTextbox(self.terminal_frame, fg_color=LOG_BG, text_color=LOG_INFO,
                                      font=ctk.CTkFont(family="Consolas", size=14), corner_radius=6,
                                      activate_scrollbars=True)
        self.log_box.grid(row=1, column=0, sticky="nsew", padx=(20, 10), pady=(0, 5))
        self.log_box.configure(state="disabled")

        self.log_box.tag_config("INFO", foreground=LOG_INFO)
        self.log_box.tag_config("SYSTEM", foreground=LOG_SYS)
        self.log_box.tag_config("WARN", foreground=LOG_WARN)
        self.log_box.tag_config("ERROR", foreground=LOG_ERR)
        self.log_box.tag_config("SUCCESS", foreground=LOG_OK)

        self.right_header_frame = ctk.CTkFrame(self.terminal_frame, fg_color="transparent")
        self.right_header_frame.grid(row=0, column=1, padx=(10, 20), pady=(10, 5), sticky="ew")
        self.right_header_frame.grid_columnconfigure(0, weight=1)

        self.tab_seg = ctk.CTkSegmentedButton(self.right_header_frame,
                                              values=[self.theme["tab_task"], self.theme["tab_output"]],
                                              command=self.switch_right_tab, fg_color=BG_INPUT, selected_color=ACCENT,
                                              text_color=TEXT_MAIN, font=ctk.CTkFont(family="微软雅黑", size=13))
        self.tab_seg.grid(row=0, column=0, sticky="ew")
        self.tab_seg.set(self.theme["tab_task"])

        self.btn_add_root = ctk.CTkButton(self.right_header_frame, text="➕", width=32, height=28, fg_color=BG_INPUT,
                                          hover_color=SUCCESS, text_color=SUCCESS,
                                          font=ctk.CTkFont(size=14, weight="bold"), command=self.add_task_root)
        self.btn_add_root.grid(row=0, column=1, padx=(5, 0))

        self.btn_open_explorer = ctk.CTkButton(self.right_header_frame, text="📂", width=32, height=28,
                                               fg_color=BG_INPUT, hover_color=ACCENT_HOVER,
                                               command=self.open_current_explorer)
        self.btn_open_explorer.grid(row=0, column=2, padx=(5, 0))

        self.files_panel = ctk.CTkFrame(self.terminal_frame, fg_color=LOG_BG, corner_radius=6)
        self.files_panel.grid(row=1, column=1, sticky="nsew", padx=(10, 20), pady=(0, 5))
        self.files_panel.grid_rowconfigure(0, weight=1)
        self.files_panel.grid_columnconfigure(0, weight=1)

        self.files_list_frame = ctk.CTkScrollableFrame(self.files_panel, fg_color="transparent")
        self.files_list_frame.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)

        self.current_out_folder = ""
        self.after(200, self.refresh_right_panel)

        self.bottom_bar = ctk.CTkFrame(self.terminal_frame, fg_color="transparent")
        self.bottom_bar.grid(row=2, column=0, columnspan=2, sticky="ew", padx=20, pady=(0, 10))
        self.bottom_bar.grid_columnconfigure(0, weight=1)

        self.lbl_stats = ctk.CTkLabel(self.bottom_bar,
                                      text=f"[累计: {self.current_run_count} 次]  核算: 0 人  |  单量: 0 单  |  索赔: 0 单  |  问题: 0 单  |  耗时: 0.00 秒  |  👑 评级: 待定",
                                      font=ctk.CTkFont(family="微软雅黑", size=13, weight="bold"), text_color=WARNING)
        self.lbl_stats.grid(row=0, column=0, sticky="w")
        self.lbl_footer = ctk.CTkLabel(self.bottom_bar, text=self.theme["footer"],
                                       font=ctk.CTkFont(family="微软雅黑", size=12), text_color=TEXT_DIM)
        self.lbl_footer.grid(row=0, column=1, sticky="e")

    def write_log(self, message, level="INFO"):
        def _append_log():
            self.log_box.configure(state="normal")
            msg_append = message if message.endswith("\n") else message + "\n"
            if level == "ERROR":
                self.log_box.insert("end", "\n" + "-" * 50 + "\n", "ERROR")
                self.log_box.insert("end", msg_append, "ERROR")
                self.log_box.insert("end", "-" * 50 + "\n\n", "ERROR")
            else:
                self.log_box.insert("end", msg_append, level)
            self.log_box.see("end")
            self.log_box.configure(state="disabled")

        self.after(0, _append_log)

    def update_clock(self):
        now = datetime.now()
        hour = now.hour
        if 0 <= hour < 6:
            time_status = "[深夜修仙进度 99%]"
        elif 6 <= hour < 9:
            time_status = "[跨越障碍冲刺中]"
        elif 9 <= hour < 12:
            time_status = "[上午全速运转]"
        elif 12 <= hour < 14:
            time_status = "[人是铁，饭是钢]"
        elif 14 <= hour < 18:
            time_status = "[下午茶扫描中]"
        elif 18 <= hour < 20:
            time_status = "[准备跃出围栏回家]"
        else:
            time_status = "[晚间葛优躺模式]"

        time_str = now.strftime("%H:%M:%S")
        self.time_label.configure(text=f"{time_str} {time_status}")
        date_str = f"{now.year}年{now.month:02d}月{now.day:02d}日"
        weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
        weekday_str = weekdays[now.weekday()]

        try:
            if ZhDate:
                l_date = ZhDate.from_datetime(now)
                lunar_str = f" | 农历 {l_date.chinese()}"
            else:
                lunar_str = " (可 pip install zhdate 显示农历)"
        except Exception:
            lunar_str = ""

        full_date_str = f"{date_str} | {weekday_str}{lunar_str}"
        self.date_label.configure(text=full_date_str)
        self.after(1000, self.update_clock)

    def on_city_change(self, choice):
        self.write_log(f">>> 目标地转移至: {choice} (请准备)", "INFO")
        self.fetch_weather_thread()

    def fetch_weather_thread(self):
        if hasattr(self, 'weather_timer') and self.weather_timer: self.after_cancel(self.weather_timer)
        wait_msgs = {"马年宝马": "🐴 正在嗅探草料场天气...", "星际舰队": "🛸 正在扫描星区大气层...", "赛博黑客": "👾 正在劫持气象卫星...",
                     "米其林后厨": "👨‍🍳 正在探查露天温湿度...", "猫咪主子": "🐱 正在伸爪试探窗外温度..."}
        wait_msg = wait_msgs.get(self.theme["name"], "正在打听天气...")
        self.weather_label.configure(text=wait_msg, text_color=TEXT_DIM)
        threading.Thread(target=self._get_weather_data, daemon=True).start()
        self.weather_timer = self.after(1800000, self.fetch_weather_thread)

    def _get_weather_data(self):
        weather_text, err_msg = get_weather_info(self.city_combo.get(), self.theme["name"])
        if weather_text:
            self.after(0, lambda w=weather_text: self.weather_label.configure(text=w, text_color=SUCCESS))
        else:
            self.after(0, lambda: self.weather_label.configure(text=err_msg, text_color=LOG_WARN))

    def open_config_excel(self):
        base_path = self.entry_base.get()
        config_file = os.path.join(base_path, "config.xlsx")
        if os.path.exists(config_file):
            try:
                os.startfile(config_file)
                self.write_log(f">>> 打开设定文件: {config_file}", "SYSTEM")
            except Exception as e:
                self.write_log(f"文件暂时打不开哦: {str(e)}", "ERROR")
        else:
            self.write_log(f"哎呀，该文件不知被谁藏起来了: {config_file}", "WARN")

    def browse_source(self):
        folder = filedialog.askdirectory()
        if folder:
            self.entry_source.delete(0, "end")
            self.entry_source.insert(0, folder)

    def update_progress(self, value, text):
        percentage = int(value * 100)
        self.progress_bar.set(value)
        self.lbl_status_text.configure(text=f"[{percentage}%] {text}")

        track_length = 33
        pos = int(value * track_length)
        pos = min(pos, track_length)

        if value >= 1.0:
            track_str = "  " * track_length + f"{self.theme['target']} {self.theme['runner']} 搞定啦！"
        elif value <= 0:
            track_str = f"{self.theme['runner']} " + " ." * track_length + f" {self.theme['target']}"
        else:
            track_str = "=" * pos + f"{self.theme['runner']}" + " ." * (track_length - pos) + f" {self.theme['target']}"

        self.lbl_track.configure(text=track_str)

    def _refresh_timer(self):
        if self.is_running:
            elapsed = time.time() - self.start_time
            mins, secs, ms = int(elapsed // 60), int(elapsed % 60), int((elapsed * 10) % 10)
            self.lbl_timer.configure(text=f"{mins:02d}:{secs:02d}.{ms}")
            self.after(100, self._refresh_timer)

    def start_processing(self):
        self.run_btn.configure(state="disabled", text=self.theme["btn_run_ing"], fg_color=WARNING, text_color=BG_MAIN)
        self.lbl_timer.configure(text_color=WARNING)
        self.lbl_stats.configure(
            text=f"[累计: {self.current_run_count} 次]  核算: 0 人  |  单量: 0 单  |  索赔: 0 单  |  问题: 0 单  |  耗时: 0.00 秒  |  👑 评级: 算力聚集中...")
        self.log_box.configure(state="normal")
        self.log_box.delete("0.0", "end")
        self.log_box.configure(state="disabled")
        self.update_progress(0, "深呼吸...")
        self.is_running, self.start_time = True, time.time()
        self._refresh_timer()
        city, selected_option = self.city_combo.get(), self.type_seg.get()
        base_path, source_folder = self.entry_base.get(), self.entry_source.get()
        threading.Thread(target=process_rider_data, args=(
            city, selected_option, source_folder, base_path, self.write_log, self.safe_update_progress,
            self.finish_task,
            self.theme), daemon=True).start()

    def safe_update_progress(self, value, text):
        self.after(0, lambda: self.update_progress(value, text))

    def finish_task(self, status, result_msg, stats_info=None):
        self.after(0, lambda: self._reset_ui(status, result_msg, stats_info))

    def _reset_ui(self, status, result_msg, stats_info=None):
        self.is_running = False
        if status == "success":
            self.current_run_count += 1
            self.save_run_count(self.current_run_count)
            out_folder = stats_info.get("out_folder", "") if stats_info else ""
            self.refresh_right_panel(force_out_folder=out_folder)

            riders = stats_info.get("riders", 0) if stats_info else 0
            orders = stats_info.get("orders", 0) if stats_info else 0
            penalty = stats_info.get("penalty_orders", 0) if stats_info else 0
            problem = stats_info.get("problem_orders", 0) if stats_info else 0
            elapsed = stats_info.get("elapsed_time", 0.0) if stats_info else 0.0

            if orders == 0:
                rank_title = "空气核算员 (摸鱼王者)"
            else:
                level = (orders // 50000) + 1
                if level == 1:
                    rank_title = "Lv1 倔强青铜算薪师"
                elif level == 2:
                    rank_title = "Lv2 秩序白银算薪师"
                elif level == 3:
                    rank_title = "Lv3 荣耀黄金算薪师"
                elif level == 4:
                    rank_title = "Lv4 尊贵铂金算薪师"
                elif level == 5:
                    rank_title = "Lv5 永恒钻石机器"
                elif level == 6:
                    rank_title = "Lv6 至尊星耀狂魔"
                else:
                    rank_title = f"Lv{level} 最强王者 (无情算薪神)"

                if problem >= 100 or penalty >= 100:
                    rank_title += " [兼职背锅侠]"
                elif elapsed > 0 and elapsed < 5.0:
                    rank_title += " [闪电侠]"

            self.lbl_stats.configure(
                text=f"[累计: {self.current_run_count} 次]  核算: {riders} 人  |  单量: {orders} 单  |  索赔: {penalty} 单  |  问题: {problem} 单  |  耗时: {elapsed} 秒  |  👑 评级: {rank_title}")
            self.run_btn.configure(state="normal", text=self.theme["btn_success"], fg_color=SUCCESS,
                                   text_color="#FFFFFF")
            self.update_progress(1.0, "顺利完成")
            self.write_log(random.choice(self.theme["msg_final"]).format(result_msg=result_msg), "SYSTEM")
            self.progress_bar.configure(progress_color=SUCCESS)
            self.lbl_timer.configure(text_color=SUCCESS)
        else:
            self.run_btn.configure(state="normal", text=self.theme["btn_error"], fg_color=LOG_ERR, text_color="#FFFFFF")
            self.update_progress(0, "进程意外终止")
            self.progress_bar.configure(progress_color=LOG_ERR)
            self.lbl_timer.configure(text_color=LOG_ERR)

    def switch_right_tab(self, tab_name):
        if tab_name == self.theme["tab_task"]:
            self.current_tab_index = 0
            self.btn_add_root.grid(row=0, column=1, padx=(5, 0))
        else:
            self.current_tab_index = 1
            self.btn_add_root.grid_forget()
        self.refresh_right_panel()

    def add_task_root(self):
        title_text = self.theme.get("btn_add_root", "选择包含多个城市的总目录").split(" (")[0]
        folder = filedialog.askdirectory(title=title_text)
        if folder and folder not in self.task_roots:
            self.task_roots.append(folder)
            self.save_options()
            self.refresh_right_panel()

    def remove_task_root(self, folder):
        if folder in self.task_roots:
            self.task_roots.remove(folder)
            self.save_options()
            self.refresh_right_panel()

    def refresh_right_panel(self, force_out_folder=None):
        if force_out_folder:
            self.current_out_folder = force_out_folder
            self.current_tab_index = 1
            self.tab_seg.set(self.theme["tab_output"])
            self.btn_add_root.grid_forget()

        for widget in self.files_list_frame.winfo_children(): widget.destroy()

        if self.current_tab_index == 0:
            if not self.task_roots:
                lbl = ctk.CTkLabel(self.files_list_frame, text="当前没有划定任务领地哦~\n赶快点击右上角 ➕ 认领吧", text_color=TEXT_DIM)
                lbl.pack(pady=30)
                return

            for root in self.task_roots:
                root_frame = ctk.CTkFrame(self.files_list_frame, fg_color=BG_PANEL, corner_radius=6)
                root_frame.pack(fill="x", pady=(5, 5), padx=2)
                header = ctk.CTkFrame(root_frame, fg_color="transparent")
                header.pack(fill="x", padx=5, pady=5)
                lbl_root = ctk.CTkLabel(header, text=f"📍 {os.path.basename(root)}",
                                        font=ctk.CTkFont(family="微软雅黑", size=13, weight="bold"), text_color=ACCENT)
                lbl_root.pack(side="left")
                btn_del = ctk.CTkButton(header, text="✖", width=24, height=24, fg_color="transparent",
                                        hover_color=ERROR_BG, text_color=LOG_ERR,
                                        command=lambda r=root: self.remove_task_root(r))
                btn_del.pack(side="right")

                if not os.path.exists(root):
                    lbl_err = ctk.CTkLabel(root_frame, text="  (该目录找不到了...)", text_color=LOG_ERR,
                                           font=ctk.CTkFont(size=12))
                    lbl_err.pack(anchor="w", padx=10, pady=(0, 5))
                    continue

                try:
                    items = os.listdir(root)
                except:
                    items = []

                folders = []
                for item in items:
                    full_path = os.path.join(root, item)
                    if os.path.isdir(full_path):
                        if not item.startswith('.') and item not in ["09.template",
                                                                     "__pycache__"] and "兼职核算" not in item:
                            folders.append(full_path)

                folders.sort()
                if not folders:
                    lbl_empty = ctk.CTkLabel(root_frame, text="  (空空如也)", text_color=TEXT_DIM,
                                             font=ctk.CTkFont(size=12))
                    lbl_empty.pack(anchor="w", padx=10, pady=(0, 5))

                for d in folders:
                    dname = os.path.basename(d)
                    file_btn = ctk.CTkButton(root_frame, text=f"  📁 {dname}", anchor="w", fg_color="transparent",
                                             hover_color=BG_INPUT, text_color=WARNING,
                                             font=ctk.CTkFont(family="微软雅黑", size=13),
                                             command=lambda path=d, name=dname: self.set_source_path(path, name))
                    file_btn.pack(fill="x", pady=(0, 2), padx=5)
        else:
            out_dir = self.current_out_folder
            if not out_dir or not os.path.exists(out_dir):
                lbl = ctk.CTkLabel(self.files_list_frame, text="暂无产出文件...\n算完薪资后这里会结出果实", text_color=TEXT_DIM)
                lbl.pack(pady=40)
                return

            try:
                items = os.listdir(out_dir)
            except:
                items = []

            files = [os.path.join(out_dir, item) for item in items if
                     item.endswith('.xlsx') and not item.startswith('~')]
            files.sort(key=os.path.getmtime, reverse=True)

            if not files:
                lbl = ctk.CTkLabel(self.files_list_frame, text="夹子里空空如也...", text_color=TEXT_DIM)
                lbl.pack(pady=40)
                return

            for f in files:
                fname = os.path.basename(f)
                color = LOG_ERR if "(重复)" in fname else SUCCESS
                file_btn = ctk.CTkButton(self.files_list_frame, text=f"📄 {fname}", anchor="w", fg_color=BG_PANEL,
                                         hover_color=BG_INPUT, text_color=color,
                                         font=ctk.CTkFont(family="微软雅黑", size=13),
                                         command=lambda path=f: self.open_file(path))
                file_btn.pack(fill="x", pady=2, padx=5)

    def set_source_path(self, path, folder_name):
        self.entry_source.delete(0, "end")
        self.entry_source.insert(0, path)
        self.write_log(f">>> 🎯 锁定猎物！已将待核算料场锁定为: {folder_name}", "INFO")

        for city in self.custom_cities:
            if city in folder_name:
                self.city_combo.set(city)
                self.write_log(f">>> 🧠 智能识别：已自动将跑马场区切换为 [{city}]", "SYSTEM")
                break

    def open_current_explorer(self):
        if self.current_tab_index == 0:
            target = self.entry_source.get()
            if not target or not os.path.exists(target): target = self.task_roots[0] if self.task_roots else ""
        else:
            target = self.current_out_folder

        if target and os.path.exists(target):
            try:
                os.startfile(target)
            except:
                pass
        else:
            self.write_log(">>> 哎呀，你还没选中有效的目录或文件还没生成哦~", "WARN")

    def open_file(self, path):
        try:
            if os.path.exists(path): os.startfile(path)
        except Exception as e:
            self.write_log(f">>> 打开文件失败: {e}", "ERROR")

    # ==========================================
    # 后处理操作按钮绑定的方法
    # ==========================================
    def action_remove_problem_orders(self):
        if self.is_running: return
        self.write_log(">>> 🗑️ 正在启动【问题单剔除】面板...", "SYSTEM")

        win = ctk.CTkToplevel(self)
        win.title("🗑️ 问题单精准剔除工具")
        win.geometry("550x350")
        win.minsize(550, 350)
        win.configure(fg_color=BG_MAIN)
        win.transient(self)
        win.grab_set()

        lbl1 = ctk.CTkLabel(win, text="1. 请选择已生成的【工资表工作薄】:", font=ctk.CTkFont(family="微软雅黑", size=14),
                            text_color=TEXT_MAIN)
        lbl1.pack(pady=(20, 5), padx=20, anchor="w")

        frame1 = ctk.CTkFrame(win, fg_color="transparent")
        frame1.pack(fill="x", padx=20)
        entry_salary = ctk.CTkEntry(frame1, fg_color=BG_INPUT, border_color=BG_INPUT, text_color=TEXT_MAIN)
        entry_salary.pack(side="left", fill="x", expand=True, padx=(0, 10))

        def sel_salary():
            f = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx")])
            if f:
                entry_salary.delete(0, "end")
                entry_salary.insert(0, f)

        btn_sel_salary = ctk.CTkButton(frame1, text="浏览", width=60, command=sel_salary)
        btn_sel_salary.pack(side="right")

        lbl2 = ctk.CTkLabel(win, text="2. 请选择需要核对的【问题单剔除工作薄】:", font=ctk.CTkFont(family="微软雅黑", size=14),
                            text_color=TEXT_MAIN)
        lbl2.pack(pady=(20, 5), padx=20, anchor="w")

        frame2 = ctk.CTkFrame(win, fg_color="transparent")
        frame2.pack(fill="x", padx=20)
        entry_problem = ctk.CTkEntry(frame2, fg_color=BG_INPUT, border_color=BG_INPUT, text_color=TEXT_MAIN)
        entry_problem.pack(side="left", fill="x", expand=True, padx=(0, 10))

        def sel_problem():
            f = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx;*.xls")])
            if f:
                entry_problem.delete(0, "end")
                entry_problem.insert(0, f)

        btn_sel_problem = ctk.CTkButton(frame2, text="浏览", width=60, command=sel_problem)
        btn_sel_problem.pack(side="right")

        def start_remove():
            salary_file = entry_salary.get()
            problem_file = entry_problem.get()
            if not os.path.exists(salary_file) or not os.path.exists(problem_file):
                self.write_log(">>> [错误] 请确保两个文件的路径都正确！", "ERROR")
                return
            win.destroy()
            self.write_log(">>> 🚀 正在执行问题单精准剔除逻辑...", "SYSTEM")
            threading.Thread(target=run_remove_problem_orders, args=(salary_file, problem_file, self.write_log),
                             daemon=True).start()

        btn_run = ctk.CTkButton(win, text="🗑️ 开始剔除", width=200, height=45, corner_radius=8, fg_color=LOG_ERR,
                                hover_color="#CC0030", font=ctk.CTkFont(family="微软雅黑", size=16, weight="bold"),
                                command=start_remove)
        btn_run.pack(pady=40)


    def action_raise_price(self):
        if self.is_running: return
        self.write_log(">>> 💰 正在启动【蓝橙价格提审】面板...", "SYSTEM")

        win = ctk.CTkToplevel(self)
        win.title("💰 蓝橙单价重刷工具")
        win.geometry("550x350")
        win.minsize(550, 350)
        win.configure(fg_color=BG_MAIN)
        win.transient(self)
        win.grab_set()

        lbl1 = ctk.CTkLabel(win, text="1. 请选择已生成的【工资表工作薄】:", font=ctk.CTkFont(family="微软雅黑", size=14),
                            text_color=TEXT_MAIN)
        lbl1.pack(pady=(20, 5), padx=20, anchor="w")

        frame1 = ctk.CTkFrame(win, fg_color="transparent")
        frame1.pack(fill="x", padx=20)
        entry_salary = ctk.CTkEntry(frame1, fg_color=BG_INPUT, border_color=BG_INPUT, text_color=TEXT_MAIN)
        entry_salary.pack(side="left", fill="x", expand=True, padx=(0, 10))

        def sel_salary():
            f = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx")])
            if f:
                entry_salary.delete(0, "end")
                entry_salary.insert(0, f)

        btn_sel_salary = ctk.CTkButton(frame1, text="浏览", width=60, command=sel_salary)
        btn_sel_salary.pack(side="right")

        lbl2 = ctk.CTkLabel(win, text="2. 请选择最新的【蓝橙价格提审工作薄】:", font=ctk.CTkFont(family="微软雅黑", size=14),
                            text_color=TEXT_MAIN)
        lbl2.pack(pady=(20, 5), padx=20, anchor="w")

        frame2 = ctk.CTkFrame(win, fg_color="transparent")
        frame2.pack(fill="x", padx=20)
        entry_price = ctk.CTkEntry(frame2, fg_color=BG_INPUT, border_color=BG_INPUT, text_color=TEXT_MAIN)
        entry_price.pack(side="left", fill="x", expand=True, padx=(0, 10))

        def sel_price():
            f = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx;*.csv")])
            if f:
                entry_price.delete(0, "end")
                entry_price.insert(0, f)

        btn_sel_price = ctk.CTkButton(frame2, text="浏览", width=60, command=sel_price)
        btn_sel_price.pack(side="right")

        def start_refresh():
            salary_file = entry_salary.get()
            price_file = entry_price.get()
            if not os.path.exists(salary_file) or not os.path.exists(price_file):
                self.write_log(">>> [错误] 请确保两个文件路径都正确！", "ERROR")
                return
            win.destroy()
            self.write_log(">>> 🚀 正在执行蓝橙单价重刷逻辑...", "SYSTEM")
            threading.Thread(target=run_raise_price, args=(salary_file, price_file, self.write_log), daemon=True).start()

        btn_run = ctk.CTkButton(win, text="♻️ 蓝橙单价重刷", width=200, height=45, corner_radius=8, fg_color=ACCENT,
                                hover_color=ACCENT_HOVER, font=ctk.CTkFont(family="微软雅黑", size=16, weight="bold"),
                                command=start_refresh)
        btn_run.pack(pady=40)

    def action_overdue_review(self):
        if self.is_running: return
        self.write_log(">>> ⏰ 正在接管【蓝橙超期提审】通道... (核心逻辑待开发)", "SYSTEM")

    def action_summary_parttime(self):
        if self.is_running: return
        folder = filedialog.askdirectory(title="选择要合并已发的兼职文件夹目录")
        if not folder: return
        city = self.city_combo.get()
        self.write_log(f">>> 📊 正在拼装【{city}兼职已发汇总】卷轴...", "SYSTEM")
        threading.Thread(target=run_summary_parttime, args=(folder, city, self.write_log, self.open_file), daemon=True).start()
