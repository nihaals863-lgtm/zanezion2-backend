const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { companyFilter, companyScope } = require('../middleware/company');
const { generatePassword, successResponse, errorResponse } = require('../utils/helpers');

// GET /api/customers (aliased as /api/clients)
exports.getAll = async (req, res) => {
    try {
        const role = req.user.role;

        // Super Admin → sees companies, filtered by client_type if provided
        if (role === 'super_admin') {
            const clientType = req.query.client_type;
            const typeClause = clientType ? ' AND c.client_type = ?' : '';
            const typeParams = clientType ? [clientType] : [];
            const [rows] = await db.query(
                `SELECT c.*,
                    (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) as total_users,
                    (SELECT COUNT(*) FROM customers cu WHERE cu.company_id = c.id) as total_customers
                 FROM companies c
                 WHERE c.id != 1${typeClause}
                 ORDER BY c.created_at DESC`,
                typeParams
            );
            return successResponse(res, rows);
        }

        // Admin/Staff → sees only their company's customers
        const companyId = req.user.company_id;
        if (!companyId) return successResponse(res, []);

        const [rows] = await db.query(
            `SELECT * FROM customers WHERE company_id = ? ORDER BY created_at DESC`,
            [companyId]
        );
        return successResponse(res, rows);
    } catch (err) {
        console.error('Get customers error:', err);
        return errorResponse(res, 'Failed to fetch customers.', 500);
    }
};

// GET /api/customers/:id
exports.getById = async (req, res) => {
    try {
        const cs = companyScope(req);
        const [rows] = await db.query(`SELECT * FROM customers WHERE id = ?${cs.clause}`, [req.params.id, ...cs.params]);
        if (rows.length === 0) return errorResponse(res, 'Customer not found.', 404);
        return successResponse(res, rows[0]);
    } catch (err) {
        return errorResponse(res, 'Failed to fetch customer.', 500);
    }
};

// POST /api/customers
exports.create = async (req, res) => {
    try {
        const { name, email, phone, contact, address, client_type, password,
                billing_cycle, payment_method, contact_person, business_name,
                logo_url, source, status, plan, location } = req.body;

        const role = req.user.role;

        // ─── SUPER ADMIN: creates a new company (SaaS client) ───
        if (role === 'super_admin') {
            // Create company
            const [companyResult] = await db.query(
                `INSERT INTO companies (name, email, phone, location, plan, billing_cycle, payment_method, contact_person, client_type, logo_url, tagline, source, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [business_name || name, email || null, phone || null, address || location || null, plan || 'Essentials',
                 billing_cycle || 'Monthly', payment_method || null, contact_person || contact || null,
                 (client_type === 'Personal' ? 'Individual' : (client_type || 'SaaS')), logo_url || null, null, source || 'Admin Dashboard', status || 'active']
            );
            const newCompanyId = companyResult.insertId;

            // Create client user for this company if email provided
            let credentials = null;
            if (email) {
                const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
                if (existingUser.length === 0) {
                    const userPassword = password || generatePassword();
                    const hashedPassword = await bcrypt.hash(userPassword, 12);
                    
                    // Normalize client_type for DB ENUM if needed
                    const normalizedClientType = client_type === 'Personal' ? 'Individual' : (client_type || 'SaaS');

                    await db.query(
                        `INSERT INTO users (company_id, name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, 'admin', 'active')`,
                        [newCompanyId, name, email, hashedPassword, phone || null]
                    );
                    
                    // Try to send welcome email
                    try {
                        const { sendMail } = require('../utils/mailer');
                        await sendMail(email, 'Welcome to ZaneZion', 
                            `<h2>Your ZaneZion Institutional account is ready!</h2>
                             <p>Email: <strong>${email}</strong></p>
                             <p>Password: <strong>${userPassword}</strong></p>
                             <p>Type: <strong>${normalizedClientType}</strong></p>`
                        );
                    } catch (e) { console.log('Welcome email skipped'); }

                    credentials = { email, password: userPassword, message: `Login credentials generated and sent to ${email}` };
                }
            }

            const responseData = { id: newCompanyId, name: business_name || name };
            if (credentials) responseData.credentials = credentials;
            return successResponse(res, responseData, 'Client company created.', 201);
        }

        // ─── ADMIN/STAFF: creates a customer under their company ───
        const companyId = req.user.company_id;
        if (!companyId) return errorResponse(res, 'No company associated.', 400);

        // Create customer record
        const [result] = await db.query(
            `INSERT INTO customers (company_id, name, email, phone, contact, address, client_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, name, email || null, phone || null, contact || contact_person || null, address || location || null, client_type || 'Direct', status || 'active']
        );

        // Create login user for customer if email provided
        let credentials = null;
        if (email) {
            const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);

            if (existingUser.length === 0) {
                const userPassword = password || generatePassword();
                const hashedPassword = await bcrypt.hash(userPassword, 12);

                await db.query(
                    `INSERT INTO users (company_id, name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, 'customer', 'active')`,
                    [companyId, name, email, hashedPassword, phone || null]
                );

                // Send welcome email
                try {
                    const { sendMail } = require('../utils/mailer');
                    await sendMail(email, 'Your Account Credentials', 
                        `<h2>Your ZaneZion customer account is ready!</h2>
                         <p>Email: <strong>${email}</strong></p>
                         <p>Password: <strong>${userPassword}</strong></p>`
                    );
                } catch (e) { console.log('Customer email skipped'); }

                credentials = { email, password: userPassword, message: `Login credentials generated and sent to ${email}` };
            }
        }

        const responseData = { id: result.insertId, name };
        if (credentials) responseData.credentials = credentials;

        return successResponse(res, responseData, 'Customer created.', 201);
    } catch (err) {
        console.error('Create customer error:', err);
        return errorResponse(res, 'Failed to create customer.', 500);
    }
};

