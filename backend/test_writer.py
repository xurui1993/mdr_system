import pandas as pd

df = pd.DataFrame({'A': [1, 2], 'B': [3, 4]})
with pd.ExcelWriter('test.xlsx', engine='xlsxwriter', engine_kwargs={'options': {'constant_memory': True}}) as writer:
    workbook = writer.book
    ws = workbook.add_worksheet('Sheet1')
    writer.sheets['Sheet1'] = ws
    ws.write_row(0, 0, df.columns.values)
    df.to_excel(writer, sheet_name='Sheet1', index=False, header=False, startrow=1)
