// Shared system menu definitions — used by auth, roles, and any future permission logic
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
    { id: 26, name: 'Leave & Absence', path: '/dashboard/leave', icon: 'Calendar' },
];

const SYSTEM_ROLES = [
    { id: 1, name: 'admin', label: 'Admin' },
    { id: 2, name: 'operation', label: 'Operations' },
    { id: 3, name: 'procurement', label: 'Procurement' },
    { id: 4, name: 'inventory', label: 'Inventory' },
    { id: 5, name: 'logistics', label: 'Logistics' },
    { id: 6, name: 'concierge', label: 'Concierge' },
    { id: 7, name: 'staff', label: 'Staff' },
    { id: 8, name: 'customer', label: 'Customer' },
];

module.exports = { SYSTEM_MENUS, SYSTEM_ROLES };
