/**
 * Calculadora Fitness: puente entre la web y esta hoja de cálculo.
 * Pégalo en Extensiones → Apps Script, guarda y publica como "Aplicación web".
 * Las pestañas (profiles, foods, entries, combos) se crean solas la primera vez.
 */
const TABLES = {
  profiles: ['id','name','emoji','kcal','p','c','f'],
  foods:    ['id','name','cat','basis','kcal','p','c','f','unit_name','unit_g','owner'],
  entries:  ['id','profile','date','food_id','name','qty','basis','kcal','p','c','f','ts'],
  combos:   ['id','profile','name','items']
};
const NUMERIC = ['kcal','p','c','f','unit_g','qty','ts'];

function sheet_(t) {
  if (!TABLES[t]) throw new Error('Tabla desconocida: ' + t);
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(t);
  if (!sh) {
    sh = ss.insertSheet(t);
    const cols = TABLES[t];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
    // Columnas de texto en formato texto, para que Sheets no convierta fechas ni ids
    cols.forEach((c, i) => { if (NUMERIC.indexOf(c) < 0) sh.getRange(1, i + 1, sh.getMaxRows()).setNumberFormat('@'); });
  }
  return sh;
}

function read_(t) {
  const sh = sheet_(t), cols = TABLES[t];
  const last = sh.getLastRow();
  if (last < 2) return [];
  const vals = sh.getRange(2, 1, last - 1, cols.length).getValues();
  return vals.filter(r => r[0] !== '').map(r => {
    const o = {};
    cols.forEach((c, i) => {
      let v = r[i];
      if (v === '') v = null;
      else if (NUMERIC.indexOf(c) >= 0) v = Number(String(v).replace(',', '.'));
      else if (c === 'items') { try { v = JSON.parse(v); } catch (e) { v = []; } }
      else v = String(v);
      o[c] = v;
    });
    return o;
  });
}

function toRow_(t, o) {
  return TABLES[t].map(c => {
    const v = o[c];
    if (v === null || v === undefined) return '';
    if (c === 'items') return JSON.stringify(v);
    return v;
  });
}

function upsert_(t, rows) {
  const sh = sheet_(t), cols = TABLES[t];
  const last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
  const append = [];
  rows.forEach(o => {
    const i = ids.indexOf(String(o.id));
    if (i >= 0) sh.getRange(i + 2, 1, 1, cols.length).setValues([toRow_(t, o)]);
    else { append.push(toRow_(t, o)); ids.push(String(o.id)); }
  });
  if (append.length) sh.getRange(sh.getLastRow() + 1, 1, append.length, cols.length).setValues(append);
}

function remove_(t, ids) {
  const sh = sheet_(t);
  const last = sh.getLastRow();
  if (last < 2) return;
  const col = sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]));
  const want = ids.map(String);
  for (let i = col.length - 1; i >= 0; i--) if (want.indexOf(col[i]) >= 0) sh.deleteRow(i + 2);
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e) {
  try {
    const out = { ok: true };
    Object.keys(TABLES).forEach(t => out[t] = read_(t));
    return json_(out);
  } catch (err) { return json_({ ok: false, error: String(err) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const b = JSON.parse(e.postData.contents);
    if (b.action === 'upsert') upsert_(b.table, b.rows || []);
    else if (b.action === 'remove') remove_(b.table, b.ids || []);
    else throw new Error('Acción desconocida');
    return json_({ ok: true });
  } catch (err) { return json_({ ok: false, error: String(err) }); }
  finally { try { lock.releaseLock(); } catch (e) {} }
}
