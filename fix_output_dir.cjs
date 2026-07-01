const fs = require('fs');
let code = fs.readFileSync('backend/salary_bind_processor.py', 'utf8');

code = code.replace(
  '        extracted_month = "默认暂定"\n        folder_month = "默认月"',
  '        extracted_month = "默认暂定"\n        folder_month = "默认月"\n        folder_year = str(datetime.now().year) + "年"'
);

code = code.replace(
  '                extracted_month = dt.strftime("%Y年%m月")\n                folder_month = f"{dt.month}月"',
  '                extracted_month = dt.strftime("%Y年%m月")\n                folder_month = f"{dt.month}月"\n                folder_year = f"{dt.year}年"'
);

code = code.replace(
  '                    extracted_month = f"{y}年{int(m):02d}月"\n                    folder_month = f"{int(m)}月"',
  '                    extracted_month = f"{y}年{int(m):02d}月"\n                    folder_month = f"{int(m)}月"\n                    folder_year = f"{y}年"'
);

code = code.replace(
  '                    if len(a2_val) >= 7:\n                        extracted_month = a2_val[:7].replace("/", "年").replace("-", "年") + "月"\n                        try:\n                            folder_month = str(int(extracted_month.split(\'年\')[1].replace(\'月\', \'\'))) + "月"\n                        except:\n                            folder_month = "默认月"',
  '                    if len(a2_val) >= 7:\n                        extracted_month = a2_val[:7].replace("/", "年").replace("-", "年") + "月"\n                        try:\n                            folder_month = str(int(extracted_month.split(\'年\')[1].replace(\'月\', \'\'))) + "月"\n                            folder_year = extracted_month.split(\'年\')[0] + "年"\n                        except:\n                            folder_month = "默认月"\n                            folder_year = str(datetime.now().year) + "年"'
);

code = code.replace(
  '        if extracted_month == "默认暂定":\n            extracted_month = datetime.now().strftime("%Y年%m月")\n            folder_month = str(datetime.now().month) + "月"\n            yield create_log_event(f"未匹配到A2日期列，默认提取月份使用: {extracted_month}", "WARN")',
  '        if extracted_month == "默认暂定":\n            extracted_month = datetime.now().strftime("%Y年%m月")\n            folder_month = str(datetime.now().month) + "月"\n            folder_year = str(datetime.now().year) + "年"\n            yield create_log_event(f"未匹配到A2日期列，默认提取月份使用: {extracted_month}", "WARN")'
);

code = code.replace(
  '        output_dir = os.path.abspath(os.path.join(project_root, "outputs", "骑手支付绑定", folder_month))',
  '        output_dir = os.path.abspath(os.path.join(project_root, "outputs", "骑手支付绑定", folder_year, folder_month))'
);

fs.writeFileSync('backend/salary_bind_processor.py', code);
