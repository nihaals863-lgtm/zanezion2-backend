const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supportController');
const { verifyToken } = require('../middleware/auth');
const { scopeByCompany } = require('../middleware/company');

router.use(verifyToken, scopeByCompany);

// Tickets
router.get('/tickets', ctrl.getTickets);
router.post('/tickets', ctrl.createTicket);
router.patch('/tickets/:id/status', ctrl.updateTicketStatus);

// Events
router.get('/events', ctrl.getEvents);
router.post('/events', ctrl.createEvent);
router.put('/events/:id', ctrl.updateEvent);
router.delete('/events/:id', ctrl.deleteEvent);

// Guest Requests
router.get('/guest-requests', ctrl.getGuestRequests);
router.post('/guest-requests', ctrl.createGuestRequest);
router.put('/guest-requests/:id', ctrl.updateGuestRequest);
router.delete('/guest-requests/:id', ctrl.deleteGuestRequest);

// Chauffeur
router.get('/chauffeur-requests', ctrl.getChauffeurRequests);

// Audits
router.get('/audits', ctrl.getAudits);
router.post('/audits', ctrl.createAudit);
router.put('/audits/:id', ctrl.updateAudit);
router.delete('/audits/:id', ctrl.deleteAudit);

module.exports = router;
