# /python_app/weather.py
import requests
import urllib3
from urllib.parse import quote

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_weather_info(city_cn, theme_name):
    """Fetches weather data for a specified city and formats it based on the theme."""
    clean_city = city_cn.replace("市", "").replace("省", "").replace("特别行政区", "").strip()

    err_msgs = {
        "马年宝马": f"🐴 [{clean_city}] 草料场大雾，看不清天", 
        "星际舰队": f"🛸 [{clean_city}] 星区大气强干扰，失联",
        "赛博黑客": f"👾 [{clean_city}] 气象卫星防火墙太厚", 
        "米其林后厨": f"👨‍🍳 [{clean_city}] 烟雾报警器响了",
        "猫咪主子": f"🐱 [{clean_city}] 外面太可怕，本喵不看了"
    }
    err_msg = err_msgs.get(theme_name, f"[{clean_city}] 天气信号迷路啦")
    
    success_suffix = {"马年宝马": "宜策马", "星际舰队": "宜跃迁", "赛博黑客": "宜潜入", "米其林后厨": "宜颠勺", "猫咪主子": "宜跑酷"}
    suffix = success_suffix.get(theme_name, "宜搞钱")

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    weather_text = None

    if not weather_text:
        try:
            res1 = requests.get("https://api.vvhan.com/api/weather", params={"city": clean_city}, headers=headers, timeout=6, verify=False)
            if res1.status_code == 200:
                data1 = res1.json()
                if data1.get("success"):
                    info = data1.get("info", {})
                    w_type = info.get("type", "未知")
                    high = info.get("high", "").replace("℃", "°C")
                    low = info.get("low", "").replace("℃", "°C")
                    if w_type != "未知": 
                        weather_text = f"[{city_cn}] {w_type} {low}~{high} | {suffix}"
        except Exception:
            pass

    if not weather_text:
        try:
            res2 = requests.get("http://wthrcdn.etouch.cn/weather_mini", params={"city": clean_city}, headers=headers, timeout=6, verify=False)
            if res2.status_code == 200:
                data2 = res2.json()
                if data2.get("status") == 1000:
                    forecast = data2.get("data", {}).get("forecast", [])
                    if forecast:
                        today = forecast[0]
                        w_type = today.get("type", "未知")
                        high = today.get("high", "").replace("高温 ", "")
                        low = today.get("low", "").replace("低温 ", "")
                        weather_text = f"[{city_cn}] {w_type} {low}~{high} | {suffix}"
        except Exception:
            pass

    if not weather_text:
        try:
            safe_city = quote(clean_city)
            url3 = f"https://wttr.in/{safe_city}?format=j1"
            res3 = requests.get(url3, headers=headers, timeout=8, verify=False)
            if res3.status_code == 200:
                data3 = res3.json()
                current = data3.get("current_condition", [{}])[0]
                w_type = current.get("lang_zh", [{"value": "未知"}])[0]["value"]
                temp = current.get("temp_C", "?") + "°C"
                weather_text = f"[{city_cn}] {w_type} 当前 {temp} | {suffix}"
        except Exception:
            pass

    return weather_text, err_msg
