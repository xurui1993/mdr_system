# /python_app/main.py
from app import UltimateRiderApp

if __name__ == "__main__":
    try:
        from ctypes import windll
        windll.shcore.SetProcessDpiAwareness(1)
    except:
        pass
    app = UltimateRiderApp()
    app.mainloop()
