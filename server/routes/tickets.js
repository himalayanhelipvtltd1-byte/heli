const express = require('express');
const { generateTicketPdf } = require('../lib/ticket-pdf');

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const draft = req.body;
    if (!draft || !draft.passengers?.length) {
      res.status(400).json({ error: 'Invalid ticket data' });
      return;
    }
    const pdf = await generateTicketPdf(draft);
    const bookingId = draft.bookingId || 'ticket';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ticket-${bookingId}.pdf"`,
    );
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message || 'PDF generation failed' });
  }
});

module.exports = router;
