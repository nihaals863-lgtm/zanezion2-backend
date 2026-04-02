const db = require('../config/db');
const { companyFilter, companyScope } = require('../middleware/company');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getLuxuryItems = async (req, res) => {
    try {
        const cf = companyFilter(req);
        const [rows] = await db.query(`SELECT * FROM luxury_items WHERE 1=1 ${cf.clause} ORDER BY created_at DESC`, cf.params);
        return successResponse(res, rows);
    } catch (err) { return errorResponse(res, 'Failed to fetch luxury items.', 500); }
};

exports.createLuxuryItem = async (req, res) => {
    try {
        const { item_name, owner_name, vault_location, estimated_value, status, notes } = req.body;
        const companyId = req.companyScope;
        const [result] = await db.query(
            `INSERT INTO luxury_items (company_id, item_name, owner_name, vault_location, estimated_value, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [companyId, item_name, owner_name || null, vault_location || null, estimated_value || null, status || 'Stored', notes || null]
        );
        return successResponse(res, { id: result.insertId }, 'Luxury item added.', 201);
    } catch (err) { return errorResponse(res, 'Failed to add luxury item.', 500); }
};

exports.updateLuxuryItem = async (req, res) => {
    try {
        const { item_name, owner_name, vault_location, estimated_value, status, notes } = req.body;
        const cs = companyScope(req);
        await db.query(
            `UPDATE luxury_items SET item_name = COALESCE(?, item_name), owner_name = COALESCE(?, owner_name), vault_location = COALESCE(?, vault_location), estimated_value = COALESCE(?, estimated_value), status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE id = ?${cs.clause}`,
            [item_name, owner_name, vault_location, estimated_value, status, notes, req.params.id, ...cs.params]
        );
        return successResponse(res, { id: req.params.id }, 'Luxury item updated.');
    } catch (err) { return errorResponse(res, 'Failed to update luxury item.', 500); }
};

exports.deleteLuxuryItem = async (req, res) => {
    try {
        const cs = companyScope(req);
        await db.query(`DELETE FROM luxury_items WHERE id = ?${cs.clause}`, [req.params.id, ...cs.params]);
        return successResponse(res, null, 'Luxury item deleted.');
    } catch (err) { return errorResponse(res, 'Failed to delete luxury item.', 500); }
};
