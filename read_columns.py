import pandas as pd

df = pd.read_excel(r'C:\Users\bb559\OneDrive\デスクトップ\calumn.xlsx', nrows=2, engine='openpyxl')
with open(r'C:\Users\bb559\hayasys\columns.txt', 'w', encoding='utf-8') as f:
    for i, col in enumerate(df.columns):
        f.write(f'{i+1}: {col}\n')
print('done')
