import json
import urllib.request
import os
import html as _html

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config", "telegram.json")

def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)

def escape_html(text):
    """Escape HTML special characters for Telegram HTML parse_mode.

    Escapes &, <, > so that dynamic content (error messages, service names)
    does not break Telegram's HTML parser.  Intentional tags like <b> must
    be added *after* calling this on user/dynamic content.
    """
    return _html.escape(str(text))

def send_telegram(message):
    """Send a message via Telegram.  ``message`` may contain HTML tags."""
    config = load_config()
    url = f"https://api.telegram.org/bot{config['bot_token']}/sendMessage"
    data = json.dumps({"chat_id": config["chat_id"], "text": message, "parse_mode": "HTML"}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"Telegram error: {e}")
        return None
