const db = require('../config/db');
const { companyFilter, companyScope } = require('../middleware/company');
const { successResponse, errorResponse } = require('../utils/helpers');

// --- ASSIGNMENTS ---
exports.getAssignments = async (req, res) => {
    try {
        const cf = companyFilter(req);
        const role = req.user.role;
        let extra = '';
        const extraParams = [];

        if (role === 'staff') {
            extra = ' AND assignee_id = ?';
            extraParams.push(req.user.id);
        }

        const [rows] = await db.query(
            `SELECT sa.*, u.name as assignee_name FROM staff_assignments sa LEFT JOIN users u ON sa.assignee_id = u.id WHERE 1=1 ${cf.clause} ${extra} ORDER BY sa.created_at DESC`,
            [...cf.params, ...extraParams]
        );
        return successResponse(res, rows);
    } catch (err) { return errorResponse(res, 'Failed to fetch assignments.', 500); }
};

exports.createAssignment = async (req, res) => {
    try {
        const { assigneeId, task, location, status, priority, missionType, passengerName, pickupTime, dropLocation, pickupLocation, deliveryLocation, luggage, goodsDetails, weight } = req.body;
        const companyId = req.companyScope;
        const [result] = await db.query(
            `INSERT INTO staff_assignments (company_id, assignee_id, task, location, status, priority, mission_type, passenger_name, pickup_time, drop_location, pickup_location, delivery_location, luggage, goods_details, weight)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, assigneeId, task, location || null, status || 'Pending', priority || 'Normal', missionType || null, passengerName || null, pickupTime || null, dropLocation || null, pickupLocation || null, deliveryLocation || null, luggage || null, goodsDetails || null, weight || null]
        );
        return successResponse(res, { id: result.insertId }, 'Assignment created.', 201);
    } catch (err) { return errorResponse(res, 'Failed to create assignment.', 500); }
};

exports.updateAssignment = async (req, res) => {
    try {
        const fields = req.body;
        const sets = [], values = [];
        for (const [k, v] of Object.entries(fields)) {
            if (['id', 'created_at', 'company_id'].includes(k)) continue;
            sets.push(`${k} = ?`); values.push(v);
        }
        const cs = companyScope(req);
        values.push(req.params.id, ...cs.params);
        await db.query(`UPDATE staff_assignments SET ${sets.join(', ')} WHERE id = ?${cs.clause}`, values);
        return successResponse(res, { id: req.params.id }, 'Assignment updated.');
    } catch (err) { return errorResponse(res, 'Failed to update assignment.', 500); }
};

// --- CLOCK IN/OUT ---
exports.clockIn = async (req, res) => {
    try {
        const { location } = req.body;
        const companyId = req.user.company_id;

        const [active] = await db.query(
            'SELECT id FROM shifts WHERE user_id = ? AND clock_out IS NULL', [req.user.id]
        );
        if (active.length > 0) return errorResponse(res, 'Already clocked in.', 400);

        const [result] = await db.query(
            `INSERT INTO shifts (company_id, user_id, clock_in, location) VALUES (?, ?, NOW(), ?)`,
            [companyId, req.user.id, location || null]
        );

        await db.query('UPDATE users SET is_available = TRUE WHERE id = ?', [req.user.id]);

        return successResponse(res, { shiftId: result.insertId }, 'Clocked in.');
    } catch (err) { return errorResponse(res, 'Clock in failed.', 500); }
};

exports.clockOut = async (req, res) => {
    try {
        const [active] = await db.query(
            'SELECT * FROM shifts WHERE user_id = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1', [req.user.id]
        );
        if (active.length === 0) return errorResponse(res, 'No active shift.', 400);

        const shift = active[0];
        await db.query(
            `UPDATE shifts SET clock_out = NOW(), duration_hours = TIMESTAMPDIFF(MINUTE, clock_in, NOW()) / 60 WHERE id = ?`,
            [shift.id]
        );

        await db.query('UPDATE users SET is_available = FALSE WHERE id = ?', [req.user.id]);

        const [updated] = await db.query('SELECT * FROM shifts WHERE id = ?', [shift.id]);

        return successResponse(res, updated[0], 'Clocked out.');
    } catch (err) { return errorResponse(res, 'Clock out failed.', 500); }
};

// --- AVAILABILITY ---
exports.toggleAvailability = async (req, res) => {
    try {
        const { is_available } = req.body;
        const cs = companyScope(req);
        await db.query(`UPDATE users SET is_available = ? WHERE id = ?${cs.clause}`, [is_available, req.params.userId, ...cs.params]);
        return successResponse(res, { userId: req.params.userId, is_available }, 'Availability updated.');
    } catch (err) { return errorResponse(res, 'Failed to update availability.', 500); }
};

// --- LEAVE REQUESTS ---
exports.getLeaveRequests = async (req, res) => {
    try {
        const cf = companyFilter(req);
        const role = req.user.role;
        let extra = '';
        const extraParams = [];

        if (role === 'staff') {
            extra = ' AND lr.user_id = ?';
            extraParams.push(req.user.id);
        }

        const [rows] = await db.query(
            `SELECT lr.*, u.name as user_name FROM leave_requests lr LEFT JOIN users u ON lr.user_id = u.id WHERE 1=1 ${cf.clause} ${extra} ORDER BY lr.created_at DESC`,
            [...cf.params, ...extraParams]
        );
        return successResponse(res, rows);
    } catch (err) { return errorResponse(res, 'Failed to fetch leave requests.', 500); }
};

exports.createLeaveRequest = async (req, res) => {
    try {
        const { leave_type, start_date, end_date, reason } = req.body;
        const companyId = req.user.company_id;
        const [result] = await db.query(
            `INSERT INTO leave_requests (company_id, user_id, leave_type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?, ?)`,
            [companyId, req.user.id, leave_type, start_date, end_date, reason || null]
        );
        return successResponse(res, { id: result.insertId }, 'Leave request submitted.', 201);
    } catch (err) { return errorResponse(res, 'Failed to submit leave request.', 500); }
};

exports.updateLeaveRequest = async (req, res) => {
    try {
        const { status } = req.body;
        const cs = companyScope(req);
        await db.query(
            `UPDATE leave_requests SET status = ?, reviewed_by = ? WHERE id = ?${cs.clause}`,
            [status, req.user.id, req.params.id, ...cs.params]
        );
        return successResponse(res, { id: req.params.id, status }, 'Leave request updated.');
    } catch (err) { return errorResponse(res, 'Failed to update leave request.', 500); }
};
