// GWC Coffee Register — Google Apps Script backend
// Paste this into Extensions → Apps Script in your Google Sheet, then deploy as a Web app.

const SHEET = 'Orders';
const HEAD = ['id','createdAt','time','vanilla','pumpkin','oat','foam','pan','drinks','total','payment','name','tendered'];

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(HEAD); }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Read all orders
function doGet() {
  const [h, ...rows] = sheet_().getDataRange().getValues();
  return json_(rows.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))));
}

// Add or void an order
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const sh = sheet_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (body.action === 'add') {
      const o = body.order;
      sh.appendRow([o.id, o.createdAt, new Date(o.createdAt), o.vanilla, o.pumpkin, o.oat, o.foam,
        o.pan, (o.drinks || []).join('; '), o.total, o.payment, o.name || '', o.tendered ?? '']);
    } else if (body.action === 'void') {
      const n = sh.getLastRow() - 1;
      if (n > 0) {
        const ids = sh.getRange(2, 1, n, 1).getValues().flat();
        const i = ids.indexOf(body.id);
        if (i >= 0) sh.deleteRow(i + 2);
      }
    }
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}
