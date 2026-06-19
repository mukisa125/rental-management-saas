const Company = require('../models/Company');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const SubscriptionTransaction = require('../models/SubscriptionTransaction');
const User = require('../models/User');

class ReportingService {
  /**
   * Generate revenue report
   */
  async generateRevenueReport(companyId, startDate, endDate) {
    try {
      const payments = await Payment.find({
        company: companyId,
        status: 'paid',
        paidDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).populate('tenant', 'fullName');

      const subscriptionPayments = await SubscriptionTransaction.find({
        company: companyId,
        status: 'completed',
        processedDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).populate('subscriptionPlan', 'name');

      const totalRentRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalSubscriptionRevenue = subscriptionPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalRevenue = totalRentRevenue + totalSubscriptionRevenue;

      const revenueByMonth = {};
      payments.forEach(p => {
        const month = p.paidDate.toISOString().substring(0, 7);
        revenueByMonth[month] = (revenueByMonth[month] || 0) + p.amount;
      });

      return {
        period: `${startDate} to ${endDate}`,
        totalRentRevenue,
        totalSubscriptionRevenue,
        totalRevenue,
        paymentCount: payments.length,
        averagePayment: payments.length > 0 ? totalRentRevenue / payments.length : 0,
        revenueByMonth,
        topPayingTenants: payments
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10)
          .map(p => ({
            tenant: p.tenant?.fullName,
            amount: p.amount,
            date: p.paidDate
          }))
      };
    } catch (error) {
      throw new Error(`Error generating revenue report: ${error.message}`);
    }
  }

  /**
   * Generate subscription report
   */
  async generateSubscriptionReport(startDate, endDate) {
    try {
      const companies = await Company.find({
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).populate('subscriptionPlan');

      const subscriptionsByStatus = {};
      const subscriptionsByPlan = {};

      companies.forEach(company => {
        subscriptionsByStatus[company.subscriptionStatus] = (subscriptionsByStatus[company.subscriptionStatus] || 0) + 1;
        const planName = company.subscriptionPlan?.name || 'Unknown';
        subscriptionsByPlan[planName] = (subscriptionsByPlan[planName] || 0) + 1;
      });

      const activeSubscriptions = companies.filter(c => c.subscriptionStatus === 'active').length;
      const trialSubscriptions = companies.filter(c => c.subscriptionStatus === 'trial').length;
      const expiredSubscriptions = companies.filter(c => c.subscriptionStatus === 'expired').length;
      const suspendedSubscriptions = companies.filter(c => c.subscriptionStatus === 'suspended').length;

      return {
        period: `${startDate} to ${endDate}`,
        totalCompanies: companies.length,
        activeSubscriptions,
        trialSubscriptions,
        expiredSubscriptions,
        suspendedSubscriptions,
        subscriptionsByStatus,
        subscriptionsByPlan,
        newCompanies: companies.length,
        churnRate: 0 // Calculate based on historical data
      };
    } catch (error) {
      throw new Error(`Error generating subscription report: ${error.message}`);
    }
  }

  /**
   * Generate customer report
   */
  async generateCustomerReport(companyId) {
    try {
      const company = await Company.findById(companyId).populate('subscriptionPlan');
      const properties = await Property.find({ company: companyId });
      const units = await Unit.find({ company: companyId });
      const tenants = await Tenant.find({ company: companyId });
      const payments = await Payment.find({ company: companyId, status: 'paid' });

      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const occupiedUnits = units.filter(u => u.status === 'occupied').length;
      const occupancyRate = units.length > 0 ? (occupiedUnits / units.length) * 100 : 0;

      return {
        company: {
          name: company.companyName,
          email: company.email,
          subscription: company.subscriptionPlan?.name,
          status: company.subscriptionStatus
        },
        metrics: {
          totalProperties: properties.length,
          totalUnits: units.length,
          occupiedUnits,
          occupancyRate: occupancyRate.toFixed(2),
          totalTenants: tenants.length,
          totalRevenue,
          averageRent: tenants.length > 0 ? totalRevenue / tenants.length : 0
        },
        statistics: {
          activeProperties: properties.filter(p => p.status === 'active').length,
          maintenanceProperties: properties.filter(p => p.status === 'maintenance').length,
          activeTenants: tenants.filter(t => t.status === 'active').length,
          pendingTenants: tenants.filter(t => t.status === 'pending').length
        }
      };
    } catch (error) {
      throw new Error(`Error generating customer report: ${error.message}`);
    }
  }

  /**
   * Generate property statistics report
   */
  async generatePropertyReport(companyId, startDate, endDate) {
    try {
      const properties = await Property.find({
        company: companyId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });

      const units = await Unit.find({
        company: companyId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });

      const tenants = await Tenant.find({
        company: companyId,
        leaseStart: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });

      return {
        period: `${startDate} to ${endDate}`,
        totalProperties: properties.length,
        newProperties: properties.length,
        totalUnits: units.length,
        newUnits: units.length,
        newTenants: tenants.length,
        propertiesByStatus: {
          active: properties.filter(p => p.status === 'active').length,
          inactive: properties.filter(p => p.status === 'inactive').length,
          maintenance: properties.filter(p => p.status === 'maintenance').length
        },
        unitsByStatus: {
          vacant: units.filter(u => u.status === 'vacant').length,
          occupied: units.filter(u => u.status === 'occupied').length,
          maintenance: units.filter(u => u.status === 'maintenance').length
        },
        averageUnitsPerProperty: properties.length > 0 ? units.length / properties.length : 0
      };
    } catch (error) {
      throw new Error(`Error generating property report: ${error.message}`);
    }
  }

  /**
   * Generate occupancy report
   */
  async generateOccupancyReport(companyId, startDate, endDate) {
    try {
      const properties = await Property.find({ company: companyId });
      const units = await Unit.find({ company: companyId });
      const tenants = await Tenant.find({
        company: companyId,
        leaseStart: { $lte: new Date(endDate) },
        leaseEnd: { $gte: new Date(startDate) }
      });

      const totalUnits = units.length;
      const occupiedUnits = units.filter(u => u.status === 'occupied').length;
      const vacantUnits = units.filter(u => u.status === 'vacant').length;
      const maintenanceUnits = units.filter(u => u.status === 'maintenance').length;

      const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

      return {
        period: `${startDate} to ${endDate}`,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        maintenanceUnits,
        occupancyRate: occupancyRate.toFixed(2),
        occupiedPercentage: ((occupiedUnits / totalUnits) * 100).toFixed(2),
        vacantPercentage: ((vacantUnits / totalUnits) * 100).toFixed(2),
        maintenancePercentage: ((maintenanceUnits / totalUnits) * 100).toFixed(2),
        activeTenants: tenants.filter(t => t.status === 'active').length,
        averageRentPerUnit: tenants.length > 0 
          ? tenants.reduce((sum, t) => sum + t.rentAmount, 0) / tenants.length 
          : 0,
        propertiesWithVacancy: properties.map(p => ({
          name: p.name,
          totalUnits: p.totalUnits,
          occupiedUnits: p.occupiedUnits,
          occupancyRate: p.occupiedUnits > 0 ? (p.occupiedUnits / p.totalUnits) * 100 : 0
        }))
      };
    } catch (error) {
      throw new Error(`Error generating occupancy report: ${error.message}`);
    }
  }

  /**
   * Generate maintenance report
   */
  async generateMaintenanceReport(companyId, startDate, endDate) {
    try {
      const maintenanceRequests = await Maintenance.find({
        company: companyId,
        submittedDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });

      const totalCost = maintenanceRequests.reduce((sum, m) => sum + (m.cost || 0), 0);
      const estimatedCost = maintenanceRequests.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);

      const requestsByStatus = {};
      const requestsByCategory = {};
      const requestsByPriority = {};

      maintenanceRequests.forEach(m => {
        requestsByStatus[m.status] = (requestsByStatus[m.status] || 0) + 1;
        requestsByCategory[m.category] = (requestsByCategory[m.category] || 0) + 1;
        requestsByPriority[m.priority] = (requestsByPriority[m.priority] || 0) + 1;
      });

      const completedRequests = maintenanceRequests.filter(m => m.status === 'completed').length;
      const averageResolutionTime = maintenanceRequests
        .filter(m => m.resolvedDate)
        .reduce((sum, m) => sum + (m.resolvedDate - m.submittedDate), 0) / Math.max(completedRequests, 1);

      return {
        period: `${startDate} to ${endDate}`,
        totalRequests: maintenanceRequests.length,
        completedRequests,
        pendingRequests: maintenanceRequests.filter(m => m.status !== 'completed').length,
        totalCost,
        estimatedCost,
        averageCost: maintenanceRequests.length > 0 ? totalCost / maintenanceRequests.length : 0,
        averageResolutionDays: Math.ceil(averageResolutionTime / (1000 * 60 * 60 * 24)),
        requestsByStatus,
        requestsByCategory,
        requestsByPriority
      };
    } catch (error) {
      throw new Error(`Error generating maintenance report: ${error.message}`);
    }
  }

  /**
   * Generate growth statistics report
   */
  async generateGrowthReport(companyId, months = 12) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - months, 1);

