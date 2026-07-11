import requests


CITY_QUERY_ALIASES = {
    "广水": "Guangshui,Hubei",
}


def _weather_description(day: dict) -> str:
    hourly = day.get("hourly", [])
    candidates = hourly[4:5] or hourly[0:1]
    if candidates:
        desc = candidates[0].get("weatherDesc", [{}])[0].get("value")
        if desc:
            return desc
    return "天气情况未知"


def get_weather(city: str, days: int = 1) -> str:
    """
    通过 wttr.in API 查询真实天气信息。days=1 查询当前天气，days>1 查询未来多天天气。
    """
    days = max(1, min(int(days), 3))
    query_city = CITY_QUERY_ALIASES.get(city, city)
    url = f"https://wttr.in/{query_city}"
    params = {
        "format": "j1",
        "lang": "zh",
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        if days == 1:
            current_condition = data["current_condition"][0]
            weather_desc = current_condition["weatherDesc"][0]["value"]
            temp_c = current_condition["temp_C"]
            feels_like_c = current_condition.get("FeelsLikeC")
            humidity = current_condition.get("humidity")

            details = f"{city}当前天气:{weather_desc}，气温{temp_c}摄氏度"
            if feels_like_c:
                details += f"，体感温度{feels_like_c}摄氏度"
            if humidity:
                details += f"，湿度{humidity}%"
            return details

        forecasts = []
        for day in data.get("weather", [])[:days]:
            date = day.get("date", "日期未知")
            desc = _weather_description(day)
            min_temp = day.get("mintempC", "?")
            max_temp = day.get("maxtempC", "?")
            avg_temp = day.get("avgtempC", "?")
            forecasts.append(
                f"{date}: {desc}，{min_temp}-{max_temp}摄氏度，平均{avg_temp}摄氏度"
            )

        if not forecasts:
            return f"错误: 未获取到{city}未来{days}天天气。"

        return f"{city}未来{days}天天气:\n" + "\n".join(forecasts)

    except requests.exceptions.RequestException as e:
        return f"错误: 查询天气时遇到网络问题 - {e}"
    except (KeyError, IndexError, ValueError) as e:
        return f"错误: 解析天气数据失败，可能是城市名称无效 - {e}"
