#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exporta a aba completa DumpPTBR3 de um XLSX para inventario.js.
Uso:
  python exportar_inventario.py F76.xlsx
  python exportar_inventario.py F76.xlsx --output inventario.js
Requer: pip install openpyxl
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

WEAPON_FILTER_FLAGS = {4, 5, 6}
SHEET_NAME = "DumpPTBR3"
HEADER_ROW = 2


def normalize_key(value: str) -> str:
    value = unicodedata.normalize("NFD", str(value or ""))
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return value.strip()


def number(value, default=None):
    if value is None or str(value).strip() == "":
        return default
    if isinstance(value, (int, float)):
        return value
    raw = str(value).strip().replace(",", ".")
    try:
        n = float(raw)
        return int(n) if n.is_integer() else n
    except ValueError:
        return default


def boolean(value):
    if value is None or str(value).strip() == "":
        return None
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"true", "verdadeiro", "1", "sim", "yes"}


def main():
    parser = argparse.ArgumentParser(description="Gera inventario.js a partir de DumpPTBR3.")
    parser.add_argument("xlsx", type=Path, help="Arquivo XLSX exportado do Google Sheets")
    parser.add_argument("--output", type=Path, default=Path("inventario.js"))
    args = parser.parse_args()

    try:
        from openpyxl import load_workbook
    except ImportError as exc:
        raise SystemExit("Instale a dependência com: python -m pip install openpyxl") from exc

    if not args.xlsx.is_file():
        raise SystemExit(f"Arquivo não encontrado: {args.xlsx}")

    wb = load_workbook(args.xlsx, read_only=True, data_only=True)
    if SHEET_NAME not in wb.sheetnames:
        raise SystemExit(f"A aba obrigatória '{SHEET_NAME}' não existe no arquivo.")

    ws = wb[SHEET_NAME]
    headers = [str(c.value or "").strip() for c in ws[HEADER_ROW]]
    index = {name: i for i, name in enumerate(headers) if name}
    required = {"text", "count", "filterFlag"}
    missing = sorted(required - set(index))
    if missing:
        raise SystemExit("Colunas obrigatórias ausentes: " + ", ".join(missing))

    weapons = []
    for row in ws.iter_rows(min_row=HEADER_ROW + 1, values_only=True):
        name = str(row[index["text"]] or "").strip()
        if not name:
            continue
        flag = number(row[index["filterFlag"]])
        if flag not in WEAPON_FILTER_FLAGS:
            continue

        level = number(get("itemLevel"))
        stars = number(get("numLegendaryStars"))
        weight = number(get("weight"))
        weapons.append({
            "name": name,
            "catalogKey": normalize_key(name),
            "quantity": number(get("count"), 0),
            "level": level,
            "legendaryStars": stars,
            "effects": [],
            "tradable": boolean(get("isTradable")),
            "weight": weight,
        })

    payload = {
        "schemaVersion": 1,
        "locale": "pt-BR",
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "DumpPTBR3",
        "count": len(weapons),
        "weapons": weapons,
    }

    output = "/* Gerado automaticamente. Não edite manualmente. */\n"
    output += "window.F76_INVENTARIO = "
    output += json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    output += ";\n"

    args.output.write_text(output, encoding="utf-8")
    print(f"Arquivo criado: {args.output.resolve()}")
    print(f"Armas exportadas: {len(weapons)}")
    print("Filtro provisório: filterFlag 4, 5 e 6.")
    print("Efeitos lendários não são exportados porque não estão disponíveis na aba completa.")


if __name__ == "__main__":
    main()
