#!/usr/bin/env node
// Builds a colourful HTML email body from a newman JSON reporter export.
// Usage: node generate-email-summary.js <path-to-newman-report.json>
const fs = require('fs');

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('Usage: generate-email-summary.js <newman-report.json>');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const stats = report.run.stats;
const executions = report.run.executions;

const total = stats.assertions.total;
const failed = stats.assertions.failed;
const passed = total - failed;
const passRate = total ? Math.round((passed / total) * 100) : 0;
const overallColor = failed === 0 ? '#22c55e' : '#ef4444';
const overallLabel = failed === 0 ? 'ALL TESTS PASSED' : `${failed} ASSERTION${failed === 1 ? '' : 'S'} FAILED`;

const rows = executions.map((exec) => {
  const name = exec.item.name;
  const assertions = exec.assertions || [];
  const itemFailed = assertions.filter((a) => a.error).length;
  const itemTotal = assertions.length;
  const status = itemFailed === 0 ? 'PASS' : 'FAIL';
  const color = itemFailed === 0 ? '#16a34a' : '#dc2626';
  const bg = itemFailed === 0 ? '#f0fdf4' : '#fef2f2';
  const failDetails = assertions
    .filter((a) => a.error)
    .map((a) => `<div style="color:#991b1b;font-size:12px;margin-top:4px;">&bull; ${escapeHtml(a.assertion)}: ${escapeHtml(a.error.message || '')}</div>`)
    .join('');
  return `
    <tr style="background:${bg};">
      <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;">${escapeHtml(name)}${failDetails}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;font-size:13px;">${itemTotal - itemFailed}/${itemTotal}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">
        <span style="background:${color};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold;">${status}</span>
      </td>
    </tr>`;
}).join('');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;border-radius:8px 8px 0 0;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:20px;">Treekle Users API &mdash; Regression Report</h1>
    <p style="color:#e0e7ff;margin:6px 0 0;font-size:13px;">${new Date(report.run.timings.started).toString()}</p>
  </div>
  <div style="background:${overallColor};padding:16px;text-align:center;">
    <span style="color:#fff;font-size:18px;font-weight:bold;">${overallLabel}</span>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;">
    <tr>
      <td style="padding:10px;text-align:center;background:#eef2ff;border-radius:6px;width:25%;">
        <div style="font-size:22px;font-weight:bold;color:#4338ca;">${stats.items.total}</div>
        <div style="font-size:12px;color:#4338ca;">Requests</div>
      </td>
      <td style="width:8px;"></td>
      <td style="padding:10px;text-align:center;background:#f0fdf4;border-radius:6px;width:25%;">
        <div style="font-size:22px;font-weight:bold;color:#16a34a;">${passed}</div>
        <div style="font-size:12px;color:#16a34a;">Assertions Passed</div>
      </td>
      <td style="width:8px;"></td>
      <td style="padding:10px;text-align:center;background:#fef2f2;border-radius:6px;width:25%;">
        <div style="font-size:22px;font-weight:bold;color:#dc2626;">${failed}</div>
        <div style="font-size:12px;color:#dc2626;">Assertions Failed</div>
      </td>
      <td style="width:8px;"></td>
      <td style="padding:10px;text-align:center;background:#fffbeb;border-radius:6px;width:25%;">
        <div style="font-size:22px;font-weight:bold;color:#d97706;">${passRate}%</div>
        <div style="font-size:12px;color:#d97706;">Pass Rate</div>
      </td>
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;">
    <thead>
      <tr style="background:#1f2937;">
        <th style="padding:8px 12px;color:#fff;text-align:left;font-size:13px;">Request</th>
        <th style="padding:8px 12px;color:#fff;text-align:center;font-size:13px;">Assertions</th>
        <th style="padding:8px 12px;color:#fff;text-align:center;font-size:13px;">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="font-size:12px;color:#6b7280;margin-top:16px;">Full interactive report attached. Generated automatically by GitHub Actions.</p>
</div>`;

fs.writeFileSync('email-summary.html', html);
console.log(`Summary written to email-summary.html (${passed}/${total} passed, ${failed} failed)`);
