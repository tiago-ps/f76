/**
 * Integração Fallout 76 — Google Sheets
 *
 * Primeira fonte: inventário de armas em português.
 * A API expõe somente campos selecionados de registros WEAPON.
 * Não retorna char, account, serverHandleID ou o conteúdo das outras abas.
 */

const F76_CONFIG = {
  spreadsheetId: '1fpkiCy_tdEuGvgFnD9V5zuNxBOMBedLDwrFTwfS4Yp4',
  initialSheetName: 'Cópia de DumpPTBR3',
  headerRow: 2,
  sourceRole: 'inventory_ptbr',
  metadataKey: 'F76_SOURCE_ROLE',
  cacheSeconds: 0
};

/**
 * Executar uma única vez no editor do Apps Script.
 * Marca a aba escolhida com metadados persistentes. Depois disso,
 * renomear a aba não quebra a integração.
 */
function setupF76() {
  const ss = SpreadsheetApp.openById(F76_CONFIG.spreadsheetId);
  const sheet = ss.getSheetByName(F76_CONFIG.initialSheetName);
  if (!sheet) {
    throw new Error('Não encontrei a aba inicial: ' + F76_CONFIG.initialSheetName);
  }

  const alreadyMarked = sheet.getDeveloperMetadata().some(function (m) {
    return m.getKey() === F76_CONFIG.metadataKey &&
      m.getValue() === F76_CONFIG.sourceRole;
  });

  if (!alreadyMarked) {
    sheet.addDeveloperMetadata(F76_CONFIG.metadataKey, F76_CONFIG.sourceRole);
  }

  return 'Integração preparada. Aba identificada por metadado; renomeá-la não altera a conexão.';
}

/** Endpoint de leitura. Aceita JSONP para funcionar no GitHub Pages sem CORS. */
function doGet(e) {
  try {
    const payload = buildPayload_();
    const callback = e && e.parameter ? String(e.parameter.callback || '') : '';

    if (callback) {
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*(\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(callback)) {
        throw new Error('Callback inválido.');
      }
      return ContentService
        .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const errorPayload = { ok: false, error: String(err && err.message ? err.message : err) };
    return ContentService
      .createTextOutput(JSON.stringify(errorPayload))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buildPayload_() {
  const sheet = findSourceSheet_();
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow <= F76_CONFIG.headerRow) {
    return { ok: true, source: F76_CONFIG.sourceRole, updatedAt: new Date().toISOString(), count: 0, weapons: [] };
  }

  const values = sheet.getRange(
    F76_CONFIG.headerRow,
    1,
    lastRow - F76_CONFIG.headerRow + 1,
    lastColumn
  ).getDisplayValues();

  const headers = values[0].map(function (h) { return String(h || '').trim(); });
  const index = {};
  headers.forEach(function (h, i) { if (h) index[h] = i; });

  const required = ['text', 'count', 'itemType'];
  const missing = required.filter(function (h) { return index[h] === undefined; });
  if (missing.length) {
    throw new Error('Colunas obrigatórias ausentes: ' + missing.join(', '));
  }

  const weapons = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const name = String(row[index.text] || '').trim();
    const type = String(row[index.itemType] || '').trim().toUpperCase();
    if (!name || type !== 'WEAPON') continue;

    const effects = ['legendary_1', 'legendary_2', 'legendary_3', 'legendary_4']
      .map(function (key) {
        return index[key] === undefined ? '' : String(row[index[key]] || '').trim();
      })
      .filter(Boolean);

    const quantity = numberOrZero_(row[index.count]);
    weapons.push({
      name: name,
      catalogKey: normalizeKey_(name),
      quantity: quantity,
      level: valueOrNull_(row, index, 'itemLevel'),
      legendaryStars: valueOrNull_(row, index, 'numLegendaryStars'),
      effects: effects,
      tradable: booleanOrNull_(row, index, 'isTradable')
    });
  }

  return {
    ok: true,
    source: F76_CONFIG.sourceRole,
    updatedAt: new Date().toISOString(),
    count: weapons.length,
    weapons: weapons
  };
}

function findSourceSheet_() {
  const ss = SpreadsheetApp.openById(F76_CONFIG.spreadsheetId);
  const matches = ss.getSheets().filter(function (sheet) {
    return sheet.getDeveloperMetadata().some(function (m) {
      return m.getKey() === F76_CONFIG.metadataKey &&
        m.getValue() === F76_CONFIG.sourceRole;
    });
  });

  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? 'A aba de inventário ainda não foi preparada. Execute setupF76() uma vez.'
        : 'Mais de uma aba está marcada como fonte do inventário. Revise os metadados.'
    );
  }
  return matches[0];
}

function normalizeKey_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function numberOrZero_(value) {
  const n = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function valueOrNull_(row, index, key) {
  return index[key] === undefined || row[index[key]] === '' ? null : row[index[key]];
}

function booleanOrNull_(row, index, key) {
  if (index[key] === undefined || row[index[key]] === '') return null;
  return String(row[index[key]]).toLowerCase() === 'true';
}
