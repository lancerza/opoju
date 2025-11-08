# convert_xlsx_to_csv.py
# แปลง Excel (.xlsx/.xlsm) ในโฟลเดอร์ data/ → รวมเป็น data/data.csv
# เลือกเฉพาะชีตชื่อ "Data" หากมี มิฉะนั้นใช้ชีตแรก
# ต้องการคอลัมน์: วันที่, รายการ, สาย, ยอดแทง

import os, sys
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
OUT_CSV  = os.path.join(DATA_DIR, 'data.csv')

def find_excel_files():
    files = []
    for n in os.listdir(DATA_DIR):
        if n.lower().endswith(('.xlsx','.xlsm')):
            files.append(os.path.join(DATA_DIR, n))
    return files

def read_one(path):
    try:
        xls = pd.ExcelFile(path, engine='openpyxl')
    except Exception as e:
        print(f"[WARN] เปิดไฟล์ {path} ไม่ได้: {e}")
        return None
    sheet_name = 'Data' if 'Data' in xls.sheet_names else xls.sheet_names[0]
    df = pd.read_excel(path, sheet_name=sheet_name, engine='openpyxl')
    # Normalize headers
    df.columns = [str(c).strip() for c in df.columns]
    needed = ['วันที่','รายการ','สาย','ยอดแทง']
    # Try to map similar names
    map_candidates = {
        'วันที่':['วันที่','date','วันที่/เวลา','เวลา'],
        'รายการ':['รายการ','ชื่อรายการ','desc','รายละเอียด'],
        'สาย':['สาย','line','group','category'],
        'ยอดแทง':['ยอดแทง','amount','ยอด','มูลค่า']
    }
    colmap = {}
    for need in needed:
        for c in df.columns:
            if c == need or c.lower() in map(str.lower, map_candidates.get(need, [])):
                colmap[need] = c
                break
    missing = [k for k in needed if k not in colmap]
    if missing:
        print(f"[WARN] ข้ามไฟล์ {path}: หัวคอลัมน์ไม่ครบ {missing}")
        return None
    out = df[[colmap['วันที่'], colmap['รายการ'], colmap['สาย'], colmap['ยอดแทง']]].copy()
    out.columns = needed
    return out

def main():
    files = find_excel_files()
    if not files:
        print("[INFO] ไม่พบไฟล์ Excel ใน data/ (จะคง data.csv เดิม)")
        return
    frames = []
    for f in files:
        df = read_one(f)
        if df is not None:
            frames.append(df)
    if not frames:
        print("[INFO] ไม่มีตารางที่อ่านได้")
        return
    all_df = pd.concat(frames, ignore_index=True)
    # Ensure types
    all_df['ยอดแทง'] = pd.to_numeric(all_df['ยอดแทง'], errors='coerce').fillna(0)
    # Save
    all_df.to_csv(OUT_CSV, index=False, encoding='utf-8-sig')
    print(f"[OK] wrote {OUT_CSV} rows={len(all_df)}")

if __name__ == "__main__":
    main()
