"""Actualiza el CSV público de respuestas antes de desplegar Pages."""
import csv
import io
from pathlib import Path
from urllib.request import Request, urlopen

URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuynNpJ2AdxCKV8Jt-bHB4IGs1S4XvrUCdPe0Uv9k1QF2ySjEKb5clloFWeO48tg1XG1ddej9l6FRd/pub?output=csv"
request = Request(URL, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/csv,*/*;q=0.8"})
with urlopen(request, timeout=30) as response:
    text = response.read().decode("utf-8-sig")

rows = list(csv.reader(io.StringIO(text)))
if not rows or "Marca temporal" not in rows[0] or not any("nombre completo" in cell.lower() for cell in rows[0]):
    raise ValueError("La hoja publicada no devolvió el CSV esperado")

Path("docs/data.csv").write_text(text, encoding="utf-8")
print(f"CSV actualizado: {max(0, len(rows) - 1)} respuestas")
