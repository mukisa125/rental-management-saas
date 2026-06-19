export const formatUGX = (value = 0) => {
  const amount = Number(value) || 0;
  return `UGX ${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
};