      const growthData = [];

      for (let i = 0; i < months; i++) {
        const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 1);

        const propertiesCount = await Property.countDocuments({
          company: companyId,
          createdAt: { $lte: monthEnd }
        });

        const unitsCount = await Unit.countDocuments({
          company: companyId,
          createdAt: { $lte: monthEnd }
        });

        const tenantsCount = await Tenant.countDocuments({
          company: companyId,
          createdAt: { $lte: monthEnd }
        });

        const revenue = await Payment.aggregate([
          {
            $match: {
              company: companyId,
              status: 'paid',
              paidDate: { $gte: monthStart, $lt: monthEnd }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]);

        growthData.push({
          month: monthStart.toISOString().substring(0, 7),
          properties: propertiesCount,
          units: unitsCount,
          tenants: tenantsCount,
          revenue: revenue[0]?.total || 0
        });
      }

      return {
        period: `${months} months`,
        growthData
      };
    } catch (error) {
      throw new Error(`Error generating growth report: ${error.message}`);
    }
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(companyId) {
    try {
      const revenueReport = await this.generateRevenueReport(
        companyId,
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        new Date().toISOString().substring(0, 10)
      );

      const occupancyReport = await this.generateOccupancyReport(
        companyId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        new Date().toISOString().substring(0, 10)
      );

      const maintenanceReport = await this.generateMaintenanceReport(
        companyId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        new Date().toISOString().substring(0, 10)
      );

      return {
        summary: {
          revenue: revenueReport.totalRevenue,
          occupancyRate: occupancyReport.occupancyRate,
          maintenanceCost: maintenanceReport.totalCost,
          activeProperties: (await Property.countDocuments({ company: companyId, status: 'active' })),
          activeTenants: (await Tenant.countDocuments({ company: companyId, status: 'active' }))
        },
        details: {
          revenue: revenueReport,
          occupancy: occupancyReport,
          maintenance: maintenanceReport
        }
      };
    } catch (error) {
      throw new Error(`Error generating executive summary: ${error.message}`);
    }
  }
}

module.exports = new ReportingService();
