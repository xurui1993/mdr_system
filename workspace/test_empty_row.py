import pandas as pd
import numpy as np
df = pd.DataFrame({"A": ["", "Team1"], "B": ["", "ID1"], "C": ["", "Name1"]})
df.replace(r'^\s*$', np.nan, regex=True, inplace=True)
df.dropna(subset=["B"], inplace=True)
print(df)