// PUT /api/customers/:id
exports.update = async (req, res) => {
    try {
        const fields = req.body;
        const sets = [];
        const values = [];
        for (const [key, val] of Object.entries(fields)) {
            if (['id', 'created_at', 'company_id', 'password', 'credentials'].includes(key)) continue;
            sets.push(`${key} = ?`);
            values.push(val);
        }
        if (sets.length === 0) return errorResponse(res, 'No fields to update.', 400);
        const cs = companyScope(req);
        values.push(req.params.id, ...cs.params);
        await db.query(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?${cs.clause}`, values);

        // If status changed to active and this customer has no user account yet, create one
        if (fields.status && fields.status.toLowerCase() === 'active') {
            const [customer] = await db.query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
            if (customer.length > 0 && customer[0].email) {
                const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [customer[0].email]);
                if (existingUser.length === 0) {
                    const userPassword = generatePassword();
                    const hashedPassword = await bcrypt.hash(userPassword, 12);
                    await db.query(
                        `INSERT INTO users (company_id, name, email, password, role, status) VALUES (?, ?, ?, ?, 'customer', 'active')`,
                        [customer[0].company_id, customer[0].name, customer[0].email, hashedPassword]
                    );
                    return successResponse(res, {
                        id: req.params.id,
                        credentials: { email: customer[0].email, password: userPassword, message: `Credentials generated for ${customer[0].name}` }
                    }, 'Customer activated with login credentials.');
                }
            }
        }

        return successResponse(res, { id: req.params.id }, 'Customer updated.');
    } catch (err) {
        return errorResponse(res, 'Failed to update customer.', 500);
    }
};

// DELETE /api/customers/:id
exports.remove = async (req, res) => {
    try {
        // Also delete associated user if exists
        const cs = companyScope(req);
        const [customer] = await db.query(`SELECT email FROM customers WHERE id = ?${cs.clause}`, [req.params.id, ...cs.params]);
        if (customer.length === 0) return errorResponse(res, 'Customer not found.', 404);
        if (customer[0].email) {
            await db.query('DELETE FROM users WHERE email = ? AND role IN ("customer","admin")', [customer[0].email]);
        }
        await db.query(`DELETE FROM customers WHERE id = ?${cs.clause}`, [req.params.id, ...cs.params]);
        return successResponse(res, null, 'Customer deleted.');
    } catch (err) {
        return errorResponse(res, 'Failed to delete customer.', 500);
    }
};
