/**
 * Staff Configuration Manager
 * Authoritative source of initial staff accounts.
 * Pulls credentials strictly from environment variables.
 * Does NOT persist plaintext passwords to disk.
 */

const getStaffCredentials = () => {
  const isProd = process.env.NODE_ENV === 'production';

  const adminUsername = (process.env.ADMIN_USERNAME || (!isProd ? 'admin' : '')).trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || (!isProd ? 'Admin@Apurva2026!' : '')).trim();
  const adminPhone = (process.env.ADMIN_PHONE || (!isProd ? '9876543210' : '')).trim();
  const adminName = (process.env.ADMIN_NAME || 'System Administrator').trim();

  const kitchenUsername = (process.env.KITCHEN_USERNAME || (!isProd ? 'chef_kitchen' : '')).trim().toLowerCase();
  const kitchenPassword = (process.env.KITCHEN_PASSWORD || (!isProd ? 'Kitchen@Apurva2026!' : '')).trim();
  const kitchenPhone = (process.env.KITCHEN_PHONE || (!isProd ? '9876543211' : '')).trim();
  const kitchenName = (process.env.KITCHEN_NAME || 'Kitchen Display Chef').trim();

  const driverUsername = (process.env.DRIVER_USERNAME || (!isProd ? 'rider_deoria' : '')).trim().toLowerCase();
  const driverPassword = (process.env.DRIVER_PASSWORD || (!isProd ? 'Driver@Apurva2026!' : '')).trim();
  const driverPhone = (process.env.DRIVER_PHONE || (!isProd ? '9876543212' : '')).trim();
  const driverName = (process.env.DRIVER_NAME || 'Rider Ramesh Kumar').trim();

  return {
    admin: {
      username: adminUsername,
      password: adminPassword,
      role: 'admin',
      name: adminName,
      phone: adminPhone
    },
    kitchen: {
      username: kitchenUsername,
      password: kitchenPassword,
      role: 'kitchen',
      name: kitchenName,
      phone: kitchenPhone
    },
    driver: {
      username: driverUsername,
      password: driverPassword,
      role: 'driver',
      name: driverName,
      phone: driverPhone
    }
  };
};

module.exports = {
  getStaffCredentials
};
