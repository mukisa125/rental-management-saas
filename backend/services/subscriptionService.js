const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionTransaction = require('../models/SubscriptionTransaction');
const Company = require('../models/Company');
const { getPaymentProvider } = require('./paymentProviderService');

class SubscriptionService {
  /**
   * Get all subscription plans
   */
  async getAllPlans() {
    try {
      const plans = await SubscriptionPlan.find({ isActive: true }).sort({ displayOrder: 1 });
      return plans;
    } catch (error) {
      throw new Error(`Error fetching subscription plans: ${error.message}`);
    }
  }

  /**
   * Get a specific subscription plan by ID
   */
  async getPlanById(planId) {
    try {
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }
      return plan;
    } catch (error) {
      throw new Error(`Error fetching subscription plan: ${error.message}`);
    }
  }

  /**
   * Get plan by name
   */
  async getPlanByName(name) {
    try {
      const plan = await SubscriptionPlan.findOne({ name, isActive: true });
      if (!plan) {
        throw new Error(`Subscription plan "${name}" not found`);
      }
      return plan;
    } catch (error) {
      throw new Error(`Error fetching subscription plan: ${error.message}`);
    }
  }

  /**
   * Create a new subscription for a company
   */
  async createSubscription(companyId, planId, billingCycle = 'monthly', paymentMethod = 'manual') {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Calculate subscription dates
      const startDate = new Date();
      let endDate = new Date();

      if (billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (billingCycle === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Determine amount based on billing cycle
      const amount = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;

      // Create subscription transaction
      const transaction = await SubscriptionTransaction.create({
        company: companyId,
        subscriptionPlan: planId,
        amount,
        currency: 'USD',
        billingCycle,
        transactionType: 'subscription',
        paymentMethod,
        status: 'pending',
        startDate,
        endDate
      });

      // Update company subscription details
      company.subscriptionPlan = planId;
      company.subscriptionStatus = plan.trialDays > 0 ? 'trial' : 'active';
      company.subscriptionStartDate = startDate;
      company.subscriptionEndDate = endDate;
      company.billingCycle = billingCycle;
      company.paymentProvider = paymentMethod;

      if (plan.trialDays > 0) {
        company.trialEndsAt = new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000);
      }

      await company.save();

      return {
        success: true,
        subscription: company,
        transaction: transaction
      };
    } catch (error) {
      throw new Error(`Error creating subscription: ${error.message}`);
    }
  }

  /**
   * Upgrade subscription plan
   */
  async upgradeSubscription(companyId, newPlanId) {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const newPlan = await SubscriptionPlan.findById(newPlanId);
      if (!newPlan) {
        throw new Error('New subscription plan not found');
      }

      const oldPlan = await SubscriptionPlan.findById(company.subscriptionPlan);

      // Calculate prorated amount
      const now = new Date();
      const daysRemaining = Math.ceil((company.subscriptionEndDate - now) / (1000 * 60 * 60 * 24));
      const dailyRate = (newPlan.monthlyPrice / 30);
      const upgradeAmount = dailyRate * daysRemaining;

      // Create upgrade transaction
      const transaction = await SubscriptionTransaction.create({
        company: companyId,
        subscriptionPlan: newPlanId,
        amount: upgradeAmount,
        currency: 'USD',
        billingCycle: company.billingCycle,
        transactionType: 'upgrade',
        paymentMethod: company.paymentProvider,
        status: 'pending',
        startDate: now,
        endDate: company.subscriptionEndDate
      });

      // Update company subscription
      company.subscriptionPlan = newPlanId;
      await company.save();

      return {
        success: true,
        message: 'Subscription upgraded successfully',
        transaction: transaction,
        proratedAmount: upgradeAmount
      };
    } catch (error) {
      throw new Error(`Error upgrading subscription: ${error.message}`);
    }
  }

  /**
   * Downgrade subscription plan
   */
  async downgradeSubscription(companyId, newPlanId) {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const newPlan = await SubscriptionPlan.findById(newPlanId);
      if (!newPlan) {
        throw new Error('New subscription plan not found');
      }

      // Create downgrade transaction
      const transaction = await SubscriptionTransaction.create({
        company: companyId,
        subscriptionPlan: newPlanId,
        amount: 0,
        currency: 'USD',
        billingCycle: company.billingCycle,
        transactionType: 'downgrade',
        paymentMethod: company.paymentProvider,
        status: 'pending',
        startDate: new Date(),
        endDate: company.subscriptionEndDate
      });

      // Update company subscription (downgrade takes effect at next billing cycle)
      company.subscriptionPlan = newPlanId;
      await company.save();

      return {
        success: true,
        message: 'Downgrade scheduled for next billing cycle',
        transaction: transaction
      };
    } catch (error) {
      throw new Error(`Error downgrading subscription: ${error.message}`);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(companyId, reason = '') {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      company.subscriptionStatus = 'cancelled';
      company.isActive = false;
      await company.save();

      return {
        success: true,
        message: 'Subscription cancelled successfully'
      };
    } catch (error) {
      throw new Error(`Error cancelling subscription: ${error.message}`);
    }
  }

  /**
   * Suspend subscription
   */
  async suspendSubscription(companyId, reason = '') {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      company.subscriptionStatus = 'suspended';
      company.isActive = false;
      await company.save();

      return {
        success: true,
        message: 'Subscription suspended successfully'
      };
    } catch (error) {
      throw new Error(`Error suspending subscription: ${error.message}`);
    }
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(companyId) {
    try {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      const plan = await SubscriptionPlan.findById(company.subscriptionPlan);

      company.subscriptionStatus = 'active';
      company.isActive = true;
      company.nextPaymentDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      await company.save();

      return {
        success: true,
        message: 'Subscription reactivated successfully'
      };
    } catch (error) {
      throw new Error(`Error reactivating subscription: ${error.message}`);
    }
  }

  /**
   * Process subscription payment
   */
  async processSubscriptionPayment(transactionId, paymentDetails) {
    try {
      const transaction = await SubscriptionTransaction.findById(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get payment provider
      const provider = getPaymentProvider(transaction.paymentMethod);

      // Process payment
      const paymentResult = await provider.processPayment(paymentDetails);

      if (paymentResult.success) {
        transaction.status = 'completed';
        transaction.paymentId = paymentResult.transactionId;
        transaction.processedDate = new Date();

        await transaction.save();

        // Update company
        const company = await Company.findById(transaction.company);
        company.subscriptionStatus = 'active';
        company.lastPaymentDate = new Date();
        company.nextPaymentDueDate = new Date(
          Date.now() + (transaction.billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000
        );
        await company.save();

        return {
          success: true,
          message: 'Payment processed successfully',
          transaction: transaction
        };
      } else {
        transaction.status = 'failed';
        transaction.failureReason = paymentResult.error;
        await transaction.save();

        throw new Error(`Payment processing failed: ${paymentResult.error}`);
      }
    } catch (error) {
      throw new Error(`Error processing subscription payment: ${error.message}`);
    }
  }

  /**
   * Check subscription limits for a company
   */
  async checkSubscriptionLimits(companyId) {
    try {
      const company = await Company.findById(companyId).populate('subscriptionPlan');
      if (!company || !company.subscriptionPlan) {
        throw new Error('Company or subscription plan not found');
      }

      const plan = company.subscriptionPlan;
      const limits = {
        properties: {
          limit: plan.maxProperties,
          current: company.totalProperties,
          available: plan.maxProperties ? plan.maxProperties - company.totalProperties : -1,
          exceeded: plan.maxProperties ? company.totalProperties >= plan.maxProperties : false
        },
        units: {
          limit: plan.maxUnits,
          current: company.totalUnits,
          available: plan.maxUnits ? plan.maxUnits - company.totalUnits : -1,
          exceeded: plan.maxUnits ? company.totalUnits >= plan.maxUnits : false
        },
        managers: {
          limit: plan.maxManagers,
          current: company.totalManagers,
          available: plan.maxManagers ? plan.maxManagers - company.totalManagers : -1,
          exceeded: plan.maxManagers ? company.totalManagers >= plan.maxManagers : false
        },
        owners: {
          limit: plan.maxOwners,
          current: company.totalOwners,
          available: plan.maxOwners ? plan.maxOwners - company.totalOwners : -1,
          exceeded: plan.maxOwners ? company.totalOwners >= plan.maxOwners : false
        },
        tenants: {
          limit: plan.maxTenants,
          current: company.totalTenants,
          available: plan.maxTenants ? plan.maxTenants - company.totalTenants : -1,
          exceeded: plan.maxTenants ? company.totalTenants >= plan.maxTenants : false
        }
      };

      return limits;
    } catch (error) {
      throw new Error(`Error checking subscription limits: ${error.message}`);
    }
  }

  /**
   * Get subscription usage statistics
   */
  async getSubscriptionUsage(companyId) {
    try {
      const company = await Company.findById(companyId).populate('subscriptionPlan');
      if (!company) {
        throw new Error('Company not found');
      }

      const plan = company.subscriptionPlan;

      return {
        plan: plan.name,
        billingCycle: company.billingCycle,
        subscriptionStatus: company.subscriptionStatus,
        startDate: company.subscriptionStartDate,
        endDate: company.subscriptionEndDate,
        trialEndsAt: company.trialEndsAt,
        monthlyRevenue: company.monthlyRevenue,
        annualRevenue: company.annualRevenue,
        usage: {
          properties: {
            current: company.totalProperties,
            limit: plan.maxProperties || 'Unlimited'
          },
          units: {
            current: company.totalUnits,
            limit: plan.maxUnits || 'Unlimited'
          },
          managers: {
            current: company.totalManagers,
            limit: plan.maxManagers || 'Unlimited'
          },
          owners: {
            current: company.totalOwners,
            limit: plan.maxOwners || 'Unlimited'
          },
          tenants: {
            current: company.totalTenants,
            limit: plan.maxTenants || 'Unlimited'
          }
        },
        features: plan.features
      };
    } catch (error) {
      throw new Error(`Error getting subscription usage: ${error.message}`);
    }
  }

  /**
   * Generate subscription invoice
   */
  async generateInvoice(transactionId) {
    try {
      const transaction = await SubscriptionTransaction.findById(transactionId)
        .populate('company')
        .populate('subscriptionPlan');

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Generate invoice object
      const invoice = {
        invoiceId: `INV-${Date.now()}`,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        company: {
          name: transaction.company.companyName,
          email: transaction.company.email,
          phone: transaction.company.phone,
          address: transaction.company.address
        },
        billTo: {
          name: transaction.company.ownerName,
          email: transaction.company.email
        },
        items: [{
          description: `${transaction.subscriptionPlan.name} - ${transaction.billingCycle} subscription`,
          quantity: 1,
          unitPrice: transaction.amount,
          total: transaction.amount
        }],
        subtotal: transaction.amount,
        tax: 0,
        total: transaction.amount,
        paymentTerms: 'Due upon receipt',
        status: transaction.status
      };

      // Save invoice URL (in real implementation, generate PDF)
      transaction.invoiceId = invoice.invoiceId;
      transaction.invoiceUrl = `/invoices/${invoice.invoiceId}.pdf`;
      await transaction.save();

      return invoice;
    } catch (error) {
      throw new Error(`Error generating invoice: ${error.message}`);
    }
  }
}

module.exports = new SubscriptionService();
