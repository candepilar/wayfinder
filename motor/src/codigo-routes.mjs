import express from 'express';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { auditCode, prepareFiles } from './codigo.mjs';
import { bobStatus } from './bob.mjs';

export function codeRoutes(app, { dataDir, busy, run = auditCode, available = () => bobStatus().disponible }) {
  let running = false;
  let lastStart = 0;
  app.post('/api/codigo', express.json({ limit: '400kb' }), async (req,res) => {
    let files;
    try { files = prepareFiles(req.body?.archivos); }
    catch(error) { return res.status(400).json({ error: error.message }); }
    if (!available()) return res.status(409).json({ error: 'Bob no está disponible en este momento.' });
    if (running || busy()) return res.status(409).json({ error: 'Hay otro análisis en curso. Esperá a que termine.' });
    if (Date.now() - lastStart < 60000) return res.status(429).json({ error: 'Esperá un minuto entre análisis de código.' });
    running = true; lastStart = Date.now();
    const controller = new AbortController();
    const workspace = path.join(dataDir, 'codigo-temporal', randomUUID());
    const timer = setTimeout(() => controller.abort(), 190000);
    const disconnected = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnected);
    try { res.json(await run(files, { workspace, signal: controller.signal })); }
    catch { if (!res.destroyed) res.status(502).json({ error: 'Bob no completó el análisis. Probá con menos archivos o verificá su saldo/configuración.' }); }
    finally { clearTimeout(timer); res.off('close', disconnected); await rm(workspace, { recursive:true, force:true }).catch(() => {}); running = false; }
  });
  return () => running;
}
