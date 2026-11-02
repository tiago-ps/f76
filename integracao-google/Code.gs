/**
 * Integração Fallout 76 — Google Sheets
 *
 * Fonte: aba completa DumpPTBR3 (exportação PT-BR do Invent-O-Matic).
 * A classificação de armas usa filterFlag, pois a aba completa não possui
 * a coluna itemType. Os valores 4, 5 e 6 foram conferidos contra os registros
 * classificados como WEAPON na aba simplificada da planilha.
 *
 * A API expõe somente campos selecionados de armas.
 * Não retorna char, account, serverHandleID nem dados das demais abas.
 */

const F76_CONFIG = {
  spreadsheetId: '1fpkiCy_tdEuGvgFnD9V5zuNxBOMBedLDwrFTwfS4Yp4',
  initialSheetName: 'DumpPTBR3',
  headerRow: 2,
  sourceRole: 'inventory_ptbr',
  metadataKey: 'F76_SOURCE_ROLE',
  cacheSeconds: 0
};

// filterFlag observado na fonte completa e cruzado com itemType=WEAPON.
const F76_WEAPON_FILTER_FLAGS = [4, 5, 6];

/**
 * Executar uma única vez no editor do Apps Script.
 * Marca a aba escolhida com metadados persistentes.
 */
function setupF76() {
  const ss = SpreadsheetApp.openById(F76_CONFIG.spreadsheetId);
  const sheet = ss.getSheetByName(F76_CONFIG.initialSheetName);
  if (!sheet) {
    throw new Error('Não encontrei a aba inicial: ' + F76_CONFIG.initialSheetName);
  }

  // Remove a marcação antiga da fonte anterior, se houver, para manter
  // exatamente uma aba como inventário sem apagar ou alterar células.
  ss.getSheets().forEach(function (candidate) {
    if (candidate.getSheetId() === sheet.getSheetId()) return;
    candidate.getDeveloperMetadata().forEach(function (m) {
      if (m.getKey() === F76_CONFIG.metadataKey &&
          m.getValue() === F76_CONFIG.sourceRole) {
        m.remove();
      }
    });
  });

  const alreadyMarked = sheet.getDeveloperMetadata().some(function (m) {
    return m.getKey() === F76_CONFIG.metadataKey &&
      m.getValue() === F76_CONFIG.sourceRole;
  });

  if (!alreadyMarked) {
    sheet.addDeveloperMetadata(F76_CONFIG.metadataKey, F76_CONFIG.sourceRole);
  }

  return 'Integração preparada. Fonte: DumpPTBR3 completa; classificação de armas por filterFlag.';
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
    return {
      ok: true, source: F76_CONFIG.sourceRole,
      updatedAt: new Date().toISOString(), count: 0, weapons: []
    };
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

  const required = ['text', 'count', 'filterFlag'];
  const missing = required.filter(function (h) { return index[h] === undefined; });
  if (missing.length) {
    throw new Error('Colunas obrigatórias ausentes em DumpPTBR3: ' + missing.join(', '));
  }

  const weapons = [];
  let ignoredRows = 0;

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const name = String(row[index.text] || '').trim();
    if (!name) continue;

    const filterFlag = numberOrNull_(row[index.filterFlag]);
    if (filterFlag === null || F76_WEAPON_FILTER_FLAGS.indexOf(filterFlag) === -1) {
      ignoredRows++;
      continue;
    }

    const quantity = numberOrZero_(row[index.count]);
    weapons.push({
      name: name,
      catalogKey: normalizeKey_(name),
      quantity: quantity,
      level: valueOrNull_(row, index, 'itemLevel'),
      legendaryStars: valueOrNull_(row, index, 'numLegendaryStars'),
      effects: [],
      tradable: booleanOrNull_(row, index, 'isTradable'),
      weight: valueOrNull_(row, index, 'weight')
    });
  }

  return {
    ok: true,
    source: F76_CONFIG.sourceRole,
    locale: 'pt-BR',
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
        ? 'A aba DumpPTBR3 ainda não foi preparada. Execute setupF76() uma vez.'
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

function numberOrNull_(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function valueOrNull_(row, index, key) {
  return index[key] === undefined || row[index[key]] === '' ? null : row[index[key]];
}

function booleanOrNull_(row, index, key) {
  if (index[key] === undefined || row[index[key]] === '') return null;
  return String(row[index[key]]).toLowerCase() === 'true';
}
