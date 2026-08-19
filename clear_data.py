# -*- coding: utf-8 -*-
"""
clear_data.py - Xóa toàn bộ dữ liệu test trong cơ sở dữ liệu SQL Server [DB_Giaoban]
"""
import db_service

def clear_all_test_data():
    conn = db_service.get_db_connection()
    cur = conn.cursor()
    
    print("[INFO] Dang xoa du lieu test trong DB_Giaoban...")
    cur.execute("DELETE FROM MeetingReports")
    cur.execute("DELETE FROM Directives")
    cur.execute("DELETE FROM Meetings")
    cur.execute("DELETE FROM Events")
    cur.execute("DELETE FROM PropagandaPlans")
    
    # Reset Identity
    for table in ['Meetings', 'MeetingReports', 'Directives', 'Events', 'PropagandaPlans']:
        try:
            cur.execute(f"DBCC CHECKIDENT ('{table}', RESEED, 0)")
        except Exception:
            pass
            
    # Reset admin
    cur.execute("UPDATE Users SET Role = 'Admin', Department = N'Văn phòng Đài', IsNew = 0 WHERE LOWER(Username) = 'admin'")
    conn.commit()
    conn.close()
    print("[SUCCESS] Da xoa sach du lieu test trong DB_Giaoban va reset STT ve 0 thanh cong!")

if __name__ == "__main__":
    clear_all_test_data()
