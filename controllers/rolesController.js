const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/helpers');

// All available roles in the system
const SYSTEM_ROLES = [
    { id: 1, name: 'client', label: 'Client' },
    { id: 2, name: 'operation', label: 'Operations' },
    { id: 3, name: 'procurement', label: 'Procurement' },
    { id: 4, name: 'inventory', label: 'Inventory' },
    { id: 5, name: 'logistics', label: 'Logistics' },
    { id: 6, name: 'concierge', label: 'Concierge' },
    { id: 7, name: 'staff', label: 'Staff' },
    { id: 8, name: 'customer', label: 'Customer' },
];

// All menu items with icons and paths
const SYSTEM_MENUS = [
    { id: 1, name: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { id: 2, name: 'Customers', path: '/dashboard/clients', icon: 'Users' },
    { id: 3, name: 'Orders', path: '/dashboard/orders', icon: 'ShoppingCart' },
    { id: 4, name: 'Projects', path: '/dashboard/projects', icon: 'Briefcase' },
    { id: 5, name: 'Missions', path: '/dashboard/missions', icon: 'Navigation' },
    { id: 6, name: 'Deliveries', path: '/dashboard/deliveries', icon: 'Truck' },
    { id: 7, name: 'Inventory', path: '/dashboard/inventory', icon: 'Package' },
    { id: 8, name: 'Staff Management', path: '/dashboard/users', icon: 'UserCog' },
    { id: 9, name: 'Invoices', path: '/dashboard/invoices', icon: 'FileText' },
    { id: 10, name: 'Payroll', path: '/dashboard/payroll', icon: 'CreditCard' },
    { id: 11, name: 'Reports', path: '/dashboard/reports', icon: 'BarChart3' },
    { id: 12, name: 'Support', path: '/dashboard/support-tickets', icon: 'Headphones' },
    { id: 13, name: 'Chauffeur', path: '/dashboard/chauffeur', icon: 'Car' },
    { id: 14, name: 'Events', path: '/dashboard/events', icon: 'Calendar' },
    { id: 15, name: 'Guest Requests', path: '/dashboard/guest-requests', icon: 'Heart' },
    { id: 16, name: 'Luxury Items', path: '/dashboard/luxury-items', icon: 'Gift' },
    { id: 17, name: 'Vendors', path: '/dashboard/vendors', icon: 'Store' },
    { id: 18, name: 'Purchase Requests', path: '/dashboard/purchase-requests', icon: 'ShoppingCart' },
    { id: 19, name: 'Quotes', path: '/dashboard/quotes', icon: 'Box' },
    { id: 20, name: 'Purchase Orders', path: '/dashboard/purchase-orders', icon: 'FileText' },
    { id: 21, name: 'Fleet', path: '/dashboard/fleet', icon: 'Truck' },
    { id: 22, name: 'Warehouses', path: '/dashboard/warehouses', icon: 'Store' },
    { id: 23, name: 'Staff Terminal', path: '/dashboard/staff-terminal', icon: 'Smartphone' },
    { id: 24, name: 'Settings', path: '/dashboard/settings', icon: 'Settings' },
    { id: 25, name: 'Security Protocol', path: '/dashboard/roles-permissions', icon: 'ShieldCheck' },
];

// GET /api/roles
exports.getRoles = async (req, res) => {
    try {
        return successResponse(res, SYSTEM_ROLES);
    } catch (err) {
        return errorResponse(res, 'Failed to fetch roles.', 500);
    }
};

// GET /api/roles/menus
exports.getMenus = async (req, res) => {
    try {
        return successResponse(res, SYSTEM_MENUS);
    } catch (err) {
        return errorResponse(res, 'Failed to fetch menus.', 500);
    }
};

// GET /api/roles/:roleId/permissions
exports.getPermissions = async (req, res) => {
    try {
        const role = SYSTEM_ROLES.find(r => r.id === parseInt(req.params.roleId));
        if (!role) return errorResponse(res, 'Role not found.', 404);

        const companyId = req.companyScope;
        const companyClause = companyId ? 'AND (company_id = ? OR company_id IS NULL)' : '';
        const companyParams = companyId ? [companyId] : [];

        const [existing] = await db.query(
            `SELECT * FROM menu_permissions WHERE role = ? ${companyClause}`,
            [role.name, ...companyParams]
        );

        // Build permissions list: merge DB records with all menus
        const dbPerms = {};
        existing.forEach(p => {
            dbPerms[p.menu_name] = p;
        });

        const permissions = SYSTEM_MENUS.map(menu => {
            const dbPerm = dbPerms[menu.name];
            return {
                id: menu.id,
                menu_name: menu.name,
                name: menu.name,
                path: menu.path,
                icon: menu.icon,
                can_view: dbPerm ? !!dbPerm.can_view : false,
                can_add: dbPerm ? !!dbPerm.can_create : false,
                can_edit: dbPerm ? !!dbPerm.can_edit : false,
                can_delete: dbPerm ? !!dbPerm.can_delete : false,
            };
        });

        return successResponse(res, permissions);
    } catch (err) {
        console.error('Get permissions error:', err);
        return errorResponse(res, 'Failed to fetch permissions.', 500);
    }
};

// POST /api/roles/:roleId/permissions
exports.savePermissions = async (req, res) => {
    try {
        const role = SYSTEM_ROLES.find(r => r.id === parseInt(req.params.roleId));
        if (!role) return errorResponse(res, 'Role not found.', 404);

        const { permissions } = req.body;
        if (!Array.isArray(permissions)) return errorResponse(res, 'Invalid permissions data.', 400);

        const companyId = req.companyScope || null;

        // Delete existing permissions for this role + company
        if (companyId) {
            await db.query('DELETE FROM menu_permissions WHERE role = ? AND company_id = ?', [role.name, companyId]);
        } else {
            await db.query('DELETE FROM menu_permissions WHERE role = ? AND company_id IS NULL', [role.name]);
        }

        // Insert new permissions
        for (const perm of permissions) {
            const menu = SYSTEM_MENUS.find(m => m.id === perm.menu_id);
            if (!menu) continue;

            await db.query(
                `INSERT INTO menu_permissions (company_id, role, menu_name, can_view, can_create, can_edit, can_delete)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [companyId, role.name, menu.name, !!perm.can_view, !!perm.can_add, !!perm.can_edit, !!perm.can_delete]
            );
        }

        return successResponse(res, null, 'Permissions saved successfully.');
    } catch (err) {
        console.error('Save permissions error:', err);
        return errorResponse(res, 'Failed to save permissions.', 500);
    }
};
