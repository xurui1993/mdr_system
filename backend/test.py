import pandas as pd
try:
    df = pd.DataFrame({'a':[1]})
    with pd.ExcelWriter('test.xlsx', engine='xlsxwriter') as writer:
        writer.book.add_worksheet('Sheet1')
        df.to_excel(writer, sheet_name='Sheet1')
    print("Success")
except Exception as e:
    print(f"Error: {e}")
