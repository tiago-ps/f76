#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera inventario.js diretamente do itemsmod.ini do Invent-O-Matic-Extractor.

Uso:
  python exportar_inventario.py itemsmod.ini
  python exportar_inventario.py itemsmod.ini --output inventario.js

Não exporta nomes de conta/personagem, serverHandleID ou containerID.
Requer apenas Python 3 (biblioteca padrão).
"""
from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 2
WEAPON_FILTER_FLAGS = {4, 5, 6}


def normalize_key(value: str) -> str:
    value = unicodedata.normalize("NFD", str(value or ""))
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    normalized = re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
    # Alguns registros válidos do mod têm nomes formados apenas por símbolos.
    # Preserve o texto original normalizado em vez de descartar esses itens.
    return normalized or re.sub(r"\\s+", " ", str(value or "").strip().lower())


def number(value: Any, default=None):
    if value is None or str(value).strip() == "":
        return default
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return value
    try:
        result = float(str(value).strip().replace(",", "."))
        return int(result) if result.is_integer() else result
    except (TypeError, ValueError):
        return default


def card_value(item: dict, key: str):
    for entry in item.get("ItemCardEntries") or []:
        if isinstance(entry, dict) and entry.get("text") == key:
            return entry.get("value")
    return None


def description_lines(item: dict) -> list[str]:
    raw = card_value(item, "DESC")
    if not raw:
        return []
    result = []
    for line in str(raw).replace("\r", "").split("\n"):
        # ¬ e § são marcadores visuais presentes no texto do mod.
        cleaned = line.replace("¬", "").replace("§", "").strip()
        if cleaned:
            result.append(cleaned)
    return result


def effects_from_description(item: dict) -> list[str]:
    stars = int(number(item.get("numLegendaryStars"), 0) or 0)
    if stars <= 0:
        return []
    # O mod apresenta primeiro as linhas dos efeitos lendários. Linhas
    # posteriores podem ser características inerentes/descrições adicionais.
    return description_lines(item)[:stars]


def choose_character(root: dict, requested: str | None):
    characters = root.get("characterInventories")
    if not isinstance(characters, dict) or not characters:
        raise SystemExit("O arquivo não contém characterInventories válido.")
    if requested is not None:
        if requested not in characters:
            available = ", ".join(characters.keys())
            raise SystemExit(f"Personagem '{requested}' não encontrado. Disponíveis: {available}")
        return characters[requested]
    if len(characters) != 1:
        raise SystemExit(
            "O arquivo contém mais de um personagem. Informe qual usar com --character."
        )
    return next(iter(characters.values()))


def export_item(item: dict, location: str) -> dict | None:
    name = str(item.get("text") or "").strip()
    key = normalize_key(name)
    if not name or not key:
        return None

    stars = number(item.get("numLegendaryStars"), 0) or 0
    return {
        "name": name,
        "catalogKey": key,
        "location": location,
        "quantity": number(item.get("count"), 1),
        "level": number(item.get("itemLevel")),
        "legendaryStars": stars,
        "legendaryModCount": number(card_value(item, "legendaryMods")),
        "effects": effects_from_description(item),
        "description": "\n".join(description_lines(item)),
        "tradable": item.get("isTradable"),
        "weight": number(item.get("weight")),
        "damage": number(item.get("damage")),
        "accuracy": number(item.get("weaponDisplayAccuracy")),
        "range": number(item.get("weaponDisplayRange")),
        "rateOfFire": number(item.get("weaponDisplayRateOfFire")),
        "filterFlag": number(item.get("filterFlag")),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Gera inventario.js diretamente do itemsmod.ini."
    )
    parser.add_argument("input", type=Path, help="Arquivo itemsmod.ini gerado pelo mod")
    parser.add_argument("--output", type=Path, default=Path("inventario.js"))
    parser.add_argument(
        "--character",
        help="Nome do personagem dentro do arquivo (necessário apenas se houver vários).",
    )
    args = parser.parse_args()

    if not args.input.is_file():
        raise SystemExit(f"Arquivo não encontrado: {args.input}")

    try:
        root = json.loads(args.input.read_text(encoding="utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Não foi possível ler o itemsmod.ini como JSON: {exc}") from exc

    if not isinstance(root, dict):
        raise SystemExit("Formato inesperado: a raiz do arquivo precisa ser um objeto JSON.")

    character = choose_character(root, args.character)
    records = []
    for source_key, location in (
        ("playerInventory", "personagem"),
        ("stashInventory", "bau"),
    ):
        source_items = character.get(source_key) or []
        if not isinstance(source_items, list):
            raise SystemExit(f"O campo {source_key} não contém uma lista válida.")
        for item in source_items:
            if not isinstance(item, dict):
                continue
            if number(item.get("filterFlag")) not in WEAPON_FILTER_FLAGS:
                continue
            # Os registros de armas têm dano numérico positivo. Isso exclui
            # falsos positivos do mesmo grupo (binóculos, fertilizante etc.).
            if (number(item.get("damage"), 0) or 0) <= 0:
                continue
            exported = export_item(item, location)
            if exported:
                records.append(exported)

    player_count = sum(1 for item in records if item["location"] == "personagem")
    stash_count = len(records) - player_count
    with_effects = sum(1 for item in records if item["effects"])
    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "locale": "pt-BR",
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "Invent-O-Matic-Extractor",
        "sourceVersion": root.get("version"),
        "count": len(records),
        "countsByLocation": {"personagem": player_count, "bau": stash_count},
        "records": records,
    }

    output = "/* Gerado automaticamente a partir de itemsmod.ini. Não edite manualmente. */\n"
    output += "window.F76_INVENTARIO = "
    output += json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    output += ";\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")

    print(f"Arquivo criado: {args.output.resolve()}")
    print(f"Registros exportados: {len(records)}")
    print(f"  Personagem: {player_count}")
    print(f"  Baú: {stash_count}")
    print(f"Registros com descrições de efeitos: {with_effects}")
    print("Filtro: filterFlag 4, 5 e 6 + dano maior que zero.")
    print("Privacidade: nomes de conta/personagem e identificadores de instância não são exportados.")
    print("A classificação usa os campos do próprio dump; revise novos tipos se o mod alterar os flags.")


if __name__ == "__main__":
    main()
