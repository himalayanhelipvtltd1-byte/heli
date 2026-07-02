const path = require('path');
const { supabase, SCREENSHOT_BUCKET } = require('./supabase');

const QR_STORAGE_PREFIX = 'settings/payment-qr';

const DEFAULTS = {
  id: 1,
  merchant: 'Trans Bharat Aviation',
  manager: 'Raja Kumar',
  account_number: '38408100014453',
  ifsc: 'BARB0FATWAH',
  bank: 'Bank of Baroda',
  qr_image_path: null,
};

function toPublicSettings(row) {
  const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : Date.now();
  return {
    merchant: row.merchant,
    manager: row.manager,
    accountNumber: row.account_number,
    ifsc: row.ifsc,
    bank: row.bank,
    qrImage: row.qr_image_path
      ? `/api/payment-details/qr?v=${updatedAt}`
      : 'assets/images/payment-qr.png',
  };
}

function isMissingSettingsTable(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('payment_settings') && (
    message.includes('does not exist')
    || message.includes('schema cache')
    || message.includes('could not find')
  );
}

function defaultSettingsRow() {
  return {
    ...DEFAULTS,
    updated_at: new Date().toISOString(),
  };
}

async function getPaymentSettingsRow() {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    if (isMissingSettingsTable(error)) return defaultSettingsRow();
    throw error;
  }
  if (data) return data;

  const { data: created, error: insertError } = await supabase
    .from('payment_settings')
    .insert(DEFAULTS)
    .select('*')
    .single();
  if (insertError) {
    if (isMissingSettingsTable(insertError)) return defaultSettingsRow();
    throw insertError;
  }
  return created;
}

async function getPublicPaymentSettings() {
  const row = await getPaymentSettingsRow();
  return toPublicSettings(row);
}

async function updatePaymentSettings(fields) {
  const patch = { updated_at: new Date().toISOString() };
  if (fields.merchant !== undefined) patch.merchant = String(fields.merchant).trim();
  if (fields.manager !== undefined) patch.manager = String(fields.manager).trim();
  if (fields.accountNumber !== undefined) patch.account_number = String(fields.accountNumber).trim();
  if (fields.ifsc !== undefined) patch.ifsc = String(fields.ifsc).trim();
  if (fields.bank !== undefined) patch.bank = String(fields.bank).trim();

  const { data, error } = await supabase
    .from('payment_settings')
    .update(patch)
    .eq('id', 1)
    .select('*')
    .single();
  if (error) {
    if (isMissingSettingsTable(error)) {
      throw new Error('Run supabase/migration-payment-settings.sql in Supabase SQL Editor first');
    }
    throw error;
  }
  return data;
}

async function uploadPaymentQr(file) {
  const ext = path.extname(file.originalname) || '.png';
  const storagePath = `${QR_STORAGE_PREFIX}${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });
  if (uploadError) {
    if (isMissingSettingsTable(uploadError)) {
      throw new Error('Run supabase/migration-payment-settings.sql in Supabase SQL Editor first');
    }
    throw uploadError;
  }

  const { data, error } = await supabase
    .from('payment_settings')
    .update({
      qr_image_path: storagePath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('*')
    .single();
  if (error) {
    if (isMissingSettingsTable(error)) {
      throw new Error('Run supabase/migration-payment-settings.sql in Supabase SQL Editor first');
    }
    throw error;
  }
  return data;
}

async function downloadPaymentQr(row) {
  if (!row?.qr_image_path) return null;
  const { data, error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .download(row.qr_image_path);
  if (error) throw error;
  return data;
}

module.exports = {
  DEFAULTS,
  SCREENSHOT_BUCKET,
  toPublicSettings,
  getPaymentSettingsRow,
  getPublicPaymentSettings,
  updatePaymentSettings,
  uploadPaymentQr,
  downloadPaymentQr,
};
