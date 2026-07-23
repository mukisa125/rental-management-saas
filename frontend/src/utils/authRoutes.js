export const getDashboardPath = (role) => {
  switch (role) {
    case 'manager':
      return '/manager/dashboard';
    case 'super_admin':
      return '/super-admin/dashboard';
    case 'self_owner':
      return '/self-owner/dashboard';
    case 'tenant':
      return '/tenant/dashboard';
    default:
      return '/login';
  }
};
