#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exporta a aba completa DumpPTBR3 de um XLSX para inventario.js.
Uso:
  python exportar_inventario.py F76.xlsx
  python exportar_inventario.py F76.xlsx --output inventario.js
Requer: python -m pip install openpyxl
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
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def number(value, default=None):
    if value is None or str(value).strip() == "":
        return default
    if isinstance(value, (int, float)):
        return value
    try:
        result = float(str(value).strip().replace(",", "."))
        return int(result) if result.is_integer() else result
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

    workbook = load_workbook(args.xlsx, read_only=True, data_only=True)
    if SHEET_NAME not in workbook.sheetnames:
        raise SystemExit(f"A aba obrigatória '{SHEET_NAME}' não existe no arquivo.")

    sheet = workbook[SHEET_NAME]
    headers = [str(cell.value or "").strip() for cell in sheet[HEADER_ROW]]
    index = {name: position for position, name in enumerate(headers) if name}
    required = {"text", "count", "filterFlag"}
    missing = sorted(required - set(index))
    if missing:
        raise SystemExit("Colunas obrigatórias ausentes: " + ", ".join(missing))

    weapons = []
    for row in sheet.iter_rows(min_row=HEADER_ROW + 1, values_only=True):
        # Linhas esparsas do XLSX podem terminar antes das últimas colunas.
        def get(field):
            position = index.get(field)
            return row[position] if position is not None and position < len(row) else None

        name = str(get("text") or "").strip()
        catalog_key = normalize_key(name)
        if not name or not catalog_key:
            continue
        if number(get("filterFlag")) not in WEAPON_FILTER_FLAGS:
            continue

        weapons.append({
            "name": name,
            "catalogKey": catalog_key,
            "quantity": number(get("count"), 0),
            "level": number(get("itemLevel")),
            "legendaryStars": number(get("numLegendaryStars")),
            "effects": [],
            "tradable": boolean(get("isTradable")),
            "weight": number(get("weight")),
        })

    payload = {
        "schemaVersion": 1,
        "locale": "pt-BR",
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": SHEET_NAME,
        "count": len(weapons),
        "weapons": weapons,
    }

    output = "/* Gerado automaticamente. Não edite manualmente. */\\n"
    output += "window.F76_INVENTARIO = "
    output += json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    output += ";\\n"
    args.output.write_text(output, encoding="utf-8")

    print(f"Arquivo criado: {args.output.resolve()}")
    print(f"Armas exportadas: {len(weapons)}")
    print("Filtro provisório: filterFlag 4, 5 e 6.")
    print("Efeitos lendários permanecem vazios porque não estão disponíveis na aba completa.")


if __name__ == "__main__":
    main()
